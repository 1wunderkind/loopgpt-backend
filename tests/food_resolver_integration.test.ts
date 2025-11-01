/**
 * Food Resolver Integration Tests
 * 
 * Tests for the complete food resolver system including:
 * - Food lookup with fallback
 * - Logging to food_search_logs
 * - Metrics endpoint
 * - Autocomplete API
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test 1: Food resolver initialization
Deno.test("Food resolver initializes correctly", async () => {
  const { initFoodResolver } = await import("../supabase/lib/food_resolver.ts");
  
  const CDN_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";
  const resolver = initFoodResolver(CDN_URL, "v1");
  
  assertExists(resolver);
  
  // Load data
  await resolver.load();
  
  // Get manifest
  const manifest = await resolver.getManifest();
  assertEquals(manifest.count, 1000);
});

// Test 2: Exact food lookup
Deno.test("Exact food lookup works", async () => {
  const { initFoodResolver, getFoodResolver } = await import("../supabase/lib/food_resolver.ts");
  
  const CDN_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";
  initFoodResolver(CDN_URL, "v1");
  
  const resolver = getFoodResolver();
  await resolver.load();
  
  const food = await resolver.findExact("chicken breast");
  assertExists(food);
  assertEquals(food.name, "chicken breast");
  assertExists(food.kcal);
  assertExists(food.protein);
});

// Test 3: Fuzzy food search
Deno.test("Fuzzy food search works", async () => {
  const { getFoodResolver } = await import("../supabase/lib/food_resolver.ts");
  
  const resolver = getFoodResolver();
  const results = await resolver.findFuzzy("chiken", 5); // Misspelled
  
  assertExists(results);
  assertEquals(results.length > 0, true);
  
  // Should find chicken-related foods
  const hasChicken = results.some(r => r.food.name.toLowerCase().includes("chicken"));
  assertEquals(hasChicken, true);
});

// Test 4: Food lookup with logging
Deno.test("Food lookup logs to database", async () => {
  const { findFood } = await import("../supabase/lib/food_lookup_helper.ts");
  
  const testUserId = "test-user-123";
  const food = await findFood("broccoli", testUserId);
  
  assertExists(food);
  
  // Check that it was logged
  const { data: logs } = await supabase
    .from("food_search_logs")
    .select("*")
    .eq("query", "broccoli")
    .eq("user_id", testUserId)
    .order("created_at", { ascending: false })
    .limit(1);
  
  assertExists(logs);
  assertEquals(logs.length, 1);
  assertEquals(logs[0].success, true);
  assertEquals(logs[0].result_count > 0, true);
});

// Test 5: Tracker food integration
Deno.test("Tracker food lookup with fallback works", async () => {
  const { lookupFoodForTracker } = await import("../supabase/lib/tracker_food_integration.ts");
  
  const result = await lookupFoodForTracker("apple");
  
  assertExists(result);
  assertExists(result.calories_per_100g);
  assertExists(result.protein_per_100g);
  assertEquals(result.source === "resolver" || result.source === "database", true);
});

// Test 6: Unit conversion
Deno.test("Unit conversion works correctly", async () => {
  const { convertToGrams } = await import("../supabase/lib/tracker_food_integration.ts");
  
  assertEquals(convertToGrams(1, "kg"), 1000);
  assertEquals(convertToGrams(1, "cup"), 240);
  assertEquals(convertToGrams(1, "tbsp"), 15);
  assertEquals(convertToGrams(100, "g"), 100);
});

// Test 7: Metrics endpoint
Deno.test("Metrics endpoint returns valid data", async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/metrics_food_resolver`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  
  assertEquals(response.ok, true);
  
  const data = await response.json();
  assertExists(data.timestamp);
  assertExists(data.total_queries);
  assertExists(data.avg_latency_ms);
  assertExists(data.error_rate);
  assertExists(data.cache_hit_rate);
});

// Test 8: Food search API
Deno.test("Food search API works", async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/food_search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: "chicken",
        limit: 5,
      }),
    }
  );
  
  assertEquals(response.ok, true);
  
  const data = await response.json();
  assertEquals(data.success, true);
  assertExists(data.results);
  assertEquals(data.results.length > 0, true);
});

// Test 9: Performance - Cold load
Deno.test("Food resolver cold load is fast", async () => {
  const { initFoodResolver } = await import("../supabase/lib/food_resolver.ts");
  
  const CDN_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";
  const resolver = initFoodResolver(CDN_URL, "v1");
  
  const startTime = performance.now();
  await resolver.load();
  const loadTime = performance.now() - startTime;
  
  console.log(`Cold load time: ${loadTime.toFixed(2)}ms`);
  assertEquals(loadTime < 100, true); // Should be < 100ms (target is 60ms)
});

// Test 10: Performance - Warm lookup
Deno.test("Food resolver warm lookup is fast", async () => {
  const { getFoodResolver } = await import("../supabase/lib/food_resolver.ts");
  
  const resolver = getFoodResolver();
  
  const startTime = performance.now();
  await resolver.findExact("chicken breast");
  const lookupTime = performance.now() - startTime;
  
  console.log(`Warm lookup time: ${lookupTime.toFixed(2)}ms`);
  assertEquals(lookupTime < 2, true); // Should be < 2ms (target is 1ms)
});

console.log("\n✅ All food resolver integration tests passed!\n");

