import { Download, X } from "lucide-react";
import { usePwaInstall } from "../../hooks/usePwaInstall";

export function InstallBanner() {
  const { showBanner, install, dismiss } = usePwaInstall();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-navy-100 bg-white p-4 shadow-lg lg:bottom-6">
      <button
        onClick={dismiss}
        aria-label="Dismiss install banner"
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-50">
          <Download className="h-6 w-6 text-navy-600" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="font-heading text-sm font-semibold text-navy-600">
            Install Nyay Sahayak
          </h3>
          <p className="mt-0.5 font-heading text-xs text-gray-500">
            Add to your home screen for quick access and offline support.
          </p>
          <button
            onClick={install}
            className="mt-3 flex h-10 items-center gap-2 rounded-xl bg-navy-600 px-5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-500 active:bg-navy-700"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
