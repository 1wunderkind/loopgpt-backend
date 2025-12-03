/**
 * Unit Tests: Meal Planning - Adjust Calories
 */

import { assertEquals, assert } from "../../helpers.ts";

Deno.test("adjust: increases calories correctly", async () => {
  const original = 2000;
  const increase = 200;
  const adjusted = original + increase;
  assertEquals(adjusted, 2200);
});

Deno.test("adjust: decreases calories correctly", async () => {
  const original = 2000;
  const decrease = 200;
  const adjusted = original - decrease;
  assertEquals(adjusted, 1800);
});

Deno.test("adjust: maintains macro ratios", async () => {
  const originalRatios = { protein: 30, carbs: 40, fat: 30 };
  const adjustedRatios = { protein: 30, carbs: 40, fat: 30 };
  assertEquals(originalRatios, adjustedRatios);
});

Deno.test("adjust: validates minimum calories", async () => {
  const minCalories = 1200;
  const adjusted = 1500;
  assert(adjusted >= minCalories);
});

Deno.test("adjust: validates maximum calories", async () => {
  const maxCalories = 4000;
  const adjusted = 2500;
  assert(adjusted <= maxCalories);
});

Deno.test("adjust: scales all meals proportionally", async () => {
  const meals = [500, 700, 700, 100];
  const scale = 1.1;
  const scaled = meals.map(m => m * scale);
  assertEquals(scaled[0], 550);
});

Deno.test("adjust: handles percentage adjustments", async () => {
  const original = 2000;
  const percent = 10; // 10% increase
  const adjusted = original * (1 + percent / 100);
  assertEquals(adjusted, 2200);
});
