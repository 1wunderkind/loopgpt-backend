/**
 * Generate Week Plan Edge Function (MULTILINGUAL VERSION)
 * Main orchestration function for creating meal plans with multilingual support
 */

import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";
import { getKCalGoals, getRecipesFromLeftover, getMacrosFromNutrition } from "../_lib/mcpWrappers.ts";
import { buildAffiliateLinks, generateAffiliateSummary } from "../_lib/affiliate.ts";
import { formatMealPlan, detectLanguage } from "../_lib/multilingual.ts";
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
      language, // NEW: Optional language parameter
    } = body;

    // NEW: Detect language from user input
    const userInput = vibe || goal_type || dietary_restrictions.join(" ") || "healthy meal plan";
    const detectedLanguage = language || detectLanguage(userInput);
    
    console.log(`[MULTILINGUAL] Detected language: ${detectedLanguage} from input: "${userInput}"`);

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
    const dailyMeals: any[] = [];
    const allIngredients: string[] = [];

    for (let day = 1; day <= 7; day++) {
      const dayDate = getDateAfterDays(startDate, day - 1);

      for (let mealOrder = 1; mealOrder <= recipes_per_day; mealOrder++) {
        const mealType = mealOrder === 1 ? "breakfast" : mealOrder === 2 ? "lunch" : "dinner";

        // Generate recipe from LeftoverGPT
        const recipe = await getRecipesFromLeftover({
          chatgpt_user_id,
          vibe,
          diet: dietary_restrictions.join(", "),
          chef_persona: "Gordon Ramsay",
        });

        // Analyze nutrition with NutritionGPT
        const nutrition = await getMacrosFromNutrition({
          recipe_name: recipe.recipe_name,
          ingredients: recipe.ingredients,
          servings: 1,
        });

        // Build affiliate links
        const ingredientNames = recipe.ingredients.map((i: any) => i.name);
        allIngredients.push(...ingredientNames);
        const affiliateLinks = await buildAffiliateLinks(ingredientNames);

        dailyMeals.push({
          day,
          day_date: dayDate,
          meal_type: mealType,
          meal_order: mealOrder,
          recipe_name: recipe.recipe_name,
          recipe_source: "LeftoverGPT",
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          macros: nutrition,
          affiliate_links: affiliateLinks,
        });
      }
    }

    // Step 3: Calculate total nutrition
    const totalNutrition = dailyMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.macros?.calories || 0),
        protein_g: acc.protein_g + (meal.macros?.protein_g || 0),
        carbs_g: acc.carbs_g + (meal.macros?.carbs_g || 0),
        fat_g: acc.fat_g + (meal.macros?.fat_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Step 4: Build affiliate summary
    const affiliateSummary = generateAffiliateSummary(allIngredients);

    // Step 5: Build response data
    const responseData: GenerateWeekPlanResponse = {
      meal_plan: {
        id: crypto.randomUUID(),
        chatgpt_user_id,
        plan_name: `${vibe} Meal Plan`,
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
      daily_meals: dailyMeals as any,
      total_nutrition: totalNutrition,
      affiliate_summary: affiliateSummary,
    };

    // NEW: Format response in user's language
    const formattedMessage = await formatMealPlan(responseData, userInput);

    console.log(`[MULTILINGUAL] Formatted response in ${detectedLanguage}`);

    // Return response with formatted message
    return createSuccessResponse({
      ...responseData,
      formatted_message: formattedMessage,
      language: detectedLanguage,
    });

  } catch (error) {
    console.error("Error generating meal plan:", error);
    return createErrorResponse(error);
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

// Export handler with logging middleware
export default withLogging(handler);

