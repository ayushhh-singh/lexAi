import { Link } from "react-router-dom";
import {
  Scale,
  Search,
  FileText,
  FolderKanban,
  Languages,
  CheckCircle2,
  Shield,
  Landmark,
  ArrowRight,
  Clock,
  BookOpen,
  PenTool,
  Play,
} from "lucide-react";
import { FEATURE_FLAGS } from "@nyay/shared";

/* ────────────────────────────────────────────────────────────────────── */
/*  LandingPage                                                          */
/* ────────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TrustSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Navbar                                                                */
/* ────────────────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto max-w-[1200px] px-6 flex items-center justify-between h-16">
        <Link to="/landing" className="flex items-center gap-2.5">
          <Scale className="h-7 w-7 text-white" />
          <span className="font-heading text-xl font-bold text-white">
            Nyay Sahayak
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-navy-200 hover:text-white transition-colors duration-150">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-navy-200 hover:text-white transition-colors duration-150">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-navy-200 hover:text-white transition-colors duration-150">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-navy-200 hover:text-white transition-colors duration-150"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-white px-5 py-2 text-sm font-heading font-semibold text-navy-600 hover:bg-navy-50 transition-colors duration-150"
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Hero                                                                  */
/* ────────────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-navy-900 pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Animated gradient mesh background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-gradient-mesh opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, #2B6CB0 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #1A365D 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #38A169 0%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 text-center">
        {/* Beta badge */}
        {FEATURE_FLAGS.BETA_MODE && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-navy-200 animate-fade-in">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
            Currently in Beta &mdash; Free Access
          </div>
        )}

        <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl md:text-[48px] animate-fade-in-up">
          Your AI Legal Assistant
          <br className="hidden sm:block" /> for Indian Law
        </h1>

        <p className="mx-auto mt-6 max-w-2xl font-body text-lg text-navy-200 sm:text-xl leading-relaxed animate-fade-in-up [animation-delay:100ms]">
          Research case law, draft legal documents, and manage cases — powered
          by AI trained on Indian statutes, Supreme Court and High Court
          judgments.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up [animation-delay:200ms]">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-heading text-base font-semibold text-navy-600 shadow-lg shadow-black/10 hover:bg-navy-50 transition-colors duration-150"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-transparent px-8 py-3 font-heading text-base font-semibold text-white hover:bg-white/5 transition-colors duration-150"
          >
            <Play className="h-4 w-4" />
            Watch Demo
          </button>
        </div>

        {/* Trust badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-navy-300 animate-fade-in-up [animation-delay:300ms]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Verified Citations
          </span>
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            DPDP Compliant
          </span>
          <span className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-warning" />
            Built for Indian Courts
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Problem                                                               */
/* ────────────────────────────────────────────────────────────────────── */

const PAIN_POINTS = [
  {
    icon: Clock,
    title: "Hours on Research",
    description:
      "Searching through thousands of judgments and statutes manually for every single case.",
  },
  {
    icon: PenTool,
    title: "Repetitive Drafting",
    description:
      "Re-typing the same petition formats, bail applications, and notices from scratch.",
  },
  {
    icon: BookOpen,
    title: "Citation Errors",
    description:
      "Incorrect or outdated citations that get flagged by courts, costing credibility and time.",
  },
] as const;

function ProblemSection() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
            Lawyers spend 60% of time on
            <br className="hidden sm:block" />{" "}
            <span className="text-accent">repetitive documentation</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-gray-600">
            The Indian legal system demands precision, yet most lawyers are
            bogged down by manual processes that AI can handle in seconds.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PAIN_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50">
                <point.icon className="h-6 w-6 text-navy-600" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-gray-900">
                {point.title}
              </h3>
              <p className="mt-2 font-body text-gray-600 leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Features                                                              */
/* ────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Search,
    title: "AI Legal Research",
    description:
      "Search across Supreme Court, High Court judgments and Indian statutes with AI that understands legal context. Get verified citations with source links, not hallucinated references.",
    highlights: ["Natural language queries", "Verified citations with sources", "IPC, CrPC, BNS, BNSS coverage"],
  },
  {
    icon: FileText,
    title: "Document Generation",
    description:
      "Generate court-ready legal documents — bail applications, writ petitions, legal notices, and more. Formatted per court-specific rules with proper citation standards.",
    highlights: ["20+ document templates", "Court-specific formatting", "Auto-filled from case data"],
  },
  {
    icon: FolderKanban,
    title: "Case Management",
    description:
      "Organize all your cases, documents, and deadlines in one place. Link research and drafts to cases automatically for a complete case file.",
    highlights: ["Case timeline tracking", "Document organization", "Linked research & drafts"],
  },
  {
    icon: Languages,
    title: "Hindi Language Support",
    description:
      "Full interface and AI responses in Hindi. Research and draft in the language your clients and courts prefer, with accurate legal Hindi terminology.",
    highlights: ["Complete Hindi UI", "Hindi legal terminology", "Bilingual document output"],
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything you need to practice law
            <br className="hidden sm:block" /> faster and smarter
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-gray-600">
            Purpose-built for Indian lawyers — not a generic AI chatbot with a
            legal skin.
          </p>
        </div>

        <div className="mt-20 space-y-24">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex flex-col items-center gap-12 lg:flex-row ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text side */}
              <div className="flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50">
                  <feature.icon className="h-6 w-6 text-navy-600" />
                </div>
                <h3 className="mt-5 font-heading text-2xl font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-3 font-body text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {feature.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                      <span className="font-body">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Screenshot placeholder */}
              <div className="flex-1 w-full">
                <div className="aspect-[4/3] rounded-xl border border-gray-200 bg-gradient-to-br from-navy-50 to-gray-100 flex items-center justify-center shadow-sm">
                  <div className="text-center px-8">
                    <feature.icon className="mx-auto h-16 w-16 text-navy-300" />
                    <p className="mt-4 font-heading text-sm font-medium text-navy-400">
                      {feature.title} Interface
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  How It Works                                                          */
/* ────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    number: "1",
    title: "Describe Your Need",
    description:
      "Tell the AI what you need — a bail application, case research, or a legal notice — in plain English or Hindi.",
  },
  {
    number: "2",
    title: "AI Researches & Drafts",
    description:
      "Nyay Sahayak searches relevant statutes and judgments, verifies citations, and generates a complete draft.",
  },
  {
    number: "3",
    title: "Review & Download",
    description:
      "Review the AI output, make edits if needed, and download court-ready documents with proper formatting.",
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-gray-600">
            From query to court-ready document in three simple steps.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Horizontal dashed connector line between step circles */}
          <div
            aria-hidden="true"
            className="absolute top-7 left-[16.67%] right-[16.67%] hidden h-px border-t-2 border-dashed border-navy-200 lg:block"
          />

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-600 text-white font-heading text-xl font-bold shadow-lg shadow-navy-600/20">
                  {step.number}
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 font-body text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Trust                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

function TrustSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm md:p-16">
          <div className="flex flex-col items-center gap-12 lg:flex-row">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                Built by an IIT Roorkee Engineer
              </h2>
              <p className="mt-4 font-body text-lg text-gray-600 leading-relaxed">
                Nyay Sahayak is built with the same rigor expected in Indian
                courtrooms. Every citation is verified against actual court
                records. Your data is encrypted and never used for model training.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: Shield, label: "End-to-end encryption" },
                  { icon: CheckCircle2, label: "Verified AI citations" },
                  { icon: Landmark, label: "Indian court formatting" },
                  { icon: Scale, label: "DPDP Act compliant" },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <badge.icon className="h-5 w-5 shrink-0 text-navy-600" />
                    <span className="font-heading text-sm font-medium text-gray-800">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="h-64 w-64 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center shadow-xl">
                  <Scale className="h-24 w-24 text-white/20" />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -right-4 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-heading text-sm font-semibold text-gray-900">
                      99.2% Citation Accuracy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Pricing                                                               */
/* ────────────────────────────────────────────────────────────────────── */

function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
            {FEATURE_FLAGS.SHOW_PRICING ? "Simple, Transparent Pricing" : "Pricing"}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-gray-600">
            {FEATURE_FLAGS.SHOW_PRICING
              ? "Choose the plan that fits your practice."
              : "We're in beta — enjoy full access while we refine the product."}
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          {FEATURE_FLAGS.SHOW_PRICING ? (
            <PricingCards />
          ) : (
            <BetaFreeCard />
          )}
        </div>
      </div>
    </section>
  );
}

function BetaFreeCard() {
  return (
    <div className="w-full max-w-lg rounded-2xl border-2 border-navy-600 bg-white p-10 shadow-sm text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-sm font-heading font-semibold text-success-dark">
        <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
        Beta Access
      </div>
      <h3 className="mt-6 font-heading text-4xl font-bold text-gray-900">
        Free
      </h3>
      <p className="mt-1 font-body text-gray-500">
        During beta period
      </p>
      <ul className="mt-8 space-y-4 text-left">
        {[
          "Unlimited AI legal research",
          "All document templates",
          "Case management",
          "Hindi language support",
          "Verified citations",
        ].map((item) => (
          <li key={item} className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <span className="font-body text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/signup"
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-600 px-6 py-3 font-heading text-base font-semibold text-white hover:bg-navy-500 transition-colors duration-150"
      >
        Get Started Free
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs text-gray-400 font-body">
        No credit card required. No commitment.
      </p>
    </div>
  );
}

function PricingCards() {
  const plans = [
    {
      name: "Starter",
      price: "999",
      period: "/month",
      features: [
        "50 AI research queries/month",
        "10 document drafts/month",
        "Basic case management",
        "Email support",
      ],
      cta: "Start Starter",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "2,499",
      period: "/month",
      features: [
        "Unlimited AI research",
        "Unlimited document drafts",
        "Full case management",
        "Hindi language support",
        "Priority support",
      ],
      cta: "Start Professional",
      highlighted: true,
    },
    {
      name: "Firm",
      price: "4,999",
      period: "/month",
      features: [
        "Everything in Professional",
        "Up to 10 team members",
        "Shared case files",
        "Custom templates",
        "Dedicated account manager",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-2xl p-8 ${
            plan.highlighted
              ? "border-2 border-navy-600 bg-white shadow-lg relative"
              : "border border-gray-200 bg-white shadow-sm"
          }`}
        >
          {plan.highlighted && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-navy-600 px-4 py-1 text-xs font-heading font-semibold text-white">
              Most Popular
            </div>
          )}
          <h3 className="font-heading text-lg font-semibold text-gray-900">
            {plan.name}
          </h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-heading text-sm text-gray-500">&#8377;</span>
            <span className="font-heading text-4xl font-bold text-gray-900">
              {plan.price}
            </span>
            <span className="font-body text-gray-500">{plan.period}</span>
          </div>
          <ul className="mt-8 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <span className="font-body text-gray-700">{f}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            className={`mt-8 inline-flex w-full items-center justify-center rounded-lg px-6 py-2.5 font-heading text-sm font-semibold transition-colors duration-150 ${
              plan.highlighted
                ? "bg-navy-600 text-white hover:bg-navy-500"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {plan.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  CTA                                                                   */
/* ────────────────────────────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="rounded-2xl bg-navy-600 px-8 py-16 text-center md:px-16">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to practice law smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-navy-200">
            Join hundreds of Indian lawyers already using Nyay Sahayak to save
            hours every week.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-heading text-base font-semibold text-navy-600 shadow-lg shadow-black/10 hover:bg-navy-50 transition-colors duration-150"
          >
            Start Free Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Footer                                                                */
/* ────────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-navy-900 py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Scale className="h-7 w-7 text-white" />
              <span className="font-heading text-xl font-bold text-white">
                Nyay Sahayak
              </span>
            </div>
            <p className="mt-4 max-w-sm font-body text-navy-300 leading-relaxed">
              AI-powered legal assistant built specifically for Indian lawyers
              and the Indian legal system.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-navy-400">
              Made in India
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-navy-400">
              Product
            </h4>
            <ul className="mt-4 space-y-3">
              {["Features", "Pricing", "Research", "Document Drafting"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                      className="text-sm text-navy-300 hover:text-white transition-colors duration-150"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-navy-400">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              {["Privacy Policy", "Terms of Service", "DPDP Compliance"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-navy-300 hover:text-white transition-colors duration-150"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="font-body text-xs text-navy-500 leading-relaxed">
            <strong className="text-navy-400">Disclaimer:</strong> Nyay Sahayak
            is an AI-assisted tool for legal professionals. It does not
            constitute legal advice. All AI-generated content should be reviewed
            and verified by a qualified legal professional before use in any
            legal proceeding. Nyay Sahayak is not a law firm and does not provide
            legal representation.
          </p>
          <p className="mt-4 text-xs text-navy-500">
            &copy; {new Date().getFullYear()} Nyay Sahayak. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
