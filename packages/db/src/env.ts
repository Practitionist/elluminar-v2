import { z } from "zod";

const emptyStringToUndefined = (val: unknown): unknown => {
  if (typeof val === "string" && val.trim() === "") {
    return undefined;
  }
  return val;
};

const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

const optionalPostgresUrl = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .min(1)
    .refine(
      (url) =>
        url.startsWith("postgres://") || url.startsWith("postgresql://"),
      {
        message: "Must be a valid PostgreSQL connection string (postgres:// or postgresql://)",
      },
    )
    .optional(),
);

const optionalHttpUrl = z.preprocess(
  emptyStringToUndefined,
  z.url().optional(),
);

export const serverEnvSchema = z.object({
  DATABASE_URL: optionalPostgresUrl,
  DIRECT_URL: optionalPostgresUrl,
  BETTER_AUTH_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 characters").optional(),
  ),
  BETTER_AUTH_URL: optionalHttpUrl,
  R2_ACCOUNT_ID: optionalNonEmptyString,
  R2_ACCESS_KEY_ID: optionalNonEmptyString,
  R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  R2_BUCKET_NAME: optionalNonEmptyString,
  GEMINI_API_KEY: optionalNonEmptyString,
  RAZORPAY_KEY_ID: optionalNonEmptyString,
  RAZORPAY_WEBHOOK_SECRET: optionalNonEmptyString,
  UPSTASH_REDIS_REST_URL: optionalHttpUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalNonEmptyString,
});

export interface ServerEnvCapabilities {
  hasLiveDatabase: boolean;
  hasCloudflareR2: boolean;
  hasGeminiApi: boolean;
  hasRazorpay: boolean;
  hasUpstashRedis: boolean;
}

export type ValidatedServerEnvVars = z.infer<typeof serverEnvSchema>;

export type ParsedServerEnv = ValidatedServerEnvVars & {
  capabilities: ServerEnvCapabilities;
} & ServerEnvCapabilities;

/**
 * Validates server environment variables with Zod and computes deterministic
 * adapter capability flags so local development and CI test suites degrade
 * gracefully without crashing when optional infrastructure credentials are omitted.
 */
export function parseServerEnv(
  rawEnv: Record<string, string | undefined> = process.env,
): ParsedServerEnv {
  const parsed = serverEnvSchema.parse(rawEnv);

  const capabilities: ServerEnvCapabilities = {
    hasLiveDatabase: Boolean(parsed.DATABASE_URL),
    hasCloudflareR2: Boolean(
      parsed.R2_ACCOUNT_ID &&
        parsed.R2_ACCESS_KEY_ID &&
        parsed.R2_SECRET_ACCESS_KEY &&
        parsed.R2_BUCKET_NAME,
    ),
    hasGeminiApi: Boolean(parsed.GEMINI_API_KEY),
    hasRazorpay: Boolean(
      parsed.RAZORPAY_KEY_ID && parsed.RAZORPAY_WEBHOOK_SECRET,
    ),
    hasUpstashRedis: Boolean(
      parsed.UPSTASH_REDIS_REST_URL && parsed.UPSTASH_REDIS_REST_TOKEN,
    ),
  };

  return {
    ...parsed,
    capabilities,
    ...capabilities,
  };
}
