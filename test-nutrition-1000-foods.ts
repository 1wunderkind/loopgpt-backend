#!/usr/bin/env -S deno run --allow-read

/**
 * Test Nutrition Engine with 1,000-Food Database
 *
 * Verifies that the nutrition engine correctly uses the new 1,000-food database
 */

import { estimateRecipeNutrition } from "./supabase/functions/_shared/nutrition/index.ts";
import {
  FOOD_DATABASE,
  SYNONYM_MAP,
} from "./supabase/functions/_shared/nutrition/dictionary.ts";

console.log("🧪 Testing Nutrition Engine with 1,000-Food Database\n");

// ============================================================================
// Test 1: Database Size
// ============================================================================

console.log("📊 Test 1: Database Size");
console.log(`   Foods in database: ${Object.keys(FOOD_DATABASE).length}`);
console.log(`   Synonyms in map: ${Object.keys(SYNONYM_MAP).length}`);
console.log(
  `   Total lookups: ${
    Object.keys(FOOD_DATABASE).length + Object.keys(SYNONYM_MAP).length
  }`,
);

if (Object.keys(FOOD_DATABASE).length === 1000) {
  console.log("   ✅ PASS: Database has 1,000 foods\n");
} else {
  console.log(
    `   ❌ FAIL: Expected 1,000 foods, got ${
      Object.keys(FOOD_DATABASE).length
    }\n`,
  );
}

// ============================================================================
// Test 2: Sample Foods Lookup
// ============================================================================

console.log("📊 Test 2: Sample Foods Lookup");

const sampleFoods = [
  "chicken breast",
  "apple",
  "rice",
  "broccoli",
  "salmon",
  "olive oil",
  "cheese",
  "eggs",
  "banana",
  "almonds",
];

let foundCount = 0;
for (const food of sampleFoods) {
  const entry = FOOD_DATABASE[food];
  if (entry) {
    console.log(`   ✅ Found: ${food} (${entry.displayName})`);
    foundCount++;
  } else {
    console.log(`   ❌ Missing: ${food}`);
  }
}

console.log(`   Found ${foundCount}/${sampleFoods.length} sample foods\n`);

// ============================================================================
// Test 3: Recipe Nutrition Calculation
// ============================================================================

console.log("📊 Test 3: Recipe Nutrition Calculation");

const testRecipe = {
  recipeName: "Chicken and Rice Bowl",
  servings: 2,
  ingredients: [
    { name: "chicken breast", quantity: 200, unit: "g" },
    { name: "rice", quantity: 1, unit: "cup" },
    { name: "broccoli", quantity: 100, unit: "g" },
    { name: "olive oil", quantity: 1, unit: "tbsp" },
  ],
};

try {
  const result = estimateRecipeNutrition(testRecipe);

  console.log(`   Recipe: ${testRecipe.recipeName}`);
  console.log(`   Servings: ${result.servings}`);
  console.log(`   Confidence: ${result.confidence}`);
  console.log(`   \n   Per Serving:`);
  console.log(`     Calories: ${result.perServing.calories} kcal`);
  console.log(`     Protein: ${result.perServing.protein_g}g`);
  console.log(`     Carbs: ${result.perServing.carbs_g}g`);
  console.log(`     Fat: ${result.perServing.fat_g}g`);
  console.log(`   \n   Total:`);
  console.log(`     Calories: ${result.total.calories} kcal`);
  console.log(`     Protein: ${result.total.protein_g}g`);
  console.log(`     Carbs: ${result.total.carbs_g}g`);
  console.log(`     Fat: ${result.total.fat_g}g`);
  console.log(`   \n   Diet Tags: ${result.dietTags.join(", ") || "none"}`);
  console.log(
    `   \n   Matched Ingredients: ${result.matchedIngredients}/${testRecipe.ingredients.length}`,
  );

  if (result.matchedIngredients === testRecipe.ingredients.length) {
    console.log(`   ✅ PASS: All ingredients matched\n`);
  } else {
    console.log(`   ⚠️  WARNING: Not all ingredients matched\n`);
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
}

// ============================================================================
// Test 4: Synonym Matching
// ============================================================================

console.log("📊 Test 4: Synonym Matching");

const synonymTests = [
  { input: "oranges", expected: "orange" },
  { input: "apples", expected: "apple" },
  { input: "chicken breasts", expected: "chicken breast" },
];

let synonymPassCount = 0;
for (const test of synonymTests) {
  const canonical = SYNONYM_MAP[test.input];
  if (canonical === test.expected) {
    console.log(`   ✅ "${test.input}" → "${canonical}"`);
    synonymPassCount++;
  } else {
    console.log(
      `   ❌ "${test.input}" → "${canonical}" (expected "${test.expected}")`,
    );
  }
}

console.log(
  `   Passed ${synonymPassCount}/${synonymTests.length} synonym tests\n`,
);

// ============================================================================
// Test 5: Coverage Analysis
// ============================================================================

console.log("📊 Test 5: Coverage Analysis");

const foodGroups: Record<string, number> = {};

for (const [name, entry] of Object.entries(FOOD_DATABASE)) {
  // Count by first word as rough category
  const category = name.split(" ")[0];
  foodGroups[category] = (foodGroups[category] || 0) + 1;
}

const topCategories = Object.entries(foodGroups)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log("   Top 10 food categories:");
for (const [category, count] of topCategories) {
  console.log(`     ${category}: ${count} foods`);
}

console.log("\n✅ All tests completed!");

// ============================================================================
// Summary
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("📊 SUMMARY");
console.log("=".repeat(60));
console.log(`Total Foods: ${Object.keys(FOOD_DATABASE).length}`);
console.log(`Total Synonyms: ${Object.keys(SYNONYM_MAP).length}`);
console.log(
  `Total Lookups: ${
    Object.keys(FOOD_DATABASE).length + Object.keys(SYNONYM_MAP).length
  }`,
);
console.log(`Sample Foods Found: ${foundCount}/${sampleFoods.length}`);
console.log(`Synonym Tests Passed: ${synonymPassCount}/${synonymTests.length}`);
console.log("=".repeat(60));
