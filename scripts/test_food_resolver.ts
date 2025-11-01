#!/usr/bin/env -S deno run --allow-read --allow-net
/**
 * Food Resolver Performance Benchmark & Validation Tests
 * 
 * Usage:
 *   deno run --allow-read --allow-net scripts/test_food_resolver.ts
 */

// Mock CDN by serving local files
const LOCAL_DATA_DIR = "./data";

// Create a simple file server for testing
async function loadLocalJSON(filename: string) {
  const path = `${LOCAL_DATA_DIR}/${filename}`;
  const content = await Deno.readTextFile(path);
  return JSON.parse(content);
}

// Mock fetch for local testing
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request) => {
  const urlStr = url.toString();
  
  if (urlStr.includes("/manifest@")) {
    const data = await loadLocalJSON("manifest@v1.json");
    return new Response(JSON.stringify(data), { status: 200 });
  }
  
  if (urlStr.includes("/foods@")) {
    const data = await loadLocalJSON("foods@v1.json");
    return new Response(JSON.stringify(data), { status: 200 });
  }
  
  if (urlStr.includes("/index.ngram@")) {
    const data = await loadLocalJSON("index.ngram@v1.json");
    return new Response(JSON.stringify(data), { status: 200 });
  }
  
  return originalFetch(url);
};

// Import the resolver
const { initFoodResolver } = await import("../supabase/lib/food_resolver.ts");

console.log("🧪 Food Resolver Performance Benchmark & Validation");
console.log("====================================================");
console.log("");

// Initialize resolver
const resolver = initFoodResolver("https://example.com/cdn", "v1");

// Test 1: Cold load performance
console.log("📊 Test 1: Cold Load Performance");
console.log("----------------------------------");

const coldStartTime = performance.now();
await resolver.load();
const coldLoadTime = Math.round(performance.now() - coldStartTime);

const manifest = await resolver.getManifest();
console.log(`✅ Loaded ${manifest.count} foods in ${coldLoadTime}ms`);

if (coldLoadTime > 60) {
  console.log(`⚠️  WARNING: Cold load time (${coldLoadTime}ms) exceeds target (60ms)`);
} else {
  console.log(`✅ PASS: Cold load within target (< 60ms)`);
}

console.log("");

// Test 2: Exact match performance
console.log("📊 Test 2: Exact Match Performance");
console.log("-----------------------------------");

const exactTests = [
  "chicken",
  "broccoli",
  "apple",
  "milk",
  "rice",
];

let totalExactTime = 0;

for (const query of exactTests) {
  const startTime = performance.now();
  const result = await resolver.findExact(query);
  const searchTime = performance.now() - startTime;
  totalExactTime += searchTime;
  
  if (result) {
    console.log(`✅ "${query}" → ${result.name} (${searchTime.toFixed(2)}ms)`);
  } else {
    console.log(`❌ "${query}" → not found (${searchTime.toFixed(2)}ms)`);
  }
}

const avgExactTime = totalExactTime / exactTests.length;
console.log(`📊 Average exact match time: ${avgExactTime.toFixed(2)}ms`);

if (avgExactTime > 1) {
  console.log(`⚠️  WARNING: Exact match time (${avgExactTime.toFixed(2)}ms) exceeds target (1ms)`);
} else {
  console.log(`✅ PASS: Exact match within target (< 1ms)`);
}

console.log("");

// Test 3: Fuzzy search performance
console.log("📊 Test 3: Fuzzy Search Performance");
console.log("------------------------------------");

const fuzzyTests = [
  "chiken",      // Misspelled chicken
  "brocoli",     // Misspelled broccoli
  "aple",        // Misspelled apple
  "whole milk",  // Multi-word
  "brown rice",  // Multi-word
];

let totalFuzzyTime = 0;

for (const query of fuzzyTests) {
  const startTime = performance.now();
  const results = await resolver.findFuzzy(query, 3);
  const searchTime = performance.now() - startTime;
  totalFuzzyTime += searchTime;
  
  console.log(`🔍 "${query}" (${searchTime.toFixed(2)}ms):`);
  for (const { food, score } of results.slice(0, 3)) {
    console.log(`   ${score.toFixed(2)} - ${food.name}`);
  }
}

const avgFuzzyTime = totalFuzzyTime / fuzzyTests.length;
console.log(`📊 Average fuzzy search time: ${avgFuzzyTime.toFixed(2)}ms`);

if (avgFuzzyTime > 5) {
  console.log(`⚠️  WARNING: Fuzzy search time (${avgFuzzyTime.toFixed(2)}ms) exceeds target (5ms)`);
} else {
  console.log(`✅ PASS: Fuzzy search within target (< 5ms)`);
}

console.log("");

// Test 4: Data integrity
console.log("📊 Test 4: Data Integrity");
console.log("-------------------------");

const allFoods = await resolver.getAll();

// Check for duplicates
const names = allFoods.map(f => f.name.toLowerCase());
const uniqueNames = new Set(names);

if (names.length !== uniqueNames.size) {
  console.log(`❌ FAIL: Found ${names.length - uniqueNames.size} duplicate names`);
} else {
  console.log(`✅ PASS: No duplicate names (${names.length} unique foods)`);
}

// Check for missing nutrition data
const missingNutrition = allFoods.filter(f => 
  f.kcal === 0 && f.protein === 0 && f.carbs === 0 && f.fat === 0
);

if (missingNutrition.length > 0) {
  console.log(`⚠️  WARNING: ${missingNutrition.length} foods have no nutrition data`);
} else {
  console.log(`✅ PASS: All foods have nutrition data`);
}

// Check group distribution
const groups = allFoods.reduce((acc, f) => {
  acc[f.group] = (acc[f.group] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log(`📊 Group distribution:`);
for (const [group, count] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${group.padEnd(12)} ${count.toString().padStart(4)} foods`);
}

console.log("");

// Test 5: Memory usage
console.log("📊 Test 5: Memory Usage");
console.log("-----------------------");

const memUsage = (Deno.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
console.log(`📊 Heap memory used: ${memUsage} MB`);

if (parseFloat(memUsage) > 50) {
  console.log(`⚠️  WARNING: Memory usage (${memUsage} MB) is high`);
} else {
  console.log(`✅ PASS: Memory usage within reasonable limits`);
}

console.log("");

// Summary
console.log("====================================================");
console.log("📊 BENCHMARK SUMMARY");
console.log("====================================================");
console.log(`Cold Load:      ${coldLoadTime}ms (target: < 60ms)`);
console.log(`Exact Match:    ${avgExactTime.toFixed(2)}ms (target: < 1ms)`);
console.log(`Fuzzy Search:   ${avgFuzzyTime.toFixed(2)}ms (target: < 5ms)`);
console.log(`Total Foods:    ${allFoods.length}`);
console.log(`Memory Usage:   ${memUsage} MB`);
console.log("");

const allPassed = 
  coldLoadTime <= 60 &&
  avgExactTime <= 1 &&
  avgFuzzyTime <= 5 &&
  names.length === uniqueNames.size;

if (allPassed) {
  console.log("✅ ALL TESTS PASSED!");
} else {
  console.log("⚠️  SOME TESTS FAILED - Review warnings above");
}

console.log("");

