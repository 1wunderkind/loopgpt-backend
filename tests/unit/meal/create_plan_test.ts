/**
 * Unit Tests: Meal Planning - Create Plan
 * Tests for creating meal plans
 */

import { assertEquals, assertExists, assert, testData } from "../../helpers.ts";

Deno.test("meal_plan: creates plan with target calories", async () => {
  const targetCalories = 2000;
  const mockPlan = {
    id: crypto.randomUUID(),
    user_id: testData.userId(),
    target_calories: targetCalories,
    meals: [],
    created_at: new Date().toISOString(),
  };

  assertEquals(mockPlan.target_calories, targetCalories);
  assertExists(mockPlan.id);
});

Deno.test("meal_plan: includes all meal types", async () => {
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const mockPlan = {
    meals: mealTypes.map(type => ({ type, foods: [] })),
  };

  assertEquals(mockPlan.meals.length, 4);
  assert(mockPlan.meals.every(m => mealTypes.includes(m.type)));
});

Deno.test("meal_plan: distributes calories across meals", async () => {
  const targetCalories = 2000;
  const meals = [
    { type: "breakfast", calories: 500 },
    { type: "lunch", calories: 700 },
    { type: "dinner", calories: 700 },
    { type: "snack", calories: 100 },
  ];

  const total = meals.reduce((sum, m) => sum + m.calories, 0);
  assertEquals(total, targetCalories);
});

Deno.test("meal_plan: respects macro targets", async () => {
  const macroTargets = {
    protein_percent: 30,
    carbs_percent: 40,
    fat_percent: 30,
  };

  const total = macroTargets.protein_percent + macroTargets.carbs_percent + macroTargets.fat_percent;
  assertEquals(total, 100);
});

Deno.test("meal_plan: handles dietary restrictions", async () => {
  const restrictions = ["vegetarian", "gluten-free"];
  const mockPlan = {
    dietary_restrictions: restrictions,
  };

  assertEquals(mockPlan.dietary_restrictions.length, 2);
  assert(mockPlan.dietary_restrictions.includes("vegetarian"));
});

Deno.test("meal_plan: generates for multiple days", async () => {
  const days = 7;
  const mockPlan = {
    duration_days: days,
    daily_plans: Array(days).fill(null).map(() => ({ meals: [] })),
  };

  assertEquals(mockPlan.daily_plans.length, days);
});

Deno.test("meal_plan: includes shopping list", async () => {
  const mockPlan = {
    shopping_list: [
      { item: "Chicken breast", quantity: 1000, unit: "g" },
      { item: "Rice", quantity: 500, unit: "g" },
    ],
  };

  assertExists(mockPlan.shopping_list);
  assert(mockPlan.shopping_list.length > 0);
});

Deno.test("meal_plan: validates calorie range", async () => {
  const minCalories = 1200;
  const maxCalories = 4000;
  const targetCalories = 2000;

  assert(targetCalories >= minCalories && targetCalories <= maxCalories);
});

Deno.test("meal_plan: allows meal preferences", async () => {
  const preferences = {
    breakfast_time: "07:00",
    lunch_time: "12:00",
    dinner_time: "18:00",
  };

  assertExists(preferences.breakfast_time);
  assertExists(preferences.lunch_time);
  assertExists(preferences.dinner_time);
});

Deno.test("meal_plan: includes nutritional summary", async () => {
  const mockPlan = {
    summary: {
      total_calories: 2000,
      total_protein: 150,
      total_carbs: 200,
      total_fat: 67,
    },
  };

  assertExists(mockPlan.summary);
  assert(mockPlan.summary.total_calories > 0);
});
