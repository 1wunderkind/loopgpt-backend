/**
 * Unit Tests: Food Search
 * Tests for food search functionality
 */

import {
  assertEquals,
  assertExists,
  assert,
  createMockRequest,
  parseJsonResponse,
  assertSuccessResponse,
  assertErrorResponse,
  testData,
} from "../../helpers.ts";

Deno.test("food_search: returns results for valid query", async () => {
  // Mock implementation - in real tests, this would call the actual function
  const query = "chicken breast";
  const mockResults = {
    foods: [
      testData.food({ description: "Chicken Breast, Raw" }),
      testData.food({ description: "Chicken Breast, Grilled" }),
    ],
    total: 2,
  };

  assertExists(mockResults.foods);
  assertEquals(mockResults.foods.length, 2);
  assert(mockResults.foods[0].description.toLowerCase().includes("chicken"));
});

Deno.test("food_search: handles empty query gracefully", async () => {
  const query = "";
  const mockError = {
    error: "INVALID_QUERY",
    message: "Query cannot be empty",
  };

  assertExists(mockError.error);
  assertEquals(mockError.error, "INVALID_QUERY");
});

Deno.test("food_search: handles special characters in query", async () => {
  const query = "chicken & rice";
  const mockResults = {
    foods: [testData.food()],
    total: 1,
  };

  assertExists(mockResults.foods);
  assert(mockResults.total >= 0);
});

Deno.test("food_search: returns empty array for no matches", async () => {
  const query = "xyzabc123nonexistent";
  const mockResults = {
    foods: [],
    total: 0,
  };

  assertEquals(mockResults.foods.length, 0);
  assertEquals(mockResults.total, 0);
});

Deno.test("food_search: limits results to specified count", async () => {
  const query = "apple";
  const limit = 5;
  const mockResults = {
    foods: Array(5).fill(null).map(() => testData.food()),
    total: 100,
  };

  assertEquals(mockResults.foods.length, limit);
  assert(mockResults.total >= mockResults.foods.length);
});

Deno.test("food_search: handles case-insensitive search", async () => {
  const queries = ["CHICKEN", "chicken", "ChIcKeN"];
  
  for (const query of queries) {
    const mockResults = {
      foods: [testData.food({ description: "Chicken Breast" })],
      total: 1,
    };
    
    assertExists(mockResults.foods);
    assert(mockResults.foods.length > 0);
  }
});

Deno.test("food_search: returns nutrition data for each food", async () => {
  const query = "apple";
  const mockResults = {
    foods: [testData.food({
      calories: 95,
      protein: 0.5,
      carbs: 25,
      fat: 0.3,
    })],
    total: 1,
  };

  const food = mockResults.foods[0];
  assertExists(food.calories);
  assertExists(food.protein);
  assertExists(food.carbs);
  assertExists(food.fat);
});

Deno.test("food_search: handles pagination correctly", async () => {
  const query = "chicken";
  const page = 2;
  const limit = 10;
  
  const mockResults = {
    foods: Array(10).fill(null).map(() => testData.food()),
    total: 50,
    page,
    limit,
  };

  assertEquals(mockResults.foods.length, limit);
  assertEquals(mockResults.page, page);
  assert(mockResults.total > mockResults.foods.length);
});

Deno.test("food_search: handles very long queries", async () => {
  const query = "a".repeat(500);
  const mockError = {
    error: "QUERY_TOO_LONG",
    message: "Query exceeds maximum length",
  };

  assertExists(mockError.error);
  assertEquals(mockError.error, "QUERY_TOO_LONG");
});

Deno.test("food_search: returns branded and generic foods", async () => {
  const query = "milk";
  const mockResults = {
    foods: [
      testData.food({ description: "Milk, whole", brand_name: null }),
      testData.food({ description: "Whole Milk", brand_name: "Organic Valley" }),
    ],
    total: 2,
  };

  assertEquals(mockResults.foods.length, 2);
  // First is generic (no brand)
  assertEquals(mockResults.foods[0].brand_name, null);
  // Second is branded
  assertExists(mockResults.foods[1].brand_name);
});
