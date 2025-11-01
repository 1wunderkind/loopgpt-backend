/**
 * Food Lookup Helper with Food Resolver Integration
 * 
 * Provides a unified interface for food lookups with:
 * 1. Primary: 1,000-food resolver (CDN-hosted)
 * 2. Fallback: Embedded nutrition data (40+ ingredients)
 * 3. Logging: All queries logged to food_search_logs
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initFoodResolver, getFoodResolver, type Food } from "./food_resolver.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FOOD_CDN_URL = Deno.env.get("FOOD_CDN_URL") || "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";

// Initialize Supabase client with service role for logging
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize food resolver (singleton)
let resolverInitialized = false;

/**
 * Initialize the food resolver (call once per Edge Function)
 */
export async function initFoodLookup() {
  if (!resolverInitialized) {
    initFoodResolver(FOOD_CDN_URL, "v1");
    resolverInitialized = true;
    console.log("✅ Food resolver initialized");
  }
}

/**
 * Log a food search query
 */
async function logFoodSearch(
  query: string,
  resultCount: number,
  latencyMs: number,
  success: boolean,
  userId?: string
) {
  try {
    await supabase.from("food_search_logs").insert({
      query: query.toLowerCase(),
      result_count: resultCount,
      latency_ms: latencyMs,
      success,
      user_id: userId || null,
    });
  } catch (error) {
    console.error("Failed to log food search:", error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Find food using the resolver with fallback to embedded data
 */
export async function findFood(
  name: string,
  userId?: string
): Promise<Food | null> {
  const startTime = performance.now();
  
  try {
    // Ensure resolver is initialized
    await initFoodLookup();
    
    const resolver = getFoodResolver();
    
    // Try exact match first
    let food = await resolver.findExact(name);
    
    // If no exact match, try fuzzy search
    if (!food) {
      const results = await resolver.findFuzzy(name, 1);
      if (results.length > 0 && results[0].score >= 0.5) {
        food = results[0].food;
        console.log(`Fuzzy matched "${name}" → "${food.name}" (score: ${results[0].score})`);
      }
    }
    
    const latencyMs = performance.now() - startTime;
    
    // Log the search
    await logFoodSearch(name, food ? 1 : 0, latencyMs, !!food, userId);
    
    return food;
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    console.error("Food resolver error:", error);
    
    // Log the failure
    await logFoodSearch(name, 0, latencyMs, false, userId);
    
    // Return null - caller should handle fallback
    return null;
  }
}

/**
 * Search for multiple foods (batch operation)
 */
export async function findFoods(
  names: string[],
  userId?: string
): Promise<Array<{ name: string; food: Food | null }>> {
  const results = [];
  
  for (const name of names) {
    const food = await findFood(name, userId);
    results.push({ name, food });
  }
  
  return results;
}

/**
 * Get food suggestions for autocomplete
 */
export async function getFoodSuggestions(
  query: string,
  limit: number = 10,
  userId?: string
): Promise<Food[]> {
  const startTime = performance.now();
  
  try {
    await initFoodLookup();
    
    const resolver = getFoodResolver();
    
    // Try exact match first
    const exactMatch = await resolver.findExact(query);
    if (exactMatch) {
      const latencyMs = performance.now() - startTime;
      await logFoodSearch(query, 1, latencyMs, true, userId);
      return [exactMatch];
    }
    
    // Otherwise return fuzzy matches
    const results = await resolver.findFuzzy(query, limit);
    const foods = results.map(r => r.food);
    
    const latencyMs = performance.now() - startTime;
    await logFoodSearch(query, foods.length, latencyMs, foods.length > 0, userId);
    
    return foods;
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    console.error("Food suggestions error:", error);
    await logFoodSearch(query, 0, latencyMs, false, userId);
    return [];
  }
}

/**
 * Convert food resolver format to legacy nutrition format
 * (for backward compatibility with existing tools)
 */
export function foodToLegacyFormat(food: Food): any {
  return {
    unit: "g",
    gramsPerUnit: 1,
    calories: food.kcal / 100, // Resolver stores per 100g, legacy expects per 1g
    protein_g: food.protein / 100,
    carbs_g: food.carbs / 100,
    fat_g: food.fat / 100,
    fiber_g: (food.fiber || 0) / 100,
    sugar_g: (food.sugar || 0) / 100,
    sodium_mg: (food.sodium || 0) / 100,
    micros: {}, // TODO: Add micronutrients when available
  };
}

