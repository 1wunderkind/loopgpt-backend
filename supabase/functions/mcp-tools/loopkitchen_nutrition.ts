/**
 * LoopKitchen Nutrition Analysis Tool
 * 
 * Standalone nutrition analysis using NutritionGPT from shared module.
 * Returns NutritionSummary widget for UI-ready data.
 * 
 * Features:
 * - Recipe-based analysis (from recipe objects)
 * - Ingredient-based analysis (from raw ingredient lists)
 * - Meal logging with daily/weekly aggregation
 * - Confidence indicators for estimates
 * - Health insights and warnings
 * 
 * Phase 3 of LoopKitchen Integration
 */

import { callModel } from "../_shared/loopkitchen/callModel.ts";
import { NUTRITIONGPT_SYSTEM, NUTRITIONGPT_USER } from "../_shared/loopkitchen/prompts.ts";
import { getCached } from "../_shared/loopkitchen/cache.ts";
import { logMealLog } from "../_shared/analytics/index.ts";
import type {
  NutritionSummary,
  InfoMessage,
  RecipeCardDetailed,
} from "../_shared/loopkitchen/types/index.ts";

// ============================================================================
// Types
// ============================================================================

interface NutritionInput {
  // Option 1: Analyze from recipe objects
  recipes?: RecipeCardDetailed[];
  
  // Option 2: Analyze from raw ingredients
  ingredients?: Array<{
    name: string;
    quantity?: string;
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
  tags: string[]; // e.g., ["high-protein", "low-carb", "heart-healthy"]
  warnings: string[]; // e.g., ["High sodium content"]
  confidence: "high" | "medium" | "low"; // Estimation confidence
  insights: string[]; // Health insights and tips
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
// GPT Response Schema
// ============================================================================

const nutritionAnalysisSchema = {
  type: "object",
  properties: {
    perServing: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" },
        sugar: { type: "number" },
        sodium: { type: "number" },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
      additionalProperties: false,
    },
    total: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" },
        sugar: { type: "number" },
        sodium: { type: "number" },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
      additionalProperties: false,
    },
    servings: { type: "number" },
    healthScore: { type: "number", minimum: 0, maximum: 100 },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    insights: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "perServing",
    "total",
    "servings",
    "healthScore",
    "tags",
    "warnings",
    "confidence",
    "insights",
  ],
  additionalProperties: false,
};

// ============================================================================
// Main Function
// ============================================================================

export async function analyzeNutrition(params: any): Promise<NutritionSummary | InfoMessage> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.nutrition] Starting analysis...", {
      hasRecipes: !!params.recipes,
      hasIngredients: !!params.ingredients,
      recipeCount: params.recipes?.length,
      ingredientCount: params.ingredients?.length,
    });

    // Validate input
    const input = validateNutritionInput(params);

    // Build user message based on input type
    let userMessage: string;
    let sourceName: string;

    if (input.recipes && input.recipes.length > 0) {
      // Recipe-based analysis
      const recipe = input.recipes[0]; // For now, analyze first recipe
      sourceName = recipe.title;
      
      const ingredientsList = recipe.ingredients
        .map((ing) => `- ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}`.trim())
        .join("\n");

      userMessage = `Analyze the nutritional content of this recipe:

Recipe: ${recipe.title}
Servings: ${recipe.servings}
Prep Time: ${recipe.prepTime} min
Cook Time: ${recipe.cookTime} min

Ingredients:
${ingredientsList}

Instructions:
${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")}`;
    } else if (input.ingredients && input.ingredients.length > 0) {
      // Ingredient-based analysis
      sourceName = "Custom Ingredients";
      
      const ingredientsList = input.ingredients
        .map((ing) => `- ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}`.trim())
        .join("\n");

      userMessage = `Analyze the nutritional content of these ingredients:

Servings: ${input.servings}

Ingredients:
${ingredientsList}`;
    } else {
      throw new Error("No valid input provided");
    }

    // Get NutritionGPT prompt
    const system = NUTRITIONGPT_SYSTEM;
    const fullUserMessage = userMessage;

    console.log("[loopkitchen.nutrition] Calling NutritionGPT...");

    // Call GPT with caching
    const { value: result, cached } = await getCached(
      "nutrition.analyze",
      { userMessage }, // Cache by user message content
      () => callModel<NutritionAnalysisResult>(
        NUTRITIONGPT_SYSTEM,
        userMessage,
        {
          temperature: 0.3,
          maxTokens: 1000,
        }
      ),
      86400000 // 24 hour TTL for nutrition data
    );

    if (cached) {
      console.log("[loopkitchen.nutrition] Cache HIT");
    }

    const duration = Date.now() - startTime;
    console.log("[loopkitchen.nutrition] Analysis complete", {
      duration,
      healthScore: result.healthScore,
      confidence: result.confidence,
      tagCount: result.tags.length,
    });

    // Build NutritionSummary widget
    const widget: NutritionSummary = {
      type: "NutritionSummary",
      data: {
        totalNutrition: result.total,
        perServing: result.perServing,
        servings: result.servings,
        healthScore: result.healthScore,
        tags: result.tags,
        warnings: result.warnings,
        insights: result.insights,
        confidence: result.confidence,
        source: sourceName,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
        model: "gpt-4o-mini",
      },
    };

    return widget;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[loopkitchen.nutrition] Error:", error.message);

    // Return InfoMessage widget for errors
    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Nutrition Analysis Error",
        message: `Unable to analyze nutrition: ${error.message}`,
        severity: "error",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return errorWidget;
  }
}

// ============================================================================
// Meal Logging Support
// ============================================================================

/**
 * Log a meal with nutrition data for daily/weekly tracking
 * 
 * Database Integration: Ready for Phase 4
 * Schema: /database/schemas/loopkitchen_meal_logs.sql
 * 
 * @param params - Meal logging parameters
 * @param params.userId - User ID
 * @param params.mealType - breakfast | lunch | dinner | snack
 * @param params.mealDate - ISO date string (defaults to today)
 * @param params.recipeId - Optional recipe ID
 * @param params.recipeTitle - Recipe/meal name
 * @param params.nutrition - Nutrition data (per serving)
 * @param params.servings - Number of servings consumed
 * @param params.healthScore - Health score (0-100)
 * @param params.tags - Diet/health tags
 */
export async function logMeal(params: any): Promise<InfoMessage> {
  const startTime = Date.now();
  
  try {
    console.log("[loopkitchen.nutrition] Meal logging requested", {
      mealType: params.mealType,
      date: params.mealDate,
      userId: params.userId,
    });

    // Validate required fields
    if (!params.userId) {
      throw new Error("userId is required");
    }
    if (!params.mealType) {
      throw new Error("mealType is required (breakfast/lunch/dinner/snack)");
    }
    if (!params.recipeTitle) {
      throw new Error("recipeTitle is required");
    }
    if (!params.nutrition) {
      throw new Error("nutrition data is required");
    }

    // TODO: Phase 4 - Database Integration
    // Uncomment when database is set up:
    /*
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Database not configured");
    }
    
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("loopkitchen_meal_logs")
      .insert({
        user_id: params.userId,
        meal_type: params.mealType,
        meal_date: params.mealDate || new Date().toISOString().split('T')[0],
        recipe_id: params.recipeId,
        recipe_title: params.recipeTitle,
        calories: params.nutrition.calories,
        protein: params.nutrition.protein,
        carbs: params.nutrition.carbs,
        fat: params.nutrition.fat,
        fiber: params.nutrition.fiber,
        sugar: params.nutrition.sugar,
        sodium: params.nutrition.sodium,
        servings: params.servings || 1.0,
        health_score: params.healthScore,
        tags: params.tags || [],
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    // Refresh materialized view for daily summaries
    await supabase.rpc("refresh_loopkitchen_daily_nutrition");
    
    const duration = Date.now() - startTime;
    console.log("[loopkitchen.nutrition] Meal logged successfully", {
      mealId: data.id,
      duration,
    });
    
    const widget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Logged",
        message: `${params.recipeTitle} logged as ${params.mealType}. Total: ${params.nutrition.calories * (params.servings || 1)} calories.`,
        severity: "success",
        actionable: true,
        actionText: "View Daily Summary",
        actionData: {
          userId: params.userId,
          date: params.mealDate || new Date().toISOString().split('T')[0],
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };
    
    return widget;
    */
    
    // Log to analytics (Phase 1)
    logMealLog({
      userId: params.userId,
      sessionId: params.sessionId || null,
      sourceGpt: 'KCalGPT',
      loggedAt: params.mealDate || new Date().toISOString(),
      mealType: params.mealType,
      description: params.recipeTitle,
      caloriesKcal: params.nutrition.calories * (params.servings || 1),
      proteinG: params.nutrition.protein * (params.servings || 1),
      carbsG: params.nutrition.carbs * (params.servings || 1),
      fatG: params.nutrition.fat * (params.servings || 1),
      fiberG: params.nutrition.fiber * (params.servings || 1),
      rawPayload: params,
    }).catch(err => console.error('[Analytics] Failed to log meal:', err));

    // Placeholder response for Phase 3
    const duration = Date.now() - startTime;
    const widget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Logging Ready",
        message: `Meal logging is ready for database integration in Phase 4. Schema created at /database/schemas/loopkitchen_meal_logs.sql. Would log: ${params.recipeTitle} (${params.mealType}, ${params.nutrition.calories} cal).`,
        severity: "info",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return widget;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Logging Error",
        message: `Unable to log meal: ${error.message}`,
        severity: "error",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return errorWidget;
  }
}

/**
 * Get daily nutrition summary for a user
 * 
 * Aggregates all meals logged for a specific date.
 * Database Integration: Ready for Phase 4
 * Schema: /database/schemas/loopkitchen_meal_logs.sql
 * 
 * @param params - Daily summary parameters
 * @param params.userId - User ID
 * @param params.date - ISO date string (defaults to today)
 */
export async function getDailyNutrition(params: any): Promise<NutritionSummary | InfoMessage> {
  const startTime = Date.now();
  
  try {
    console.log("[loopkitchen.nutrition] Daily summary requested", {
      date: params.date,
      userId: params.userId,
    });

    // Validate required fields
    if (!params.userId) {
      throw new Error("userId is required");
    }

    const targetDate = params.date || new Date().toISOString().split('T')[0];

    // TODO: Phase 4 - Database Integration
    // Uncomment when database is set up:
    /*
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Database not configured");
    }
    
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query daily summary from materialized view
    const { data: dailySummary, error: summaryError } = await supabase
      .from("loopkitchen_daily_nutrition")
      .select("*")
      .eq("user_id", params.userId)
      .eq("meal_date", targetDate)
      .single();
    
    if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = no rows
      throw new Error(`Database error: ${summaryError.message}`);
    }
    
    // Get user targets for comparison
    const { data: userPrefs, error: prefsError } = await supabase
      .from("loopkitchen_user_nutrition_prefs")
      .select("*")
      .eq("user_id", params.userId)
      .single();
    
    if (prefsError && prefsError.code !== 'PGRST116') {
      console.warn("[loopkitchen.nutrition] No user preferences found");
    }
    
    // If no meals logged today, return empty summary
    if (!dailySummary) {
      const emptyWidget: InfoMessage = {
        type: "InfoMessage",
        data: {
          title: "No Meals Logged",
          message: `No meals logged for ${targetDate}. Start logging to track your nutrition!`,
          severity: "info",
          actionable: true,
          actionText: "Log a Meal",
        },
        meta: {
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };
      return emptyWidget;
    }
    
    // Build nutrition summary widget
    const totalNutrition: NutritionMacros = {
      calories: dailySummary.total_calories,
      protein: dailySummary.total_protein,
      carbs: dailySummary.total_carbs,
      fat: dailySummary.total_fat,
      fiber: dailySummary.total_fiber,
      sugar: dailySummary.total_sugar,
      sodium: dailySummary.total_sodium,
    };
    
    // Calculate per-meal average
    const perServing: NutritionMacros = {
      calories: dailySummary.total_calories / dailySummary.meal_count,
      protein: dailySummary.total_protein / dailySummary.meal_count,
      carbs: dailySummary.total_carbs / dailySummary.meal_count,
      fat: dailySummary.total_fat / dailySummary.meal_count,
      fiber: dailySummary.total_fiber / dailySummary.meal_count,
      sugar: dailySummary.total_sugar / dailySummary.meal_count,
      sodium: dailySummary.total_sodium / dailySummary.meal_count,
    };
    
    // Generate insights based on targets
    const insights: string[] = [];
    const warnings: string[] = [];
    
    if (userPrefs) {
      if (totalNutrition.calories < userPrefs.target_calories * 0.8) {
        insights.push(`You're ${Math.round(userPrefs.target_calories - totalNutrition.calories)} calories below your target.`);
      } else if (totalNutrition.calories > userPrefs.target_calories * 1.2) {
        warnings.push(`You've exceeded your calorie target by ${Math.round(totalNutrition.calories - userPrefs.target_calories)} calories.`);
      } else {
        insights.push("You're on track with your calorie target!");
      }
      
      if (totalNutrition.protein < userPrefs.target_protein * 0.8) {
        insights.push(`Consider adding ${Math.round(userPrefs.target_protein - totalNutrition.protein)}g more protein.`);
      }
      
      if (totalNutrition.fiber < 25) {
        insights.push("Try to include more fiber-rich foods like vegetables and whole grains.");
      }
    }
    
    // Add meal distribution insights
    if (dailySummary.breakfast_count === 0) {
      insights.push("Don't skip breakfast! It helps maintain energy levels throughout the day.");
    }
    
    const widget: NutritionSummary = {
      type: "NutritionSummary",
      data: {
        totalNutrition,
        perServing,
        servings: dailySummary.meal_count,
        healthScore: Math.round(dailySummary.avg_health_score || 70),
        tags: dailySummary.all_tags || [],
        warnings,
        insights,
        confidence: "high",
        source: `${dailySummary.meal_count} meals on ${targetDate}`,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        model: "database-aggregation",
      },
    };
    
    return widget;
    */

    // Placeholder response for Phase 3
    const duration = Date.now() - startTime;
    const widget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Daily Nutrition Ready",
        message: `Daily nutrition tracking is ready for database integration in Phase 4. Schema created at /database/schemas/loopkitchen_meal_logs.sql. Would query meals for: ${targetDate}`,
        severity: "info",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return widget;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Daily Nutrition Error",
        message: `Unable to get daily nutrition: ${error.message}`,
        severity: "error",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return errorWidget;
  }
}
