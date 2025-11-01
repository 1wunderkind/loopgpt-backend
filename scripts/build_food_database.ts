#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * LoopGPT Food Database Builder
 * Expand from 107 → 1,000+ foods using USDA FoodData Central
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/build_food_database.ts \
 *     --input=data \
 *     --existing=data/existing_107_foods.json \
 *     --limit=1000 \
 *     --version=v1
 */

import { loadUSDAData, filterCommonFoods } from "./src/ingest_usda.ts";
import { normalizeName, generateAliases, classifyGroup, defaultMeasures } from "./src/utils.ts";
import { buildNGramIndex, getIndexStats } from "./src/generate_index.ts";

interface Food {
  id: number;
  name: string;
  aliases?: string[];
  group: string;
  measures?: Array<{ label: string; grams: number }>;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface ExistingFood {
  id: string;
  name: string;
  name_variations: string[];
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number;
  common_servings: Array<{ name: string; grams: number }>;
}

// Parse command line arguments
const args = Object.fromEntries(
  Deno.args.map((a) => {
    const [key, value] = a.split("=");
    return [key.replace(/^--/, ""), value];
  })
);

const INPUT_DIR = args.input ?? "./data";
const EXISTING_FILE = args.existing ?? "./data/existing_107_foods.json";
const LIMIT = Number(args.limit ?? 1000);
const VERSION = args.version ?? "v1";
const OUT_DIR = "./data";

console.log("🧮 LoopGPT Food Database Builder");
console.log("=================================");
console.log(`Input directory: ${INPUT_DIR}`);
console.log(`Existing foods: ${EXISTING_FILE}`);
console.log(`Target count: ${LIMIT}`);
console.log(`Version: ${VERSION}`);
console.log("");

// Ensure output directory exists
await Deno.mkdir(OUT_DIR, { recursive: true });

/**
 * Load existing 107 foods
 */
async function loadExistingFoods(): Promise<Food[]> {
  console.log("📦 Loading existing 107 foods...");
  
  const json = await Deno.readTextFile(EXISTING_FILE);
  const existing: ExistingFood[] = JSON.parse(json);
  
  // Normalize category names to canonical 8 groups
  const categoryMap: Record<string, string> = {
    "fruits": "fruit",
    "vegetables": "veg",
    "proteins": "meat",
    "grains": "grain",
    "dairy": "dairy",
    "fats": "fat",
    "condiments": "condiment",
    "misc": "misc",
  };
  
  const foods: Food[] = existing.map((food, index) => ({
    id: index + 1,
    name: normalizeName(food.name),
    aliases: food.name_variations.length > 0 ? food.name_variations : generateAliases(food.name),
    group: categoryMap[food.category] || classifyGroup(food.category),
    measures: food.common_servings.length > 0 
      ? food.common_servings.map(s => ({ label: s.name, grams: s.grams }))
      : defaultMeasures(categoryMap[food.category] || "misc"),
    kcal: Math.round(food.calories_per_100g),
    protein: Math.round(food.protein_per_100g * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * 10) / 10,
    fat: Math.round(food.fat_per_100g * 10) / 10,
    fiber: Math.round(food.fiber_per_100g * 10) / 10,
    sugar: Math.round(food.sugar_per_100g * 10) / 10,
    sodium: 0, // Not in existing schema
  }));
  
  console.log(`✅ Loaded ${foods.length} existing foods`);
  return foods;
}

/**
 * Main build function
 */
async function build() {
  // Load existing foods
  const existingFoods = await loadExistingFoods();
  const existingNames = new Set(existingFoods.map(f => f.name));
  
  // Load USDA data
  const usdaFoods = await loadUSDAData(INPUT_DIR);
  
  // Filter to common foods
  const commonFoods = filterCommonFoods(usdaFoods, LIMIT * 2); // Get 2x to account for duplicates
  
  console.log(`📊 Filtered to ${commonFoods.length} common USDA foods`);
  console.log("");
  
  // Merge with existing foods
  const foods: Food[] = [...existingFoods];
  let nextId = existingFoods.length + 1;
  
  console.log("🔄 Merging USDA foods...");
  
  for (const usdaFood of commonFoods) {
    if (foods.length >= LIMIT) break;
    
    const name = normalizeName(usdaFood.description);
    
    // Skip if duplicate
    if (existingNames.has(name)) {
      continue;
    }
    
    // Skip if too similar to existing
    const isDuplicate = existingFoods.some(existing => {
      const similarity = calculateSimilarity(name, existing.name);
      return similarity > 0.8;
    });
    
    if (isDuplicate) {
      continue;
    }
    
    existingNames.add(name);
    
    const group = classifyGroup(usdaFood.category);
    
    foods.push({
      id: nextId++,
      name,
      aliases: generateAliases(name),
      group,
      measures: defaultMeasures(group),
      kcal: Math.round(usdaFood.nutrients.kcal),
      protein: Math.round(usdaFood.nutrients.protein * 10) / 10,
      carbs: Math.round(usdaFood.nutrients.carbs * 10) / 10,
      fat: Math.round(usdaFood.nutrients.fat * 10) / 10,
      fiber: Math.round(usdaFood.nutrients.fiber * 10) / 10,
      sugar: Math.round(usdaFood.nutrients.sugar * 10) / 10,
      sodium: Math.round(usdaFood.nutrients.sodium * 10) / 10,
    });
  }
  
  console.log(`✅ Built database with ${foods.length} foods (${foods.length - existingFoods.length} new)`);
  console.log("");
  
  // Write output
  const foodsPath = `${OUT_DIR}/foods@${VERSION}.json`;
  await Deno.writeTextFile(foodsPath, JSON.stringify(foods, null, 0));
  
  const fileInfo = await Deno.stat(foodsPath);
  const fileSizeKB = Math.round(fileInfo.size / 1024);
  
  console.log(`✅ Wrote ${foods.length} foods → ${foodsPath} (${fileSizeKB} KB)`);
  
  // Generate statistics
  const groupCounts = foods.reduce((acc, food) => {
    acc[food.group] = (acc[food.group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("");
  console.log("📊 Food groups distribution:");
  for (const [group, count] of Object.entries(groupCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${group.padEnd(12)} ${count.toString().padStart(4)} foods`);
  }
  
  // Write manifest
  const manifest = {
    version: VERSION,
    count: foods.length,
    existing_count: existingFoods.length,
    new_count: foods.length - existingFoods.length,
    groups: groupCounts,
    generated_at: new Date().toISOString(),
  };
  
  const manifestPath = `${OUT_DIR}/manifest@${VERSION}.json`;
  await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log("");
  console.log(`✅ Manifest written → ${manifestPath}`);
  
  // Build n-gram index
  console.log("");
  console.log("🔍 Building n-gram fuzzy search index...");
  
  const index = buildNGramIndex(foods);
  const stats = getIndexStats(index);
  
  const indexPath = `${OUT_DIR}/index.ngram@${VERSION}.json`;
  await Deno.writeTextFile(indexPath, JSON.stringify(index, null, 0));
  
  const indexFileInfo = await Deno.stat(indexPath);
  const indexSizeKB = Math.round(indexFileInfo.size / 1024);
  
  console.log(`✅ N-gram index built → ${indexPath} (${indexSizeKB} KB)`);
  console.log(`   ${stats.tokenCount} tokens, avg ${stats.avgFoodsPerToken} foods/token`);
  console.log("");
  console.log("🎉 Build complete!");
  
  return foods;
}

/**
 * Calculate similarity between two strings (simple Jaccard)
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

// Run if main module
if (import.meta.main) {
  await build();
}

