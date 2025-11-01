/**
 * Generate Week Plan Edge Function (WITH GEOLOCATION)
 * Main orchestration function for creating meal plans with multilingual support and location-aware affiliate routing
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";
import { getKCalGoals, getRecipesFromLeftover, getMacrosFromNutrition } from "../../../../lib/mcpWrappers.ts";
import { buildAffiliateLinks, generateAffiliateSummary } from "../../../../lib/affiliate.ts";
import { formatMealPlan, detectLanguage } from "../../../../lib/multilingual.ts";
import { 
  formatCountryDisplay, 
  needsLocationConfirmation, 
  generateLocationConfirmationPrompt,
  getAlternativeCountries,
  calculateLocationConfidence 
} from "../../../../lib/locationUtils.ts";
import type { GenerateWeekPlanRequest, GenerateWeekPlanResponse } from "../../../../lib/types.ts";

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
      language,
      confirmed_country, // NEW: User-confirmed country (if provided)
    } = body;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Detect language from user input
    const userInput = vibe || goal_type || dietary_restrictions.join(" ") || "healthy meal plan";
    const detectedLanguage = language || detectLanguage(userInput);
    
    console.log(`[MULTILINGUAL] Detected language: ${detectedLanguage} from input: "${userInput}"`);

    // Step 2: Get user location (NEW - GEOLOCATION)
    const geoHint = req.headers.get("X-User-Country") || undefined;
    
    const locationResponse = await fetch(`${supabaseUrl}/functions/v1/get_user_location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatgpt_user_id,
        detected_language: detectedLanguage,
        geo_hint: geoHint,
      }),
    });

    const locationData = await locationResponse.json();

    console.log(`[GEOLOCATION] Location data:`, locationData);

    // Step 3: Check if location confirmation is needed
    if (locationData.needs_confirmation && !confirmed_country) {
      const confidence = calculateLocationConfidence(
        locationData.source,
        detectedLanguage === locationData.language
      );

      if (needsLocationConfirmation(confidence)) {
        // Generate confirmation prompt
        const alternatives = getAlternativeCountries(detectedLanguage, locationData.country, 1);
        const confirmationPrompt = generateLocationConfirmationPrompt(
          detectedLanguage,
          locationData.country || alternatives[0],
          alternatives
        );

        console.log(`[GEOLOCATION] Needs confirmation: ${confirmationPrompt}`);

        // Return early with confirmation prompt
        return createSuccessResponse({
          needs_location_confirmation: true,
          confirmation_prompt: confirmationPrompt,
          detected_language: detectedLanguage,
          suggested_country: locationData.country || alternatives[0],
          alternative_countries: alternatives,
        });
      }
    }

    // Step 4: If user provided confirmed_country, update profile
    if (confirmed_country) {
      console.log(`[GEOLOCATION] User confirmed country: ${confirmed_country}`);

      await fetch(`${supabaseUrl}/functions/v1/update_user_location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatgpt_user_id,
          language: detectedLanguage,
          confirmed_country,
        }),
      });

      locationData.country = confirmed_country;
      locationData.needs_confirmation = false;
    }

    const userCountry = locationData.country;

    console.log(`[GEOLOCATION] Using country: ${userCountry}`);

    // Step 5: Get affiliates for user's country (NEW - GEOLOCATION)
    const affiliatesResponse = await fetch(`${supabaseUrl}/functions/v1/get_affiliate_by_country`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: userCountry }),
    });

    const affiliatesData = await affiliatesResponse.json();

    console.log(`[GEOLOCATION] Found ${affiliatesData.count} affiliates for ${userCountry}`);

    // Calculate date range (default to 7 days starting tomorrow)
    const startDate = start_date || getNextDay();
    const endDate = end_date || getDateAfterDays(startDate, 7);

    console.log(`Generating meal plan for user ${chatgpt_user_id} from ${startDate} to ${endDate}`);

    // Step 6: Get user goals from K-Cal GPT
    const userGoals = await getKCalGoals(chatgpt_user_id);
    const finalCaloriesTarget = calories_target || userGoals?.daily_calorie_goal || 2000;
    const finalMacrosTarget = macros_target || {
      protein_g: userGoals?.daily_protein_goal || 150,
      carbs_g: userGoals?.daily_carbs_goal || 200,
      fat_g: userGoals?.daily_fat_goal || 65,
    };

    console.log(`User goals: ${finalCaloriesTarget} cal, ${JSON.stringify(finalMacrosTarget)} macros`);

    // Step 7: Generate recipes for the week
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

        // Build affiliate links for grocery shopping
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

    // Step 8: Calculate total nutrition
    const totalNutrition = dailyMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.macros?.calories || 0),
        protein_g: acc.protein_g + (meal.macros?.protein_g || 0),
        carbs_g: acc.carbs_g + (meal.macros?.carbs_g || 0),
        fat_g: acc.fat_g + (meal.macros?.fat_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Step 9: Build grocery affiliate summary
    const affiliateSummary = generateAffiliateSummary(allIngredients);

    // Step 10: Build response data
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
      delivery_affiliates: affiliatesData.affiliates, // NEW: Delivery affiliates for user's country
      user_country: userCountry, // NEW: User's confirmed country
    };

    // Step 11: Format response in user's language
    const formattedMessage = await formatMealPlan(responseData, userInput);

    console.log(`[MULTILINGUAL] Formatted response in ${detectedLanguage}`);
    console.log(`[GEOLOCATION] Included ${affiliatesData.count} delivery affiliates for ${userCountry}`);

    // Step 12: Save meal plan to database
    const { data: savedPlan, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        chatgpt_user_id,
        plan_name: responseData.meal_plan.plan_name,
        start_date: startDate,
        end_date: endDate,
        goal_type,
        calories_target: finalCaloriesTarget,
        macros_target: finalMacrosTarget,
        vibe,
        recipes_per_day,
      })
      .select()
      .single();

    if (planError) {
      console.error("[DB] Error saving meal plan:", planError);
    } else {
      console.log(`[DB] Saved meal plan with ID: ${savedPlan.id}`);
    }

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
serve(withLogging(handler));

