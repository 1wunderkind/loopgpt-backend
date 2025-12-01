/**
 * =====================================================
 * FOOD LOOKUP HELPER
 * =====================================================
 * Helper functions for food search and autocomplete
 * Used by food_search endpoint for frontend autocomplete
 * 
 * UPDATED: Now uses smart_food_search() PostgreSQL function
 * with advanced full-text search, fuzzy matching, and typo tolerance
 * =====================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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
 * Uses the smart_food_search() PostgreSQL function which combines:
 * - Exact matching (score: 1.0)
 * - Prefix matching (score: 0.9)
 * - Full-text search (score: 0.7 * ts_rank)
 * - Fuzzy/typo matching (score: 0.5 * similarity)
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

    const searchTerm = query.trim();
    
    // Use the smart_food_search PostgreSQL function
    const { data, error } = await supabase
      .rpc('smart_food_search', {
        search_query: searchTerm,
        result_limit: limit
      });
    
    if (error) {
      console.error('Error in smart_food_search:', error);
      
      // Fallback to basic search if smart search fails
      return await fallbackSearch(searchTerm, limit);
    }
    
    if (!data || data.length === 0) {
      // Log unsuccessful search for analytics
      if (userId) {
        await logFoodSearch(userId, query, false);
      }
      return [];
    }
    
    // Log successful search
    if (userId) {
      await logFoodSearch(userId, query, true);
    }
    
    return transformToSuggestions(data);
  } catch (error) {
    console.error('Error getting food suggestions:', error);
    
    // Fallback to basic search on exception
    return await fallbackSearch(query.trim(), limit);
  }
}

/**
 * Fallback search using basic ILIKE query
 * Used when smart_food_search fails
 */
async function fallbackSearch(
  searchTerm: string,
  limit: number
): Promise<FoodSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('tracker_foods')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .eq('verified', true)
      .order('name')
      .limit(limit);
    
    if (error || !data) {
      return [];
    }
    
    return transformToSuggestions(data);
  } catch (error) {
    console.error('Error in fallback search:', error);
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
