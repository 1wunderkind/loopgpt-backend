/**
 * =====================================================
 * FOOD LOOKUP HELPER
 * =====================================================
 * Helper functions for food search and autocomplete
 * Used by food_search endpoint for frontend autocomplete
 * =====================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL" )!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Food suggestion result structure
 */
export interface FoodSuggestion {
  id: number | string;
  name: string;
  aliases?: string[];
  group?: string;
  measures?: Array<{ label: string; grams: number }>;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium?: number;
}

/**
 * Get food suggestions for autocomplete
 * 
 * @param query - Search query from user
 * @param limit - Maximum number of results (default: 10)
 * @param userId - Optional user ID for logging
 * @returns Array of matching food suggestions
 */
export async function getFoodSuggestions(
  query: string,
  limit: number = 10,
  userId?: string
): Promise<FoodSuggestion[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Strategy 1: Try exact match first
    const { data: exactMatches, error: exactError } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', searchTerm)
      .eq('verified', true)
      .limit(limit);
    
    if (!exactError && exactMatches && exactMatches.length > 0) {
      return transformToSuggestions(exactMatches);
    }
    
    // Strategy 2: Try prefix match (starts with)
    const { data: prefixMatches, error: prefixError } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', `${searchTerm}%`)
      .eq('verified', true)
      .order('name')
      .limit(limit);
    
    if (!prefixError && prefixMatches && prefixMatches.length > 0) {
      return transformToSuggestions(prefixMatches);
    }
    
    // Strategy 3: Try full-text search
    const { data: textMatches, error: textError } = await supabase
      .from('tracker_foods')
      .select('*')
      .textSearch('name', searchTerm, {
        type: 'websearch',
        config: 'english'
      })
      .eq('verified', true)
      .limit(limit);
    
    if (!textError && textMatches && textMatches.length > 0) {
      return transformToSuggestions(textMatches);
    }
    
    // Strategy 4: Try partial match (contains)
    const { data: partialMatches, error: partialError } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .eq('verified', true)
      .order('name')
      .limit(limit);
    
    if (!partialError && partialMatches && partialMatches.length > 0) {
      return transformToSuggestions(partialMatches);
    }
    
    // Log unsuccessful search for analytics
    if (userId) {
      await logFoodSearch(userId, query, false);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting food suggestions:', error);
    return [];
  }
}

/**
 * Transform database results to FoodSuggestion format
 */
function transformToSuggestions(foods: any[]): FoodSuggestion[] {
  return foods.map(food => ({
    id: food.id,
    name: food.name,
    aliases: food.name_variations || [],
    group: food.category,
    measures: food.common_servings || [{ label: 'g', grams: 1 }],
    kcal: food.calories_per_100g,
    protein: food.protein_per_100g,
    carbs: food.carbs_per_100g,
    fat: food.fat_per_100g,
    fiber: food.fiber_per_100g || 0,
    sugar: food.sugar_per_100g || 0,
    sodium: 0
  }));
}

/**
 * Log food search for analytics
 */
async function logFoodSearch(
  userId: string,
  query: string,
  found: boolean
): Promise<void> {
  try {
    await supabase
      .from('food_search_logs')
      .insert({
        user_id: userId,
        query,
        found,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // Ignore logging errors
    console.warn('Failed to log food search:', error);
  }
}

/**
 * Get popular foods (most searched/logged)
 * 
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of popular foods
 */
export async function getPopularFoods(limit: number = 20): Promise<FoodSuggestion[]> {
  try {
    // Get most commonly logged foods
    const { data, error } = await supabase
      .from('tracker_foods')
      .select('*')
      .eq('verified', true)
      .order('name')
      .limit(limit);
    
    if (error) {
      console.error('Error getting popular foods:', error);
      return [];
    }
    
    return transformToSuggestions(data || []);
  } catch (error) {
    console.error('Error getting popular foods:', error);
    return [];
  }
}

/**
 * Get foods by category
 * 
 * @param category - Food category
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of foods in that category
 */
export async function getFoodsByCategory(
  category: string,
  limit: number = 50
): Promise<FoodSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('tracker_foods')
      .select('*')
      .eq('category', category)
      .eq('verified', true)
      .order('name')
      .limit(limit);
    
    if (error) {
      console.error('Error getting foods by category:', error);
      return [];
    }
    
    return transformToSuggestions(data || []);
  } catch (error) {
    console.error('Error getting foods by category:', error);
    return [];
  }
}
