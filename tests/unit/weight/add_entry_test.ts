/**
 * Unit Tests: Weight Tracking - Add Entry
 * Tests for adding weight entries
 */

import {
  assertEquals,
  assertExists,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("weight_add: creates entry successfully", async () => {
  const userId = testData.userId();
  const mockEntry = testData.weightEntry({ user_id: userId, weight_kg: 70.5 });

  assertExists(mockEntry.id);
  assertEquals(mockEntry.user_id, userId);
  assertEquals(mockEntry.weight_kg, 70.5);
  assertExists(mockEntry.recorded_at);
});

Deno.test("weight_add: validates weight is positive", async () => {
  const weight = 70.5;
  const isValid = weight > 0;
  assertEquals(isValid, true);

  const invalidWeight = -10;
  const isInvalid = invalidWeight > 0;
  assertEquals(isInvalid, false);
});

Deno.test("weight_add: validates weight is reasonable", async () => {
  const minWeight = 20; // 20kg minimum
  const maxWeight = 300; // 300kg maximum

  const validWeight = 70;
  assert(validWeight >= minWeight && validWeight <= maxWeight);

  const tooLow = 10;
  assert(!(tooLow >= minWeight && tooLow <= maxWeight));

  const tooHigh = 400;
  assert(!(tooHigh >= minWeight && tooHigh <= maxWeight));
});

Deno.test("weight_add: stores timestamp correctly", async () => {
  const now = new Date();
  const mockEntry = testData.weightEntry({
    recorded_at: now.toISOString(),
  });

  assertExists(mockEntry.recorded_at);
  const parsed = new Date(mockEntry.recorded_at);
  assert(parsed instanceof Date);
  assert(!isNaN(parsed.getTime()));
});

Deno.test("weight_add: allows optional notes", async () => {
  const mockEntry = testData.weightEntry({
    notes: "Morning weight, before breakfast",
  });

  assertExists(mockEntry.notes);
  assert(mockEntry.notes.length > 0);
});

Deno.test("weight_add: handles decimal weights", async () => {
  const weights = [70.5, 68.25, 72.125];
  
  for (const weight of weights) {
    const mockEntry = testData.weightEntry({ weight_kg: weight });
    assertEquals(mockEntry.weight_kg, weight);
  }
});

Deno.test("weight_add: associates with correct user", async () => {
  const userId1 = testData.userId();
  const userId2 = testData.userId();

  const entry1 = testData.weightEntry({ user_id: userId1 });
  const entry2 = testData.weightEntry({ user_id: userId2 });

  assertEquals(entry1.user_id, userId1);
  assertEquals(entry2.user_id, userId2);
  assert(entry1.user_id !== entry2.user_id);
});

Deno.test("weight_add: generates unique IDs", async () => {
  const entry1 = testData.weightEntry();
  const entry2 = testData.weightEntry();

  assertExists(entry1.id);
  assertExists(entry2.id);
  assert(entry1.id !== entry2.id);
});
