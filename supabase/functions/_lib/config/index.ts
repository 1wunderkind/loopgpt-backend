/**
 * TheLoopGPT Metadata Configuration - Central Export
 * 
 * This file exports all metadata configurations for TheLoopGPT.
 * Import from this file to access any metadata component.
 * 
 * Usage:
 *   import { THELOOPGPT_METADATA, ALL_TOOL_DESCRIPTIONS, ROUTING_METADATA } from "./_shared/config/index.ts";
 */

// Export types
export type {
  ToolDescription,
  ToolParameter,
  RoutingMetadata,
  TriggerHint,
  NegativeHint,
  ToolChain,
  AppMetadata
} from "./types.ts";

// Export main metadata
export {
  THELOOPGPT_METADATA,
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_CATEGORIES,
  FEATURE_HIGHLIGHTS,
  USE_CASES,
  TARGET_USERS
} from "./theloopgptMetadata.ts";

// Export tool descriptions
export {
  ALL_TOOL_DESCRIPTIONS,
  getToolDescription,
  getToolsByCategory,
  getAllToolIds,
  getToolCount,
  getToolsByPriority,
  TOOL_SUMMARY,
  // Individual tool exports for direct access
  TOOL_PLAN_GENERATE_FROM_LEFTOVERS,
  TOOL_PLAN_CREATE_MEAL_PLAN,
  TOOL_PLAN_RANDOM_MEAL,
  TOOL_PLAN_GET_ACTIVE_PLAN,
  TOOL_NUTRITION_ANALYZE_FOOD,
  TOOL_NUTRITION_COMPARE_FOODS,
  TOOL_NUTRITION_GET_MACROS,
  TOOL_NUTRITION_GET_RECOMMENDATIONS,
  TOOL_TRACKER_LOG_MEAL,
  TOOL_TRACKER_SUMMARY,
  TOOL_TRACKER_LOG_WEIGHT,
  TOOL_TRACKER_QUICK_ADD_CALORIES,
  TOOL_TRACKER_GET_PROGRESS,
  TOOL_USER_GET_PROFILE,
  TOOL_USER_SET_WEIGHT_GOAL,
  TOOL_USER_UPDATE_DIET_PREFERENCES,
  TOOL_FOOD_SEARCH,
  TOOL_DELIVERY_SEARCH_RESTAURANTS,
  TOOL_DELIVERY_GET_MENU,
  TOOL_DELIVERY_PLACE_ORDER,
  TOOL_LOOPGPT_ROUTE_ORDER,
  TOOL_LOOPGPT_CONFIRM_ORDER,
  TOOL_LOOPGPT_CANCEL_ORDER,
  TOOL_LOOPGPT_RECORD_OUTCOME,
  TOOL_LOOP_PREDICT_OUTCOME,
  TOOL_LOOP_ADJUST_CALORIES,
  TOOL_LOOP_EVALUATE_PLAN,
  TOOL_GDPR_EXPORT,
  TOOL_GDPR_DELETE,
  TOOL_CCPA_OPT_OUT,
  TOOL_CREATE_CHECKOUT_SESSION,
  TOOL_CREATE_CUSTOMER_PORTAL,
  TOOL_CHECK_ENTITLEMENT,
  TOOL_UPGRADE_TO_PREMIUM,
  TOOL_HEALTH,
  TOOL_SYS_HEALTHCHECK,
  TOOL_SYS_GET_HELP
} from "./toolDescriptions.ts";

// Export routing hints
export {
  ROUTING_METADATA
} from "./routingHints.ts";

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get complete metadata package for MCP server
 */
export function getCompleteMetadata() {
  return {
    app: THELOOPGPT_METADATA,
    tools: ALL_TOOL_DESCRIPTIONS,
    routing: ROUTING_METADATA,
    summary: {
      toolCount: getToolCount(),
      categories: Object.keys(TOOL_SUMMARY.categories),
      lastUpdated: TOOL_SUMMARY.lastUpdated
    }
  };
}

/**
 * Get tool description with routing hints
 */
export function getToolWithRouting(toolId: string) {
  const tool = getToolDescription(toolId);
  if (!tool) return null;
  
  // Find matching routing hints
  const routingHints = Object.entries(ROUTING_METADATA.triggerHints)
    .filter(([_, hint]) => hint.relatedTools?.includes(toolId))
    .map(([key, hint]) => ({ key, ...hint }));
  
  return {
    ...tool,
    routingHints
  };
}

/**
 * Search tools by keyword
 */
export function searchTools(keyword: string): ToolDescription[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(ALL_TOOL_DESCRIPTIONS).filter(tool => 
    tool.displayName.toLowerCase().includes(lowerKeyword) ||
    tool.primaryDescription.toLowerCase().includes(lowerKeyword) ||
    tool.category.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get recommended tool for user query
 */
export function getRecommendedTool(userQuery: string): {
  toolId: string;
  confidence: number;
  reason: string;
} | null {
  const lowerQuery = userQuery.toLowerCase();
  
  // Check trigger hints
  for (const [hintKey, hint] of Object.entries(ROUTING_METADATA.triggerHints)) {
    for (const example of hint.examples) {
      if (lowerQuery.includes(example.toLowerCase().slice(0, 20))) {
        return {
          toolId: hint.relatedTools[0],
          confidence: hint.confidence,
          reason: `Matched trigger hint: ${hintKey}`
        };
      }
    }
  }
  
  // Fallback to keyword search
  const matches = searchTools(userQuery);
  if (matches.length > 0) {
    return {
      toolId: matches[0].toolId,
      confidence: 0.5,
      reason: "Keyword match"
    };
  }
  
  return null;
}

/**
 * Validate tool invocation
 */
export function validateToolInvocation(
  toolId: string,
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const tool = getToolDescription(toolId);
  if (!tool) {
    return { valid: false, errors: [`Tool ${toolId} not found`] };
  }
  
  const errors: string[] = [];
  
  // Check required params
  for (const param of tool.requiredParams) {
    if (!(param.name in params)) {
      errors.push(`Missing required parameter: ${param.name}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// METADATA CONSTANTS FOR QUICK ACCESS
// ============================================================================

export const METADATA_VERSION = "1.0.0";
export const METADATA_LAST_UPDATED = "2025-12-03";
export const TOTAL_TOOLS = getToolCount();

// Export for MCP server manifest
export const MCP_SERVER_INFO = {
  name: "theloopgpt",
  version: METADATA_VERSION,
  description: THELOOPGPT_METADATA.shortDescription,
  tools: getAllToolIds(),
  capabilities: [
    "recipe_generation",
    "nutrition_analysis",
    "meal_planning",
    "food_tracking",
    "grocery_ordering",
    "ai_predictions"
  ]
};
