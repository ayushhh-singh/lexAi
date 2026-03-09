import { useState } from "react";
import { Check, Star } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@nyay/shared";
import type { SubscriptionTier } from "@nyay/shared";
import { FEATURE_FLAGS } from "@nyay/shared";
import { useTranslation } from "../../lib/i18n";
import { api } from "../../lib/api-client";

interface PricingCardsProps {
  currentTier?: SubscriptionTier;
  onSubscribed?: () => void;
}

export function PricingCards({ currentTier = "free", onSubscribed }: PricingCardsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  if (!FEATURE_FLAGS.SHOW_PRICING) return null;

  const handleSubscribe = async (tier: "starter" | "professional") => {
    setLoading(tier);
    try {
      const { data } = await api.payments.subscribe(tier);
      if (data) {
        // In production, open Razorpay checkout here using data.razorpay_key_id
        onSubscribed?.();
      }
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {SUBSCRIPTION_PLANS.map((plan) => {
        const isCurrent = plan.tier === currentTier;
        const isPopular = plan.tier === "starter";

        return (
          <div
            key={plan.tier}
            className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md ${
              isPopular
                ? "border-accent ring-2 ring-accent/20"
                : "border-gray-200"
            }`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 font-heading text-xs font-semibold text-white">
                  <Star className="h-3 w-3" />
                  {t("pricing.popular")}
                </span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-heading text-lg font-bold text-gray-900">
                {plan.name}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                {plan.price_inr === 0 ? (
                  <span className="font-heading text-3xl font-bold text-gray-900">
                    {t("pricing.free")}
                  </span>
                ) : (
                  <>
                    <span className="font-heading text-sm text-gray-500">₹</span>
                    <span className="font-heading text-3xl font-bold text-gray-900">
                      {plan.price_inr}
                    </span>
                    <span className="font-heading text-sm text-gray-500">
                      {t("pricing.perMonth")}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="font-body text-sm text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <button
                disabled
                className="w-full rounded-lg bg-gray-100 px-6 py-2.5 font-heading text-sm font-semibold text-gray-500"
              >
                {t("pricing.currentPlan")}
              </button>
            ) : plan.tier === "free" ? (
              <div />
            ) : (
              <button
                onClick={() => handleSubscribe(plan.tier as "starter" | "professional")}
                disabled={loading !== null}
                className={`w-full rounded-lg px-6 py-2.5 font-heading text-sm font-semibold text-white transition-colors duration-150 ${
                  isPopular
                    ? "bg-accent hover:bg-accent-dark"
                    : "bg-navy-600 hover:bg-navy-500"
                } disabled:opacity-50`}
              >
                {loading === plan.tier ? "..." : t("billing.upgrade")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
