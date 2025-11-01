/**
 * MCP Wrappers for External GPT Integration
 * Provides typed interfaces to call K-Cal GPT, LeftoverGPT, and NutritionGPT
 */

import { config } from "../config/index.ts";
import type {
  KCalGoals,
  LeftoverRecipeRequest,
  LeftoverRecipeResponse,
  NutritionAnalysisRequest,
  NutritionAnalysisResponse,
  MCPResponse,
} from "./types.ts";

/**
 * Generic MCP call wrapper
 */
async function callMCP<T>(
  endpoint: string,
  method: string,
  params?: Record<string, unknown>
): Promise<MCPResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: params || {},
        id: crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: {
          code: data.error.code || "MCP_ERROR",
          message: data.error.message || "MCP call failed",
        },
      };
    }

    return {
      success: true,
      data: data.result,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Failed to call MCP endpoint",
      },
    };
  }
}

// ============================================================================
// K-CAL GPT WRAPPERS
// ============================================================================

/**
 * Get user's calorie and macro goals from K-Cal GPT
 */
export async function getKCalGoals(chatgptUserId: string): Promise<KCalGoals | null> {
  const response = await callMCP<KCalGoals>(
    config.externalGPTs.kcalEndpoint,
    "tools/call",
    {
      name: "get_user_goals",
      arguments: {
        chatgpt_user_id: chatgptUserId,
      },
    }
  );

  if (!response.success || !response.data) {
    console.warn("Failed to get K-Cal goals:", response.error);
    return null;
  }

  return response.data;
}

/**
 * Log a meal to K-Cal GPT
 */
export async function logMealToKCal(
  chatgptUserId: string,
  foodDescription: string,
  calories?: number,
  macros?: { protein_g?: number; carbs_g?: number; fat_g?: number }
): Promise<boolean> {
  const response = await callMCP(
    config.externalGPTs.kcalEndpoint,
    "tools/call",
    {
      name: "log_food",
      arguments: {
        chatgpt_user_id: chatgptUserId,
        food_description: foodDescription,
        calories,
        ...macros,
      },
    }
  );

  return response.success;
}

/**
 * Get daily summary from K-Cal GPT
 */
export async function getDailySummary(
  chatgptUserId: string,
  date?: string
): Promise<unknown> {
  const response = await callMCP(
    config.externalGPTs.kcalEndpoint,
    "tools/call",
    {
      name: "get_daily_summary",
      arguments: {
        chatgpt_user_id: chatgptUserId,
        date,
      },
    }
  );

  return response.data;
}

// ============================================================================
// LEFTOVER GPT WRAPPERS
// ============================================================================

/**
 * Generate a recipe from LeftoverGPT
 */
export async function getRecipeFromLeftover(
  request: LeftoverRecipeRequest
): Promise<LeftoverRecipeResponse | null> {
  const response = await callMCP<LeftoverRecipeResponse>(
    config.externalGPTs.leftoverEndpoint,
    "tools/call",
    {
      name: "generate_recipe",
      arguments: {
        chatgpt_user_id: request.chatgpt_user_id,
        ingredients: request.ingredients || [],
        vibe: request.vibe,
        diet: request.diet,
        chef_persona: request.chef_persona || "Gordon",
      },
    }
  );

  if (!response.success || !response.data) {
    console.warn("Failed to get recipe from LeftoverGPT:", response.error);
    return null;
  }

  return response.data;
}

/**
 * Get multiple recipes from LeftoverGPT
 */
export async function getRecipesFromLeftover(
  chatgptUserId: string,
  count: number,
  vibe?: string,
  diet?: string
): Promise<LeftoverRecipeResponse[]> {
  const recipes: LeftoverRecipeResponse[] = [];

  for (let i = 0; i < count; i++) {
    const recipe = await getRecipeFromLeftover({
      chatgpt_user_id: chatgptUserId,
      vibe,
      diet,
    });

    if (recipe) {
      recipes.push(recipe);
    }
  }

  return recipes;
}

// ============================================================================
// NUTRITION GPT WRAPPERS
// ============================================================================

/**
 * Analyze nutrition for a recipe using NutritionGPT
 */
export async function getMacrosFromNutrition(
  request: NutritionAnalysisRequest
): Promise<NutritionAnalysisResponse | null> {
  const response = await callMCP<NutritionAnalysisResponse>(
    config.externalGPTs.nutritionEndpoint,
    "tools/call",
    {
      name: "analyze_nutrition",
      arguments: {
        recipeName: request.recipe_name,
        servings: request.servings || 1,
        ingredients: request.ingredients,
      },
    }
  );

  if (!response.success || !response.data) {
    console.warn("Failed to get nutrition analysis:", response.error);
    return null;
  }

  return response.data;
}

/**
 * Analyze nutrition for multiple recipes
 */
export async function analyzeBatchNutrition(
  recipes: NutritionAnalysisRequest[]
): Promise<(NutritionAnalysisResponse | null)[]> {
  const results = await Promise.all(
    recipes.map((recipe) => getMacrosFromNutrition(recipe))
  );

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if all external GPT endpoints are reachable
 */
export async function healthCheckExternalGPTs(): Promise<{
  kcal: boolean;
  leftover: boolean;
  nutrition: boolean;
}> {
  const checks = await Promise.all([
    fetch(config.externalGPTs.kcalEndpoint, { method: "HEAD" })
      .then(() => true)
      .catch(() => false),
    fetch(config.externalGPTs.leftoverEndpoint, { method: "HEAD" })
      .then(() => true)
      .catch(() => false),
    fetch(config.externalGPTs.nutritionEndpoint, { method: "HEAD" })
      .then(() => true)
      .catch(() => false),
  ]);

  return {
    kcal: checks[0],
    leftover: checks[1],
    nutrition: checks[2],
  };
}

