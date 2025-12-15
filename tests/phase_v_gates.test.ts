import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { analyzeNutrition } from "../supabase/functions/mcp-tools/nutrition.ts";
import { generateMealPlan } from "../supabase/functions/mcp-tools/mealplan.ts";

// The tools are designed to be resilient and return fallbacks on error, 
// rather than throwing. So we should test that they return a valid response structure
// even with invalid input, OR check if they log the error correctly (which is harder to test here).
// Alternatively, we can test the validation functions directly if we exported them.
// Since I exported them in the previous step, let's import them!

import { validateNutritionInput } from "../supabase/functions/mcp-tools/nutrition.ts";
import { validateMealPlanInput } from "../supabase/functions/mcp-tools/mealplan.ts";

Deno.test("Gate: Nutrition Input Validation - Throws on missing recipes", () => {
  try {
    validateNutritionInput({});
    throw new Error("Should have thrown");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes("recipes array is required")) {
      throw e;
    }
  }
});

Deno.test("Gate: Nutrition Input Validation - Throws on empty recipes", () => {
  try {
    validateNutritionInput({ recipes: [] });
    throw new Error("Should have thrown");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes("recipes array is required")) {
      throw e;
    }
  }
});

Deno.test("Gate: MealPlan Input Validation - Throws on missing goals", () => {
  try {
    validateMealPlanInput({ days: 7 });
    throw new Error("Should have thrown");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes("goals object is required")) {
      throw e;
    }
  }
});

Deno.test("Gate: MealPlan Input Validation - Accepts valid input", () => {
  const result = validateMealPlanInput({ 
    goals: { calories: 2000 }, 
    days: 3,
    dietaryTags: ["vegan"],
    excludeIngredients: ["nuts"]
  });
  
  assertEquals(result.days, 3);
  assertEquals(result.goals.calories, 2000);
  assertEquals(result.dietaryTags[0], "vegan");
});

Deno.test("Gate: Nutrition Tool - Returns fallback on invalid input (Resilience Check)", async () => {
  // The tool catches the validation error and returns a fallback
  const result = await analyzeNutrition({});
  
  // Check if we got a valid response structure (fallback)
  if (!result.analyses || !Array.isArray(result.analyses)) {
    throw new Error("Expected analyses array in fallback response");
  }
  
  // Should be empty or contain fallback data, but definitely not crash
  console.log("Resilience check passed, got:", result.analyses.length, "analyses");
});
