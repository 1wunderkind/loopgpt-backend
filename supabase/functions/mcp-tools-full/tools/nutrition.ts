/**
 * Nutrition Analysis Tool for TheLoopGPT MCP
 * Analyze nutritional content of recipes
 */

import { NutritionAnalysisJsonSchema } from "./shared/jsonSchema.ts";
import {
  NutritionInputSchema,
  NutritionAnalysisSchema,
  type NutritionAnalysis,
} from "./shared/schemas.ts";
import { getOpenAIClient } from "../config/openai.ts";
import { ENV } from "../config/env.ts";
import { OpenAiError } from "./shared/errors.ts";
import { validateInput } from "./shared/validation.ts";
import { logToolStart, logToolSuccess, logToolError } from "./shared/logging.ts";
import { recordToolCall } from "./shared/metrics.ts";
import { cacheGet, cacheSet, generateCacheKey } from "./shared/cache.ts";

/**
 * Analyze nutrition for recipes
 */
export async function analyzeNutrition(params: unknown): Promise<NutritionAnalysis> {
  const startTime = Date.now();
  const toolName = "nutrition.analyze";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(NutritionInputSchema, params, toolName);
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<NutritionAnalysis>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Analyze nutrition using OpenAI Structured Outputs
    const client = getOpenAIClient();
    
    const systemPrompt = `You are TheLoopGPT's nutrition analysis engine. Analyze the nutritional content of recipes with high accuracy.

Rules:
- Provide realistic calorie and macro estimates based on ingredients and portions
- Use USDA nutritional database knowledge when possible
- Mark confidence as "high" for common ingredients, "medium" for estimates, "low" for unusual combinations
- Calculate per-serving nutrition if requested
- Include fiber, sugar, and sodium when relevant
- Sum up total nutrition across all recipes`;

    const userPrompt = `Analyze the nutrition for these recipes:

${input.recipes.map((r, i) => `
Recipe ${i + 1}: ${r.name}
Servings: ${r.servings || 'unknown'}
Ingredients:
${r.ingredients.map(ing => `- ${ing.name}${ing.quantity ? ` (${ing.quantity})` : ''}`).join('\n')}
`).join('\n')}

${input.perServing ? 'Provide per-serving nutrition for each recipe.' : 'Provide total nutrition for each recipe.'}`;

    // Use pre-defined JSON Schema for Structured Outputs

    const completion = await client.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      temperature: 0.3, // Lower temperature for more consistent nutrition estimates
      max_tokens: ENV.OPENAI_MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nutrition_analysis",
          strict: true,
          schema: NutritionAnalysisJsonSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new OpenAiError("Empty response from OpenAI", false);
    }

    const analysis: NutritionAnalysis = JSON.parse(rawContent);
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, analysis, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { recipeCount: input.recipes.length });
    recordToolCall(toolName, true, duration);
    
    return analysis;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    
    // Graceful degradation: return approximate nutrition
    if (error instanceof OpenAiError) {
      logToolError(toolName, new Error("Falling back to approximate nutrition"), duration);
      
      const input = validateInput(NutritionInputSchema, params, toolName);
      return {
        perRecipe: input.recipes.map(r => ({
          recipeId: r.id,
          recipeName: r.name,
          summary: {
            calories: 400, // Approximate average
            protein_g: 20,
            carbs_g: 45,
            fat_g: 15,
          },
          confidence: "low" as const,
        })),
      };
    }
    
    throw error;
  }
}
