/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and correctly typed.
 */

import { AppError } from "./errors/ErrorHandler.ts";

export interface EnvConfig {
  // Core
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENVIRONMENT: "development" | "staging" | "production";

  // AI
  OPENAI_API_KEY: string;

  // Providers
  MEALME_API_KEY?: string;
  MEALME_API_BASE?: string;

  // Logging
  LOGTAIL_TOKEN?: string;

  // Optional
  [key: string]: string | undefined;
}

const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
];

/**
 * Validate and retrieve environment variables
 */
export function getEnv(): EnvConfig {
  const missing: string[] = [];
  const config: Record<string, string | undefined> = {};

  // Check required variables
  for (const key of REQUIRED_VARS) {
    const value = Deno.env.get(key);
    if (!value) {
      missing.push(key);
    }
    config[key] = value;
  }

  // Check optional variables
  config.MEALME_API_KEY = Deno.env.get("MEALME_API_KEY");
  config.MEALME_API_BASE = Deno.env.get("MEALME_API_BASE");
  config.LOGTAIL_TOKEN = Deno.env.get("LOGTAIL_TOKEN");
  config.ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "development";

  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(", ")}`,
      "ENV_CONFIG_ERROR",
      500,
      "INTERNAL",
    );
  }

  return config as unknown as EnvConfig;
}

/**
 * Validate environment at startup
 * Call this at the top of your edge function
 */
export function validateEnv(): void {
  getEnv();
}
