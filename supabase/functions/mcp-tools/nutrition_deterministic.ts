/**
 * Deterministic Nutrition Analysis Tool (MCP)
 * 
 * Replaces LLM-based nutrition analysis with deterministic rule-based engine.
 * 
 * Features:
 * - Deterministic macro calculation (same input → same output)
 * - Rule-based diet tagging
 * - No LLM calls in calculation path
 * - Integrates with analytics.meal_logs
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import { estimateRecipeNutrition, type RecipeNutritionInput } from "../_shared/nutrition/index.ts";
import { logMealLog } from "../_shared/analytics/index.ts";
import type { RecipeCardDetailed } from "../_shared/loopkitchen/types/index.ts";

// ============================================================================
// Types
// ============================================================================

interface NutritionInput {
  // Option 1: Analyze from recipe objects
  recipes?: RecipeCardDetailed[];
  
  // Option 2: Analyze from raw ingredients
  ingredients?: Array<{
    name: string;
    quantity?: string | number;
    unit?: string;
  }>;
  
  // Optional: Servings count (defaults to 1)
  servings?: number;
  
  // Optional: Meal context for logging
  mealContext?: {
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    date?: string; // ISO date string
    userId?: string; // For meal logging
  };
}

interface NutritionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface NutritionAnalysisResult {
  perServing: NutritionMacros;
  total: NutritionMacros;
  servings: number;
  healthScore: number; // 0-100
  tags: string[]; // Diet tags
  warnings: string[]; // Health warnings
  confidence: "high" | "medium" | "low";
  insights: string[]; // Health insights
}

// ============================================================================
// Validation
// ============================================================================

function validateNutritionInput(params: any): NutritionInput {
  // Must have either recipes or ingredients
  if (!params.recipes && !params.ingredients) {
    throw new Error("Either 'recipes' or 'ingredients' must be provided");
  }

  // Validate recipes if provided
  if (params.recipes) {
    if (!Array.isArray(params.recipes) || params.recipes.length === 0) {
      throw new Error("'recipes' must be a non-empty array");
    }
  }

  // Validate ingredients if provided
  if (params.ingredients) {
    if (!Array.isArray(params.ingredients) || params.ingredients.length === 0) {
      throw new Error("'ingredients' must be a non-empty array");
    }
  }

  return {
    recipes: params.recipes,
    ingredients: params.ingredients,
    servings: params.servings || 1,
    mealContext: params.mealContext,
  };
}

// ============================================================================
// Health Score Calculation
// ============================================================================

/**
 * Calculate health score based on macros and diet tags
 * 
 * Scoring factors:
 * - High protein: +10
 * - High fiber: +10
 * - Low sodium: +10
 * - Low sugar: +10
 * - Vegan/vegetarian: +10
 * - High fat: -5
 * - High carbs: -5
 * 
 * Base score: 50
 * Range: 0-100
 */
function calculateHealthScore(macros: NutritionMacros, tags: string[]): number {
  let score = 50; // Base score
  
  // Positive factors
  if (macros.protein >= 20) score += 10;
  if (macros.fiber >= 5) score += 10;
  if (macros.sodium < 200) score += 10;
  if (macros.sugar < 5) score += 10;
  if (tags.includes("vegan") || tags.includes("vegetarian")) score += 10;
  
  // Negative factors
  if (macros.fat > 30) score -= 5;
  if (macros.carbs > 60) score -= 5;
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Health Warnings & Insights
// ============================================================================

/**
 * Generate health warnings based on macros
 */
function generateWarnings(macros: NutritionMacros): string[] {
  const warnings: string[] = [];
  
  if (macros.sodium > 500) {
    warnings.push("High sodium content - may not be suitable for those watching salt intake");
  }
  
  if (macros.sugar > 20) {
    warnings.push("High sugar content - consider reducing added sugars");
  }
  
  if (macros.fat > 40) {
    warnings.push("High fat content - ensure it's from healthy sources");
  }
  
  if (macros.calories > 800) {
    warnings.push("High calorie content - consider portion size");
  }
  
  return warnings;
}

/**
 * Generate health insights based on macros and tags
 */
function generateInsights(macros: NutritionMacros, tags: string[]): string[] {
  const insights: string[] = [];
  
  if (macros.protein >= 20) {
    insights.push("Good protein source - helps with muscle maintenance and satiety");
  }
  
  if (macros.fiber >= 5) {
    insights.push("High fiber content - supports digestive health");
  }
  
  if (tags.includes("vegan")) {
    insights.push("Plant-based meal - rich in phytonutrients and antioxidants");
  }
  
  if (tags.includes("low_carb")) {
    insights.push("Low carb option - may help with blood sugar management");
  }
  
  if (tags.includes("keto_friendly")) {
    insights.push("Keto-friendly - high fat, very low carb");
  }
  
  if (macros.sodium < 200) {
    insights.push("Low sodium - heart-healthy choice");
  }
  
  return insights;
}

// ============================================================================
// Main Function
// ============================================================================

export async function analyzeNutrition(params: any): Promise<NutritionAnalysisResult> {
  const startTime = Date.now();

  try {
    console.log("[nutrition_deterministic] Starting analysis...", {
      hasRecipes: !!params.recipes,
      hasIngredients: !!params.ingredients,
      recipeCount: params.recipes?.length,
      ingredientCount: params.ingredients?.length,
    });

    // Validate input
    const input = validateNutritionInput(params);

    // Build RecipeNutritionInput for engine
    let recipeInput: RecipeNutritionInput;
    let recipeName: string;

    if (input.recipes && input.recipes.length > 0) {
      // Recipe-based analysis
      const recipe = input.recipes[0]; // For now, analyze first recipe
      recipeName = recipe.title;
      
      recipeInput = {
        recipeId: recipe.id,
        recipeName: recipe.title,
        servings: recipe.servings || input.servings || 1,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name,
          quantity: parseFloat(String(ing.quantity || 1)),
          unit: ing.unit || "piece",
        })),
      };
    } else if (input.ingredients && input.ingredients.length > 0) {
      // Ingredient-based analysis
      recipeName = "Custom Ingredients";
      
      recipeInput = {
        recipeName,
        servings: input.servings || 1,
        ingredients: input.ingredients.map(ing => ({
          name: ing.name,
          quantity: parseFloat(String(ing.quantity || 1)),
          unit: ing.unit || "piece",
        })),
      };
    } else {
      throw new Error("No valid input provided");
    }

    console.log("[nutrition_deterministic] Calling deterministic engine...");

    // Call deterministic engine
    const result = estimateRecipeNutrition(recipeInput);

    console.log("[nutrition_deterministic] Engine result:", {
      calories: result.perServing.calories,
      confidence: result.confidence,
      tags: result.dietTags.length,
    });

    // Convert to MCP response format
    const perServing: NutritionMacros = {
      calories: result.perServing.calories,
      protein: result.perServing.protein_g,
      carbs: result.perServing.carbs_g,
      fat: result.perServing.fat_g,
      fiber: result.perServing.fiber_g || 0,
      sugar: result.perServing.sugar_g || 0,
      sodium: result.perServing.sodium_mg || 0,
    };

    const total: NutritionMacros = {
      calories: result.total.calories,
      protein: result.total.protein_g,
      carbs: result.total.carbs_g,
      fat: result.total.fat_g,
      fiber: result.total.fiber_g || 0,
      sugar: result.total.sugar_g || 0,
      sodium: result.total.sodium_mg || 0,
    };

    // Calculate health score
    const healthScore = calculateHealthScore(perServing, result.dietTags);

    // Generate warnings and insights
    const warnings = generateWarnings(perServing);
    const insights = generateInsights(perServing, result.dietTags);

    // Log meal if context provided
    if (input.mealContext?.userId) {
      try {
        await logMealLog({
          userId: input.mealContext.userId,
          mealType: input.mealContext.mealType || "snack",
          date: input.mealContext.date || new Date().toISOString().split('T')[0],
          recipeName,
          calories: perServing.calories,
          protein_g: perServing.protein,
          carbs_g: perServing.carbs,
          fat_g: perServing.fat,
        });
        console.log("[nutrition_deterministic] Meal logged successfully");
      } catch (error) {
        console.error("[nutrition_deterministic] Failed to log meal:", error);
        // Don't throw - meal logging is non-critical
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[nutrition_deterministic] Analysis complete in ${duration}ms`);

    return {
      perServing,
      total,
      servings: result.servings,
      healthScore,
      tags: result.dietTags,
      warnings,
      confidence: result.confidence,
      insights,
    };

  } catch (error) {
    console.error("[nutrition_deterministic] Error:", error);
    throw error;
  }
}
