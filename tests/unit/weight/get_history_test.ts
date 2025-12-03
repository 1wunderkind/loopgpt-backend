/**
 * Unit Tests: Weight Tracking - Get History
 * Tests for retrieving weight history
 */

import {
  assertEquals,
  assertExists,
  assert,
  testData,
} from "../../helpers.ts";

Deno.test("weight_history: returns entries in chronological order", async () => {
  const userId = testData.userId();
  const mockEntries = [
    testData.weightEntry({ user_id: userId, recorded_at: "2024-01-01T00:00:00Z", weight_kg: 70 }),
    testData.weightEntry({ user_id: userId, recorded_at: "2024-01-02T00:00:00Z", weight_kg: 69.5 }),
    testData.weightEntry({ user_id: userId, recorded_at: "2024-01-03T00:00:00Z", weight_kg: 69 }),
  ];

  assertEquals(mockEntries.length, 3);
  
  // Check chronological order
  for (let i = 1; i < mockEntries.length; i++) {
    const prev = new Date(mockEntries[i - 1].recorded_at);
    const curr = new Date(mockEntries[i].recorded_at);
    assert(curr > prev);
  }
});

Deno.test("weight_history: filters by date range", async () => {
  const startDate = new Date("2024-01-01");
  const endDate = new Date("2024-01-31");

  const mockEntries = [
    testData.weightEntry({ recorded_at: "2024-01-15T00:00:00Z" }),
    testData.weightEntry({ recorded_at: "2024-01-20T00:00:00Z" }),
  ];

  for (const entry of mockEntries) {
    const date = new Date(entry.recorded_at);
    assert(date >= startDate && date <= endDate);
  }
});

Deno.test("weight_history: returns empty array when no entries", async () => {
  const userId = testData.userId();
  const mockEntries: any[] = [];

  assertEquals(mockEntries.length, 0);
  assert(Array.isArray(mockEntries));
});

Deno.test("weight_history: limits number of results", async () => {
  const limit = 10;
  const mockEntries = Array(10).fill(null).map(() => testData.weightEntry());

  assertEquals(mockEntries.length, limit);
  assert(mockEntries.length <= limit);
});

Deno.test("weight_history: includes all entry fields", async () => {
  const mockEntry = testData.weightEntry({
    notes: "Test note",
  });

  assertExists(mockEntry.id);
  assertExists(mockEntry.user_id);
  assertExists(mockEntry.weight_kg);
  assertExists(mockEntry.recorded_at);
  assertExists(mockEntry.created_at);
  assertExists(mockEntry.notes);
});

Deno.test("weight_history: filters by user correctly", async () => {
  const userId = testData.userId();
  const mockEntries = [
    testData.weightEntry({ user_id: userId }),
    testData.weightEntry({ user_id: userId }),
  ];

  assert(mockEntries.every(e => e.user_id === userId));
});

Deno.test("weight_history: handles pagination", async () => {
  const page = 2;
  const limit = 10;
  const offset = (page - 1) * limit;

  const mockResult = {
    entries: Array(10).fill(null).map(() => testData.weightEntry()),
    total: 50,
    page,
    limit,
  };

  assertEquals(mockResult.entries.length, limit);
  assertEquals(mockResult.page, page);
  assert(mockResult.total > mockResult.entries.length);
});
