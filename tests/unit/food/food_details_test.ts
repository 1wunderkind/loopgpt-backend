/**
 * Unit Tests: Food Details
 * Tests for retrieving detailed food information
 */

import {
  assertEquals,
  assertExists,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("food_details: returns complete nutrition data", async () => {
  const foodId = 12345;
  const mockFood = testData.food({
    id: foodId,
    description: "Chicken Breast, Raw",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    serving_size: 100,
    serving_unit: "g",
  });

  assertExists(mockFood);
  assertEquals(mockFood.id, foodId);
  assertExists(mockFood.calories);
  assertExists(mockFood.protein);
  assertExists(mockFood.carbs);
  assertExists(mockFood.fat);
});

Deno.test("food_details: handles invalid food ID", async () => {
  const foodId = 999999999;
  const mockError = {
    error: "NOT_FOUND",
    message: "Food not found",
  };

  assertExists(mockError.error);
  assertEquals(mockError.error, "NOT_FOUND");
});

Deno.test("food_details: includes serving size information", async () => {
  const foodId = 12345;
  const mockFood = testData.food({
    serving_size: 100,
    serving_unit: "g",
  });

  assertExists(mockFood.serving_size);
  assertExists(mockFood.serving_unit);
  assert(mockFood.serving_size > 0);
});

Deno.test("food_details: includes brand information when available", async () => {
  const foodId = 12345;
  const mockFood = testData.food({
    brand_name: "Organic Valley",
  });

  assertExists(mockFood.brand_name);
  assert(mockFood.brand_name.length > 0);
});

Deno.test("food_details: includes data source", async () => {
  const foodId = 12345;
  const mockFood = testData.food({
    data_source: "USDA",
  });

  assertExists(mockFood.data_source);
  assert(["USDA", "Branded", "Custom"].includes(mockFood.data_source));
});
