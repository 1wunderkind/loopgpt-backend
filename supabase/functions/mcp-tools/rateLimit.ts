/**
 * Postgres-backed rate limiting for MCP Tools
 * Provides persistent rate limiting across Edge Function invocations
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let supabaseClient: any = null;

const MAX_REQUESTS = 100;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[rateLimit] Supabase not configured, rate limiting disabled");
      return null;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseClient;
}

/**
 * Check if user has exceeded rate limit
 * Throws error if limit exceeded
 */
export async function checkRateLimit(userId: string): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return; // Rate limiting disabled
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);
    
    // Get current rate limit entry
    const { data, error } = await client
      .from("mcp_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // Error other than "not found"
      console.error("[rateLimit] Check error:", error.message);
      return; // Fail open - don't block on errors
    }
    
    if (!data || new Date(data.window_start) < windowStart) {
      // No entry or window expired - create new window
      await client
        .from("mcp_rate_limits")
        .upsert({
          user_id: userId,
          request_count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      console.log("[rateLimit] New window", { userId, count: 1 });
      return;
    }
    
    // Check if limit exceeded
    if (data.request_count >= MAX_REQUESTS) {
      const resetTime = new Date(new Date(data.window_start).getTime() + WINDOW_MS);
      const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 1000 / 60);
      
      throw new Error(
        `Rate limit exceeded. You've made ${data.request_count} requests in the last hour. ` +
        `Limit: ${MAX_REQUESTS} requests/hour. Try again in ${minutesUntilReset} minutes.`
      );
    }
    
    // Increment count
    await client
      .from("mcp_rate_limits")
      .update({
        request_count: data.request_count + 1,
        updated_at: now.toISOString()
      })
      .eq("user_id", userId);
    
    console.log("[rateLimit] Request counted", { 
      userId, 
      count: data.request_count + 1,
      remaining: MAX_REQUESTS - (data.request_count + 1)
    });
    
  } catch (error: any) {
    // If it's our rate limit error, re-throw it
    if (error.message.includes("Rate limit exceeded")) {
      throw error;
    }
    
    // Otherwise, log and fail open
    console.error("[rateLimit] Check error:", error.message);
    return;
  }
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(userId: string): Promise<{
  requestCount: number;
  limit: number;
  remaining: number;
  resetAt: string;
} | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from("mcp_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error || !data) return null;
    
    const resetAt = new Date(new Date(data.window_start).getTime() + WINDOW_MS);
    
    return {
      requestCount: data.request_count,
      limit: MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - data.request_count),
      resetAt: resetAt.toISOString()
    };
  } catch (error: any) {
    console.error("[rateLimit] Status error:", error.message);
    return null;
  }
}
