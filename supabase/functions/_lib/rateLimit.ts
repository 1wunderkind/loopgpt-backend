/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per user per endpoint
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset_at: string;
  current_count: number;
}

export interface RateLimitConfig {
  limit?: number;
  windowMinutes?: number;
}

/**
 * Checks if a user has exceeded rate limits for an endpoint
 * 
 * @param userId - The authenticated user's ID
 * @param endpoint - The endpoint name (e.g., "plan_create_meal_plan")
 * @param config - Optional rate limit configuration
 * @returns RateLimitResult with allowed status and metadata
 * 
 * @example
 * ```typescript
 * const result = await checkRateLimit(userId, "plan_create_meal_plan");
 * if (!result.allowed) {
 *   return createRateLimitResponse(result);
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const {
    limit = 100,
    windowMinutes = 60
  } = config;

  // Create service client (rate limiting needs elevated privileges)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Call the database function
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error("[RATE_LIMIT] Database error:", error);
      // On error, allow request (fail open)
      return {
        allowed: true,
        remaining: limit,
        limit,
        reset_at: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
        current_count: 0
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error("[RATE_LIMIT] Unexpected error:", error);
    // On error, allow request (fail open)
    return {
      allowed: true,
      remaining: limit,
      limit,
      reset_at: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
      current_count: 0
    };
  }
}

/**
 * Creates a rate limit exceeded response
 * 
 * @param result - The rate limit result from checkRateLimit
 * @returns HTTP Response with 429 status
 * 
 * @example
 * ```typescript
 * if (!result.allowed) {
 *   return createRateLimitResponse(result);
 * }
 * ```
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const resetDate = new Date(result.reset_at);
  const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      ok: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      rate_limit: {
        limit: result.limit,
        remaining: result.remaining,
        reset_at: result.reset_at,
        retry_after_seconds: retryAfter
      }
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset_at,
        "Retry-After": retryAfter.toString()
      }
    }
  );
}

/**
 * Adds rate limit headers to a successful response
 * 
 * @param response - The original response
 * @param result - The rate limit result
 * @returns Response with added rate limit headers
 * 
 * @example
 * ```typescript
 * const response = createSuccessResponse(data);
 * return addRateLimitHeaders(response, rateLimitResult);
 * ```
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.reset_at);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Rate limit configuration per endpoint
 * Can be overridden by database configuration
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Expensive operations (low limits)
  "plan_create_meal_plan": { limit: 20, windowMinutes: 60 },
  "plan_generate_from_leftovers": { limit: 20, windowMinutes: 60 },
  "delivery_place_order": { limit: 10, windowMinutes: 60 },
  
  // Medium operations
  "nutrition_analyze_food": { limit: 50, windowMinutes: 60 },
  "tracker_log_weight": { limit: 50, windowMinutes: 60 },
  "tracker_log_meal": { limit: 100, windowMinutes: 60 },
  
  // Light operations (higher limits)
  "user_get_profile": { limit: 100, windowMinutes: 60 },
  "tracker_get_progress": { limit: 100, windowMinutes: 60 },
  "plan_get_active_plan": { limit: 100, windowMinutes: 60 },
  
  // MCP server
  "mcp-server": { limit: 100, windowMinutes: 60 },
  
  // Default for unlisted endpoints
  "*": { limit: 100, windowMinutes: 60 }
};

/**
 * Gets rate limit configuration for an endpoint
 * Falls back to default if endpoint not configured
 * 
 * @param endpoint - The endpoint name
 * @returns RateLimitConfig for the endpoint
 */
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS["*"];
}

/**
 * Middleware wrapper that adds rate limiting to a handler function
 * 
 * @param handler - The original request handler
 * @param endpoint - The endpoint name for rate limiting
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * ```typescript
 * async function handler(req: Request): Promise<Response> {
 *   // Your logic here
 * }
 * 
 * export default withRateLimit(handler, "plan_create_meal_plan");
 * ```
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  endpoint: string
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Extract user ID from Authorization header
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No auth, skip rate limiting (will be caught by auth middleware)
      return handler(req);
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create temporary client to verify token and get user ID
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Invalid token, skip rate limiting (will be caught by auth middleware)
      return handler(req);
    }

    // Check rate limit
    const config = getRateLimitConfig(endpoint);
    const result = await checkRateLimit(user.id, endpoint, config);

    if (!result.allowed) {
      console.warn(`[RATE_LIMIT] User ${user.id} exceeded limit for ${endpoint}`);
      return createRateLimitResponse(result);
    }

    // Execute handler and add rate limit headers
    const response = await handler(req);
    return addRateLimitHeaders(response, result);
  };
}
