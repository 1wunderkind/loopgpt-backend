/**
 * Tool Access Control Configuration
 *
 * Defines which tools require authentication and which are public.
 *
 * Access Levels:
 * - public: Anyone can call (no auth required)
 * - authenticated: Requires valid user session
 * - service_only: Only service role can call (internal tools)
 *
 * Part of: Step 5 - Security Hardening
 */

// ============================================================================
// Types
// ============================================================================

export type ToolAccess = "public" | "authenticated" | "service_only";

// ============================================================================
// Tool Access Policies
// ============================================================================

/**
 * Access control map for all MCP tools
 *
 * Default: authenticated (require login)
 * Explicitly mark public tools
 */
export const TOOL_ACCESS: Record<string, ToolAccess> = {
  // ========================================================================
  // Public Tools (no auth required)
  // ========================================================================

  // Recipe generation - allow public use for demos/trials
  "loopkitchen_recipes.generate": "public",
  "loopkitchen.generate_recipe": "public",

  // Nutrition estimation - public for demos
  "estimate_recipe_nutrition": "public",
  "nutrition.analyze": "public",
  "nutrition_analyze_deterministic": "public",

  // Search (read-only, no personal data)
  "search_recipes": "public",

  // ========================================================================
  // Authenticated Tools (require login)
  // ========================================================================

  // Personal data - tracking
  "log_meal": "authenticated",
  "log_weight": "authenticated",
  "get_meal_history": "authenticated",
  "get_weight_history": "authenticated",
  "get_nutrition_summary": "authenticated",

  // Personal data - goals
  "get_user_goals": "authenticated",
  "set_user_goals": "authenticated",
  "update_user_goals": "authenticated",

  // Personal data - profile
  "get_user_profile": "authenticated",
  "update_user_profile": "authenticated",

  // Meal planning (personalized)
  "generate_week_plan": "authenticated",
  "generate_meal_plan": "authenticated",
  "get_meal_plan": "authenticated",
  "update_meal_plan": "authenticated",

  // Grocery lists (personalized)
  "generate_grocery_list": "authenticated",
  "get_grocery_list": "authenticated",

  // Commerce - restaurant search
  "search_restaurants": "authenticated",
  "get_restaurant_details": "authenticated",

  // Commerce - ordering (requires auth for fraud prevention)
  "place_order": "authenticated",
  "confirm_order": "authenticated",
  "cancel_order": "authenticated",
  "get_order_status": "authenticated",
  "get_order_history": "authenticated",

  // Affiliate links
  "get_affiliate_links": "authenticated",

  // Saved recipes (personalized)
  "save_recipe": "authenticated",
  "get_saved_recipes": "authenticated",
  "delete_saved_recipe": "authenticated",

  // ========================================================================
  // Service-Only Tools (internal use only)
  // ========================================================================

  // Admin tools
  "admin.get_user_stats": "service_only",
  "admin.delete_user_data": "service_only",

  // Internal analytics
  "analytics.record_event": "service_only",
  "analytics.get_metrics": "service_only",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get access level for a tool
 *
 * @param toolName - MCP tool name
 * @returns Access level (defaults to "authenticated" if not specified)
 */
export function getToolAccess(toolName: string): ToolAccess {
  return TOOL_ACCESS[toolName] || "authenticated";
}

/**
 * Check if a tool requires authentication
 *
 * @param toolName - MCP tool name
 * @returns true if tool requires auth
 */
export function requiresAuth(toolName: string): boolean {
  const access = getToolAccess(toolName);
  return access === "authenticated" || access === "service_only";
}

/**
 * Check if a tool is public (no auth required)
 *
 * @param toolName - MCP tool name
 * @returns true if tool is public
 */
export function isPublic(toolName: string): boolean {
  return getToolAccess(toolName) === "public";
}

/**
 * Check if a tool is service-only
 *
 * @param toolName - MCP tool name
 * @returns true if tool is service-only
 */
export function isServiceOnly(toolName: string): boolean {
  return getToolAccess(toolName) === "service_only";
}

/**
 * Validate access to a tool
 *
 * @param toolName - MCP tool name
 * @param userId - User ID (if authenticated)
 * @param isServiceRole - Whether caller has service role key
 * @returns { allowed: boolean, reason?: string }
 */
export function validateAccess(
  toolName: string,
  userId?: string,
  isServiceRole: boolean = false,
): { allowed: boolean; reason?: string } {
  const access = getToolAccess(toolName);

  // Service-only tools
  if (access === "service_only") {
    if (!isServiceRole) {
      return {
        allowed: false,
        reason: "This tool is for internal use only",
      };
    }
    return { allowed: true };
  }

  // Authenticated tools
  if (access === "authenticated") {
    if (!userId && !isServiceRole) {
      return {
        allowed: false,
        reason: "Please sign in to use this feature",
      };
    }
    return { allowed: true };
  }

  // Public tools
  return { allowed: true };
}

/**
 * Get all public tools
 */
export function getPublicTools(): string[] {
  return Object.entries(TOOL_ACCESS)
    .filter(([_, access]) => access === "public")
    .map(([tool, _]) => tool);
}

/**
 * Get all authenticated tools
 */
export function getAuthenticatedTools(): string[] {
  return Object.entries(TOOL_ACCESS)
    .filter(([_, access]) => access === "authenticated")
    .map(([tool, _]) => tool);
}

/**
 * Get all service-only tools
 */
export function getServiceOnlyTools(): string[] {
  return Object.entries(TOOL_ACCESS)
    .filter(([_, access]) => access === "service_only")
    .map(([tool, _]) => tool);
}

/**
 * Get access summary for documentation
 */
export function getAccessSummary(): {
  public: number;
  authenticated: number;
  service_only: number;
  total: number;
} {
  const tools = Object.values(TOOL_ACCESS);
  return {
    public: tools.filter((a) => a === "public").length,
    authenticated: tools.filter((a) => a === "authenticated").length,
    service_only: tools.filter(a === "service_only").length,
    total: tools.length,
  };
}
