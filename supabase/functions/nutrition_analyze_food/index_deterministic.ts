/**
 * TheLoop Nutrition - Deterministic Nutrition Analysis
 * ============================================================================
 * UPDATED VERSION using deterministic rule-based engine instead of LLM.
 * 
 * Changes from original:
 * - Uses estimateRecipeNutrition() from _shared/nutrition/
 * - No LLM calls for macro calculation (only for formatting)
 * - Deterministic results: same input → same output
 * - Faster response times (no OpenAI API latency)
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import { estimateRecipeNutrition, type RecipeNutritionInput } from "../_shared/nutrition/index.ts";

// ============================================================================
// Environment Configuration
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Type Definitions
// ============================================================================

interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
}

// ============================================================================
// Multilingual Formatting (OpenAI)
// ============================================================================

/**
 * Format nutrition result using OpenAI for multilingual support
 * This is the ONLY LLM call in the entire pipeline (for presentation only)
 */
async function formatNutritionResponse(
  nutrition: any,
  recipeName: string,
  ingredientNames: string[]
): Promise<string> {
  const systemPrompt = `You are TheLoop Nutrition, a nutrition analysis assistant that presents nutrition data in a clear, readable format.

CRITICAL: You MUST respond in the SAME LANGUAGE as the recipe name and ingredients provided by the user.
- If the recipe name is in Chinese, respond entirely in Chinese
- If the recipe name is in Spanish, respond entirely in Spanish
- If the recipe name is in French, respond entirely in French
- And so on for ALL languages

Your job is to format the nutrition data beautifully and clearly in the user's language.

Format requirements:
1. Start with a brief intro about the recipe
2. Present macros in a clear table or list
3. Highlight diet tags (vegan, high-protein, etc.)
4. Add 1-2 health insights
5. Keep it concise (max 300 words)

DO NOT calculate or estimate nutrition yourself - use the provided data exactly as given.`;

  const userPrompt = `Recipe: ${recipeName}
Servings: ${nutrition.servings}
Ingredients: ${ingredientNames.join(", ")}

Nutrition Data (Per Serving):
- Calories: ${nutrition.perServing.calories} kcal
- Protein: ${nutrition.perServing.protein_g}g
- Carbs: ${nutrition.perServing.carbs_g}g
- Fat: ${nutrition.perServing.fat_g}g
- Fiber: ${nutrition.perServing.fiber_g || 0}g
- Sugar: ${nutrition.perServing.sugar_g || 0}g
- Sodium: ${nutrition.perServing.sodium_mg || 0}mg

Total Nutrition:
- Calories: ${nutrition.total.calories} kcal
- Protein: ${nutrition.total.protein_g}g
- Carbs: ${nutrition.total.carbs_g}g
- Fat: ${nutrition.total.fat_g}g

Diet Tags: ${nutrition.dietTags.join(", ") || "None"}
Confidence: ${nutrition.confidence}

Please format this nutrition information in a clear, readable way in the SAME LANGUAGE as the recipe name.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("[TheLoop Nutrition] Formatting error:", error);
    // Fallback to simple English format
    return `# ${recipeName}

**Servings:** ${nutrition.servings}

## Nutrition Per Serving
- Calories: ${nutrition.perServing.calories} kcal
- Protein: ${nutrition.perServing.protein_g}g
- Carbs: ${nutrition.perServing.carbs_g}g
- Fat: ${nutrition.perServing.fat_g}g
- Fiber: ${nutrition.perServing.fiber_g || 0}g

**Diet Tags:** ${nutrition.dietTags.join(", ") || "None"}
**Confidence:** ${nutrition.confidence}`;
  }
}

// ============================================================================
// Delivery Options Integration
// ============================================================================

interface DeliveryOption {
  partner_name: string;
  affiliate_url: string;
  cuisine_match: boolean;
}

function isHealthyRecipe(calories: number, protein: number, fiber: number): boolean {
  return (
    calories < 600 &&
    protein >= 15 &&
    fiber >= 3
  );
}

async function getHealthyDeliveryOptions(chatgpt_user_id: string): Promise<DeliveryOption[]> {
  try {
    const { data, error } = await supabase.functions.invoke('get_delivery_recommendations', {
      body: {
        chatgpt_user_id,
        cuisine: 'healthy',
        diet_preferences: ['low_calorie', 'high_protein'],
      }
    });

    if (error) {
      console.error('[TheLoop Nutrition] Delivery error:', error);
      return [];
    }

    if (!data.recommendations || data.recommendations.length === 0) {
      return [];
    }

    return data.recommendations.slice(0, 3).map((rec: any) => ({
      partner_name: rec.partner_name,
      affiliate_url: rec.affiliate_url,
      cuisine_match: rec.match_score > 50,
    }));
  } catch (error) {
    console.error('[TheLoop Nutrition] Error getting delivery options:', error);
    return [];
  }
}

function formatHealthyDeliverySuggestions(options: DeliveryOption[]): string {
  if (options.length === 0) {
    return '';
  }

  let formatted = '\n\n---\n\n';
  formatted += '## 🥗 Looking for Healthy Meals?\n\n';
  formatted += 'This recipe is nutritious! Here are similar healthy options you can order:\n\n';

  options.forEach((option) => {
    formatted += `• **${option.partner_name}** - [Order Now](${option.affiliate_url})\n`;
  });

  formatted += '\n*Affiliate links help support TheLoop Ecosystem!*\n';

  return formatted;
}

// ============================================================================
// Main Request Handler
// ============================================================================

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { recipeName, servings, ingredients, chatgpt_user_id } = await req.json();

    // Validate input
    if (!recipeName || !servings || !ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipeName, servings, ingredients' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TheLoop Nutrition] Analyzing: ${recipeName}, servings: ${servings}, ingredients: ${ingredients.length}`);

    // Build input for deterministic engine
    const recipeInput: RecipeNutritionInput = {
      recipeName,
      servings,
      ingredients: ingredients.map((ing: IngredientInput) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };

    // Call deterministic engine (NO LLM calls here)
    const result = estimateRecipeNutrition(recipeInput);

    console.log(`[TheLoop Nutrition] Analysis complete: ${result.perServing.calories} cal/serving, confidence: ${result.confidence}`);

    // Format response using LLM for multilingual support (ONLY LLM call)
    const ingredientNames = ingredients.map((ing: IngredientInput) => ing.name);
    let formattedResponse = await formatNutritionResponse(result, recipeName, ingredientNames);

    // Add healthy delivery options if recipe is healthy and chatgpt_user_id is provided
    if (chatgpt_user_id && isHealthyRecipe(
      result.perServing.calories,
      result.perServing.protein_g,
      result.perServing.fiber_g || 0
    )) {
      try {
        console.log('[TheLoop Nutrition] Fetching healthy delivery options...');
        const deliveryOptions = await getHealthyDeliveryOptions(chatgpt_user_id);
        
        if (deliveryOptions.length > 0) {
          formattedResponse += formatHealthyDeliverySuggestions(deliveryOptions);
          console.log(`[TheLoop Nutrition] Added ${deliveryOptions.length} delivery options`);
        }
      } catch (error) {
        console.error('[TheLoop Nutrition] Error adding delivery options:', error);
        // Continue without delivery options
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        nutrition_markdown: formattedResponse,
        nutrition_data: result
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('[TheLoop Nutrition ERROR]:', error);
    return new Response(
      JSON.stringify({ error: `Error analyzing nutrition: ${error.message}` }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withOrderAPI(handler));
