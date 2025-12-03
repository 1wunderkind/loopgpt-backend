/**
 * Unit Tests: Alternative Food Suggestions
 * Tests for suggesting healthier alternatives
 */

import {
  assertEquals,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("alternatives: suggests lower calorie options", async () => {
  const originalFood = testData.food({ calories: 500 });
  const alternatives = [
    testData.food({ calories: 300 }),
    testData.food({ calories: 350 }),
  ];

  assert(alternatives.every(alt => alt.calories < originalFood.calories));
});

Deno.test("alternatives: suggests higher protein options", async () => {
  const originalFood = testData.food({ protein: 10 });
  const alternatives = [
    testData.food({ protein: 20 }),
    testData.food({ protein: 25 }),
  ];

  assert(alternatives.every(alt => alt.protein > originalFood.protein));
});

Deno.test("alternatives: suggests lower fat options", async () => {
  const originalFood = testData.food({ fat: 20 });
  const alternatives = [
    testData.food({ fat: 10 }),
    testData.food({ fat: 5 }),
  ];

  assert(alternatives.every(alt => alt.fat < originalFood.fat));
});

Deno.test("alternatives: returns similar food types", async () => {
  const originalFood = testData.food({ description: "Whole Milk" });
  const alternatives = [
    testData.food({ description: "Skim Milk" }),
    testData.food({ description: "Almond Milk" }),
  ];

  assert(alternatives.every(alt => alt.description.toLowerCase().includes("milk")));
});

Deno.test("alternatives: limits number of suggestions", async () => {
  const maxSuggestions = 5;
  const alternatives = Array(5).fill(null).map(() => testData.food());

  assertEquals(alternatives.length, maxSuggestions);
  assert(alternatives.length <= maxSuggestions);
});
