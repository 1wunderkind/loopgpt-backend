/**
 * Environment Configuration for TheLoopGPT MCP Tools
 */

export const ENV = {
  OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") || "",
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
  SERVICE_ROLE_KEY: Deno.env.get("SERVICE_ROLE_KEY") || "",
  
  // Feature flags
  ENABLE_CACHING: Deno.env.get("ENABLE_CACHING") !== "false",
  ENABLE_RATE_LIMITING: Deno.env.get("ENABLE_RATE_LIMITING") !== "false",
  
  // OpenAI settings
  OPENAI_MODEL: Deno.env.get("OPENAI_MODEL") || "gpt-4o-2024-08-06",
  OPENAI_TEMPERATURE: parseFloat(Deno.env.get("OPENAI_TEMPERATURE") || "0.8"),
  OPENAI_MAX_TOKENS: parseInt(Deno.env.get("OPENAI_MAX_TOKENS") || "4000"),
  
  // Cache settings
  CACHE_TTL_SECONDS: parseInt(Deno.env.get("CACHE_TTL_SECONDS") || "300"),
  
  // Rate limit settings
  RATE_LIMIT_MAX_REQUESTS: parseInt(Deno.env.get("RATE_LIMIT_MAX_REQUESTS") || "100"),
  RATE_LIMIT_WINDOW_MS: parseInt(Deno.env.get("RATE_LIMIT_WINDOW_MS") || String(60 * 60 * 1000)),
};

/**
 * Validate required environment variables
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = ["OPENAI_API_KEY", "SUPABASE_URL", "SERVICE_ROLE_KEY"];
  const missing = required.filter(key => !ENV[key as keyof typeof ENV]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
