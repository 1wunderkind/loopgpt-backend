/**
 * Recipes Tool - Standalone Version
 * Generate recipes from ingredients using OpenAI
 */

import OpenAI from "https://esm.sh/openai@4.28.0";
import { generateRecipesCacheKey } from "./cacheKey.ts";
import { cacheGet, cacheSet } from "./cache.ts";
import { categorizeError, logStructuredError, logSuccess, logCtaImpression } from "./errorTypes.ts";
import { getFallbackRecipes } from "./fallbacks.ts";
import { generateRecipesCtas, addCtasToResponse } from "./ctaSchemas.ts";
import { scoreRecipes, type CandidateRecipe } from "../_shared/recommendations/index.ts";
import { logIngredientSubmission, logRecipeEvent } from "../_shared/analytics/index.ts";

// Type for recipe generation input
export interface RecipesInput {
  ingredients?: string[];
  count?: number;
  locale?: string;
  dietTags?: string[];
  cuisines?: string[];
  caloriesPerServing?: number;
  dietaryTags?: string[];
  excludeIngredients?: string[];
  maxRecipes?: number;
  difficulty?: string;
  lowEffortMode?: boolean; // Trigger low-effort recipe generation
  maxPrepTime?: number; // Max prep time in minutes for low-effort mode
}

// Simple input validation
function validateRecipesInput(params: any) {
  if (!params.ingredients || !Array.isArray(params.ingredients) || params.ingredients.length === 0) {
    throw new Error("ingredients array is required and must not be empty");
  }
  
  return {
    ingredients: params.ingredients,
    dietaryTags: params.dietaryTags || [],
    excludeIngredients: params.excludeIngredients || [],
    maxRecipes: Math.min(params.maxRecipes || 3, 10),
    difficulty: params.difficulty || "any"
  };
}

// JSON Schema for OpenAI Structured Outputs
const RecipeListJsonSchema = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" }
              },
              required: ["name", "quantity"],
              additionalProperties: false
            }
          },
          instructions: {
            type: "array",
            items: { type: "string" }
          },
          prepTimeMinutes: { type: "number" },
          cookTimeMinutes: { type: "number" },
          servings: { type: "number" },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"]
          }
        },
        required: ["id", "name", "ingredients", "instructions", "prepTimeMinutes", "cookTimeMinutes", "servings", "tags", "difficulty"],
        additionalProperties: false
      }
    }
  },
  required: ["recipes"],
  additionalProperties: false
};

/**
 * Composite tool: Generate recipes WITH nutrition analysis
 */
export async function generateRecipesWithNutrition(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[recipes.generateWithNutrition] Starting composite operation...");
    
    // Step 1: Generate recipes
    const recipes = await generateRecipes(params);
    
    // Step 2: Analyze nutrition for all generated recipes
    const { analyzeNutrition } = await import("./nutrition.ts");
    const analyses = await analyzeNutrition({ recipes });
    
    // Step 3: Merge nutrition data into recipes
    const recipesWithNutrition = recipes.map((recipe: any) => {
      const analysis = analyses.find((a: any) => a.recipeId === recipe.id);
      return {
        ...recipe,
        nutrition: analysis || null
      };
    });
    
    const duration = Date.now() - startTime;
    console.log("[recipes.generateWithNutrition] Success", { recipeCount: recipesWithNutrition.length, duration });
    
    return recipesWithNutrition;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[recipes.generateWithNutrition] Error", { error: error.message, duration });
    throw error;
  }
}

export async function generateRecipes(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[recipes.generate] Starting...", { params });
    
    // Validate input
    const input = validateRecipesInput(params);
    
    // Log ingredient submission (analytics)
    if (params.userId) {
      logIngredientSubmission({
        userId: params.userId,
        sessionId: params.sessionId || null,
        sourceGpt: 'RecipeGPT',
        ingredients: input.ingredients.map((ing: any) => ({
          name: typeof ing === 'string' ? ing : ing.name,
          raw: typeof ing === 'string' ? ing : ing.name,
        })),
        locale: params.locale || null,
      }).catch(err => console.error('[Analytics] Failed to log ingredient submission:', err));
    }
    
    // Check cache first (with smart key generation)
    const cacheKey = generateRecipesCacheKey(input);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const recipes = JSON.parse(cached);
      logSuccess("recipes.generate", duration, {
        recipeCount: recipes.length,
        cached: true,
        fallbackUsed: false,
      });
      return recipes;
    }
    
    // Cache miss - generate recipes
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const client = new OpenAI({ apiKey });
    
    // Build prompts with low-effort mode support
    const isLowEffort = params.lowEffortMode === true;
    const maxPrepTime = params.maxPrepTime || 30;
    
    let systemPrompt: string;
    let userPrompt: string;
    
    if (isLowEffort) {
      // Low-effort mode: quick, easy recipes with common pantry items
      systemPrompt = `Generate ${input.maxRecipes} QUICK and EASY recipe(s) using common pantry items. Focus on:
- Minimal prep time (under ${maxPrepTime} minutes total)
- Simple cooking techniques (no complex steps)
- Common ingredients most people have at home
- Low effort, high satisfaction
${input.dietaryTags.length > 0 ? `Diet: ${input.dietaryTags.join(', ')}. ` : ''}Tag all recipes with "low_effort" and "quick". Return JSON with recipes array.`;

      userPrompt = `Generate ${input.maxRecipes} quick and easy recipe(s) for someone who is tired or wants minimal effort.

Suggested ingredients (use what makes sense): ${input.ingredients.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')}

Requirements:
- Total time (prep + cook): under ${maxPrepTime} minutes
- Difficulty: easy
- Use common pantry staples
- Minimal cleanup
${input.dietaryTags.length > 0 ? `Dietary requirements: ${input.dietaryTags.join(', ')}` : ''}

Examples: scrambled eggs, pasta with butter and cheese, rice bowl, quesadilla, instant ramen upgrade`;
    } else {
      // Normal mode
      systemPrompt = `Generate ${input.maxRecipes} recipe(s) using: ${input.ingredients.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')}. ${input.dietaryTags.length > 0 ? `Diet: ${input.dietaryTags.join(', ')}. ` : ''}${input.excludeIngredients.length > 0 ? `Exclude: ${input.excludeIngredients.join(', ')}. ` : ''}Return JSON with recipes array.`;

      userPrompt = `Generate ${input.maxRecipes} recipe(s) using these ingredients:
${input.ingredients.map((i: any) => `- ${typeof i === 'string' ? i : i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n')}

${input.dietaryTags.length > 0 ? `Dietary requirements: ${input.dietaryTags.join(', ')}` : ''}
${input.excludeIngredients.length > 0 ? `Exclude: ${input.excludeIngredients.join(', ')}` : ''}
${input.difficulty !== 'any' ? `Difficulty level: ${input.difficulty}` : ''}`;
    }

    console.log("[recipes.generate] Calling OpenAI...");
    
    // Call OpenAI with Structured Outputs
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema" as any,
        json_schema: {
          name: "recipe_list",
          strict: true,
          schema: RecipeListJsonSchema,
        },
      } as any,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    let recipes = parsed.recipes || parsed;
    
    // ========================================================================
    // RECOMMENDATION ENGINE INTEGRATION
    // ========================================================================
    
    if (params.userId && recipes.length > 0) {
      console.log('[recipes.generate] Scoring recipes with recommendation engine...');
      
      // Prepare candidate recipes for scoring
      const candidateRecipes: CandidateRecipe[] = recipes.map((recipe: any) => ({
        recipe_id: recipe.id,
        title: recipe.name,
        ingredients: recipe.ingredients.map((ing: any) => ing.name),
        calories: 500, // Default estimate
        protein_g: 25,
        carbs_g: 50,
        fat_g: 15,
      }));
      
      // Score recipes
      const scoredRecipes = await scoreRecipes({
        userId: params.userId,
        recipes: candidateRecipes,
        limit: recipes.length,
      });
      
      // Create score map
      const scoreMap = new Map(scoredRecipes.map(sr => [sr.recipe_id, sr]));
      
      // Add scores to recipes and sort by score
      recipes = recipes.map((recipe: any) => {
        const scoreData = scoreMap.get(recipe.id);
        return {
          ...recipe,
          recommendationScore: scoreData?.total_score,
          matchReason: scoreData?.match_reason,
          confidence: scoreData?.confidence,
        };
      }).sort((a: any, b: any) => {
        const scoreA = a.recommendationScore || 50;
        const scoreB = b.recommendationScore || 50;
        return scoreB - scoreA;
      });
      
      console.log('[recipes.generate] Recipes scored and sorted');
    }
    
    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(recipes), 86400);
    
    const duration = Date.now() - startTime;
    logSuccess("recipes.generate", duration, {
      recipeCount: recipes.length,
      cached: false,
      fallbackUsed: false,
    });
    
    // Log recipe generation events (analytics)
    if (params.userId) {
      for (const recipe of recipes) {
        logRecipeEvent({
          userId: params.userId,
          sessionId: params.sessionId || null,
          recipeId: recipe.id,
          recipeTitle: recipe.name,
          eventType: 'generated',
          sourceGpt: 'RecipeGPT',
          responseTimeMs: duration,
        }).catch(err => console.error('[Analytics] Failed to log recipe event:', err));
      }
    }
    
    // Add CTAs to successful response
    const ctas = generateRecipesCtas(recipes, input);
    
    // Log CTA impression
    logCtaImpression("recipes", ctas.map(c => c.id), {
      recipeCount: recipes.length,
      cached: false,
    });
    
    // Return object with recipes and CTAs
    return {
      recipes,
      suggestedActions: ctas,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "recipes.generate");
    
    // Log structured error
    logStructuredError(categorized, true, duration);
    
    // Return fallback recipes instead of throwing
    console.warn("[recipes.generate] Returning fallback recipes due to error");
    const fallbackRecipes = getFallbackRecipes(params.maxRecipes || 3);
    
    // Log fallback usage
    logSuccess("recipes.generate", duration, {
      fallbackUsed: true,
      recipeCount: fallbackRecipes.length,
      errorType: categorized.type,
    });
    
    // Add CTAs to fallback response
    const ctasForFallback = generateRecipesCtas(fallbackRecipes, params);
    
    // Return object with recipes and CTAs
    return {
      recipes: fallbackRecipes,
      suggestedActions: ctasForFallback,
    };
  }
}
