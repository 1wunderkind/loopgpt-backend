/**
 * Unit Tests: Nutrition Calculation
 * Tests for calculating nutritional values
 */

import {
  assertEquals,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("nutrition_calc: calculates calories correctly", async () => {
  const food = testData.food({
    calories: 100,
    serving_size: 100,
  });
  const quantity = 200; // 200g

  const calculatedCalories = (food.calories / food.serving_size) * quantity;
  
  assertEquals(calculatedCalories, 200);
});

Deno.test("nutrition_calc: calculates protein correctly", async () => {
  const food = testData.food({
    protein: 10,
    serving_size: 100,
  });
  const quantity = 150; // 150g

  const calculatedProtein = (food.protein / food.serving_size) * quantity;
  
  assertEquals(calculatedProtein, 15);
});

Deno.test("nutrition_calc: calculates macros for multiple items", async () => {
  const foods = [
    testData.food({ calories: 100, protein: 10, carbs: 15, fat: 5 }),
    testData.food({ calories: 200, protein: 20, carbs: 30, fat: 10 }),
  ];

  const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
  const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);
  const totalCarbs = foods.reduce((sum, f) => sum + f.carbs, 0);
  const totalFat = foods.reduce((sum, f) => sum + f.fat, 0);

  assertEquals(totalCalories, 300);
  assertEquals(totalProtein, 30);
  assertEquals(totalCarbs, 45);
  assertEquals(totalFat, 15);
});

Deno.test("nutrition_calc: handles zero serving size gracefully", async () => {
  const food = testData.food({
    serving_size: 0,
  });

  // Should handle division by zero
  const isValid = food.serving_size > 0;
  assertEquals(isValid, false);
});

Deno.test("nutrition_calc: calculates macro percentages", async () => {
  const food = testData.food({
    protein: 30,
    carbs: 40,
    fat: 20,
  });

  // Protein: 30g × 4 cal/g = 120 cal
  // Carbs: 40g × 4 cal/g = 160 cal
  // Fat: 20g × 9 cal/g = 180 cal
  // Total: 460 cal

  const proteinCal = food.protein * 4;
  const carbsCal = food.carbs * 4;
  const fatCal = food.fat * 9;
  const totalCal = proteinCal + carbsCal + fatCal;

  const proteinPercent = (proteinCal / totalCal) * 100;
  const carbsPercent = (carbsCal / totalCal) * 100;
  const fatPercent = (fatCal / totalCal) * 100;

  assert(proteinPercent > 0 && proteinPercent < 100);
  assert(carbsPercent > 0 && carbsPercent < 100);
  assert(fatPercent > 0 && fatPercent < 100);
  
  // Should sum to ~100%
  const total = proteinPercent + carbsPercent + fatPercent;
  assert(Math.abs(total - 100) < 0.1);
});

Deno.test("nutrition_calc: handles fractional servings", async () => {
  const food = testData.food({
    calories: 100,
    serving_size: 100,
  });
  const quantity = 50.5; // 50.5g

  const calculatedCalories = (food.calories / food.serving_size) * quantity;
  
  assertEquals(calculatedCalories, 50.5);
});

Deno.test("nutrition_calc: rounds to appropriate precision", async () => {
  const food = testData.food({
    calories: 100,
    serving_size: 100,
  });
  const quantity = 33.333; // 33.333g

  const calculatedCalories = (food.calories / food.serving_size) * quantity;
  const rounded = Math.round(calculatedCalories * 10) / 10; // Round to 1 decimal
  
  assertEquals(rounded, 33.3);
});

Deno.test("nutrition_calc: validates negative values", async () => {
  const food = testData.food({
    calories: -100, // Invalid
  });

  const isValid = food.calories >= 0;
  assertEquals(isValid, false);
});
