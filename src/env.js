import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    //BETTER_AUTH_GITHUB_CLIENT_ID: z.string(),
    //BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    POLAR_ACCESS_TOKEN:z.string(),
    POLAR_WEBHOOK_SECRET:z.string(),
    WAVESPEED_API_KEY: z.string(),
    //WAVESPEED_API_KEY: z.string().min(1),
    WAVESPEED_PROMPT: z.string().optional(),
    WAVESPEED_LORA: z.string().url().optional(),
    // LoRA modest-fashion (vêtements) : utilisé pour GARMENT_ONLY / MIXED / AMBIGUOUS.
    WAVESPEED_LORA_GARMENT: z
      .string()
      .url()
      .default(
        "https://huggingface.co/chakib23/qween/resolve/main/my_first_lora_v1.safetensors",
      ),
    // Prompt (trigger word inclus) et scale propres au LoRA modest-fashion.
    // Si non définis, on retombe sur WAVESPEED_PROMPT / WAVESPEED_SCALE.
    WAVESPEED_PROMPT_GARMENT: z
      .string()
      .default(
        "hjbwear, dress the person in the first image with the exact garment shown in the second image",
      ),
    WAVESPEED_SCALE_GARMENT: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    WAVESPEED_SCALE: z
      .string()
      .transform((val) => parseFloat(val))
      .optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SHOPIFY_API_KEY: z.string(),
    SHOPIFY_API_SECRET: z.string(),
    SHOPIFY_APP_URL: z.string().url().optional(),
    SHOPIFY_SCOPES: z.string().optional(),
    SHOPIFY_BILLING_TEST: z.enum(['true', 'false']).optional(), // 'true' = test charges (dev stores)
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    //BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
    //BETTER_AUTH_GITHUB_CLIENT_SECRET:
    //  process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
    WAVESPEED_API_KEY: process.env.WAVESPEED_API_KEY,
    WAVESPEED_PROMPT: process.env.WAVESPEED_PROMPT,
    WAVESPEED_LORA: process.env.WAVESPEED_LORA,
    WAVESPEED_LORA_GARMENT: process.env.WAVESPEED_LORA_GARMENT,
    WAVESPEED_PROMPT_GARMENT: process.env.WAVESPEED_PROMPT_GARMENT,
    WAVESPEED_SCALE_GARMENT: process.env.WAVESPEED_SCALE_GARMENT,
    WAVESPEED_SCALE: process.env.WAVESPEED_SCALE,
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
    SHOPIFY_BILLING_TEST: process.env.SHOPIFY_BILLING_TEST,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
