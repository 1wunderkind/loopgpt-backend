/**
 * TheLoop Tracker - Food Resolver Integration
 * 
 * This module provides helper functions to integrate the 1,000-food resolver
 * into the tracker_log_food function with graceful fallback to the existing
 * tracker_foods table.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findFood, foodToLegacyFormat } from "./food_lookup_helper.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Enhanced food lookup with resolver + database fallback
 */
export async function lookupFoodForTracker(
  foodName: string,
  userId?: string
): Promise<{
  food_id: number | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number;
  source: "resolver" | "database" | "not_found";
}> {
  // Try food resolver first
  try {
    const food = await findFood(foodName, userId);
    
    if (food) {
      console.log(`✅ Found "${foodName}" in resolver (ID: ${food.id})`);
      return {
        food_id: food.id,
        calories_per_100g: food.kcal,
        protein_per_100g: food.protein,
        carbs_per_100g: food.carbs,
        fat_per_100g: food.fat,
        fiber_per_100g: food.fiber || 0,
        sugar_per_100g: food.sugar || 0,
        source: "resolver",
      };
    }
  } catch (error) {
    console.error("Food resolver error, falling back to database:", error);
  }
  
  // Fallback to tracker_foods database
  try {
    const { data: foodData, error: foodError } = await supabase
      .from("tracker_foods")
      .select("*")
      .ilike("name", `%${foodName}%`)
      .limit(1)
      .single();
    
    if (foodData && !foodError) {
      console.log(`✅ Found "${foodName}" in database (ID: ${foodData.id})`);
      return {
        food_id: foodData.id,
        calories_per_100g: foodData.calories_per_100g,
        protein_per_100g: foodData.protein_per_100g,
        carbs_per_100g: foodData.carbs_per_100g,
        fat_per_100g: foodData.fat_per_100g,
        fiber_per_100g: foodData.fiber_per_100g || 0,
        sugar_per_100g: foodData.sugar_per_100g || 0,
        source: "database",
      };
    }
  } catch (error) {
    console.error("Database lookup error:", error);
  }
  
  // Not found in either source
  console.warn(`⚠️  Food not found: "${foodName}"`);
  return {
    food_id: null,
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    fiber_per_100g: 0,
    sugar_per_100g: 0,
    source: "not_found",
  };
}

/**
 * Unit conversion helper
 */
export function convertToGrams(quantity: number, unit: string): number {
  const UNIT_CONVERSIONS: Record<string, number> = {
    "g": 1,
    "gram": 1,
    "grams": 1,
    "kg": 1000,
    "kilogram": 1000,
    "oz": 28.35,
    "ounce": 28.35,
    "lb": 453.59,
    "pound": 453.59,
    "ml": 1,
    "milliliter": 1,
    "cup": 240,
    "tbsp": 15,
    "tablespoon": 15,
    "tsp": 5,
    "teaspoon": 5,
  };
  
  const normalizedUnit = unit.toLowerCase().trim();
  const conversion = UNIT_CONVERSIONS[normalizedUnit];
  
  if (conversion) {
    return quantity * conversion;
  }
  
  // Default: assume grams
  console.warn(`Unknown unit "${unit}", assuming grams`);
  return quantity;
}

