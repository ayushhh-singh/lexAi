import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Scale, ArrowRight, ArrowLeft, Sparkles, MessageSquare, FileText, Search,
  Globe, ChevronDown,
} from "lucide-react";
import { COURT_LEVELS } from "@nyay/shared";
import { useAuthStore } from "../stores/auth.store";
import { api } from "../lib/api-client";
import { PracticeAreaGrid } from "../components/PracticeAreaGrid";

const TOTAL_STEPS = 4;

export function OnboardingPage() {
  const { session, profile, user, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Onboarding state
  const [practiceAreas, setPracticeAreas] = useState<string[]>(
    profile?.practice_areas ?? [],
  );
  const [language, setLanguage] = useState(profile?.preferred_language ?? "en");
  const [defaultCourt, setDefaultCourt] = useState(profile?.default_court ?? "");

  // Redirect guards
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/" replace />;

  const userName = profile?.full_name || user?.user_metadata?.full_name || "Counsellor";

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection("left");
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection("right");
      setStep((s) => s - 1);
    }
  };

  const skip = () => goNext();

  const completeOnboarding = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.auth.updateProfile({
        practice_areas: practiceAreas.length > 0 ? practiceAreas : undefined,
        preferred_language: language,
        default_court: defaultCourt || undefined,
        onboarding_completed: true,
      });
      if (data) setProfile(data);
      navigate("/", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Scale className="h-7 w-7 text-navy-600" />
          <span className="font-heading text-lg font-bold text-navy-600">Nyay Sahayak</span>
        </div>
        {step < TOTAL_STEPS - 1 && (
          <button
            onClick={skip}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Skip
          </button>
        )}
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-navy-600 transition-all duration-300 ease-out"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          {error && (
            <div className="mb-4 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
          <div
            key={step}
            className={`animate-slide-${direction}`}
          >
            {step === 0 && <WelcomeStep name={userName} />}
            {step === 1 && (
              <PracticeAreasStep
                selected={practiceAreas}
                onToggle={(id) =>
                  setPracticeAreas((prev) =>
                    prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
                  )
                }
              />
            )}
            {step === 2 && (
              <PreferencesStep
                language={language}
                onLanguageChange={setLanguage}
                defaultCourt={defaultCourt}
                onCourtChange={setDefaultCourt}
              />
            )}
            {step === 3 && <CelebrationStep />}
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {/* Step dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === step ? "w-6 bg-navy-600" : i < step ? "w-2 bg-navy-400" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-5 py-2 text-sm font-medium text-white hover:bg-navy-500 transition-colors duration-150"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={completeOnboarding}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-5 py-2 text-sm font-medium text-white hover:bg-navy-500 disabled:opacity-50 transition-colors duration-150"
            >
              {saving ? "Setting up..." : "Get Started"}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ name }: { name: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-navy-100">
        <Scale className="h-10 w-10 text-navy-600" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
        Welcome, {name}!
      </h2>
      <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
        Let&apos;s personalize your experience. This will only take a minute
        and you can always change these settings later.
      </p>
    </div>
  );
}

function PracticeAreasStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-1">
        Your practice areas
      </h2>
      <p className="text-gray-500 mb-6">
        Select the areas you practice in. This helps us tailor your AI assistant.
      </p>
      <PracticeAreaGrid selected={selected} onToggle={onToggle} compact />
      {selected.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {selected.length} selected
        </p>
      )}
    </div>
  );
}

function PreferencesStep({
  language,
  onLanguageChange,
  defaultCourt,
  onCourtChange,
}: {
  language: string;
  onLanguageChange: (lang: string) => void;
  defaultCourt: string;
  onCourtChange: (court: string) => void;
}) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-1">
        Preferences
      </h2>
      <p className="text-gray-500 mb-6">
        Set your language and default court for a smoother experience.
      </p>

      <div className="space-y-5">
        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Preferred language
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "en", label: "English" },
              { value: "hi", label: "Hindi" },
            ].map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => onLanguageChange(lang.value)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  language === lang.value
                    ? "border-navy-600 bg-navy-600 text-white"
                    : "border-gray-200 text-gray-700 hover:border-navy-200"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default court */}
        <div>
          <label htmlFor="default-court" className="block text-sm font-medium text-gray-700 mb-1.5">
            Default court
          </label>
          <div className="relative">
            <select
              id="default-court"
              value={defaultCourt}
              onChange={(e) => onCourtChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-10 text-sm text-gray-700 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            >
              <option value="">Select court (optional)</option>
              {COURT_LEVELS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CelebrationStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10">
        <Sparkles className="h-10 w-10 text-success" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
        You&apos;re all set!
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Your AI legal assistant is ready. Here&apos;s what you can do:
      </p>

      <div className="grid gap-3 text-left">
        {[
          { icon: MessageSquare, title: "AI Chat", desc: "Ask legal questions with cited answers" },
          { icon: FileText, title: "Draft Documents", desc: "Generate petitions, agreements & more" },
          { icon: Search, title: "Legal Research", desc: "Search acts, judgements & commentaries" },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-150"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50">
              <Icon className="h-5 w-5 text-navy-600" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
