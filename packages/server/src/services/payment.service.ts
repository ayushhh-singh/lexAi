import crypto from "crypto";
import { supabaseAdmin } from "../lib/supabase.js";
import { config } from "../lib/config.js";
import { AppError } from "../middleware/error.middleware.js";
import type {
  SubscriptionTier,
  Subscription,
  SubscriptionPlan,
  UsageSummary,
  BillingHistoryItem,
  CreditAction,
} from "@nyay/shared";
import { CREDIT_COSTS, SUBSCRIPTION_PLANS } from "@nyay/shared";

// The auto-generated Supabase types don't yet include the new tables
// (subscriptions, billing_history). Use untyped access until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Subscription Management ──────────────────────────────────────

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError(500, "DB_ERROR", "Failed to fetch subscription");
  return data as Subscription | null;
}

export async function createSubscription(
  userId: string,
  tier: "starter" | "professional",
  razorpaySubscriptionId: string,
  razorpayCustomerId: string,
): Promise<Subscription> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Cancel any existing active subscription
  await db
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: now.toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      tier,
      status: "active",
      razorpay_subscription_id: razorpaySubscriptionId,
      razorpay_customer_id: razorpayCustomerId,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single();

  if (error) throw new AppError(500, "DB_ERROR", "Failed to create subscription");

  // Update profile tier + reset credits for new period
  const plan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === tier)!;
  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: tier,
      ai_credits: plan.credits_per_month,
      updated_at: now.toISOString(),
    })
    .eq("id", userId);

  return data as Subscription;
}

export async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean,
): Promise<Subscription> {
  const sub = await getSubscription(userId);
  if (!sub || sub.status !== "active") {
    throw new AppError(400, "NO_ACTIVE_SUBSCRIPTION", "No active subscription to cancel");
  }

  const updates = cancelAtPeriodEnd
    ? { cancel_at_period_end: true, updated_at: new Date().toISOString() }
    : { status: "cancelled" as const, cancel_at_period_end: false, updated_at: new Date().toISOString() };

  const { data, error } = await db
    .from("subscriptions")
    .update(updates)
    .eq("id", sub.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new AppError(500, "DB_ERROR", "Failed to cancel subscription");

  // If immediate cancel, revert to free tier
  if (!cancelAtPeriodEnd) {
    const freePlan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === "free")!;
    await supabaseAdmin
      .from("profiles")
      .update({
        subscription_tier: "free",
        ai_credits: freePlan.credits_per_month,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  return data as Subscription;
}

// ─── Payment Verification ─────────────────────────────────────────

export function verifyRazorpaySignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
): boolean {
  if (!config.RAZORPAY_KEY_SECRET) return false;
  const body = `${paymentId}|${subscriptionId}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// ─── Webhook Handling ─────────────────────────────────────────────

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!config.RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac("sha256", config.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export async function handleWebhookEvent(event: string, payload: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entity = (payload as any)?.payment?.entity ?? (payload as any)?.subscription?.entity;
  if (!entity) return;

  switch (event) {
    case "subscription.charged": {
      const razorpaySubId = entity.id ?? entity.subscription_id;
      if (!razorpaySubId) break;

      const { data: sub } = await db
        .from("subscriptions")
        .select("*")
        .eq("razorpay_subscription_id", razorpaySubId)
        .single();

      if (sub) {
        const plan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === sub.tier);
        if (plan) {
          // Reset credits for new billing period
          await supabaseAdmin
            .from("profiles")
            .update({ ai_credits: plan.credits_per_month })
            .eq("id", sub.user_id);
        }
        // Extend period
        const newEnd = new Date(sub.current_period_end);
        newEnd.setMonth(newEnd.getMonth() + 1);
        await db
          .from("subscriptions")
          .update({
            current_period_start: sub.current_period_end,
            current_period_end: newEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
      }
      break;
    }

    case "subscription.cancelled":
    case "subscription.halted": {
      const razorpaySubId = entity.id;
      if (!razorpaySubId) break;

      const { data: sub } = await db
        .from("subscriptions")
        .select("*")
        .eq("razorpay_subscription_id", razorpaySubId)
        .single();

      if (sub) {
        await db
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        const freePlan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === "free")!;
        await supabaseAdmin
          .from("profiles")
          .update({ subscription_tier: "free", ai_credits: freePlan.credits_per_month })
          .eq("id", sub.user_id);
      }
      break;
    }
  }
}

// ─── Beta Usage Analytics ─────────────────────────────────────────

export async function trackUsage(
  userId: string,
  actionType: CreditAction,
  feature: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const cost = CREDIT_COSTS[actionType];
  const { error } = await supabaseAdmin
    .from("beta_usage_analytics")
    .insert({
      user_id: userId,
      action_type: actionType,
      feature,
      credits_would_cost: cost,
      metadata: metadata as unknown as Record<string, never>,
    });

  if (error) {
    console.error("[payment] Failed to track usage:", error);
  }
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Total credits used this month
  const { data: monthlyUsage } = await supabaseAdmin
    .from("beta_usage_analytics")
    .select("credits_would_cost")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const creditsUsed = (monthlyUsage ?? []).reduce(
    (sum, row) => sum + (row.credits_would_cost ?? 0),
    0,
  );

  // Queries today
  const { count: queriesToday } = await supabaseAdmin
    .from("beta_usage_analytics")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("action_type", ["chat", "research"])
    .gte("created_at", todayStart);

  // Skills docs this month
  const { count: skillsDocsThisMonth } = await supabaseAdmin
    .from("beta_usage_analytics")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", "skills_doc")
    .gte("created_at", monthStart);

  // Determine which plan their usage matches
  const sub = await getSubscription(userId);
  const currentTier = sub?.tier ?? "free";
  const plan = SUBSCRIPTION_PLANS.find((p: SubscriptionPlan) => p.tier === currentTier) ?? SUBSCRIPTION_PLANS[0];

  // Calculate equivalent cost: which plan would cover their usage
  let equivalentPlan: SubscriptionTier = "free";
  let equivalentCost = 0;
  for (const p of SUBSCRIPTION_PLANS) {
    if (creditsUsed <= p.credits_per_month) {
      equivalentPlan = p.tier;
      equivalentCost = p.price_inr;
      break;
    }
  }
  // If exceeds all plans, use the highest
  if (creditsUsed > SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.length - 1].credits_per_month) {
    const top = SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.length - 1];
    equivalentPlan = top.tier;
    equivalentCost = top.price_inr;
  }

  return {
    credits_used: creditsUsed,
    credits_limit: plan.credits_per_month,
    queries_today: queriesToday ?? 0,
    queries_limit: plan.queries_per_day,
    skills_docs_this_month: skillsDocsThisMonth ?? 0,
    skills_docs_limit: plan.skills_docs_per_month,
    equivalent_plan: equivalentPlan,
    equivalent_cost_inr: equivalentCost,
  };
}

// ─── Feedback ─────────────────────────────────────────────────────

export async function submitFeedback(
  userId: string,
  feature: string,
  rating: number,
  comment?: string,
  responseId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("feedback")
    .insert({
      user_id: userId,
      feature,
      rating,
      comment: comment ?? null,
      response_id: responseId ?? null,
      metadata: (metadata ?? {}) as unknown as Record<string, never>,
    });

  if (error) {
    console.error("[payment] Failed to submit feedback:", error);
    throw new AppError(500, "DB_ERROR", "Failed to submit feedback");
  }
}

// ─── Billing History ──────────────────────────────────────────────

export async function getBillingHistory(userId: string): Promise<BillingHistoryItem[]> {
  const { data, error } = await db
    .from("billing_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[payment] Failed to fetch billing history:", error);
    return [];
  }

  return (data ?? []) as BillingHistoryItem[];
}
