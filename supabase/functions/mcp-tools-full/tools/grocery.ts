/**
 * Grocery List Tool for TheLoopGPT MCP
 * Generate structured shopping lists from recipes or meal plans
 */

import { GroceryListJsonSchema } from "./shared/jsonSchema.ts";
import {
  GroceryInputSchema,
  GroceryListSchema,
  type GroceryList,
} from "./shared/schemas.ts";
import { getOpenAIClient } from "../config/openai.ts";
import { ENV } from "../config/env.ts";
import { OpenAiError, ValidationError } from "./shared/errors.ts";
import { validateInput } from "./shared/validation.ts";
import { logToolStart, logToolSuccess, logToolError } from "./shared/logging.ts";
import { recordToolCall } from "./shared/metrics.ts";
import { cacheGet, cacheSet, generateCacheKey } from "./shared/cache.ts";

/**
 * Generate grocery list from recipes or meal plan
 */
export async function generateGroceryList(params: unknown): Promise<GroceryList> {
  const startTime = Date.now();
  const toolName = "grocery.list";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(GroceryInputSchema, params, toolName);
    
    // Ensure at least one source is provided
    if (!input.recipes && !input.mealPlan) {
      throw new ValidationError(
        "Either recipes or mealPlan must be provided",
        "Please provide recipes or a meal plan to generate a grocery list"
      );
    }
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<GroceryList>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Collect all recipes
    const allRecipes = [];
    if (input.recipes) {
      allRecipes.push(...input.recipes);
    }
    if (input.mealPlan) {
      for (const day of input.mealPlan.days) {
        allRecipes.push(...day.recipes);
      }
    }
    
    // Generate grocery list using OpenAI Structured Outputs
    const client = getOpenAIClient();
    
    const systemPrompt = `You are TheLoopGPT's grocery list generator. Create organized, practical shopping lists.

Rules:
- Consolidate duplicate ingredients across recipes (e.g., "2 cups flour" + "1 cup flour" = "3 cups flour")
- Categorize items by grocery store section (produce, dairy, meat, pantry, etc.)
- Use standard grocery quantities (e.g., "1 lb" not "453.6g")
- Mark which recipes each ingredient is for
- Include pantry staples that might be needed
- Provide helpful notes about freshness, substitutions, or shopping tips`;

    const userPrompt = `Generate a grocery list for these recipes:

${allRecipes.map((r, i) => `
Recipe ${i + 1}: ${r.name} (ID: ${r.id})
Ingredients:
${r.ingredients.map(ing => `- ${ing.name}${ing.quantity ? ` (${ing.quantity})` : ''}`).join('\n')}
`).join('\n')}

${input.additionalItems && input.additionalItems.length > 0 ? `
Additional items to include:
${input.additionalItems.map(item => `- ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`).join('\n')}
` : ''}

${input.categorize ? 'Organize items by grocery store category.' : 'List items in order.'}`;

    // Use pre-defined JSON Schema for Structured Outputs

    const completion = await client.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      temperature: 0.3, // Lower temperature for more consistent consolidation
      max_tokens: ENV.OPENAI_MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "grocery_list",
          strict: true,
          schema: GroceryListJsonSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new OpenAiError("Empty response from OpenAI", false);
    }

    const groceryList: GroceryList = JSON.parse(rawContent);
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, groceryList, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { itemCount: groceryList.items.length });
    recordToolCall(toolName, true, duration);
    
    return groceryList;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    throw error;
  }
}
