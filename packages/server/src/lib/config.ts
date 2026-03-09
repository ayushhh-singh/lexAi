import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  ENFORCE_CREDITS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  BETA_MODE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  SHOW_PRICING: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
