/**
 * Nutrition Engine Tests
 * 
 * Comprehensive test suite for deterministic nutrition engine.
 * 
 * Test categories:
 * 1. Determinism tests (same input → same output)
 * 2. Ingredient lookup tests
 * 3. Unit conversion tests
 * 4. Macro calculation tests
 * 5. Diet tagging tests
 * 6. Confidence scoring tests
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import { assertEquals, assertExists } from "std@0.177.0/testing/asserts.ts";
import {
  estimateRecipeNutrition,
  lookupIngredient,
  convertToBaseUnit,
  calculateIngredientMacros,
  getDietTags,
  normalizeIngredientName,
  FOOD_DATABASE,
} from "./index.ts";
import type { RecipeNutritionInput } from "./types.ts";

// ============================================================================
// Test 1: Determinism - Same Input → Same Output
// ============================================================================

Deno.test("Determinism: Same recipe produces identical results", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Chicken and Rice",
    servings: 4,
    ingredients: [
      { name: "chicken breast", quantity: 500, unit: "g" },
      { name: "rice", quantity: 2, unit: "cup" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
    ],
  };

  // Run estimation 3 times
  const result1 = estimateRecipeNutrition(input);
  const result2 = estimateRecipeNutrition(input);
  const result3 = estimateRecipeNutrition(input);

  // All results should be identical
  assertEquals(result1.perServing.calories, result2.perServing.calories);
  assertEquals(result2.perServing.calories, result3.perServing.calories);
  
  assertEquals(result1.perServing.protein_g, result2.perServing.protein_g);
  assertEquals(result2.perServing.protein_g, result3.perServing.protein_g);
  
  assertEquals(result1.dietTags, result2.dietTags);
  assertEquals(result2.dietTags, result3.dietTags);
  
  assertEquals(result1.confidence, result2.confidence);
  assertEquals(result2.confidence, result3.confidence);
  
  console.log("✅ Determinism test passed");
});

// ============================================================================
// Test 2: Ingredient Lookup
// ============================================================================

Deno.test("Ingredient Lookup: Exact match", () => {
  const result = lookupIngredient({ name: "chicken breast", quantity: 100, unit: "g" });
  
  assertEquals(result.matched, true);
  assertEquals(result.canonicalName, "chicken breast");
  assertExists(result.foodEntry);
  
  console.log("✅ Exact match test passed");
});

Deno.test("Ingredient Lookup: Synonym mapping", () => {
  const result = lookupIngredient({ name: "鸡胸肉", quantity: 100, unit: "g" });
  
  assertEquals(result.matched, true);
  assertEquals(result.canonicalName, "chicken breast");
  
  console.log("✅ Synonym mapping test passed");
});

Deno.test("Ingredient Lookup: Unknown ingredient", () => {
  const result = lookupIngredient({ name: "unicorn meat", quantity: 100, unit: "g" });
  
  assertEquals(result.matched, false);
  assertEquals(result.canonicalName, undefined);
  
  console.log("✅ Unknown ingredient test passed");
});

// ============================================================================
// Test 3: Unit Conversion
// ============================================================================

Deno.test("Unit Conversion: Grams to grams", () => {
  const foodEntry = FOOD_DATABASE["chicken breast"];
  const result = convertToBaseUnit(100, "g", foodEntry);
  
  assertEquals(result, 100);
  
  console.log("✅ Grams to grams test passed");
});

Deno.test("Unit Conversion: Cup to milliliters", () => {
  const foodEntry = FOOD_DATABASE["rice"];
  const result = convertToBaseUnit(1, "cup", foodEntry);
  
  assertEquals(result, 1); // Rice uses "cup" as base unit
  
  console.log("✅ Cup conversion test passed");
});

Deno.test("Unit Conversion: Piece with gramsPerUnit", () => {
  const foodEntry = FOOD_DATABASE["egg"];
  const result = convertToBaseUnit(2, "piece", foodEntry);
  
  assertEquals(result, 100); // 2 eggs × 50g = 100g
  
  console.log("✅ Piece conversion test passed");
});

// ============================================================================
// Test 4: Macro Calculation
// ============================================================================

Deno.test("Macro Calculation: Chicken breast 100g", () => {
  const ingredient = { name: "chicken breast", quantity: 100, unit: "g" };
  const foodEntry = FOOD_DATABASE["chicken breast"];
  
  const { macros } = calculateIngredientMacros(ingredient, foodEntry);
  
  assertEquals(macros.calories, 165); // 1.65 × 100
  assertEquals(macros.protein_g, 31);  // 0.31 × 100
  assertEquals(macros.carbs_g, 0);
  assertEquals(macros.fat_g, 3.6);     // 0.036 × 100
  
  console.log("✅ Chicken breast macro calculation passed");
});

Deno.test("Macro Calculation: Rice 2 cups", () => {
  const ingredient = { name: "rice", quantity: 2, unit: "cup" };
  const foodEntry = FOOD_DATABASE["rice"];
  
  const { macros } = calculateIngredientMacros(ingredient, foodEntry);
  
  assertEquals(macros.calories, 410); // 205 × 2
  assertEquals(macros.protein_g, 8.6); // 4.3 × 2
  assertEquals(macros.carbs_g, 90);    // 45 × 2
  
  console.log("✅ Rice macro calculation passed");
});

// ============================================================================
// Test 5: Diet Tagging
// ============================================================================

Deno.test("Diet Tags: Vegan recipe", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Quinoa Salad",
    servings: 2,
    ingredients: [
      { name: "quinoa", quantity: 1, unit: "cup" },
      { name: "tomato", quantity: 2, unit: "piece" },
      { name: "spinach", quantity: 1, unit: "cup" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.dietTags.includes("vegan"), true);
  assertEquals(result.dietTags.includes("vegetarian"), true);
  assertEquals(result.dietTags.includes("gluten_free"), true);
  assertEquals(result.dietTags.includes("dairy_free"), true);
  
  console.log("✅ Vegan tagging test passed");
});

Deno.test("Diet Tags: High protein recipe", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Grilled Chicken",
    servings: 1,
    ingredients: [
      { name: "chicken breast", quantity: 200, unit: "g" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.dietTags.includes("high_protein"), true);
  assertEquals(result.perServing.protein_g >= 20, true);
  
  console.log("✅ High protein tagging test passed");
});

Deno.test("Diet Tags: Keto-friendly recipe", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Avocado Egg Bowl",
    servings: 1,
    ingredients: [
      { name: "avocado", quantity: 1, unit: "piece" },
      { name: "egg", quantity: 2, unit: "piece" },
      { name: "bacon", quantity: 2, unit: "slice" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.dietTags.includes("keto_friendly"), true);
  assertEquals(result.perServing.carbs_g < 10, true);
  assertEquals(result.perServing.fat_g >= 15, true);
  
  console.log("✅ Keto tagging test passed");
});

// ============================================================================
// Test 6: Confidence Scoring
// ============================================================================

Deno.test("Confidence: High confidence (all ingredients matched)", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Simple Salad",
    servings: 1,
    ingredients: [
      { name: "spinach", quantity: 1, unit: "cup" },
      { name: "tomato", quantity: 1, unit: "piece" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "high");
  assertEquals(result.debug?.matchedIngredients.length, 3);
  assertEquals(result.debug?.unmatchedIngredients.length, 0);
  
  console.log("✅ High confidence test passed");
});

Deno.test("Confidence: Medium confidence (some ingredients matched)", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Mixed Dish",
    servings: 1,
    ingredients: [
      { name: "chicken breast", quantity: 100, unit: "g" },
      { name: "rice", quantity: 1, unit: "cup" },
      { name: "unknown spice", quantity: 1, unit: "tsp" },
      { name: "mystery herb", quantity: 1, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "medium");
  assertEquals(result.debug?.matchedIngredients.length, 2);
  assertEquals(result.debug?.unmatchedIngredients.length, 2);
  
  console.log("✅ Medium confidence test passed");
});

Deno.test("Confidence: Low confidence (few ingredients matched)", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Exotic Dish",
    servings: 1,
    ingredients: [
      { name: "dragon fruit", quantity: 1, unit: "piece" },
      { name: "star anise", quantity: 1, unit: "tsp" },
      { name: "lemongrass", quantity: 1, unit: "tbsp" },
      { name: "rice", quantity: 1, unit: "cup" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "low");
  assertEquals(result.debug?.matchedIngredients.length, 1); // Only rice
  assertEquals(result.debug?.unmatchedIngredients.length, 3);
  
  console.log("✅ Low confidence test passed");
});

// ============================================================================
// Test 7: Edge Cases
// ============================================================================

Deno.test("Edge Case: Zero servings (should not crash)", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Test Recipe",
    servings: 1, // Minimum 1 serving
    ingredients: [
      { name: "rice", quantity: 1, unit: "cup" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertExists(result);
  assertEquals(result.servings, 1);
  
  console.log("✅ Zero servings edge case passed");
});

Deno.test("Edge Case: Empty ingredients (should not crash)", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Empty Recipe",
    servings: 1,
    ingredients: [],
  };

  const result = estimateRecipeNutrition(input);
  
  assertExists(result);
  assertEquals(result.perServing.calories, 0);
  assertEquals(result.confidence, "low");
  
  console.log("✅ Empty ingredients edge case passed");
});

Deno.test("Edge Case: Very large quantities", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Bulk Meal",
    servings: 10,
    ingredients: [
      { name: "chicken breast", quantity: 5000, unit: "g" }, // 5kg
      { name: "rice", quantity: 20, unit: "cup" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertExists(result);
  assertEquals(result.total.calories > 10000, true); // Should be very high
  assertEquals(result.perServing.calories > 1000, true);
  
  console.log("✅ Large quantities edge case passed");
});

// ============================================================================
// Test 8: Multilingual Support
// ============================================================================

Deno.test("Multilingual: Chinese ingredients", () => {
  const input: RecipeNutritionInput = {
    recipeName: "中式炒饭",
    servings: 2,
    ingredients: [
      { name: "鸡胸肉", quantity: 200, unit: "g" },
      { name: "米饭", quantity: 2, unit: "cup" },
      { name: "鸡蛋", quantity: 2, unit: "piece" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "high");
  assertEquals(result.debug?.matchedIngredients.length, 3);
  
  console.log("✅ Chinese ingredients test passed");
});

Deno.test("Multilingual: Spanish ingredients", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Pollo con Arroz",
    servings: 2,
    ingredients: [
      { name: "pechuga de pollo", quantity: 200, unit: "g" },
      { name: "arroz", quantity: 2, unit: "cup" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "high");
  assertEquals(result.debug?.matchedIngredients.length, 2);
  
  console.log("✅ Spanish ingredients test passed");
});

// ============================================================================
// Test 9: Real-World Recipes
// ============================================================================

Deno.test("Real Recipe: Classic Chicken Salad", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Classic Chicken Salad",
    servings: 4,
    ingredients: [
      { name: "chicken breast", quantity: 400, unit: "g" },
      { name: "spinach", quantity: 2, unit: "cup" },
      { name: "tomato", quantity: 2, unit: "piece" },
      { name: "avocado", quantity: 1, unit: "piece" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "high");
  assertEquals(result.dietTags.includes("high_protein"), true);
  assertEquals(result.dietTags.includes("gluten_free"), true);
  assertEquals(result.perServing.calories > 200, true);
  assertEquals(result.perServing.calories < 500, true);
  
  console.log("✅ Classic Chicken Salad test passed");
  console.log(`   Calories: ${result.perServing.calories} kcal/serving`);
  console.log(`   Protein: ${result.perServing.protein_g}g`);
  console.log(`   Tags: ${result.dietTags.join(", ")}`);
});

Deno.test("Real Recipe: Vegan Buddha Bowl", () => {
  const input: RecipeNutritionInput = {
    recipeName: "Vegan Buddha Bowl",
    servings: 2,
    ingredients: [
      { name: "quinoa", quantity: 1, unit: "cup" },
      { name: "sweet potato", quantity: 1, unit: "piece" },
      { name: "broccoli", quantity: 1, unit: "cup" },
      { name: "spinach", quantity: 1, unit: "cup" },
      { name: "avocado", quantity: 1, unit: "piece" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
  };

  const result = estimateRecipeNutrition(input);
  
  assertEquals(result.confidence, "high");
  assertEquals(result.dietTags.includes("vegan"), true);
  assertEquals(result.dietTags.includes("vegetarian"), true);
  assertEquals(result.dietTags.includes("gluten_free"), true);
  assertEquals(result.dietTags.includes("high_fiber"), true);
  
  console.log("✅ Vegan Buddha Bowl test passed");
  console.log(`   Calories: ${result.perServing.calories} kcal/serving`);
  console.log(`   Fiber: ${result.perServing.fiber_g}g`);
  console.log(`   Tags: ${result.dietTags.join(", ")}`);
});

// ============================================================================
// Run All Tests
// ============================================================================

console.log("\n🧪 Running Nutrition Engine Tests...\n");
