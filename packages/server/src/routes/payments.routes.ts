import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { config } from "../lib/config.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  createSubscriptionSchema,
  verifyPaymentSchema,
  cancelSubscriptionSchema,
  submitFeedbackSchema,
  SUBSCRIPTION_PLANS,
} from "@nyay/shared";
import {
  getSubscription,
  createSubscription,
  cancelSubscription,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  handleWebhookEvent,
  getUsageSummary,
  submitFeedback,
  getBillingHistory,
} from "../services/payment.service.js";

const router = Router();

// ─── GET /plans — list available plans ────────────────────────────

router.get("/plans", (_req: Request, res: Response) => {
  res.json({ success: true, data: SUBSCRIPTION_PLANS });
});

// ─── GET /subscription — current user subscription ────────────────

router.get(
  "/subscription",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await getSubscription(req.user!.id);
      console.log(`[payments] GET /subscription — userId=${req.user!.id}, tier=${sub?.tier ?? "free"}`);
      res.json({
        success: true,
        data: sub ?? {
          tier: "free",
          status: config.BETA_MODE ? "trialing" : "active",
          cancel_at_period_end: false,
        },
      });
    } catch (err) {
      console.error(`[payments] GET /subscription error — userId=${req.user?.id}:`, err instanceof Error ? err.message : err);
      next(err);
    }
  },
);

// ─── POST /subscribe — create Razorpay subscription ───────────────

router.post(
  "/subscribe",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request body");
      }

      const { tier } = parsed.data;
      console.log(`[payments] POST /subscribe — userId=${req.user!.id}, tier=${tier}`);

      if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
        throw new AppError(503, "PAYMENT_UNAVAILABLE", "Payment gateway not configured");
      }

      const plan = SUBSCRIPTION_PLANS.find((p: { tier: string }) => p.tier === tier);
      if (!plan) {
        throw new AppError(400, "INVALID_TIER", "Invalid subscription tier");
      }

      // Create subscription record
      // In production, first create a Razorpay subscription via their API
      const sub = await createSubscription(
        req.user!.id,
        tier,
        `rzp_sub_placeholder_${Date.now()}`,
        `rzp_cust_${req.user!.id}`,
      );

      console.log(`[payments] subscription created — userId=${req.user!.id}, subId=${sub.id}`);
      res.json({
        success: true,
        data: {
          subscription_id: sub.id,
          razorpay_subscription_id: sub.razorpay_subscription_id,
          razorpay_key_id: config.RAZORPAY_KEY_ID,
        },
      });
    } catch (err) {
      console.error(`[payments] POST /subscribe error — userId=${req.user?.id}:`, err instanceof Error ? err.message : err);
      next(err);
    }
  },
);

// ─── POST /verify — verify Razorpay payment signature ─────────────

router.post(
  "/verify",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request body");
      }

      const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = parsed.data;

      console.log(`[payments] POST /verify — userId=${req.user!.id}, subscriptionId=${razorpay_subscription_id}`);
      const valid = verifyRazorpaySignature(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      );

      if (!valid) {
        console.warn(`[payments] signature verification failed — userId=${req.user!.id}`);
        throw new AppError(400, "INVALID_SIGNATURE", "Payment verification failed");
      }

      console.log(`[payments] payment verified — userId=${req.user!.id}`);
      res.json({ success: true, data: { verified: true } });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /cancel — cancel subscription ───────────────────────────

router.post(
  "/cancel",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = cancelSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request body");
      }

      console.log(`[payments] POST /cancel — userId=${req.user!.id}, cancelAtPeriodEnd=${parsed.data.cancel_at_period_end}`);
      const sub = await cancelSubscription(
        req.user!.id,
        parsed.data.cancel_at_period_end,
      );

      console.log(`[payments] subscription cancelled — userId=${req.user!.id}`);
      res.json({ success: true, data: sub });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /usage — usage summary with equivalent cost ──────────────

router.get(
  "/usage",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await getUsageSummary(req.user!.id);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /billing-history ─────────────────────────────────────────

router.get(
  "/billing-history",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await getBillingHistory(req.user!.id);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /feedback — submit thumbs up/down + comment ─────────────

router.post(
  "/feedback",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = submitFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request body");
      }

      const { feature, rating, comment, response_id, metadata } = parsed.data;
      await submitFeedback(req.user!.id, feature, rating, comment, response_id, metadata);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /webhook — Razorpay webhook (no auth, signature verified)

router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      // Use raw body preserved by express.json verify callback for accurate signature check
      const rawBody = (req as unknown as Record<string, unknown>).rawBody as string
        ?? JSON.stringify(req.body);

      if (!signature || !verifyWebhookSignature(rawBody, signature)) {
        console.warn(`[payments] webhook signature invalid`);
        throw new AppError(400, "INVALID_WEBHOOK", "Invalid webhook signature");
      }

      const { event, payload } = req.body;
      console.log(`[payments] webhook received — event=${event}`);
      await handleWebhookEvent(event, payload);
      console.log(`[payments] webhook processed — event=${event}`);

      res.json({ success: true });
    } catch (err) {
      console.error(`[payments] webhook error:`, err instanceof Error ? err.message : err);
      next(err);
    }
  },
);

export default router;
