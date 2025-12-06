/**
 * Tool Metrics & Invocation Logging
 * 
 * Provides database logging for all MCP tool invocations to analytics.tool_invocations.
 * Used for observability, monitoring, and performance analysis.
 * 
 * Key principles:
 * - Non-throwing: Failures to log metrics must never break tool execution
 * - Async: Database inserts happen asynchronously (fire-and-forget)
 * - Structured: All logs include standardized fields for aggregation
 * 
 * Usage:
 *   import { logToolInvocationToDb } from "./lib/tool-metrics";
 *   
 *   const startedAt = new Date();
 *   const result = await executeTool(...);
 *   const finishedAt = new Date();
 *   
 *   await logToolInvocationToDb({
 *     toolName: "delivery_search_restaurants",
 *     startedAt,
 *     finishedAt,
 *     success: result.ok,
 *     errorCode: result.ok ? undefined : result.error.code,
 *   });
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logDebug, logError } from "./logger.ts";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ToolInvocationLogInput {
  // Required fields
  toolName: string;
  startedAt: Date;
  finishedAt: Date;
  success: boolean;

  // Optional context fields
  userId?: string;
  sessionId?: string;
  gptName?: string;          // e.g. 'LeftoverGPT', 'MealPlannerGPT', 'RecipeGPT'
  provider?: string;         // e.g. 'MealMe', 'Instacart', 'Affiliate:US'
  sourceGpt?: string;        // Optional extra source classification
  errorCode?: string;        // ToolErrorCode when success = false
  metadata?: Record<string, any>; // Arbitrary JSON for debugging
}

// ============================================================================
// Supabase Client Initialization
// ============================================================================

/**
 * Get Supabase client with service role key for analytics writes
 * 
 * Uses environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Log a tool invocation to analytics.tool_invocations table
 * 
 * This function is non-throwing and fire-and-forget. Failures to log metrics
 * are logged to console but do not propagate errors.
 * 
 * @param input - Tool invocation data
 */
export async function logToolInvocationToDb(
  input: ToolInvocationLogInput
): Promise<void> {
  const durationMs = input.finishedAt.getTime() - input.startedAt.getTime();

  try {
    const supabase = getSupabaseClient();

    // Insert into analytics.tool_invocations
    const { error } = await supabase
      .from("analytics.tool_invocations")
      .insert({
        tool_name: input.toolName,
        user_id: input.userId ?? null,
        session_id: input.sessionId ?? null,
        gpt_name: input.gptName ?? null,
        started_at: input.startedAt.toISOString(),
        finished_at: input.finishedAt.toISOString(),
        duration_ms: durationMs,
        success: input.success,
        error_code: input.errorCode ?? null,
        provider: input.provider ?? null,
        source_gpt: input.sourceGpt ?? null,
        metadata: input.metadata ?? {},
      });

    if (error) {
      // Log error but don't throw - metrics failures must not break tool execution
      logError("Failed to insert tool_invocation to database", {
        source: "tool-metrics",
        toolName: input.toolName,
        error: error.message,
        errorDetails: error,
      });
    } else {
      // Success - log at debug level to avoid noise
      logDebug("Inserted tool_invocation to database", {
        source: "tool-metrics",
        toolName: input.toolName,
        success: input.success,
        durationMs,
      });
    }
  } catch (e: any) {
    // Catch any unexpected errors (e.g., network failures, env var issues)
    logError("Exception while inserting tool_invocation", {
      source: "tool-metrics",
      toolName: input.toolName,
      error: e?.message ?? String(e),
      stack: e?.stack,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract user ID from request context
 * 
 * Attempts to extract user ID from various sources:
 * - Authorization header (JWT)
 * - Request body
 * - Query parameters
 * 
 * @param req - Request object
 * @returns User ID or undefined
 */
export function extractUserIdFromRequest(req: Request): string | undefined {
  try {
    // Try to extract from Authorization header (JWT)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Parse JWT payload (base64 decode middle section)
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub ?? payload.user_id;
    }

    // Try to extract from request body (if JSON)
    const contentType = req.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      // Note: This requires the request body to be cloned/cached earlier
      // since reading it here would consume the stream
      // In practice, this is handled by the MCP server's request parsing
    }

    return undefined;
  } catch (e) {
    // Silently fail - user ID extraction is best-effort
    return undefined;
  }
}

/**
 * Infer GPT name from tool name
 * 
 * Maps tool names to their corresponding GPT:
 * - leftover_* → LeftoverGPT
 * - mealplan_* → MealPlannerGPT
 * - recipe_* → RecipeGPT
 * - delivery_* → RestaurantGPT
 * - etc.
 * 
 * @param toolName - MCP tool name
 * @returns GPT name or undefined
 */
export function inferGptNameFromTool(toolName: string): string | undefined {
  const toolPrefix = toolName.split("_")[0].toLowerCase();

  const gptMap: Record<string, string> = {
    leftover: "LeftoverGPT",
    mealplan: "MealPlannerGPT",
    recipe: "RecipeGPT",
    delivery: "RestaurantGPT",
    nutrition: "NutritionGPT",
    grocery: "GroceryGPT",
    affiliate: "AffiliateGPT",
    weight: "WeightTrackerGPT",
  };

  return gptMap[toolPrefix];
}

/**
 * Infer provider from tool name
 * 
 * Maps tool names to their external service provider:
 * - delivery_* → MealMe
 * - affiliate_* → Varies by country
 * - grocery_* → OpenAI (for generation)
 * 
 * @param toolName - MCP tool name
 * @returns Provider name or undefined
 */
export function inferProviderFromTool(toolName: string): string | undefined {
  if (toolName.startsWith("delivery_")) {
    return "MealMe";
  } else if (toolName.startsWith("affiliate_")) {
    return "Affiliate"; // Could be enriched with country later
  } else if (toolName.startsWith("grocery_")) {
    return "OpenAI";
  }

  return undefined;
}

/**
 * Sanitize metadata for database storage
 * 
 * Removes sensitive fields and limits size to prevent storage bloat.
 * 
 * @param metadata - Raw metadata object
 * @returns Sanitized metadata
 */
export function sanitizeMetadata(
  metadata: Record<string, any>
): Record<string, any> {
  const sanitized = { ...metadata };

  // Remove sensitive fields
  const sensitiveFields = [
    "password",
    "apiKey",
    "api_key",
    "token",
    "secret",
    "authorization",
    "cookie",
  ];

  for (const field of sensitiveFields) {
    delete sanitized[field];
  }

  // Limit size by truncating large strings
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string" && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + "... [truncated]";
    }
  }

  return sanitized;
}
