/**
 * Recipes Tool for TheLoopGPT MCP
 * Generate recipes from ingredients with optional nutrition analysis
 */

import { RecipeListJsonSchema } from "./shared/jsonSchema.ts";
import {
  RecipesInputSchema,
  RecipesWithNutritionInputSchema,
  RecipeListSchema,
  type RecipeList,
  type NutritionAnalysis,
} from "./shared/schemas.ts";
import { getOpenAIClient } from "../config/openai.ts";
import { ENV } from "../config/env.ts";
import { OpenAiError } from "./shared/errors.ts";
import { validateInput } from "./shared/validation.ts";
import { logToolStart, logToolSuccess, logToolError } from "./shared/logging.ts";
import { recordToolCall } from "./shared/metrics.ts";
import { cacheGet, cacheSet, generateCacheKey } from "./shared/cache.ts";
import { analyzeNutrition } from "./nutrition.ts";

/**
 * Generate recipes from ingredients
 */
export async function generateRecipes(params: unknown): Promise<RecipeList> {
  const startTime = Date.now();
  const toolName = "recipes.generate";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(RecipesInputSchema, params, toolName);
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<RecipeList>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Generate recipes using OpenAI Structured Outputs
    const client = getOpenAIClient();
    
    const systemPrompt = `You are TheLoopGPT's recipe generation engine. Generate creative, practical recipes based on the provided ingredients.

Rules:
- Use as many of the provided ingredients as possible
- If dietary tags are specified, strictly follow them
- If exclude ingredients are specified, never use them
- Generate recipes with clear, step-by-step instructions
- Include prep time, cook time, and servings when possible
- Assign appropriate difficulty levels
- Add relevant tags (e.g., "quick", "healthy", "comfort food")`;

    const userPrompt = `Generate ${input.maxRecipes} recipe(s) using these ingredients:
${input.ingredients.map(i => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n')}

${input.dietaryTags && input.dietaryTags.length > 0 ? `Dietary requirements: ${input.dietaryTags.join(', ')}` : ''}
${input.excludeIngredients && input.excludeIngredients.length > 0 ? `Exclude: ${input.excludeIngredients.join(', ')}` : ''}
${input.difficulty !== 'any' ? `Difficulty level: ${input.difficulty}` : ''}`;

    // Use pre-defined JSON Schema for Structured Outputs

    const completion = await client.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      temperature: ENV.OPENAI_TEMPERATURE,
      max_tokens: ENV.OPENAI_MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recipe_list",
          strict: true,
          schema: RecipeListJsonSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new OpenAiError("Empty response from OpenAI", false);
    }

    const parsed = JSON.parse(rawContent);
    const recipes: RecipeList = parsed.recipes || parsed;
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, recipes, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { recipeCount: recipes.length });
    recordToolCall(toolName, true, duration);
    
    return recipes;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    throw error;
  }
}

/**
 * Generate recipes with nutrition analysis (composite tool)
 */
export async function generateRecipesWithNutrition(params: unknown): Promise<{
  recipes: RecipeList;
  nutrition: NutritionAnalysis;
}> {
  const startTime = Date.now();
  const toolName = "recipes.generateWithNutrition";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(RecipesWithNutritionInputSchema, params, toolName);
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<{ recipes: RecipeList; nutrition: NutritionAnalysis }>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Generate recipes
    const recipes = await generateRecipes(input);
    
    // Analyze nutrition
    const nutrition = await analyzeNutrition({ recipes, perServing: false });
    
    const result = { recipes, nutrition };
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, result, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { recipeCount: recipes.length });
    recordToolCall(toolName, true, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    throw error;
  }
}
