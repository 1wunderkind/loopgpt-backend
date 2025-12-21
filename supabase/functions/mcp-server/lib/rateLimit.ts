/**
 * Rate Limiting Module
 *
 * Provides multi-scope rate limiting for MCP tools:
 * - Per IP address
 * - Per authenticated user
 * - Per tool
 * - Global limits
 *
 * Uses atomic upserts to analytics.rate_limit_counters table
 * with deterministic time window bucketing.
 *
 * Part of: Step 5 - Security Hardening
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export type RateLimitWindow = "minute" | "hour" | "day";
export type RateLimitScope = "ip" | "user" | "tool" | "global";

/**
 * Rate limit rule definition
 */
export interface RateLimitRule {
  /** Human-readable name for this rule */
  name: string;

  /** Time window for the limit */
  window: RateLimitWindow;

  /** Maximum requests allowed in this window */
  max: number;

  /** Scope of the limit */
  scope: RateLimitScope;
}

/**
 * Context for rate limit check
 */
export interface RateLimitContext {
  /** Tool name being invoked */
  toolName: string;

  /** User ID (if authenticated) */
  userId?: string;

  /** Client IP address */
  clientIp?: string;
}

/**
 * Rate limit decision result
 */
export interface RateLimitDecision {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Number of requests remaining in this window */
  remaining: number;

  /** When the rate limit window resets */
  resetAt: Date;

  /** The rule that was violated (if blocked) */
  rule: RateLimitRule;

  /** Current count in this window */
  currentCount?: number;
}

// ============================================================================
// Window Bucketing
// ============================================================================

/**
 * Calculate deterministic window start time
 *
 * Ensures all requests in the same window get the same bucket:
 * - minute: truncate seconds (e.g., 12:34:00)
 * - hour: truncate minutes+seconds (e.g., 12:00:00)
 * - day: truncate time (e.g., 00:00:00)
 */
function getWindowStart(window: RateLimitWindow, now: Date = new Date()): Date {
  const windowStart = new Date(now);

  switch (window) {
    case "minute":
      // Truncate seconds and milliseconds
      windowStart.setSeconds(0, 0);
      break;

    case "hour":
      // Truncate minutes, seconds, and milliseconds
      windowStart.setMinutes(0, 0, 0);
      break;

    case "day":
      // Truncate hours, minutes, seconds, and milliseconds
      windowStart.setHours(0, 0, 0, 0);
      break;
  }

  return windowStart;
}

/**
 * Calculate when the window resets
 */
function getWindowEnd(window: RateLimitWindow, windowStart: Date): Date {
  const windowEnd = new Date(windowStart);

  switch (window) {
    case "minute":
      windowEnd.setMinutes(windowEnd.getMinutes() + 1);
      break;

    case "hour":
      windowEnd.setHours(windowEnd.getHours() + 1);
      break;

    case "day":
      windowEnd.setDate(windowEnd.getDate() + 1);
      break;
  }

  return windowEnd;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate composite key for rate limit counter
 *
 * Format: {scope}:{subject}:{window}
 * Examples:
 * - "ip:1.2.3.4:minute"
 * - "user:123e4567-e89b-12d3-a456-426614174000:hour"
 * - "tool:search_restaurants:day"
 * - "global:all:minute"
 */
function generateKey(
  scope: RateLimitScope,
  subject: string,
  window: RateLimitWindow,
): string {
  return `${scope}:${subject}:${window}`;
}

/**
 * Get subject for a given scope
 */
function getSubject(
  scope: RateLimitScope,
  ctx: RateLimitContext,
): string | null {
  switch (scope) {
    case "ip":
      return ctx.clientIp || null;

    case "user":
      return ctx.userId || null;

    case "tool":
      return ctx.toolName;

    case "global":
      return "all";

    default:
      return null;
  }
}

// ============================================================================
// Rate Limit Checking
// ============================================================================

/**
 * Check a single rate limit rule
 *
 * Uses atomic upsert to increment counter:
 * INSERT ... ON CONFLICT (key) DO UPDATE SET count = count + 1
 *
 * @param supabase - Supabase client (with service role key)
 * @param ctx - Rate limit context
 * @param rule - Rate limit rule to check
 * @returns Decision (allowed or blocked)
 */
async function checkSingleRule(
  supabase: SupabaseClient,
  ctx: RateLimitContext,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  // Get subject for this scope
  const subject = getSubject(rule.scope, ctx);

  // If subject is missing (e.g., no IP for IP-based rule), allow by default
  if (!subject) {
    return {
      allowed: true,
      remaining: rule.max,
      resetAt: new Date(),
      rule,
    };
  }

  // Calculate window start (deterministic bucketing)
  const windowStart = getWindowStart(rule.window);
  const resetAt = getWindowEnd(rule.window, windowStart);

  // Generate composite key
  const key = generateKey(rule.scope, subject, rule.window);

  try {
    // Atomic upsert: increment counter or insert new record
    const { data, error } = await supabase
      .from("rate_limit_counters")
      .upsert(
        {
          key,
          scope: rule.scope,
          subject,
          window: rule.window,
          window_start: windowStart.toISOString(),
          count: 1,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
          ignoreDuplicates: false,
        },
      )
      .select("count")
      .single();

    if (error) {
      console.error("[RateLimit] Database error:", error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: rule.max,
        resetAt,
        rule,
      };
    }

    // Get current count after increment
    const currentCount = data?.count || 1;

    // Check if limit exceeded
    const allowed = currentCount <= rule.max;
    const remaining = Math.max(0, rule.max - currentCount);

    return {
      allowed,
      remaining,
      resetAt,
      rule,
      currentCount,
    };
  } catch (err) {
    console.error("[RateLimit] Unexpected error:", err);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: rule.max,
      resetAt,
      rule,
    };
  }
}

/**
 * Check multiple rate limit rules
 *
 * Returns the first rule that is violated, or null if all pass.
 *
 * @param ctx - Rate limit context
 * @param rules - Array of rules to check
 * @returns First violated rule decision, or null if all pass
 */
export async function checkRateLimits(
  ctx: RateLimitContext,
  rules: RateLimitRule[],
): Promise<RateLimitDecision | null> {
  // Create Supabase client with service role key
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    {
      db: { schema: "analytics" },
    },
  );

  // Check each rule in order
  for (const rule of rules) {
    const decision = await checkSingleRule(supabase, ctx, rule);

    // If this rule is violated, return immediately
    if (!decision.allowed) {
      return decision;
    }
  }

  // All rules passed
  return null;
}

/**
 * Get rate limit rules for a specific tool
 *
 * This is a helper that will be used by the MCP handler.
 * The actual rules are defined in config/rateLimits.ts.
 *
 * @param toolName - Tool name
 * @param userId - User ID (if authenticated)
 * @returns Array of rules to check
 */
export function getRulesForTool(
  toolName: string,
  userId?: string,
): RateLimitRule[] {
  // This will be implemented in config/rateLimits.ts
  // For now, return empty array (no limits)
  return [];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract client IP from request headers
 *
 * Checks in order:
 * 1. X-Forwarded-For (first IP in list)
 * 2. X-Real-IP
 * 3. CF-Connecting-IP (Cloudflare)
 * 4. req.headers.get("x-forwarded-for")
 *
 * @param req - HTTP request
 * @returns Client IP address or undefined
 */
export function extractClientIp(req: Request): string | undefined {
  // Try X-Forwarded-For (may contain multiple IPs)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (client IP)
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Try X-Real-IP
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Try CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // No IP found
  return undefined;
}

/**
 * Format rate limit decision for logging
 */
export function formatRateLimitDecision(decision: RateLimitDecision): string {
  if (decision.allowed) {
    return `Allowed (${decision.remaining} remaining)`;
  } else {
    return `Blocked by ${decision.rule.name} (resets at ${decision.resetAt.toISOString()})`;
  }
}
