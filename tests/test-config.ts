/**
 * Test Configuration
 * Centralizes environment variables for tests to avoid hardcoding.
 */

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Load .env.test if it exists
await load({ export: true, envPath: ".env.test", examplePath: null });

export const TestConfig = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ||
    "https://qmagnwxeijctkksqbcqz.supabase.co",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "mock-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "mock-service-role-key",
  MCP_TOOLS_URL: Deno.env.get("MCP_TOOLS_URL") ||
    "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools",
  FOOD_CDN_URL: Deno.env.get("FOOD_CDN_URL") ||
    "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database",
  ENVIRONMENT: Deno.env.get("ENVIRONMENT") || "test",
};
