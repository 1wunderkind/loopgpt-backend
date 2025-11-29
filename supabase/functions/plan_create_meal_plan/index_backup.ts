/**
 * Generate Week Plan Edge Function
 * Main orchestration function for creating meal plans
 */

import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired, AppError, ErrorCodes } from "../../middleware/errorHandler.ts";
import { getKCalGoals, getRecipesFromLeftover, getMacrosFromNutrition } from "../_lib/mcpWrappers.ts";
import { buildAffiliateLinks, generateAffiliateSummary } from "../_lib/affiliate.ts";
import { isFeatureEnabled } from "../_lib/featureFlags.ts";
import type { GenerateWeekPlanRequest, GenerateWeekPlanResponse } from "../_lib/types.ts";

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as GenerateWeekPlanRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id"]);

    const {
      chatgpt_user_id,
      start_date,
      end_date,
      goal_type = "balanced",
      calories_target,
      macros_target,
      vibe = "clean eating",
      recipes_per_day = 3,
      dietary_restrictions = [],
    } = body;

    // Calculate date range (default to 7 days starting tomorrow)
    const startDate = start_date || getNextDay();
    const endDate = end_date || getDateAfterDays(startDate, 7);

    console.log(`Generating meal plan for user ${chatgpt_user_id} from ${startDate} to ${endDate}`);

    // Step 1: Get user goals from K-Cal GPT
    const userGoals = await getKCalGoals(chatgpt_user_id);
    const finalCaloriesTarget = calories_target || userGoals?.daily_calorie_goal || 2000;
    const finalMacrosTarget = macros_target || {
      protein_g: userGoals?.daily_protein_goal || 150,
      carbs_g: userGoals?.daily_carbs_goal || 200,
      fat_g: userGoals?.daily_fat_goal || 65,
    };

    console.log(`User goals: ${finalCaloriesTarget} cal, ${JSON.stringify(finalMacrosTarget)} macros`);

    // Step 2: Generate recipes for the week
    const daysCount = getDaysBetween(startDate, endDate);
    const totalRecipesNeeded = daysCount * recipes_per_day;

    console.log(`Generating ${totalRecipesNeeded} recipes (${daysCount} days × ${recipes_per_day} meals/day)`);

    // Get recipes from LeftoverGPT
    const recipes = await getRecipesFromLeftover(
      chatgpt_user_id,
      totalRecipesNeeded,
      vibe,
      goal_type
    );

    if (recipes.length === 0) {
      throw new AppError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        "Failed to generate recipes from LeftoverGPT",
        500
      );
    }

    console.log(`Generated ${recipes.length} recipes from LeftoverGPT`);

    // Step 3: Analyze nutrition for each recipe (if not already provided)
    const recipesWithNutrition = await Promise.all(
      recipes.map(async (recipe) => {
        if (recipe.nutrition) {
          return { ...recipe, nutrition: recipe.nutrition };
        }

        // Get nutrition from NutritionGPT
        const nutrition = await getMacrosFromNutrition({
          recipe_name: recipe.recipe_name,
          ingredients: recipe.ingredients,
          servings: 1,
        });

        return {
          ...recipe,
          nutrition: nutrition || { calories: 400, protein_g: 20, carbs_g: 40, fat_g: 15 },
        };
      })
    );

    // Step 4: Build affiliate links if enabled
    const affiliateEnabled = await isFeatureEnabled("affiliate_links", chatgpt_user_id);
    let affiliateLinks: Record<string, unknown> = {};
    let affiliateSummary = null;

    if (affiliateEnabled) {
      const allIngredients = recipesWithNutrition.flatMap((r) =>
        r.ingredients.map((i) => i.name)
      );
      affiliateLinks = buildAffiliateLinks(allIngredients);
      affiliateSummary = generateAffiliateSummary(allIngredients);
      console.log(`Generated affiliate links for ${allIngredients.length} ingredients`);
    }

    // Step 5: Organize recipes into daily meal plan
    const dailyMeals = [];
    let recipeIndex = 0;

    for (let day = 0; day < daysCount; day++) {
      const dayDate = getDateAfterDays(startDate, day);
      const mealTypes = getMealTypes(recipes_per_day);

      for (let mealIdx = 0; mealIdx < recipes_per_day; mealIdx++) {
        if (recipeIndex >= recipesWithNutrition.length) break;

        const recipe = recipesWithNutrition[recipeIndex];
        const ingredientNames = recipe.ingredients.map((i) => i.name);

        dailyMeals.push({
          day: day + 1,
          day_date: dayDate,
          meal_type: mealTypes[mealIdx],
          meal_order: mealIdx + 1,
          recipe_name: recipe.recipe_name,
          recipe_source: "leftover_gpt",
          ingredients: recipe.ingredients,
          instructions: recipe.instructions?.join("\n"),
          macros: recipe.nutrition,
          affiliate_links: affiliateEnabled
            ? Object.fromEntries(
                ingredientNames.map((name) => [
                  name,
                  affiliateLinks[name.toLowerCase()],
                ])
              )
            : undefined,
        });

        recipeIndex++;
      }
    }

    // Step 6: Calculate total nutrition
    const totalNutrition = dailyMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.macros?.calories || 0),
        protein_g: acc.protein_g + (meal.macros?.protein_g || 0),
        carbs_g: acc.carbs_g + (meal.macros?.carbs_g || 0),
        fat_g: acc.fat_g + (meal.macros?.fat_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Step 7: Build response
    const response: GenerateWeekPlanResponse = {
      meal_plan: {
        id: crypto.randomUUID(),
        chatgpt_user_id,
        plan_name: `${goal_type} Plan - ${startDate}`,
        start_date: startDate,
        end_date: endDate,
        goal_type,
        calories_target: finalCaloriesTarget,
        macros_target: finalMacrosTarget,
        vibe,
        recipes_per_day,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      daily_meals: dailyMeals as never,
      total_nutrition: totalNutrition,
      affiliate_summary: affiliateSummary || undefined,
    };

    console.log(`Successfully generated meal plan with ${dailyMeals.length} meals`);

    return createSuccessResponse(response);
  } catch (error) {
    console.error("Error in generate_week_plan:", error);
    return createErrorResponse(error as Error);
  }
}

// Helper functions
function getNextDay(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function getDateAfterDays(startDate: string, days: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getMealTypes(count: number): string[] {
  const types = ["breakfast", "lunch", "dinner", "snack"];
  return types.slice(0, count);
}

// Export with logging middleware
export default withLogging(handler, "generate_week_plan");

