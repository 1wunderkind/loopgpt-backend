/**
 * LooptOS Metadata Configuration - Central Export
 *
 * This file exports all metadata configurations for LooptOS.
 * Import from this file to access any metadata component.
 *
 * Usage:
 *   import { LOOPTOS_METADATA, ALL_TOOL_DESCRIPTIONS, ROUTING_METADATA } from "../_lib/config/index.ts";
 */

// Import types
import type {
  ToolDescription,
  ToolParameter,
  ToolReturnFormat,
} from "./types.ts";

// Import from sub-modules
import {
  APP_CATEGORIES,
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_NAME,
  APP_TAGLINE,
  FEATURE_HIGHLIGHTS,
  LOOPTOS_METADATA,
  TARGET_USERS,
  USE_CASES,
} from "./looptosMetadata.ts";

import {
  ALL_TOOL_DESCRIPTIONS,
  getAllToolIds,
  getToolCount,
  getToolDescription,
  getToolsByCategory,
  getToolsByPriority,
  TOOL_CCPA_OPT_OUT,
  TOOL_CHECK_ENTITLEMENT,
  TOOL_CREATE_CHECKOUT_SESSION,
  TOOL_CREATE_CUSTOMER_PORTAL,
  TOOL_DELIVERY_GET_MENU,
  TOOL_DELIVERY_PLACE_ORDER,
  TOOL_DELIVERY_SEARCH_RESTAURANTS,
  TOOL_FOOD_SEARCH,
  TOOL_GDPR_DELETE,
  TOOL_GDPR_EXPORT,
  TOOL_HEALTH,
  TOOL_LOOP_ADJUST_CALORIES,
  TOOL_LOOP_EVALUATE_PLAN,
  TOOL_LOOP_PREDICT_OUTCOME,
  TOOL_LOOPGPT_CANCEL_ORDER,
  TOOL_LOOPGPT_CONFIRM_ORDER,
  TOOL_LOOPGPT_RECORD_OUTCOME,
  TOOL_LOOPGPT_ROUTE_ORDER,
  TOOL_NUTRITION_ANALYZE_FOOD,
  TOOL_NUTRITION_COMPARE_FOODS,
  TOOL_NUTRITION_GET_MACROS,
  TOOL_NUTRITION_GET_RECOMMENDATIONS,
  TOOL_PLAN_CREATE_MEAL_PLAN,
  TOOL_PLAN_GENERATE_FROM_LEFTOVERS,
  TOOL_PLAN_GET_ACTIVE_PLAN,
  TOOL_PLAN_RANDOM_MEAL,
  TOOL_SUMMARY,
  TOOL_SYS_GET_HELP,
  TOOL_SYS_HEALTHCHECK,
  TOOL_TRACKER_GET_PROGRESS,
  TOOL_TRACKER_LOG_MEAL,
  TOOL_TRACKER_LOG_WEIGHT,
  TOOL_TRACKER_QUICK_ADD_CALORIES,
  TOOL_TRACKER_SUMMARY,
  TOOL_UPGRADE_TO_PREMIUM,
  TOOL_USER_GET_PROFILE,
  TOOL_USER_SET_WEIGHT_GOAL,
  TOOL_USER_UPDATE_DIET_PREFERENCES,
} from "./toolDescriptions.ts";

import { ROUTING_METADATA } from "./routingHints.ts";

// Re-export types
export type {
  RoutingMetadata,
  ToolChain,
  ToolDescription,
  ToolParameter,
} from "./types.ts";

// Re-export main metadata
export {
  APP_CATEGORIES,
  APP_DESCRIPTION,
  APP_KEYWORDS,
  APP_NAME,
  APP_TAGLINE,
  FEATURE_HIGHLIGHTS,
  LOOPTOS_METADATA,
  TARGET_USERS,
  USE_CASES,
};

// Re-export tool descriptions
export {
  ALL_TOOL_DESCRIPTIONS,
  getAllToolIds,
  getToolCount,
  getToolDescription,
  getToolsByCategory,
  getToolsByPriority,
  TOOL_CCPA_OPT_OUT,
  TOOL_CHECK_ENTITLEMENT,
  TOOL_CREATE_CHECKOUT_SESSION,
  TOOL_CREATE_CUSTOMER_PORTAL,
  TOOL_DELIVERY_GET_MENU,
  TOOL_DELIVERY_PLACE_ORDER,
  TOOL_DELIVERY_SEARCH_RESTAURANTS,
  TOOL_FOOD_SEARCH,
  TOOL_GDPR_DELETE,
  TOOL_GDPR_EXPORT,
  TOOL_HEALTH,
  TOOL_LOOP_ADJUST_CALORIES,
  TOOL_LOOP_EVALUATE_PLAN,
  TOOL_LOOP_PREDICT_OUTCOME,
  TOOL_LOOPGPT_CANCEL_ORDER,
  TOOL_LOOPGPT_CONFIRM_ORDER,
  TOOL_LOOPGPT_RECORD_OUTCOME,
  TOOL_LOOPGPT_ROUTE_ORDER,
  TOOL_NUTRITION_ANALYZE_FOOD,
  TOOL_NUTRITION_COMPARE_FOODS,
  TOOL_NUTRITION_GET_MACROS,
  TOOL_NUTRITION_GET_RECOMMENDATIONS,
  TOOL_PLAN_CREATE_MEAL_PLAN,
  TOOL_PLAN_GENERATE_FROM_LEFTOVERS,
  TOOL_PLAN_GET_ACTIVE_PLAN,
  TOOL_PLAN_RANDOM_MEAL,
  TOOL_SUMMARY,
  TOOL_SYS_GET_HELP,
  TOOL_SYS_HEALTHCHECK,
  TOOL_TRACKER_GET_PROGRESS,
  TOOL_TRACKER_LOG_MEAL,
  TOOL_TRACKER_LOG_WEIGHT,
  TOOL_TRACKER_QUICK_ADD_CALORIES,
  TOOL_TRACKER_SUMMARY,
  TOOL_UPGRADE_TO_PREMIUM,
  TOOL_USER_GET_PROFILE,
  TOOL_USER_SET_WEIGHT_GOAL,
  TOOL_USER_UPDATE_DIET_PREFERENCES,
};

// Re-export routing hints
export { ROUTING_METADATA };

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get complete metadata package for MCP server
 */
export function getCompleteMetadata() {
  return {
    app: LOOPTOS_METADATA,
    tools: ALL_TOOL_DESCRIPTIONS,
    routing: ROUTING_METADATA,
    summary: {
      toolCount: getToolCount(),
      categories: Object.keys(TOOL_SUMMARY.categories),
      lastUpdated: TOOL_SUMMARY.lastUpdated,
    },
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
    routingHints,
  };
}

/**
 * Search tools by keyword
 */
export function searchTools(keyword: string): ToolDescription[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(ALL_TOOL_DESCRIPTIONS).filter((tool) =>
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
          reason: `Matched trigger hint: ${hintKey}`,
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
      reason: "Keyword match",
    };
  }

  return null;
}

/**
 * Validate tool invocation
 */
export function validateToolInvocation(
  toolId: string,
  params: Record<string, any>,
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
    errors,
  };
}

// ============================================================================
// METADATA CONSTANTS FOR QUICK ACCESS
// ============================================================================

export const METADATA_VERSION = "2.1.0";
export const METADATA_LAST_UPDATED = "2025-12-21";
export const TOTAL_TOOLS = getToolCount();

// Export for MCP server manifest
export const MCP_SERVER_INFO = {
  name: "looptos",
  version: METADATA_VERSION,
  description: LOOPTOS_METADATA.shortDescription,
  tools: getAllToolIds(),
  capabilities: [
    "recipe_generation",
    "nutrition_analysis",
    "meal_planning",
    "food_tracking",
    "grocery_ordering",
    "ai_predictions",
  ],
};
