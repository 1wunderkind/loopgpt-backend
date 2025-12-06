/**
 * LoopKitchen Recipe Details Tool
 * 
 * Generate full recipe details with ingredient split (have vs need),
 * nutrition analysis, and grocery list.
 */

import {
  // Types
  RecipeCardDetailed,
  NutritionSummary,
  GroceryList,
  InfoMessage,
  Widget,
  // Prompts
  LEFTOVERGPT_DETAIL_SYSTEM,
  LEFTOVERGPT_DETAIL_USER,
  NUTRITIONGPT_SYSTEM,
  NUTRITIONGPT_USER,
  GROCERYGPT_SYSTEM,
  GROCERYGPT_USER,
  // Utilities
  callModelWithRetry,
} from "../_shared/loopkitchen/index.ts";
import { categorizeError, logStructuredError, logSuccess } from "./errorTypes.ts";

// ============================================================================
// Types
// ============================================================================

export interface GetRecipeDetailsInput {
  recipeId: string;
  recipeTitle?: string; // If not in ID, provide title
  ingredients?: string[]; // Context from list generation
  vibes?: string[];
  chaosTarget?: number; // Requested chaos level (1-10)
  timeLimit?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract recipe title from slug-based ID
 */
function extractTitleFromId(recipeId: string): string {
  // Remove trailing index number
  const withoutIndex = recipeId.replace(/-\d+$/, '');
  
  // Convert slug to title case
  return withoutIndex
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate input
 */
function validateInput(params: any): GetRecipeDetailsInput {
  if (!params.recipeId) {
    throw new Error("recipeId is required");
  }
  
  return {
    recipeId: params.recipeId,
    recipeTitle: params.recipeTitle || extractTitleFromId(params.recipeId),
    ingredients: params.ingredients || [],
    vibes: params.vibes || [],
    chaosTarget: params.chaosTarget || null,
    timeLimit: params.timeLimit || null,
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get detailed recipe with nutrition and grocery list
 */
export async function getRecipeDetails(params: any): Promise<{ widgets: Widget[] }> {
  const startTime = Date.now();
  
  try {
    console.log("[loopkitchen_recipe_details.get] Starting...", { params });
    
    // Validate input
    const input = validateInput(params);
    
    // Build prompts for recipe detail
    const detailSystemPrompt = LEFTOVERGPT_DETAIL_SYSTEM;
    const detailUserPrompt = LEFTOVERGPT_DETAIL_USER(
      input.recipeTitle,
      input.ingredients,
      input.vibes,
      input.chaosTarget,
      input.timeLimit
    );
    
    console.log("[loopkitchen_recipe_details.get] Calling OpenAI for recipe details...");
    
    // Call OpenAI for recipe details
    interface RecipeDetailResponse {
      title: string;
      description: string;
      servings: number;
      timeMinutes: number;
      chaosRating: number;
      difficulty: 'easy' | 'medium' | 'hard';
      ingredientsHave: Array<{ name: string; quantity: string }>;
      ingredientsNeed: Array<{ name: string; quantity: string }>;
      instructions: string[];
      proTip?: string;
    }
    
    const recipeDetail = await callModelWithRetry<RecipeDetailResponse>(
      detailSystemPrompt,
      detailUserPrompt,
      {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
      },
      2
    );
    
    // Build prompts for nutrition analysis
    const nutritionSystemPrompt = NUTRITIONGPT_SYSTEM;
    const nutritionUserPrompt = NUTRITIONGPT_USER(
      recipeDetail.title,
      recipeDetail.servings,
      [...recipeDetail.ingredientsHave, ...recipeDetail.ingredientsNeed]
    );
    
    console.log("[loopkitchen_recipe_details.get] Calling OpenAI for nutrition...");
    
    // Call OpenAI for nutrition (parallel with grocery list)
    const [nutritionResponse, groceryResponse] = await Promise.all([
      callModelWithRetry<{
        servings: number;
        totalNutrition: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g?: number;
          sugar_g?: number;
        };
        perServing: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g?: number;
          sugar_g?: number;
        };
        dietTags: string[];
        confidence: 'low' | 'medium' | 'high';
      }>(
        nutritionSystemPrompt,
        nutritionUserPrompt,
        {
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 1000,
        },
        2
      ),
      
      // Build grocery list from ingredientsNeed
      (async () => {
        if (recipeDetail.ingredientsNeed.length === 0) {
          return null;
        }
        
        const grocerySystemPrompt = GROCERYGPT_SYSTEM;
        const groceryUserPrompt = GROCERYGPT_USER(
          recipeDetail.title,
          recipeDetail.ingredientsNeed
        );
        
        return await callModelWithRetry<{
          categories: Array<{
            name: string;
            items: Array<{
              name: string;
              quantity: string;
              checked: boolean;
            }>;
          }>;
        }>(
          grocerySystemPrompt,
          groceryUserPrompt,
          {
            model: 'gpt-4o-mini',
            temperature: 0.3,
            maxTokens: 1000,
          },
          2
        );
      })(),
    ]);
    
    // Build widgets
    const widgets: Widget[] = [];
    
    // 1. RecipeCardDetailed
    const recipeWidget: RecipeCardDetailed = {
      type: 'RecipeCardDetailed',
      id: input.recipeId,
      title: recipeDetail.title,
      description: recipeDetail.description,
      servings: recipeDetail.servings,
      timeMinutes: recipeDetail.timeMinutes,
      chaosRating: recipeDetail.chaosRating,
      difficulty: recipeDetail.difficulty,
      ingredientsHave: recipeDetail.ingredientsHave,
      ingredientsNeed: recipeDetail.ingredientsNeed,
      instructions: recipeDetail.instructions,
      proTip: recipeDetail.proTip,
    };
    widgets.push(recipeWidget);
    
    // 2. NutritionSummary
    const nutritionWidget: NutritionSummary = {
      type: 'NutritionSummary',
      servings: nutritionResponse.servings,
      totalNutrition: nutritionResponse.totalNutrition,
      perServing: nutritionResponse.perServing,
      dietTags: nutritionResponse.dietTags,
      confidence: nutritionResponse.confidence,
    };
    widgets.push(nutritionWidget);
    
    // 3. GroceryList (if needed)
    if (groceryResponse) {
      const groceryWidget: GroceryList = {
        type: 'GroceryList',
        categories: groceryResponse.categories,
      };
      widgets.push(groceryWidget);
    }
    
    const duration = Date.now() - startTime;
    logSuccess("loopkitchen_recipe_details.get", duration, {
      widgetCount: widgets.length,
    });
    
    return { widgets };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "loopkitchen_recipe_details.get");
    
    // Log structured error
    logStructuredError(categorized, true, duration);
    
    // Return InfoMessage widget for errors
    const errorMessage: InfoMessage = {
      type: 'InfoMessage',
      severity: 'error',
      title: 'Recipe Details Failed',
      message: `Unable to load recipe details: ${categorized.userMessage}`,
      actionLabel: 'Back to Recipes',
    };
    
    return { widgets: [errorMessage] };
  }
}
