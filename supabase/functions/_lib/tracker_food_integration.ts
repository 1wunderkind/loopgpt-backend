/**
 * =====================================================
 * TRACKER FOOD INTEGRATION
 * =====================================================
 * Helper functions for food lookup and unit conversion
 * Used by tracker_log_meal to resolve food names and calculate nutrition
 * =====================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL" )!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Food data structure from tracker_foods table
 */
export interface TrackerFood {
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
  common_servings: Array<{ label: string; grams: number }>;
  data_source: string;
  verified: boolean;
}

/**
 * Lookup food in tracker_foods database with fuzzy matching
 * 
 * @param foodName - Name of food to search for
 * @param userId - User ID for logging (optional)
 * @returns Food data or null if not found
 */
export async function lookupFoodForTracker(
  foodName: string,
  userId?: string
): Promise<TrackerFood | null> {
  try {
    // Normalize search term
    const searchTerm = foodName.toLowerCase().trim();
    
    // First try exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', searchTerm)
      .eq('verified', true)
      .limit(1)
      .single();
    
    if (!exactError && exactMatch) {
      return exactMatch as TrackerFood;
    }
    
    // Try fuzzy search using full-text search
    const { data: fuzzyMatches, error: fuzzyError } = await supabase
      .from('tracker_foods')
      .select('*')
      .textSearch('name', searchTerm, {
        type: 'websearch',
        config: 'english'
      })
      .eq('verified', true)
      .limit(5);
    
    if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
      // Return the first match (most relevant)
      return fuzzyMatches[0] as TrackerFood;
    }
    
    // Try partial match (LIKE search)
    const { data: partialMatches, error: partialError } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .eq('verified', true)
      .limit(5);
    
    if (!partialError && partialMatches && partialMatches.length > 0) {
      return partialMatches[0] as TrackerFood;
    }
    
    // Log search failure for analytics (optional)
    if (userId) {
      await supabase
        .from('food_search_logs')
        .insert({
          user_id: userId,
          query: foodName,
          found: false,
          created_at: new Date().toISOString()
        })
        .catch(() => {
          // Ignore logging errors
        });
    }
    
    return null;
  } catch (error) {
    console.error('Error looking up food:', error);
    return null;
  }
}

/**
 * Convert various quantity units to grams
 * 
 * @param quantity - Amount of food
 * @param unit - Unit of measurement
 * @returns Equivalent weight in grams
 */
export function convertToGrams(quantity: number, unit: string): number {
  const unitLower = unit.toLowerCase().trim();
  
  // Weight units
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
    return quantity;
  }
  
  if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
    return quantity * 1000;
  }
  
  if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
    return quantity * 28.35;
  }
  
  if (unitLower === 'lb' || unitLower === 'pound' || unitLower === 'pounds') {
    return quantity * 453.59;
  }
  
  // Volume units (approximate conversions for common foods)
  if (unitLower === 'cup' || unitLower === 'cups') {
    return quantity * 240; // ~240g for most foods
  }
  
  if (unitLower === 'tbsp' || unitLower === 'tablespoon' || unitLower === 'tablespoons') {
    return quantity * 15;
  }
  
  if (unitLower === 'tsp' || unitLower === 'teaspoon' || unitLower === 'teaspoons') {
    return quantity * 5;
  }
  
  if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
    return quantity; // Assume 1ml = 1g for liquids
  }
  
  if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters') {
    return quantity * 1000;
  }
  
  // Serving/piece units (rough estimates)
  if (unitLower === 'serving' || unitLower === 'servings') {
    return quantity * 100; // Default serving size
  }
  
  if (unitLower === 'piece' || unitLower === 'pieces' || unitLower === 'item' || unitLower === 'items') {
    return quantity * 50; // Default piece size
  }
  
  if (unitLower === 'slice' || unitLower === 'slices') {
    return quantity * 30; // Default slice size
  }
  
  if (unitLower === 'handful' || unitLower === 'handfuls') {
    return quantity * 40;
  }
  
  // Default: assume the quantity is already in grams
  console.warn(`Unknown unit: ${unit}, assuming grams`);
  return quantity;
}

/**
 * Calculate nutrition for a given food and quantity
 * 
 * @param food - Food data from database
 * @param quantity - Amount of food
 * @param unit - Unit of measurement
 * @returns Calculated nutrition values
 */
export function calculateNutrition(
  food: TrackerFood,
  quantity: number,
  unit: string
): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
} {
  const grams = convertToGrams(quantity, unit);
  const multiplier = grams / 100; // Nutrition is per 100g
  
  return {
    calories: Math.round(food.calories_per_100g * multiplier),
    protein_g: parseFloat((food.protein_per_100g * multiplier).toFixed(1)),
    carbs_g: parseFloat((food.carbs_per_100g * multiplier).toFixed(1)),
    fat_g: parseFloat((food.fat_per_100g * multiplier).toFixed(1)),
    fiber_g: parseFloat((food.fiber_per_100g * multiplier).toFixed(1)),
    sugar_g: parseFloat((food.sugar_per_100g * multiplier).toFixed(1)),
  };
}
