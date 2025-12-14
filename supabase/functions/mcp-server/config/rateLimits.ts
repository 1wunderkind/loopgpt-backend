/**
 * Rate Limit Configuration
 * 
 * Defines pragmatic and safe rate limits for all MCP tools.
 * 
 * Strategy:
 * - Global per-IP limits (prevent DDoS)
 * - Per-user limits (fair usage)
 * - Per-tool limits (protect expensive operations)
 * - Anonymous users get stricter IP-only limits
 * 
 * Part of: Step 5 - Security Hardening
 */

import type { RateLimitRule } from "../lib/rateLimit.ts";

// ============================================================================
// Global Rate Limits
// ============================================================================

/**
 * Global per-IP limits (applied to all requests)
 * Prevents DDoS and abuse from single IP
 */
export const GLOBAL_IP_LIMITS: RateLimitRule[] = [
  {
    name: "Global IP - Minute",
    window: "minute",
    max: 60,
    scope: "ip",
  },
  {
    name: "Global IP - Hour",
    window: "hour",
    max: 500,
    scope: "ip",
  },
];

/**
 * Global per-user limits (applied to authenticated users)
 * More generous than IP limits
 */
export const GLOBAL_USER_LIMITS: RateLimitRule[] = [
  {
    name: "Global User - Minute",
    window: "minute",
    max: 120,
    scope: "user",
  },
  {
    name: "Global User - Day",
    window: "day",
    max: 1000,
    scope: "user",
  },
];

// ============================================================================
// Per-Tool Rate Limits
// ============================================================================

/**
 * Rate limits for expensive or external API tools
 * These are stricter to protect costs and external quotas
 */
export const TOOL_SPECIFIC_LIMITS: Record<string, RateLimitRule[]> = {
  // ========================================================================
  // Commerce Tools (expensive, external APIs)
  // ========================================================================
  
  "search_restaurants": [
    {
      name: "Search Restaurants - User/Minute",
      window: "minute",
      max: 10,
      scope: "user",
    },
    {
      name: "Search Restaurants - IP/Minute",
      window: "minute",
      max: 30,
      scope: "ip",
    },
  ],
  
  "place_order": [
    {
      name: "Place Order - User/Minute",
      window: "minute",
      max: 5,
      scope: "user",
    },
    {
      name: "Place Order - User/Hour",
      window: "hour",
      max: 20,
      scope: "user",
    },
  ],
  
  "confirm_order": [
    {
      name: "Confirm Order - User/Minute",
      window: "minute",
      max: 5,
      scope: "user",
    },
    {
      name: "Confirm Order - User/Hour",
      window: "hour",
      max: 20,
      scope: "user",
    },
  ],
  
  "cancel_order": [
    {
      name: "Cancel Order - User/Minute",
      window: "minute",
      max: 10,
      scope: "user",
    },
  ],
  
  "get_affiliate_links": [
    {
      name: "Get Affiliate Links - User/Minute",
      window: "minute",
      max: 20,
      scope: "user",
    },
    {
      name: "Get Affiliate Links - User/Hour",
      window: "hour",
      max: 100,
      scope: "user",
    },
  ],
  
  // ========================================================================
  // Meal Planning (expensive, LLM-based)
  // ========================================================================
  
  "generate_week_plan": [
    {
      name: "Generate Week Plan - User/Hour",
      window: "hour",
      max: 20,
      scope: "user",
    },
    {
      name: "Generate Week Plan - User/Day",
      window: "day",
      max: 50,
      scope: "user",
    },
  ],
  
  "generate_meal_plan": [
    {
      name: "Generate Meal Plan - User/Hour",
      window: "hour",
      max: 20,
      scope: "user",
    },
  ],
  
  // ========================================================================
  // Recipe Generation (moderate cost, LLM-based)
  // ========================================================================
  
  "loopkitchen_recipes.generate": [
    {
      name: "Generate Recipes - User/Minute",
      window: "minute",
      max: 30,
      scope: "user",
    },
    {
      name: "Generate Recipes - IP/Minute",
      window: "minute",
      max: 60,
      scope: "ip",
    },
  ],
  
  // ========================================================================
  // Nutrition Tools (cheap, deterministic)
  // ========================================================================
  
  "estimate_recipe_nutrition": [
    {
      name: "Estimate Nutrition - User/Minute",
      window: "minute",
      max: 60,
      scope: "user",
    },
  ],
  
  "nutrition.analyze": [
    {
      name: "Analyze Nutrition - User/Minute",
      window: "minute",
      max: 60,
      scope: "user",
    },
  ],
  
  // ========================================================================
  // Tracking Tools (moderate frequency)
  // ========================================================================
  
  "log_meal": [
    {
      name: "Log Meal - User/Minute",
      window: "minute",
      max: 30,
      scope: "user",
    },
    {
      name: "Log Meal - User/Day",
      window: "day",
      max: 200,
      scope: "user",
    },
  ],
  
  "log_weight": [
    {
      name: "Log Weight - User/Minute",
      window: "minute",
      max: 10,
      scope: "user",
    },
    {
      name: "Log Weight - User/Day",
      window: "day",
      max: 50,
      scope: "user",
    },
  ],
  
  // ========================================================================
  // User Settings (low frequency)
  // ========================================================================
  
  "set_user_goals": [
    {
      name: "Set User Goals - User/Minute",
      window: "minute",
      max: 5,
      scope: "user",
    },
    {
      name: "Set User Goals - User/Hour",
      window: "hour",
      max: 20,
      scope: "user",
    },
  ],
  
  "get_user_goals": [
    {
      name: "Get User Goals - User/Minute",
      window: "minute",
      max: 30,
      scope: "user",
    },
  ],
};

// ============================================================================
// Anonymous User Limits
// ============================================================================

/**
 * Stricter limits for anonymous (unauthenticated) users
 * Only IP-based limits apply
 */
export const ANONYMOUS_IP_LIMITS: RateLimitRule[] = [
  {
    name: "Anonymous IP - Minute",
    window: "minute",
    max: 30, // Half of authenticated user limit
    scope: "ip",
  },
  {
    name: "Anonymous IP - Hour",
    window: "hour",
    max: 200, // Stricter than global IP limit
    scope: "ip",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get rate limit rules for a specific tool
 * 
 * Returns:
 * 1. Global limits (IP or user, depending on auth)
 * 2. Tool-specific limits (if defined)
 * 
 * @param toolName - MCP tool name
 * @param userId - User ID (if authenticated)
 * @returns Array of rules to check
 */
export function getRulesForTool(
  toolName: string,
  userId?: string
): RateLimitRule[] {
  const rules: RateLimitRule[] = [];
  
  // Add global limits
  if (userId) {
    // Authenticated user: apply user limits
    rules.push(...GLOBAL_USER_LIMITS);
  } else {
    // Anonymous user: apply stricter IP limits
    rules.push(...ANONYMOUS_IP_LIMITS);
  }
  
  // Add global IP limits (always apply)
  rules.push(...GLOBAL_IP_LIMITS);
  
  // Add tool-specific limits (if defined)
  const toolLimits = TOOL_SPECIFIC_LIMITS[toolName];
  if (toolLimits) {
    rules.push(...toolLimits);
  }
  
  return rules;
}

/**
 * Check if a tool has custom rate limits defined
 */
export function hasCustomLimits(toolName: string): boolean {
  return toolName in TOOL_SPECIFIC_LIMITS;
}

/**
 * Get all tool names with custom limits
 */
export function getToolsWithCustomLimits(): string[] {
  return Object.keys(TOOL_SPECIFIC_LIMITS);
}

/**
 * Get summary of rate limits for a tool
 * Useful for documentation and debugging
 */
export function getRateLimitSummary(toolName: string, userId?: string): string {
  const rules = getRulesForTool(toolName, userId);
  const summary = rules.map(rule => 
    `${rule.name}: ${rule.max}/${rule.window}`
  ).join(", ");
  
  return summary || "No specific limits";
}
