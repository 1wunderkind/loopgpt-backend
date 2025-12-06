/**
 * LoopKitchen Recipes Tool
 * 
 * Advanced recipe generation with chaos mode, soft constraints, and widget support.
 * Powered by LeftoverGPT prompts from LoopKitchen.
 */

import {
  // Types
  RecipeCardCompact,
  InfoMessage,
  Widget,
  // Prompts
  LEFTOVERGPT_LIST_SYSTEM,
  LEFTOVERGPT_LIST_USER,
  // Utilities
  callModelWithRetry,
} from "../_shared/loopkitchen/index.ts";
import { generateRecipesCacheKey } from "./cacheKey.ts";
import { cacheGet, cacheSet } from "./cache.ts";
import { categorizeError, logStructuredError, logSuccess } from "./errorTypes.ts";
import { logIngredientSubmission, logRecipeEvent } from "../_shared/analytics/index.ts";

// ============================================================================
// Types
// ============================================================================

export interface GenerateRecipesInput {
  ingredients: string[];
  vibes?: string[];
  timeLimit?: number;
  dietConstraints?: string[];
  notes?: string;
  count?: number; // Number of recipes to generate (3-8)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate slug-based ID from recipe title
 */
function generateSlugId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return `${slug}-${index}`;
}

/**
 * Validate and normalize input
 */
function validateInput(params: any): GenerateRecipesInput {
  if (!params.ingredients || !Array.isArray(params.ingredients) || params.ingredients.length === 0) {
    throw new Error("ingredients array is required and must not be empty");
  }
  
  return {
    ingredients: params.ingredients,
    vibes: params.vibes || [],
    timeLimit: params.timeLimit || null,
    dietConstraints: params.dietConstraints || [],
    notes: params.notes || '',
    count: Math.min(Math.max(params.count || 5, 3), 8), // 3-8 recipes
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate recipes with LoopKitchen's chaos mode and soft constraints
 */
export async function generateRecipes(params: any): Promise<{ widgets: Widget[] }> {
  const startTime = Date.now();
  
  try {
    console.log("[loopkitchen_recipes.generate] Starting...", { params });
    
    // Validate input
    const input = validateInput(params);
    
    // Log ingredient submission (analytics)
    logIngredientSubmission({
      userId: params.userId || null,
      sessionId: params.sessionId || null,
      sourceGpt: 'LeftoverGPT',
      ingredients: input.ingredients.map(ing => ({ name: ing, raw: ing })),
      locale: params.locale || null,
    }).catch(err => console.error('[Analytics] Failed to log ingredient submission:', err));
    
    // Check cache first
    const cacheKey = generateRecipesCacheKey(input);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const widgets = JSON.parse(cached);
      logSuccess("loopkitchen_recipes.generate", duration, {
        widgetCount: widgets.length,
        cached: true,
      });
      return { widgets };
    }
    
    // Build prompts
    const systemPrompt = LEFTOVERGPT_LIST_SYSTEM;
    const userPrompt = LEFTOVERGPT_LIST_USER(
      input.ingredients,
      input.vibes,
      input.timeLimit,
      input.dietConstraints,
      input.notes
    );
    
    console.log("[loopkitchen_recipes.generate] Calling OpenAI...");
    
    // Call OpenAI with retry logic
    interface RecipeResponse {
      recipes: Array<{
        id?: string;
        title: string;
        shortDescription?: string;
        chaosRating: number;
        timeMinutes: number;
        difficulty: 'easy' | 'medium' | 'hard';
        dietTags: string[];
        primaryIngredients?: string[];
        vibes?: string[];
      }>;
    }
    
    const response = await callModelWithRetry<RecipeResponse>(
      systemPrompt,
      userPrompt,
      {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 2000,
      },
      2 // max retries
    );
    
    // Handle empty response (unsafe ingredients)
    if (!response.recipes || response.recipes.length === 0) {
      const infoMessage: InfoMessage = {
        type: 'InfoMessage',
        severity: 'warning',
        title: 'No Recipes Generated',
        message: 'The ingredients provided cannot be safely combined into recipes. Please try different ingredients.',
        actionLabel: 'Try Again',
      };
      
      const duration = Date.now() - startTime;
      logSuccess("loopkitchen_recipes.generate", duration, {
        widgetCount: 1,
        infoMessage: true,
      });
      
      return { widgets: [infoMessage] };
    }
    
    // Map to RecipeCardCompact widgets with soft constraint flags
    const widgets: RecipeCardCompact[] = response.recipes.map((recipe, index) => {
      const id = recipe.id || generateSlugId(recipe.title, index);
      
      // Check soft constraints
      const overTimeLimit = input.timeLimit && recipe.timeMinutes > input.timeLimit;
      const matchesDiet = input.dietConstraints.length === 0 || 
        input.dietConstraints.some(constraint => 
          recipe.dietTags.some(tag => 
            tag.toLowerCase().includes(constraint.toLowerCase())
          )
        );
      
      return {
        type: 'RecipeCardCompact',
        id,
        title: recipe.title,
        shortDescription: recipe.shortDescription,
        chaosRating: recipe.chaosRating,
        timeMinutes: recipe.timeMinutes,
        difficulty: recipe.difficulty,
        dietTags: recipe.dietTags,
        primaryIngredients: recipe.primaryIngredients,
        vibes: recipe.vibes,
        // Soft constraint flags
        overTimeLimit: overTimeLimit || undefined,
        requestedTimeLimit: overTimeLimit ? input.timeLimit : undefined,
        matchesDiet: input.dietConstraints.length > 0 ? matchesDiet : undefined,
        requestedDiet: input.dietConstraints.length > 0 ? input.dietConstraints.join(', ') : undefined,
      };
    });
    
    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(widgets), 86400);
    
    const duration = Date.now() - startTime;
    logSuccess("loopkitchen_recipes.generate", duration, {
      widgetCount: widgets.length,
      cached: false,
    });
    
    // Log recipe generation events (analytics)
    for (const widget of widgets) {
      if (widget.type === 'RecipeCardCompact') {
        logRecipeEvent({
          userId: params.userId || null,
          sessionId: params.sessionId || null,
          recipeId: widget.data.id,
          recipeTitle: widget.data.title,
          eventType: 'generated',
          chaosRatingShown: widget.data.chaosRating,
          sourceGpt: 'LeftoverGPT',
          responseTimeMs: duration,
        }).catch(err => console.error('[Analytics] Failed to log recipe event:', err));
      }
    }
    
    return { widgets };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "loopkitchen_recipes.generate");
    
    // Log structured error
    logStructuredError(categorized, true, duration);
    
    // Return InfoMessage widget for errors
    const errorMessage: InfoMessage = {
      type: 'InfoMessage',
      severity: 'error',
      title: 'Recipe Generation Failed',
      message: `Unable to generate recipes: ${categorized.userMessage}`,
      actionLabel: 'Try Again',
    };
    
    return { widgets: [errorMessage] };
  }
}
