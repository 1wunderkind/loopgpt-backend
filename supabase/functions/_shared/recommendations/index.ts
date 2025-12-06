/**
 * LoopGPT Recommendation Engine Integration
 * 
 * Provides personalized recipe scoring using the deployed recommendation engine
 * 
 * Usage:
 *   import { scoreRecipes } from '../_shared/recommendations/index.ts';
 *   
 *   const scoredRecipes = await scoreRecipes({
 *     userId: 'user-123',
 *     recipes: candidateRecipes,
 *     limit: 5
 *   });
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

export interface CandidateRecipe {
  recipe_id: string;
  title: string;
  ingredients: string[];
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface ScoredRecipe {
  recipe_id: string;
  recipe_title: string;
  total_score: number;
  ingredient_match_score: number;
  goal_alignment_score: number;
  behavioral_score: number;
  diversity_score: number;
  match_reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScoreRecipesParams {
  userId: string | null;
  recipes: CandidateRecipe[];
  limit?: number;
}

// ============================================================================
// Supabase Client
// ============================================================================

function getRecommendationClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('[Recommendations] Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Score and rank recipes using the recommendation engine
 * 
 * Returns recipes sorted by total_score (highest first)
 * Falls back to original order if recommendation engine fails or user is anonymous
 */
export async function scoreRecipes(
  params: ScoreRecipesParams
): Promise<ScoredRecipe[]> {
  const { userId, recipes, limit = 10 } = params;
  
  // If no userId, return recipes unsorted (anonymous user)
  if (!userId) {
    console.log('[Recommendations] Anonymous user - skipping personalization');
    return recipes.slice(0, limit).map((recipe, index) => ({
      recipe_id: recipe.recipe_id,
      recipe_title: recipe.title,
      total_score: 50, // Neutral score
      ingredient_match_score: 0,
      goal_alignment_score: 15, // Neutral
      behavioral_score: 10, // Neutral
      diversity_score: 15, // New user
      match_reason: 'No personalization (anonymous user)',
      confidence: 'medium' as const,
    }));
  }
  
  try {
    const client = getRecommendationClient();
    
    // Call recommendation engine
    const { data, error } = await client.rpc('get_recipe_recommendations', {
      p_user_id: userId,
      p_candidate_recipes: recipes,
      p_limit: limit
    });
    
    if (error) {
      console.error('[Recommendations] RPC call failed:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('[Recommendations] No recommendations returned - using fallback');
      // Return original recipes with neutral scores
      return recipes.slice(0, limit).map(recipe => ({
        recipe_id: recipe.recipe_id,
        recipe_title: recipe.title,
        total_score: 50,
        ingredient_match_score: 0,
        goal_alignment_score: 15,
        behavioral_score: 10,
        diversity_score: 15,
        match_reason: 'Fallback scoring',
        confidence: 'medium' as const,
      }));
    }
    
    console.log(`[Recommendations] Scored ${data.length} recipes for user ${userId}`);
    return data as ScoredRecipe[];
    
  } catch (error) {
    console.error('[Recommendations] Failed to score recipes:', error);
    
    // Graceful fallback - return recipes unsorted
    return recipes.slice(0, limit).map(recipe => ({
      recipe_id: recipe.recipe_id,
      recipe_title: recipe.title,
      total_score: 50,
      ingredient_match_score: 0,
      goal_alignment_score: 15,
      behavioral_score: 10,
      diversity_score: 15,
      match_reason: 'Error in recommendation engine',
      confidence: 'low' as const,
    }));
  }
}

/**
 * Get user's ingredient profile for display purposes
 */
export async function getUserIngredientProfile(userId: string) {
  try {
    const client = getRecommendationClient();
    
    const { data, error } = await client.rpc('get_user_ingredient_profile', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('[Recommendations] Failed to get ingredient profile:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[Recommendations] Exception in getUserIngredientProfile:', error);
    return [];
  }
}

/**
 * Get user's recipe preferences for display purposes
 */
export async function getUserRecipePreferences(userId: string) {
  try {
    const client = getRecommendationClient();
    
    const { data, error } = await client.rpc('get_user_recipe_preferences', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('[Recommendations] Failed to get recipe preferences:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('[Recommendations] Exception in getUserRecipePreferences:', error);
    return null;
  }
}
