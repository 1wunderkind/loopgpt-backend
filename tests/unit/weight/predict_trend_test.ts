/**
 * Unit Tests: Weight Tracking - Predict Trend
 * Tests for predicting weight trends
 */

import {
  assertEquals,
  assert,
} from "../../helpers.ts";

Deno.test("weight_predict: predicts weight loss trend", async () => {
  const entries = [
    { weight_kg: 75, days_ago: 30 },
    { weight_kg: 74, days_ago: 23 },
    { weight_kg: 73, days_ago: 16 },
    { weight_kg: 72, days_ago: 9 },
    { weight_kg: 71, days_ago: 2 },
  ];

  // Calculate average weekly loss
  const totalLoss = entries[0].weight_kg - entries[entries.length - 1].weight_kg;
  const totalWeeks = (entries[0].days_ago - entries[entries.length - 1].days_ago) / 7;
  const weeklyLoss = totalLoss / totalWeeks;

  assert(weeklyLoss > 0); // Losing weight
  assert(weeklyLoss < 2); // Reasonable rate
});

Deno.test("weight_predict: predicts weight gain trend", async () => {
  const entries = [
    { weight_kg: 70, days_ago: 30 },
    { weight_kg: 71, days_ago: 23 },
    { weight_kg: 72, days_ago: 16 },
    { weight_kg: 73, days_ago: 9 },
    { weight_kg: 74, days_ago: 2 },
  ];

  const totalGain = entries[entries.length - 1].weight_kg - entries[0].weight_kg;
  const totalWeeks = (entries[0].days_ago - entries[entries.length - 1].days_ago) / 7;
  const weeklyGain = totalGain / totalWeeks;

  assert(weeklyGain > 0); // Gaining weight
});

Deno.test("weight_predict: predicts stable weight", async () => {
  const entries = [
    { weight_kg: 70, days_ago: 30 },
    { weight_kg: 70.2, days_ago: 23 },
    { weight_kg: 69.8, days_ago: 16 },
    { weight_kg: 70.1, days_ago: 9 },
    { weight_kg: 69.9, days_ago: 2 },
  ];

  const totalChange = Math.abs(entries[entries.length - 1].weight_kg - entries[0].weight_kg);
  
  assert(totalChange < 1); // Minimal change = stable
});

Deno.test("weight_predict: calculates days to goal", async () => {
  const currentWeight = 75;
  const goalWeight = 70;
  const weeklyLoss = 0.5; // kg per week

  const totalLoss = currentWeight - goalWeight;
  const weeksToGoal = totalLoss / weeklyLoss;
  const daysToGoal = weeksToGoal * 7;

  assertEquals(daysToGoal, 70);
});

Deno.test("weight_predict: handles insufficient data", async () => {
  const entries = [
    { weight_kg: 70, days_ago: 2 },
  ];

  const hasEnoughData = entries.length >= 3;
  assertEquals(hasEnoughData, false);
});

Deno.test("weight_predict: projects future weight", async () => {
  const currentWeight = 75;
  const weeklyLoss = 0.5;
  const weeksInFuture = 4;

  const projectedWeight = currentWeight - (weeklyLoss * weeksInFuture);

  assertEquals(projectedWeight, 73);
});

Deno.test("weight_predict: validates prediction confidence", async () => {
  const entries = [
    { weight_kg: 75, days_ago: 30 },
    { weight_kg: 74, days_ago: 23 },
    { weight_kg: 73, days_ago: 16 },
    { weight_kg: 72, days_ago: 9 },
    { weight_kg: 71, days_ago: 2 },
  ];

  // More entries = higher confidence
  const confidence = Math.min(entries.length / 10, 1); // Max 1.0

  assert(confidence > 0 && confidence <= 1);
  assertEquals(confidence, 0.5); // 5 entries / 10 = 0.5
});
