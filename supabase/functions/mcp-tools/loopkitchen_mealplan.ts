/**
 * LoopKitchen Meal Planner Tool
 * 
 * Weekly meal plan generation using MealPlannerGPT from shared module.
 * Returns WeekPlanner widget for UI-ready meal planning.
 * 
 * Features:
 * - 7-day meal plan generation (configurable)
 * - Breakfast, lunch, dinner for each day
 * - Calorie target support
 * - Diet style preferences
 * - Ingredient reuse optimization
 * - Weekly summary with aggregated grocery list
 * - Commerce layer integration ready
 * 
 * Phase 4 of LoopKitchen Integration
 */

import { callModel } from "../_shared/loopkitchen/callModel.ts";
import { getCached } from "../_shared/loopkitchen/cache.ts";
import { logMealPlanGenerated, logAffiliateClick } from "../_shared/analytics/index.ts";
import { MEALPLANNERGPT_SYSTEM, MEALPLANNERGPT_USER } from "../_shared/loopkitchen/prompts.ts";
import type {
  WeekPlanner,
  GroceryList,
  InfoMessage,
} from "../_shared/loopkitchen/types/index.ts";

// ============================================================================
// Types
// ============================================================================

interface MealPlanInput {
  // Base ingredients user often has
  ingredients?: string[];
  
  // Calorie target per day (null for no target)
  caloriesPerDay?: number | null;
  
  // Diet style notes (e.g., "high-protein", "vegetarian", "budget-friendly")
  dietNotes?: string;
  
  // Number of days to plan (1-14, defaults to 7)
  days?: number;
  
  // Start date (ISO string, defaults to today)
  startDate?: string;
  
  // Include grocery list aggregation
  includeGroceryList?: boolean;
}

interface MealPlannerGPTResponse {
  startDate: string;
  days: Array<{
    date: string;
    dayName: string;
    meals: {
      breakfast: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
      lunch: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
      dinner: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
    };
    dayTotalCalories: number;
  }>;
  weeklySummary: {
    avgDailyCalories: number;
    totalCalories: number;
    notes: string;
  };
}

// ============================================================================
// Validation
// ============================================================================

function validateMealPlanInput(params: any): MealPlanInput {
  // Ingredients default to common pantry items if not provided
  const defaultIngredients = [
    "chicken breast",
    "rice",
    "eggs",
    "olive oil",
    "onions",
    "garlic",
    "salt",
    "pepper",
  ];

  return {
    ingredients: params.ingredients && params.ingredients.length > 0
      ? params.ingredients
      : defaultIngredients,
    caloriesPerDay: params.caloriesPerDay || null,
    dietNotes: params.dietNotes || "balanced, home-cooked meals",
    days: Math.min(Math.max(params.days || 7, 1), 14), // 1-14 days
    startDate: params.startDate || new Date().toISOString().split('T')[0],
    includeGroceryList: params.includeGroceryList !== false, // Default true
  };
}

// ============================================================================
// GPT Response Schema
// ============================================================================

const mealPlannerSchema = {
  type: "object",
  properties: {
    startDate: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          dayName: { type: "string" },
          meals: {
            type: "object",
            properties: {
              breakfast: {
                type: "object",
                properties: {
                  recipeId: { type: "string" },
                  title: { type: "string" },
                  approxCalories: { type: "number" },
                },
                required: ["recipeId", "title", "approxCalories"],
                additionalProperties: false,
              },
              lunch: {
                type: "object",
                properties: {
                  recipeId: { type: "string" },
                  title: { type: "string" },
                  approxCalories: { type: "number" },
                },
                required: ["recipeId", "title", "approxCalories"],
                additionalProperties: false,
              },
              dinner: {
                type: "object",
                properties: {
                  recipeId: { type: "string" },
                  title: { type: "string" },
                  approxCalories: { type: "number" },
                },
                required: ["recipeId", "title", "approxCalories"],
                additionalProperties: false,
              },
            },
            required: ["breakfast", "lunch", "dinner"],
            additionalProperties: false,
          },
          dayTotalCalories: { type: "number" },
        },
        required: ["date", "dayName", "meals", "dayTotalCalories"],
        additionalProperties: false,
      },
    },
    weeklySummary: {
      type: "object",
      properties: {
        avgDailyCalories: { type: "number" },
        totalCalories: { type: "number" },
        notes: { type: "string" },
      },
      required: ["avgDailyCalories", "totalCalories", "notes"],
      additionalProperties: false,
    },
  },
  required: ["startDate", "days", "weeklySummary"],
  additionalProperties: false,
};

// ============================================================================
// Main Function
// ============================================================================

export async function generateMealPlan(params: any): Promise<WeekPlanner | InfoMessage> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.mealplan] Starting meal plan generation...", {
      days: params.days,
      caloriesPerDay: params.caloriesPerDay,
      hasIngredients: !!params.ingredients,
    });

    // Validate input
    const input = validateMealPlanInput(params);

    // Build user message using MealPlannerGPT prompt
    const userMessage = MEALPLANNERGPT_USER(
      input.ingredients!,
      input.caloriesPerDay,
      input.dietNotes!,
      input.days!,
      input.startDate!
    );

    console.log("[loopkitchen.mealplan] Calling MealPlannerGPT...");

    // Call GPT with caching
    const { value: result, cached } = await getCached(
      "mealplan.generate",
      { days, calorieTarget, preferences }, // Cache by key params
      () => callModel<MealPlannerGPTResponse>(
        MEALPLANNERGPT_SYSTEM,
        userMessage,
        {
          temperature: 0.7, // Slightly higher for variety
          maxTokens: 2500,
        }
      ),
      3600000 // 1 hour TTL for meal plans
    );

    if (cached) {
      console.log("[loopkitchen.mealplan] Cache HIT");
    }

    const duration = Date.now() - startTime;
    console.log("[loopkitchen.mealplan] Meal plan generated", {
      duration,
      days: result.days.length,
      avgCalories: result.weeklySummary.avgDailyCalories,
    });

    // Log meal plan generation (analytics)
    logMealPlanGenerated({
      userId: params.userId || null,
      sessionId: params.sessionId || null,
      sourceGpt: 'MealPlannerGPT',
      title: `${input.days}-day ${input.dietNotes} plan`,
      description: `Meal plan for ${input.days} days starting ${input.startDate}`,
      daysPlanned: input.days!,
      vibe: input.dietNotes,
      targetCaloriesPerDay: input.caloriesPerDay,
      metadata: {
        avgDailyCalories: result.weeklySummary.avgDailyCalories,
        totalCalories: result.weeklySummary.totalCalories,
      },
    }).catch(err => console.error('[Analytics] Failed to log meal plan:', err));
    
    // Build WeekPlanner widget
    const widget: WeekPlanner = {
      type: "WeekPlanner",
      data: {
        startDate: result.startDate,
        days: result.days.map((day) => ({
          date: day.date,
          dayName: day.dayName,
          meals: {
            breakfast: {
              recipeId: day.meals.breakfast.recipeId,
              title: day.meals.breakfast.title,
              approxCalories: day.meals.breakfast.approxCalories,
            },
            lunch: {
              recipeId: day.meals.lunch.recipeId,
              title: day.meals.lunch.title,
              approxCalories: day.meals.lunch.approxCalories,
            },
            dinner: {
              recipeId: day.meals.dinner.recipeId,
              title: day.meals.dinner.title,
              approxCalories: day.meals.dinner.approxCalories,
            },
          },
          dayTotalCalories: day.dayTotalCalories,
        })),
        weeklySummary: {
          avgDailyCalories: result.weeklySummary.avgDailyCalories,
          totalCalories: result.weeklySummary.totalCalories,
          notes: result.weeklySummary.notes,
        },
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
    console.error("[loopkitchen.mealplan] Error:", error.message);

    // Return InfoMessage widget for errors
    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Plan Generation Error",
        message: `Unable to generate meal plan: ${error.message}`,
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
// Grocery List Aggregation
// ============================================================================

/**
 * Generate aggregated grocery list from meal plan
 * 
 * This extracts all unique recipes from the meal plan, fetches their
 * ingredient details, and generates a consolidated grocery list.
 * 
 * Features:
 * - Aggregates ingredients from all recipes in the plan
 * - Combines duplicate ingredients with quantity summation
 * - Organizes into standard grocery categories
 * - Ready for commerce layer integration
 */
export async function generateGroceryListFromPlan(
  mealPlan: WeekPlanner,
  pantryIngredients?: string[]
): Promise<GroceryList | InfoMessage> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.mealplan] Generating grocery list from plan...");

    // Extract all recipes from meal plan (with count for duplicates)
    const recipeCount = new Map<string, number>();

    mealPlan.data.days.forEach((day) => {
      const meals = [day.meals.breakfast, day.meals.lunch, day.meals.dinner];
      meals.forEach((meal) => {
        const count = recipeCount.get(meal.title) || 0;
        recipeCount.set(meal.title, count + 1);
      });
    });

    console.log("[loopkitchen.mealplan] Recipes in plan:", {
      unique: recipeCount.size,
      total: Array.from(recipeCount.values()).reduce((a, b) => a + b, 0),
    });

    // For Phase 4: Use GroceryGPT to generate organized list
    // In a full implementation, we would:
    // 1. Fetch recipe details for each unique recipe
    // 2. Extract ingredients and multiply by recipe count
    // 3. Aggregate duplicate ingredients
    // 4. Use GroceryGPT to organize into categories

    // For now, use GroceryGPT with estimated ingredients based on recipe titles
    const estimatedIngredients = estimateIngredientsFromRecipes(
      Array.from(recipeCount.entries())
    );

    // Call GroceryGPT to organize ingredients
    const { GROCERYGPT_SYSTEM, GROCERYGPT_USER } = await import(
      "../_shared/loopkitchen/prompts.ts"
    );

    const grocerySchema = {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "string" },
                    checked: { type: "boolean" },
                  },
                  required: ["name", "quantity", "checked"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "items"],
            additionalProperties: false,
          },
        },
      },
      required: ["categories"],
      additionalProperties: false,
    };

    const groceryResult = await callModel<{ categories: GroceryList["data"]["categories"] }>(
      GROCERYGPT_SYSTEM,
      GROCERYGPT_USER(estimatedIngredients),
      {
        temperature: 0.3,
        maxTokens: 1500,
      }
    );

    // Filter out pantry ingredients if provided
    let categories = groceryResult.categories;
    if (pantryIngredients && pantryIngredients.length > 0) {
      const pantrySet = new Set(pantryIngredients.map((i) => i.toLowerCase()));
      categories = categories.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) => !pantrySet.has(item.name.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0);
    }

    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const duration = Date.now() - startTime;

    console.log("[loopkitchen.mealplan] Grocery list generated", {
      duration,
      categories: categories.length,
      totalItems,
    });

    const widget: GroceryList = {
      type: "GroceryList",
      data: {
        categories,
        totalItems,
        estimatedCost: null, // TODO: Add cost estimation from commerce layer
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
    console.error("[loopkitchen.mealplan] Grocery list error:", error.message);

    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Grocery List Generation Error",
        message: `Unable to generate grocery list: ${error.message}`,
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
 * Estimate ingredients from recipe titles
 * 
 * This is a helper function that generates reasonable ingredient estimates
 * based on recipe titles. In a full implementation, this would be replaced
 * by fetching actual recipe details.
 */
function estimateIngredientsFromRecipes(
  recipes: Array<[string, number]>
): Array<{ name: string; quantity: string }> {
  const ingredients: Array<{ name: string; quantity: string }> = [];

  // Common base ingredients for most recipes
  ingredients.push(
    { name: "olive oil", quantity: "1 bottle" },
    { name: "salt", quantity: "1 container" },
    { name: "black pepper", quantity: "1 container" },
    { name: "garlic", quantity: "2 heads" },
    { name: "onions", quantity: "3-4 medium" }
  );

  // Analyze recipe titles for common ingredients
  recipes.forEach(([title, count]) => {
    const titleLower = title.toLowerCase();

    // Proteins
    if (titleLower.includes("chicken")) {
      ingredients.push({ name: "chicken breast", quantity: `${count * 2} lbs` });
    }
    if (titleLower.includes("beef")) {
      ingredients.push({ name: "beef", quantity: `${count * 1.5} lbs` });
    }
    if (titleLower.includes("fish") || titleLower.includes("salmon")) {
      ingredients.push({ name: "fish fillets", quantity: `${count * 1} lb` });
    }
    if (titleLower.includes("egg")) {
      ingredients.push({ name: "eggs", quantity: `${count * 6} eggs` });
    }

    // Grains
    if (titleLower.includes("rice")) {
      ingredients.push({ name: "rice", quantity: `${count * 2} cups` });
    }
    if (titleLower.includes("pasta")) {
      ingredients.push({ name: "pasta", quantity: `${count} lb` });
    }
    if (titleLower.includes("bread") || titleLower.includes("toast")) {
      ingredients.push({ name: "bread", quantity: `${count} loaf` });
    }

    // Vegetables
    if (titleLower.includes("salad") || titleLower.includes("greens")) {
      ingredients.push({ name: "mixed greens", quantity: `${count} bag` });
    }
    if (titleLower.includes("tomato")) {
      ingredients.push({ name: "tomatoes", quantity: `${count * 4} medium` });
    }
    if (titleLower.includes("broccoli")) {
      ingredients.push({ name: "broccoli", quantity: `${count} head` });
    }

    // Dairy
    if (titleLower.includes("cheese")) {
      ingredients.push({ name: "cheese", quantity: `${count * 0.5} lb` });
    }
    if (titleLower.includes("milk") || titleLower.includes("cream")) {
      ingredients.push({ name: "milk", quantity: `${count} quart` });
    }
  });

  return ingredients;
}

// ============================================================================
// Composite Function: Meal Plan + Grocery List
// ============================================================================

/**
 * Generate meal plan with grocery list in one call
 * 
 * Returns both WeekPlanner and GroceryList widgets
 */
export async function generateMealPlanWithGrocery(
  params: any
): Promise<{ mealPlan: WeekPlanner | InfoMessage; groceryList: GroceryList | InfoMessage }> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.mealplan] Generating meal plan with grocery list...");

    // Generate meal plan
    const mealPlan = await generateMealPlan(params);

    // If meal plan generation failed, return error for both
    if (mealPlan.type === "InfoMessage") {
      return {
        mealPlan,
        groceryList: mealPlan,
      };
    }

    // Generate grocery list from meal plan
    const groceryList = await generateGroceryListFromPlan(mealPlan);

    const duration = Date.now() - startTime;
    console.log("[loopkitchen.mealplan] Complete meal plan with grocery list generated", {
      duration,
    });

    return {
      mealPlan,
      groceryList,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[loopkitchen.mealplan] Composite error:", error.message);

    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Plan Generation Error",
        message: `Unable to generate meal plan with grocery list: ${error.message}`,
        severity: "error",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return {
      mealPlan: errorWidget,
      groceryList: errorWidget,
    };
  }
}

// ============================================================================
// Commerce Layer Integration
// ============================================================================

/**
 * Prepare grocery order from meal plan
 * 
 * Integrates with the commerce layer to get provider quotes for
 * the grocery list generated from a meal plan.
 * 
 * This is a convenience function that:
 * 1. Generates grocery list from meal plan
 * 2. Calls commerce.prepareCart with the grocery list
 * 3. Returns provider quotes for user selection
 * 
 * Phase 4: Commerce integration ready
 */
export async function prepareMealPlanOrder(params: any): Promise<any> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.mealplan] Preparing meal plan order...", {
      userId: params.userId,
      hasLocation: !!params.location,
    });

    // Validate required fields
    if (!params.userId) {
      throw new Error("userId is required");
    }
    if (!params.location) {
      throw new Error("location is required for order routing");
    }
    if (!params.mealPlan || params.mealPlan.type !== "WeekPlanner") {
      throw new Error("mealPlan (WeekPlanner widget) is required");
    }

    // Generate grocery list from meal plan
    const groceryList = await generateGroceryListFromPlan(
      params.mealPlan,
      params.pantryIngredients
    );

    // If grocery list generation failed, return error
    if (groceryList.type === "InfoMessage") {
      return groceryList;
    }

    // Call commerce layer to prepare cart
    // Import commerce function dynamically to avoid circular dependencies
    const { prepareCart } = await import("./commerce.ts");

    const commerceResult = await prepareCart({
      userId: params.userId,
      groceryList: groceryList.data,
      location: params.location,
      preferences: params.preferences || {},
    });

    const duration = Date.now() - startTime;
    console.log("[loopkitchen.mealplan] Meal plan order prepared", {
      duration,
      providers: commerceResult.providers?.length || 0,
    });
    
    // Log affiliate event (analytics) - when user selects a provider
    if (commerceResult.providers && commerceResult.providers.length > 0) {
      // Log impression for all providers
      commerceResult.providers.forEach((provider: any) => {
        logAffiliateClick({
          userId: params.userId || null,
          sessionId: params.sessionId || null,
          eventType: 'impression',
          provider: provider.name,
          url: provider.url || null,
        }).catch(err => console.error('[Analytics] Failed to log affiliate impression:', err));
      });
    }

    // Return commerce result with grocery list attached
    return {
      ...commerceResult,
      groceryList,
      mealPlan: params.mealPlan,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[loopkitchen.mealplan] Order preparation error:", error.message);

    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Order Preparation Error",
        message: `Unable to prepare meal plan order: ${error.message}`,
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
 * Complete meal planning flow with commerce integration
 * 
 * This is the ultimate convenience function that:
 * 1. Generates meal plan
 * 2. Generates grocery list
 * 3. Gets provider quotes for grocery delivery
 * 
 * Returns everything needed for a complete meal planning + ordering experience.
 */
export async function generateMealPlanWithCommerce(params: any): Promise<any> {
  const startTime = Date.now();

  try {
    console.log("[loopkitchen.mealplan] Starting complete meal plan flow...");

    // Validate required fields
    if (!params.userId) {
      throw new Error("userId is required for commerce integration");
    }
    if (!params.location) {
      throw new Error("location is required for order routing");
    }

    // Step 1: Generate meal plan
    const mealPlan = await generateMealPlan(params);

    if (mealPlan.type === "InfoMessage") {
      return { mealPlan };
    }

    // Step 2: Generate grocery list
    const groceryList = await generateGroceryListFromPlan(
      mealPlan,
      params.pantryIngredients
    );

    if (groceryList.type === "InfoMessage") {
      return { mealPlan, groceryList };
    }

    // Step 3: Get provider quotes
    const { prepareCart } = await import("./commerce.ts");

    const commerceResult = await prepareCart({
      userId: params.userId,
      groceryList: groceryList.data,
      location: params.location,
      preferences: params.preferences || {},
    });

    const duration = Date.now() - startTime;
    console.log("[loopkitchen.mealplan] Complete flow finished", {
      duration,
      providers: commerceResult.providers?.length || 0,
    });

    return {
      mealPlan,
      groceryList,
      commerce: commerceResult,
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
        flow: "complete",
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[loopkitchen.mealplan] Complete flow error:", error.message);

    const errorWidget: InfoMessage = {
      type: "InfoMessage",
      data: {
        title: "Meal Planning Flow Error",
        message: `Unable to complete meal planning flow: ${error.message}`,
        severity: "error",
        actionable: false,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: duration,
      },
    };

    return { error: errorWidget };
  }
}
