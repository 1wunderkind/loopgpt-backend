#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Generate Food Dictionary from USDA Database
 * 
 * Converts data/foods@v1.json (1,000 foods) into TypeScript dictionary format
 * for use in the deterministic nutrition engine.
 * 
 * Input: data/foods@v1.json
 * Output: supabase/functions/_shared/nutrition/dictionary.generated.ts
 */

interface FoodV1 {
  id: number;
  name: string;
  aliases: string[];
  group: string;
  measures: Array<{
    label: string;
    grams: number;
  }>;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface FoodEntry {
  canonicalName: string;
  displayName: string;
  baseUnit: string;
  gramsPerUnit: number;
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  flags: {
    isVegan?: boolean;
    isVegetarian?: boolean;
    isDairy?: boolean;
    isGlutenFree?: boolean;
    isAnimalProduct?: boolean;
  };
}

// ============================================================================
// Food Group to Flags Mapping
// ============================================================================

function getFoodFlags(group: string, name: string): FoodEntry["flags"] {
  const flags: FoodEntry["flags"] = {};
  
  // Animal products
  if (group === "meat" || group === "dairy") {
    flags.isAnimalProduct = true;
    flags.isVegetarian = false;
    flags.isVegan = false;
  }
  
  // Dairy
  if (group === "dairy") {
    flags.isDairy = true;
    flags.isVegetarian = true;
  }
  
  // Vegan/Vegetarian
  if (group === "fruit" || group === "veg" || group === "grain") {
    flags.isVegan = true;
    flags.isVegetarian = true;
    flags.isGlutenFree = group !== "grain"; // Most grains have gluten
  }
  
  // Fats (check for animal-based)
  if (group === "fat") {
    const animalFats = ["butter", "lard", "tallow", "ghee", "cream"];
    const isAnimalFat = animalFats.some(af => name.toLowerCase().includes(af));
    
    if (isAnimalFat) {
      flags.isAnimalProduct = true;
      flags.isVegetarian = true;
      flags.isVegan = false;
    } else {
      flags.isVegan = true;
      flags.isVegetarian = true;
    }
  }
  
  // Condiments (mostly vegan)
  if (group === "condiment") {
    const animalCondiments = ["mayo", "mayonnaise", "fish sauce", "oyster sauce"];
    const isAnimalCondiment = animalCondiments.some(ac => name.toLowerCase().includes(ac));
    
    if (isAnimalCondiment) {
      flags.isVegetarian = false;
      flags.isVegan = false;
    } else {
      flags.isVegan = true;
      flags.isVegetarian = true;
    }
  }
  
  return flags;
}

// ============================================================================
// Convert Food to Dictionary Entry
// ============================================================================

function convertFood(food: FoodV1): [string, FoodEntry] {
  const canonicalName = food.name.toLowerCase().trim();
  const displayName = food.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Use first measure as default, or 100g if no measures
  const defaultMeasure = food.measures[0] || { label: "g", grams: 100 };
  const gramsPerUnit = defaultMeasure.grams;
  
  // Nutrition data in foods@v1.json is per 100g
  // We need to convert to per-gram, then the engine will scale by quantity
  const perGram = {
    calories: food.kcal / 100,
    protein_g: food.protein / 100,
    carbs_g: food.carbs / 100,
    fat_g: food.fat / 100,
    fiber_g: food.fiber / 100,
    sugar_g: food.sugar / 100,
    sodium_mg: food.sodium / 100,
  };
  
  const entry: FoodEntry = {
    canonicalName,
    displayName,
    baseUnit: "g",  // Always use grams as base unit
    gramsPerUnit: 1,  // 1 gram per unit
    nutrition: perGram,  // Per-gram nutrition values
    flags: getFoodFlags(food.group, food.name),
  };
  
  return [canonicalName, entry];
}

// ============================================================================
// Generate Synonym Map
// ============================================================================

function generateSynonymMap(foods: FoodV1[]): Map<string, string> {
  const synonymMap = new Map<string, string>();
  
  for (const food of foods) {
    const canonicalName = food.name.toLowerCase().trim();
    
    // Add aliases
    for (const alias of food.aliases) {
      const normalizedAlias = alias.toLowerCase().trim();
      if (normalizedAlias !== canonicalName) {
        synonymMap.set(normalizedAlias, canonicalName);
      }
    }
    
    // Add plural form if not already in aliases
    const plural = canonicalName + "s";
    if (!food.aliases.some(a => a.toLowerCase() === plural)) {
      synonymMap.set(plural, canonicalName);
    }
  }
  
  return synonymMap;
}

// ============================================================================
// Generate TypeScript Code
// ============================================================================

function generateTypeScriptCode(
  foodEntries: Map<string, FoodEntry>,
  synonymMap: Map<string, string>
): string {
  let code = `/**
 * Auto-generated Food Dictionary
 * 
 * Generated from: data/foods@v1.json (1,000 foods)
 * Generated at: ${new Date().toISOString()}
 * 
 * DO NOT EDIT MANUALLY - Run scripts/generate-food-dictionary.ts to regenerate
 */

import type { FoodEntry } from "./types.ts";

// ============================================================================
// Canonical Food Database (${foodEntries.size} foods)
// ============================================================================

export const FOOD_DATABASE: Record<string, FoodEntry> = {\n`;

  // Sort foods alphabetically
  const sortedEntries = Array.from(foodEntries.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  for (const [canonicalName, entry] of sortedEntries) {
    code += `  "${canonicalName}": {\n`;
    code += `    canonicalName: "${entry.canonicalName}",\n`;
    code += `    displayName: "${entry.displayName}",\n`;
    code += `    baseUnit: "${entry.baseUnit}",\n`;
    code += `    gramsPerUnit: ${entry.gramsPerUnit},\n`;
    code += `    nutrition: {\n`;
    code += `      calories: ${entry.nutrition.calories.toFixed(2)},\n`;
    code += `      protein_g: ${entry.nutrition.protein_g.toFixed(2)},\n`;
    code += `      carbs_g: ${entry.nutrition.carbs_g.toFixed(2)},\n`;
    code += `      fat_g: ${entry.nutrition.fat_g.toFixed(2)},\n`;
    code += `      fiber_g: ${entry.nutrition.fiber_g.toFixed(2)},\n`;
    code += `      sugar_g: ${entry.nutrition.sugar_g.toFixed(2)},\n`;
    code += `      sodium_mg: ${entry.nutrition.sodium_mg.toFixed(2)},\n`;
    code += `    },\n`;
    code += `    flags: ${JSON.stringify(entry.flags, null, 6).replace(/\n/g, '\n    ')},\n`;
    code += `  },\n`;
  }
  
  code += `};\n\n`;
  
  // Add synonym map
  code += `// ============================================================================\n`;
  code += `// Synonym Map (${synonymMap.size} synonyms)\n`;
  code += `// ============================================================================\n\n`;
  code += `export const SYNONYM_MAP: Record<string, string> = {\n`;
  
  const sortedSynonyms = Array.from(synonymMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  for (const [synonym, canonical] of sortedSynonyms) {
    code += `  "${synonym}": "${canonical}",\n`;
  }
  
  code += `};\n\n`;
  
  // Add normalization function
  code += `// ============================================================================\n`;
  code += `// Ingredient Normalization\n`;
  code += `// ============================================================================\n\n`;
  code += `/**\n`;
  code += ` * Normalize ingredient name to canonical form\n`;
  code += ` * \n`;
  code += ` * Steps:\n`;
  code += ` * 1. Lowercase and trim\n`;
  code += ` * 2. Check synonym map\n`;
  code += ` * 3. Return canonical name or original if not found\n`;
  code += ` */\n`;
  code += `export function normalizeIngredientName(name: string): string {\n`;
  code += `  const normalized = name.toLowerCase().trim();\n`;
  code += `  return SYNONYM_MAP[normalized] || normalized;\n`;
  code += `}\n`;
  
  return code;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("🔄 Generating food dictionary from USDA database...\n");
  
  // Read foods@v1.json
  const inputPath = "./data/foods@v1.json";
  console.log(`📖 Reading ${inputPath}...`);
  const foodsJson = await Deno.readTextFile(inputPath);
  const foods: FoodV1[] = JSON.parse(foodsJson);
  console.log(`✅ Loaded ${foods.length} foods\n`);
  
  // Convert to dictionary format
  console.log("🔄 Converting to dictionary format...");
  const foodEntries = new Map<string, FoodEntry>();
  
  for (const food of foods) {
    const [canonicalName, entry] = convertFood(food);
    foodEntries.set(canonicalName, entry);
  }
  console.log(`✅ Converted ${foodEntries.size} food entries\n`);
  
  // Generate synonym map
  console.log("🔄 Generating synonym map...");
  const synonymMap = generateSynonymMap(foods);
  console.log(`✅ Generated ${synonymMap.size} synonyms\n`);
  
  // Generate TypeScript code
  console.log("🔄 Generating TypeScript code...");
  const tsCode = generateTypeScriptCode(foodEntries, synonymMap);
  
  // Write output
  const outputPath = "./supabase/functions/_shared/nutrition/dictionary.generated.ts";
  console.log(`📝 Writing to ${outputPath}...`);
  await Deno.writeTextFile(outputPath, tsCode);
  console.log(`✅ Generated ${outputPath}\n`);
  
  // Statistics
  console.log("📊 Statistics:");
  console.log(`   Foods: ${foodEntries.size}`);
  console.log(`   Synonyms: ${synonymMap.size}`);
  console.log(`   Total lookups: ${foodEntries.size + synonymMap.size}`);
  console.log(`   File size: ${(tsCode.length / 1024).toFixed(2)} KB\n`);
  
  console.log("✅ Done!");
}

if (import.meta.main) {
  main().catch(console.error);
}
