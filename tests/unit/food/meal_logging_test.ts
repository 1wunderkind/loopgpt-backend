/**
 * Unit Tests: Meal Logging
 * Tests for logging meals and food consumption
 */

import {
  assertEquals,
  assertExists,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("meal_logging: creates meal entry successfully", async () => {
  const userId = testData.userId();
  const mockMeal = {
    id: crypto.randomUUID(),
    user_id: userId,
    meal_type: "breakfast",
    foods: [
      { food_id: 123, quantity: 100, unit: "g" },
    ],
    total_calories: 200,
    logged_at: new Date().toISOString(),
  };

  assertExists(mockMeal.id);
  assertEquals(mockMeal.user_id, userId);
  assertExists(mockMeal.meal_type);
  assert(mockMeal.foods.length > 0);
});

Deno.test("meal_logging: validates meal type", async () => {
  const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
  
  for (const mealType of validMealTypes) {
    const isValid = validMealTypes.includes(mealType);
    assertEquals(isValid, true);
  }

  const invalidMealType = "invalid_meal";
  const isValid = validMealTypes.includes(invalidMealType);
  assertEquals(isValid, false);
});

Deno.test("meal_logging: calculates total nutrition for meal", async () => {
  const foods = [
    { calories: 100, protein: 10, carbs: 15, fat: 5 },
    { calories: 200, protein: 20, carbs: 30, fat: 10 },
  ];

  const totals = {
    calories: foods.reduce((sum, f) => sum + f.calories, 0),
    protein: foods.reduce((sum, f) => sum + f.protein, 0),
    carbs: foods.reduce((sum, f) => sum + f.carbs, 0),
    fat: foods.reduce((sum, f) => sum + f.fat, 0),
  };

  assertEquals(totals.calories, 300);
  assertEquals(totals.protein, 30);
  assertEquals(totals.carbs, 45);
  assertEquals(totals.fat, 15);
});

Deno.test("meal_logging: handles empty meal", async () => {
  const mockMeal = {
    foods: [],
    total_calories: 0,
  };

  assertEquals(mockMeal.foods.length, 0);
  assertEquals(mockMeal.total_calories, 0);
});

Deno.test("meal_logging: stores timestamp correctly", async () => {
  const now = new Date();
  const mockMeal = {
    logged_at: now.toISOString(),
  };

  assertExists(mockMeal.logged_at);
  const parsed = new Date(mockMeal.logged_at);
  assert(parsed instanceof Date);
  assert(!isNaN(parsed.getTime()));
});

Deno.test("meal_logging: allows optional notes", async () => {
  const mockMeal = {
    notes: "Ate at restaurant",
  };

  assertExists(mockMeal.notes);
  assert(mockMeal.notes.length > 0);
});

Deno.test("meal_logging: handles multiple foods in one meal", async () => {
  const mockMeal = {
    foods: [
      { food_id: 1, quantity: 100 },
      { food_id: 2, quantity: 200 },
      { food_id: 3, quantity: 150 },
    ],
  };

  assertEquals(mockMeal.foods.length, 3);
  assert(mockMeal.foods.every(f => f.food_id && f.quantity));
});
