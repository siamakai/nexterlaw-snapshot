import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_ADDRESS: z.string().email(),
  RESEND_FROM_NAME: z.string().default("NexterLaw"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_PRIVACY_VERSION: z.string().default("1.0"),
  CALENDLY_BOOKING_URL: z.string().url().optional(),
  GHL_WEBHOOK_URL: z.string().url().optional(),
  GHL_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validated at startup — throws with a clear message if any required var is missing
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_env.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check the server logs.");
}

export const env = _env.data;
