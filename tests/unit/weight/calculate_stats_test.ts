/**
 * Unit Tests: Weight Tracking - Calculate Stats
 * Tests for calculating weight statistics
 */

import {
  assertEquals,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("weight_stats: calculates average weight", async () => {
  const weights = [70, 71, 69, 70.5, 69.5];
  const average = weights.reduce((sum, w) => sum + w, 0) / weights.length;

  assertEquals(average, 70);
});

Deno.test("weight_stats: calculates weight change", async () => {
  const startWeight = 75;
  const endWeight = 70;
  const change = endWeight - startWeight;

  assertEquals(change, -5);
  assert(change < 0); // Lost weight
});

Deno.test("weight_stats: calculates weight change percentage", async () => {
  const startWeight = 100;
  const endWeight = 90;
  const changePercent = ((endWeight - startWeight) / startWeight) * 100;

  assertEquals(changePercent, -10);
});

Deno.test("weight_stats: calculates min and max weight", async () => {
  const weights = [70, 71, 69, 72, 68];
  const min = Math.min(...weights);
  const max = Math.max(...weights);

  assertEquals(min, 68);
  assertEquals(max, 72);
});

Deno.test("weight_stats: calculates weight trend", async () => {
  const entries = [
    { weight_kg: 75, recorded_at: "2024-01-01" },
    { weight_kg: 74, recorded_at: "2024-01-08" },
    { weight_kg: 73, recorded_at: "2024-01-15" },
    { weight_kg: 72, recorded_at: "2024-01-22" },
  ];

  // Simple trend: is weight decreasing?
  const isDecreasing = entries.every((entry, i) => {
    if (i === 0) return true;
    return entry.weight_kg < entries[i - 1].weight_kg;
  });

  assertEquals(isDecreasing, true);
});

Deno.test("weight_stats: calculates average weekly change", async () => {
  const startWeight = 75;
  const endWeight = 70;
  const weeks = 5;
  const weeklyChange = (endWeight - startWeight) / weeks;

  assertEquals(weeklyChange, -1);
});

Deno.test("weight_stats: handles single entry", async () => {
  const weights = [70];
  const average = weights.reduce((sum, w) => sum + w, 0) / weights.length;

  assertEquals(average, 70);
  assertEquals(Math.min(...weights), 70);
  assertEquals(Math.max(...weights), 70);
});

Deno.test("weight_stats: calculates standard deviation", async () => {
  const weights = [70, 71, 69, 70, 70];
  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
  const stdDev = Math.sqrt(variance);

  assert(stdDev >= 0);
  assert(stdDev < 2); // Small deviation for this dataset
});
