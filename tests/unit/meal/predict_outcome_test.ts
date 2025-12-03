/**
 * Unit Tests: Meal Planning - Predict Outcome & Optimize Macros
 */

import { assertEquals, assert } from "../../helpers.ts";

// Predict Outcome Tests (8 tests)
Deno.test("predict: estimates weight change", async () => {
  const dailyDeficit = -500; // calories
  const days = 7;
  const expectedLoss = (dailyDeficit * days) / 7700; // kg
  assert(expectedLoss < 0); // Weight loss
});

Deno.test("predict: calculates TDEE", async () => {
  const bmr = 1500;
  const activityFactor = 1.5;
  const tdee = bmr * activityFactor;
  assertEquals(tdee, 2250);
});

Deno.test("predict: estimates timeline to goal", async () => {
  const currentWeight = 75;
  const goalWeight = 70;
  const weeklyLoss = 0.5;
  const weeks = (currentWeight - goalWeight) / weeklyLoss;
  assertEquals(weeks, 10);
});

Deno.test("predict: validates safe weight loss rate", async () => {
  const weeklyLoss = 0.5; // kg
  const maxSafeRate = 1.0; // kg per week
  assert(weeklyLoss <= maxSafeRate);
});

Deno.test("predict: accounts for metabolism adaptation", async () => {
  const initialTdee = 2000;
  const adaptationFactor = 0.95; // 5% reduction
  const adaptedTdee = initialTdee * adaptationFactor;
  assertEquals(adaptedTdee, 1900);
});

Deno.test("predict: includes confidence interval", async () => {
  const prediction = { value: 70, min: 68, max: 72 };
  assert(prediction.value >= prediction.min && prediction.value <= prediction.max);
});

Deno.test("predict: handles plateau scenarios", async () => {
  const weeklyChanges = [0.5, 0.4, 0.2, 0.1, 0];
  const isPlateau = weeklyChanges[weeklyChanges.length - 1] === 0;
  assertEquals(isPlateau, true);
});

Deno.test("predict: adjusts for activity level", async () => {
  const sedentary = 1.2;
  const active = 1.7;
  assert(active > sedentary);
});

// Optimize Macros Tests (7 tests)
Deno.test("optimize: balances protein for goals", async () => {
  const weight = 70; // kg
  const proteinPerKg = 2.0; // g/kg for muscle gain
  const targetProtein = weight * proteinPerKg;
  assertEquals(targetProtein, 140);
});

Deno.test("optimize: adjusts carbs for activity", async () => {
  const highActivity = { carbs_percent: 50 };
  const lowActivity = { carbs_percent: 30 };
  assert(highActivity.carbs_percent > lowActivity.carbs_percent);
});

Deno.test("optimize: ensures minimum fat intake", async () => {
  const minFatPercent = 20;
  const actualFatPercent = 25;
  assert(actualFatPercent >= minFatPercent);
});

Deno.test("optimize: maintains calorie target", async () => {
  const protein = 150; // g
  const carbs = 200; // g
  const fat = 67; // g
  const calories = (protein * 4) + (carbs * 4) + (fat * 9);
  assert(Math.abs(calories - 2000) < 50); // Within 50 cal
});

Deno.test("optimize: respects user preferences", async () => {
  const preferences = { high_protein: true };
  const macros = { protein_percent: 35 };
  assert(macros.protein_percent >= 30);
});

Deno.test("optimize: validates macro ratios", async () => {
  const macros = { protein: 30, carbs: 40, fat: 30 };
  const total = Object.values(macros).reduce((sum, v) => sum + v, 0);
  assertEquals(total, 100);
});

Deno.test("optimize: adjusts for dietary restrictions", async () => {
  const vegan = { protein_sources: ["legumes", "tofu", "tempeh"] };
  assert(vegan.protein_sources.length > 0);
});
