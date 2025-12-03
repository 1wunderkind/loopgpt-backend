/**
 * Rate Limiter for TheLoopGPT MCP Tools
 * Uses Supabase Postgres for distributed rate limiting
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimitError } from "./errors.ts";
import { logWarn } from "./logging.ts";

let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new RateLimitError("Supabase credentials not configured");
    }
    
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default: 100 requests per hour
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000,
};

/**
 * Check if user is within rate limit
 * Throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Get request count in current window
    const { data, error } = await getSupabaseClient()
      .from("rate_limits")
      .select("request_count, window_start, window_end")
      .eq("user_id", userId)
      .gte("window_end", now.toISOString())
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is OK
      logWarn("Rate limit check failed", { userId, error: error.message });
      return; // Fail open - don't block users if rate limit check fails
    }

    if (data) {
      // Existing window
      if (data.request_count >= config.maxRequests) {
        throw new RateLimitError(
          `Rate limit exceeded for user ${userId}`,
          new Date(data.window_end)
        );
      }

      // Increment count
      await getSupabaseClient()
        .from("rate_limits")
        .update({ request_count: data.request_count + 1 })
        .eq("user_id", userId)
        .eq("window_start", data.window_start);
    } else {
      // Create new window
      const windowEnd = new Date(now.getTime() + config.windowMs);
      await getSupabaseClient()
        .from("rate_limits")
        .insert({
          user_id: userId,
          request_count: 1,
          window_start: now.toISOString(),
          window_end: windowEnd.toISOString(),
          max_requests: config.maxRequests,
        });
    }
  } catch (err) {
    if (err instanceof RateLimitError) {
      throw err;
    }
    // Log but don't block on database errors
    logWarn("Rate limit check error", { userId, error: (err as Error).message });
  }
}

/**
 * Get current usage stats for a user
 */
export async function getUserUsage(userId: string): Promise<{
  requestCount: number;
  maxRequests: number;
  remainingQuota: number;
  resetAt: string;
} | null> {
  try {
    const now = new Date();
    const { data, error } = await getSupabaseClient()
      .from("rate_limits")
      .select("request_count, max_requests, window_end")
      .eq("user_id", userId)
      .gte("window_end", now.toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      requestCount: data.request_count,
      maxRequests: data.max_requests,
      remainingQuota: Math.max(0, data.max_requests - data.request_count),
      resetAt: data.window_end,
    };
  } catch (err) {
    logWarn("Failed to get user usage", { userId, error: (err as Error).message });
    return null;
  }
}

/**
 * Clean up expired rate limit windows (run periodically)
 */
export async function cleanupExpiredWindows(): Promise<number> {
  try {
    const now = new Date();
    const { data, error } = await getSupabaseClient()
      .from("rate_limits")
      .delete()
      .lt("window_end", now.toISOString())
      .select("user_id");

    if (error) {
      logWarn("Failed to cleanup expired windows", { error: error.message });
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    logWarn("Cleanup error", { error: (err as Error).message });
    return 0;
  }
}
