/**
 * =====================================================
 * FOOD RESOLVER
 * =====================================================
 * Singleton class for fast food lookup and fuzzy matching
 * Loads food database into memory for quick searches
 * Used by nutrition comparison and recommendation functions
 * =====================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get("SUPABASE_URL" )!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Food item structure
 */
export interface FoodItem {
  id: number | string;
  name: string;
  aliases?: string[];
  group?: string;
  category?: string;
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
 * FoodResolver - Singleton class for food database operations
 */
export class FoodResolver {
  private static instance: FoodResolver;
  private foods: FoodItem[] = [];
  private loaded: boolean = false;
  private supabase;

  private constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FoodResolver {
    if (!FoodResolver.instance) {
      FoodResolver.instance = new FoodResolver();
    }
    return FoodResolver.instance;
  }

  /**
   * Load food database into memory
   */
  public async load(): Promise<void> {
    if (this.loaded) {
      return; // Already loaded
    }

    try {
      // Load from tracker_foods table
      const { data, error } = await this.supabase
        .from('tracker_foods')
        .select('*')
        .eq('verified', true)
        .order('name');

      if (error) {
        console.error('Error loading foods:', error);
        throw error;
      }

      // Transform to FoodItem format
      this.foods = (data || []).map((food: any) => ({
        id: food.id,
        name: food.name,
        aliases: food.name_variations || [],
        group: food.category,
        category: food.category,
        measures: food.common_servings || [{ label: 'g', grams: 1 }],
        kcal: food.calories_per_100g,
        protein: food.protein_per_100g,
        carbs: food.carbs_per_100g,
        fat: food.fat_per_100g,
        fiber: food.fiber_per_100g || 0,
        sugar: food.sugar_per_100g || 0,
        sodium: 0
      }));

      this.loaded = true;
      console.log(`Loaded ${this.foods.length} foods into memory`);
    } catch (error) {
      console.error('Failed to load food database:', error);
      throw error;
    }
  }

  /**
   * Find foods using fuzzy matching
   * 
   * @param query - Search query
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of matching foods, sorted by relevance
   */
  public findFuzzy(query: string, limit: number = 10): FoodItem[] {
    if (!this.loaded) {
      console.warn('Food database not loaded, returning empty results');
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Score each food based on match quality
    const scored = this.foods.map(food => {
      let score = 0;
      const foodName = food.name.toLowerCase();
      
      // Exact match (highest score)
      if (foodName === searchTerm) {
        score = 1000;
      }
      // Starts with query
      else if (foodName.startsWith(searchTerm)) {
        score = 500;
      }
      // Contains query
      else if (foodName.includes(searchTerm)) {
        score = 250;
      }
      // Check aliases
      else if (food.aliases) {
        for (const alias of food.aliases) {
          const aliasLower = alias.toLowerCase();
          if (aliasLower === searchTerm) {
            score = 900;
            break;
          } else if (aliasLower.startsWith(searchTerm)) {
            score = 450;
            break;
          } else if (aliasLower.includes(searchTerm)) {
            score = 200;
            break;
          }
        }
      }
      
      // Fuzzy matching - check for word matches
      if (score === 0) {
        const queryWords = searchTerm.split(' ');
        const foodWords = foodName.split(' ');
        
        let matchedWords = 0;
        for (const queryWord of queryWords) {
          if (queryWord.length < 3) continue; // Skip very short words
          
          for (const foodWord of foodWords) {
            if (foodWord.includes(queryWord) || queryWord.includes(foodWord)) {
              matchedWords++;
              break;
            }
          }
        }
        
        if (matchedWords > 0) {
          score = matchedWords * 50;
        }
      }
      
      return { food, score };
    });

    // Filter out zero scores and sort by score descending
    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.food);

    return results;
  }

  /**
   * Find exact food by name
   * 
   * @param name - Exact food name
   * @returns Food item or null if not found
   */
  public findExact(name: string): FoodItem | null {
    if (!this.loaded) {
      console.warn('Food database not loaded');
      return null;
    }

    const searchTerm = name.toLowerCase().trim();
    
    // Try exact match
    const exactMatch = this.foods.find(food => 
      food.name.toLowerCase() === searchTerm
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try alias match
    const aliasMatch = this.foods.find(food => 
      food.aliases?.some(alias => alias.toLowerCase() === searchTerm)
    );
    
    return aliasMatch || null;
  }

  /**
   * Get all foods in a category
   * 
   * @param category - Food category
   * @returns Array of foods in that category
   */
  public getByCategory(category: string): FoodItem[] {
    if (!this.loaded) {
      console.warn('Food database not loaded');
      return [];
    }

    return this.foods.filter(food => 
      food.category?.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get total number of foods loaded
   */
  public getCount(): number {
    return this.foods.length;
  }

  /**
   * Check if database is loaded
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Reload the food database (force refresh)
   */
  public async reload(): Promise<void> {
    this.loaded = false;
    this.foods = [];
    await this.load();
  }
}
