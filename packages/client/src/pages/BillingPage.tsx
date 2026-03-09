import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, Zap, FileText, ArrowUpRight } from "lucide-react";
import { FEATURE_FLAGS, SUBSCRIPTION_PLANS } from "@nyay/shared";
import type { UsageSummary, Subscription, BillingHistoryItem } from "@nyay/shared";
import { useAuthStore } from "../stores/auth.store";
import { useTranslation } from "../lib/i18n";
import { api } from "../lib/api-client";
import { PricingCards } from "../components/billing/PricingCards";

export function BillingPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [subscription, setSubscription] = useState<Partial<Subscription> | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usageRes, subRes, historyRes] = await Promise.all([
        api.payments.getUsage(),
        api.payments.getSubscription(),
        api.payments.getBillingHistory(),
      ]);
      setUsage(usageRes.data ?? null);
      setSubscription(subRes.data ?? null);
      setHistory(historyRes.data ?? []);
    } catch {
      // Errors handled by interceptor
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async () => {
    if (!confirm(t("billing.cancelConfirm"))) return;
    setCancelling(true);
    try {
      await api.payments.cancel(true);
      await loadData();
    } catch {
      // Error handled
    } finally {
      setCancelling(false);
    }
  };

  const currentTier = (profile?.subscription_tier ?? "free") as "free" | "starter" | "professional";
  const isBeta = FEATURE_FLAGS.BETA_MODE;

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <h1 className="font-heading text-2xl font-bold text-gray-900">
        {t("billing.title")}
      </h1>

      {/* Current Plan Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-gray-900">
              {t("billing.currentPlan")}
            </h2>
            {isBeta ? (
              <>
                <p className="mt-1 font-heading text-2xl font-bold text-accent">
                  {t("billing.betaPlan")}
                </p>
                <p className="mt-0.5 font-heading text-sm text-gray-500">
                  {t("billing.betaPlanDesc")}
                </p>
              </>
            ) : (
              <p className="mt-1 font-heading text-2xl font-bold text-navy-600">
                {SUBSCRIPTION_PLANS.find((p) => p.tier === currentTier)?.name ?? "Free"}
                {currentTier !== "free" && (
                  <span className="ml-2 text-base font-normal text-gray-500">
                    ₹{SUBSCRIPTION_PLANS.find((p) => p.tier === currentTier)?.price_inr}
                    {t("pricing.perMonth")}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <CreditCard className="h-6 w-6 text-accent" />
          </div>
        </div>

        {/* Cancel button for paid plans */}
        {!isBeta && currentTier !== "free" && subscription?.status === "active" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-4 font-heading text-sm text-error hover:underline disabled:opacity-50"
          >
            {cancelling ? "..." : t("billing.cancelSubscription")}
          </button>
        )}
      </div>

      {/* Usage Summary */}
      {usage && (
        <div className="space-y-4">
          <h2 className="font-heading text-base font-semibold text-gray-900">
            {t("billing.usageThisMonth")}
          </h2>

          {/* Equivalent cost banner */}
          {usage.equivalent_cost_inr > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
              <ArrowUpRight className="h-5 w-5 text-accent" />
              <p className="font-heading text-sm font-medium text-accent-dark">
                {t("billing.equivalentCost", {
                  amount: `₹${usage.equivalent_cost_inr}`,
                  plan: SUBSCRIPTION_PLANS.find((p) => p.tier === usage.equivalent_plan)?.name ?? "Starter",
                })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Credits Used */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-heading text-xs font-medium text-gray-500">
                  {t("billing.creditsUsed")}
                </p>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-1 font-heading text-2xl font-bold text-gray-900">
                {usage.credits_used}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.min((usage.credits_used / Math.max(usage.credits_limit, 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 font-heading text-xs text-gray-400">
                of {usage.credits_limit}
              </p>
            </div>

            {/* Queries Today */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-heading text-xs font-medium text-gray-500">
                  {t("billing.queriesToday")}
                </p>
                <Zap className="h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-1 font-heading text-2xl font-bold text-gray-900">
                {usage.queries_today}
              </p>
              {usage.queries_limit && (
                <>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-success transition-all duration-300"
                      style={{ width: `${Math.min((usage.queries_today / usage.queries_limit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 font-heading text-xs text-gray-400">
                    of {usage.queries_limit}/day
                  </p>
                </>
              )}
            </div>

            {/* Skills Docs */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-heading text-xs font-medium text-gray-500">
                  {t("billing.skillsDocs")}
                </p>
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-1 font-heading text-2xl font-bold text-gray-900">
                {usage.skills_docs_this_month}
              </p>
              {usage.skills_docs_limit && (
                <>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-warning transition-all duration-300"
                      style={{ width: `${Math.min((usage.skills_docs_this_month / usage.skills_docs_limit) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 font-heading text-xs text-gray-400">
                    of {usage.skills_docs_limit}/month
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards (hidden if !SHOW_PRICING) */}
      <PricingCards currentTier={currentTier} onSubscribed={loadData} />

      {/* Billing History */}
      {!isBeta && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-base font-semibold text-gray-900">
            {t("billing.history")}
          </h2>
          {history.length === 0 ? (
            <p className="font-heading text-sm text-gray-400">
              {t("billing.noHistory")}
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-heading text-sm font-medium text-gray-900">
                      {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)} Plan
                    </p>
                    <p className="font-heading text-xs text-gray-400">
                      {new Date(item.period_start).toLocaleDateString()} — {new Date(item.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-sm font-semibold text-gray-900">
                      ₹{item.amount_inr}
                    </p>
                    <p className={`font-heading text-xs ${
                      item.status === "paid" ? "text-success" : "text-warning"
                    }`}>
                      {item.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
