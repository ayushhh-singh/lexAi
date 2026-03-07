import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate } from "react-router-dom";
import {
  Mail, Lock, User, Phone, Award, MapPin, ArrowRight, Scale, Eye, EyeOff,
} from "lucide-react";
import {
  registerSchema,
  type RegisterInput,
  INDIAN_STATES,
} from "@nyay/shared";
import { useAuthStore } from "../stores/auth.store";
import { PracticeAreaGrid } from "../components/PracticeAreaGrid";

export function SignupPage() {
  const { session, profile, loading, signup } = useAuthStore();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { practice_areas: [], phone: "+91" },
  });

  const selectedAreas = watch("practice_areas") ?? [];

  if (session && profile?.onboarding_completed) return <Navigate to="/" replace />;
  if (session) return <Navigate to="/onboarding" replace />;

  const onSubmit = async (data: RegisterInput) => {
    setError("");
    try {
      await signup(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-600 text-white flex-col justify-center px-16">
        <div className="flex items-center gap-3 mb-8">
          <Scale className="h-10 w-10" />
          <h1 className="font-heading text-3xl font-bold">Nyay Sahayak</h1>
        </div>
        <p className="font-body text-lg text-navy-100 leading-relaxed max-w-md">
          Join thousands of Indian lawyers using AI to streamline legal research,
          document drafting, and case management.
        </p>
        <div className="mt-10 space-y-4">
          {[
            "AI-powered legal research with verified citations",
            "Instant document drafting for Indian courts",
            "Smart case management & deadline tracking",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-navy-100">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <Scale className="h-8 w-8 text-navy-600" />
            <h1 className="font-heading text-2xl font-bold text-navy-600">Nyay Sahayak</h1>
          </div>

          <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
            Create your account
          </h2>
          <p className="text-gray-500 mb-6">Start your legal AI journey</p>

          {error && (
            <div className="mb-4 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in">
            {/* Full name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Adv. Priya Sharma"
                  {...register("full_name")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              {errors.full_name && <p className="mt-1 text-xs text-error">{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="priya@lawfirm.com"
                  {...register("email")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+919876543210"
                  {...register("phone")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  {...register("password")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error">{errors.password.message}</p>}
            </div>

            {/* Bar Council ID */}
            <div>
              <label htmlFor="bar_council_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                Bar Council registration number
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="bar_council_id"
                  type="text"
                  placeholder="e.g. MAH/1234/2020"
                  {...register("bar_council_id")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              {errors.bar_council_id && <p className="mt-1 text-xs text-error">{errors.bar_council_id.message}</p>}
            </div>

            {/* Practice areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Practice areas <span className="text-gray-400">(select at least one)</span>
              </label>
              <PracticeAreaGrid
                selected={selectedAreas}
                onToggle={(id) => {
                  const next = selectedAreas.includes(id)
                    ? selectedAreas.filter((a) => a !== id)
                    : [...selectedAreas, id];
                  setValue("practice_areas", next, { shouldValidate: true });
                }}
              />
              {errors.practice_areas && <p className="mt-1 text-xs text-error">{errors.practice_areas.message}</p>}
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="city"
                    type="text"
                    placeholder="Mumbai"
                    {...register("city")}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                  />
                </div>
                {errors.city && <p className="mt-1 text-xs text-error">{errors.city.message}</p>}
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">
                  State
                </label>
                <select
                  id="state"
                  {...register("state")}
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-700 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-error">{errors.state.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-500 disabled:opacity-50 transition-colors duration-150"
            >
              {loading ? "Creating account..." : "Create Account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-navy-600 hover:text-navy-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
