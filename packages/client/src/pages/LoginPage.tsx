import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Mail, Lock, ArrowRight, Scale, KeyRound } from "lucide-react";
import {
  otpRequestSchema,
  loginSchema,
  type OtpRequestInput,
  type OtpVerifyInput,
  type LoginInput,
} from "@nyay/shared";
import { useAuthStore } from "../stores/auth.store";

type AuthMode = "otp-email" | "otp-verify" | "password";

export function LoginPage() {
  const { session, profile, loading, requestOtp, verifyOtp, login } = useAuthStore();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("otp-email");
  const [otpEmail, setOtpEmail] = useState("");
  const [error, setError] = useState("");

  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  // Only allow relative paths starting with / to prevent open redirect
  const from = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";

  // Redirect if already logged in
  if (session && profile?.onboarding_completed) return <Navigate to={from} replace />;
  if (session) return <Navigate to="/onboarding" replace />;

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-600 text-white flex-col justify-center px-16">
        <div className="flex items-center gap-3 mb-8">
          <Scale className="h-10 w-10" />
          <h1 className="font-heading text-3xl font-bold">Nyay Sahayak</h1>
        </div>
        <p className="font-body text-lg text-navy-100 leading-relaxed max-w-md">
          AI-powered legal assistant built for Indian lawyers. Research faster,
          draft smarter, and manage cases with confidence.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Scale className="h-8 w-8 text-navy-600" />
            <h1 className="font-heading text-2xl font-bold text-navy-600">Nyay Sahayak</h1>
          </div>

          <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
            Welcome back
          </h2>
          <p className="text-gray-500 mb-8">Sign in to your account</p>

          {error && (
            <div className="mb-4 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {mode === "otp-email" && (
            <OtpEmailForm
              loading={loading}
              onSubmit={async (data) => {
                setError("");
                try {
                  await requestOtp(data.email);
                  setOtpEmail(data.email);
                  setMode("otp-verify");
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Failed to send OTP");
                }
              }}
              onSwitchToPassword={() => { setError(""); setMode("password"); }}
            />
          )}

          {mode === "otp-verify" && (
            <OtpVerifyForm
              email={otpEmail}
              loading={loading}
              onSubmit={async (data) => {
                setError("");
                try {
                  await verifyOtp(data.email, data.token);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Invalid OTP");
                }
              }}
              onBack={() => { setError(""); setMode("otp-email"); }}
              onResend={async () => {
                setError("");
                try {
                  await requestOtp(otpEmail);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Failed to resend OTP");
                }
              }}
            />
          )}

          {mode === "password" && (
            <PasswordForm
              loading={loading}
              onSubmit={async (data) => {
                setError("");
                try {
                  await login(data.email, data.password);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Invalid credentials");
                }
              }}
              onSwitchToOtp={() => { setError(""); setMode("otp-email"); }}
            />
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-medium text-navy-600 hover:text-navy-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function OtpEmailForm({
  loading,
  onSubmit,
  onSwitchToPassword,
}: {
  loading: boolean;
  onSubmit: (data: OtpRequestInput) => Promise<void>;
  onSwitchToPassword: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<OtpRequestInput>({
    resolver: zodResolver(otpRequestSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in">
      <div>
        <label htmlFor="otp-email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="otp-email"
            type="email"
            autoComplete="email"
            placeholder="you@lawfirm.com"
            {...register("email")}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-500 disabled:opacity-50 transition-colors duration-150"
      >
        {loading ? "Sending OTP..." : "Continue with Email OTP"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToPassword}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
      >
        <Lock className="h-4 w-4" />
        Sign in with password
      </button>
    </form>
  );
}

function OtpVerifyForm({
  email,
  loading,
  onSubmit,
  onBack,
  onResend,
}: {
  email: string;
  loading: boolean;
  onSubmit: (data: OtpVerifyInput) => Promise<void>;
  onBack: () => void;
  onResend: () => Promise<void>;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submittingRef = useRef(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled (guard against double-submit)
    const token = newDigits.join("");
    if (token.length === 6 && !submittingRef.current) {
      submittingRef.current = true;
      onSubmit({ email, token }).finally(() => { submittingRef.current = false; });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6 && !submittingRef.current) {
      submittingRef.current = true;
      onSubmit({ email, token: pasted }).finally(() => { submittingRef.current = false; });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-navy-50 p-4">
        <KeyRound className="h-5 w-5 text-navy-600 shrink-0" />
        <p className="text-sm text-gray-700">
          We sent a 6-digit code to <span className="font-medium">{email}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-heading font-semibold focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm mb-6">
        <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-700">
          Change email
        </button>
        <button
          type="button"
          disabled={resendCooldown > 0 || loading}
          onClick={async () => {
            await onResend();
            setResendCooldown(30);
          }}
          className="text-navy-600 hover:text-navy-500 disabled:text-gray-400"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>

      <button
        type="button"
        disabled={loading || digits.join("").length < 6 || submittingRef.current}
        onClick={() => {
          if (submittingRef.current) return;
          submittingRef.current = true;
          onSubmit({ email, token: digits.join("") }).finally(() => { submittingRef.current = false; });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-500 disabled:opacity-50 transition-colors duration-150"
      >
        {loading ? "Verifying..." : "Verify & Sign In"}
      </button>
    </div>
  );
}

function PasswordForm({
  loading,
  onSubmit,
  onSwitchToOtp,
}: {
  loading: boolean;
  onSubmit: (data: LoginInput) => Promise<void>;
  onSwitchToOtp: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in">
      <div>
        <label htmlFor="pw-email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="pw-email"
            type="email"
            autoComplete="email"
            placeholder="you@lawfirm.com"
            {...register("email")}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="pw-password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="pw-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            {...register("password")}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
        </div>
        {errors.password && <p className="mt-1 text-xs text-error">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-500 disabled:opacity-50 transition-colors duration-150"
      >
        {loading ? "Signing in..." : "Sign In"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToOtp}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
      >
        <Mail className="h-4 w-4" />
        Sign in with Email OTP
      </button>
    </form>
  );
}
