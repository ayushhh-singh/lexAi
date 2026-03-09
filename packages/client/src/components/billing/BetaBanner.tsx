import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { FEATURE_FLAGS } from "@nyay/shared";
import { useTranslation } from "../../lib/i18n";

export function BetaBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (!FEATURE_FLAGS.BETA_MODE || dismissed) return null;

  return (
    <div className="flex items-center justify-between bg-accent/10 px-4 py-2 lg:px-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <p className="font-heading text-sm font-medium text-accent-dark">
          {t("beta.bannerText")}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss beta banner"
        className="rounded-lg p-1 text-accent/60 transition-colors duration-150 hover:bg-accent/10 hover:text-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
