/**
 * Meal Plan Tool for TheLoopGPT MCP
 * Generate structured meal plans with optional grocery lists
 */

import { MealPlanJsonSchema } from "./shared/jsonSchema.ts";
import {
  MealPlanRequestSchema,
  MealPlanWithGroceryInputSchema,
  MealPlanSchema,
  type MealPlan,
  type GroceryList,
} from "./shared/schemas.ts";
import { getOpenAIClient } from "../config/openai.ts";
import { ENV } from "../config/env.ts";
import { OpenAiError } from "./shared/errors.ts";
import { validateInput } from "./shared/validation.ts";
import { logToolStart, logToolSuccess, logToolError } from "./shared/logging.ts";
import { recordToolCall } from "./shared/metrics.ts";
import { cacheGet, cacheSet, generateCacheKey } from "./shared/cache.ts";
import { generateGroceryList } from "./grocery.ts";

/**
 * Generate meal plan
 */
export async function generateMealPlan(params: unknown): Promise<MealPlan> {
  const startTime = Date.now();
  const toolName = "mealplan.generate";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(MealPlanRequestSchema, params, toolName);
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<MealPlan>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Generate meal plan using OpenAI Structured Outputs
    const client = getOpenAIClient();
    
    const systemPrompt = `You are TheLoopGPT's meal planning engine. Create balanced, practical meal plans based on user goals.

Rules:
- Generate ${input.days} days of meals (breakfast, lunch, dinner, snacks)
- If calorie target is specified, distribute calories appropriately across meals
- Follow dietary tags strictly (vegan, keto, etc.)
- Exclude specified ingredients completely
- Create variety - don't repeat the same recipes too often
- Include prep-friendly recipes that can be batch-cooked
- Provide nutritional summaries per day if possible
- Add helpful notes about meal prep, shopping, or substitutions`;

    const userPrompt = `Create a ${input.days}-day meal plan with these requirements:

${input.goal ? `Goal: ${input.goal}` : ''}
${input.caloriesPerDay ? `Target calories per day: ${input.caloriesPerDay}` : ''}
${input.dietTags && input.dietTags.length > 0 ? `Dietary requirements: ${input.dietTags.join(', ')}` : ''}
${input.excludeIngredients && input.excludeIngredients.length > 0 ? `Exclude ingredients: ${input.excludeIngredients.join(', ')}` : ''}

Generate complete recipes for each meal with ingredients and instructions.`;

    // Use pre-defined JSON Schema for Structured Outputs

    const completion = await client.chat.completions.create({
      model: ENV.OPENAI_MODEL,
      temperature: ENV.OPENAI_TEMPERATURE,
      max_tokens: ENV.OPENAI_MAX_TOKENS * 2, // Meal plans need more tokens
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meal_plan",
          strict: true,
          schema: MealPlanJsonSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new OpenAiError("Empty response from OpenAI", false);
    }

    const mealPlan: MealPlan = JSON.parse(rawContent);
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, mealPlan, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { days: mealPlan.days.length });
    recordToolCall(toolName, true, duration);
    
    return mealPlan;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    throw error;
  }
}

/**
 * Generate meal plan with grocery list (composite tool)
 */
export async function generateMealPlanWithGroceryList(params: unknown): Promise<{
  mealPlan: MealPlan;
  groceryList: GroceryList;
}> {
  const startTime = Date.now();
  const toolName = "mealplan.generateWithGroceryList";
  
  try {
    logToolStart(toolName, { params });
    
    // Validate input
    const input = validateInput(MealPlanWithGroceryInputSchema, params, toolName);
    
    // Check cache
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      const cached = await cacheGet<{ mealPlan: MealPlan; groceryList: GroceryList }>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        logToolSuccess(toolName, duration, { cached: true });
        recordToolCall(toolName, true, duration);
        return cached;
      }
    }
    
    // Generate meal plan
    const mealPlan = await generateMealPlan(input);
    
    // Generate grocery list from meal plan
    const groceryList = await generateGroceryList({ mealPlan, categorize: true });
    
    const result = { mealPlan, groceryList };
    
    // Cache the result
    if (ENV.ENABLE_CACHING) {
      const cacheKey = generateCacheKey(toolName, input);
      await cacheSet(cacheKey, result, ENV.CACHE_TTL_SECONDS, toolName);
    }
    
    const duration = Date.now() - startTime;
    logToolSuccess(toolName, duration, { days: mealPlan.days.length });
    recordToolCall(toolName, true, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logToolError(toolName, error as Error, duration);
    recordToolCall(toolName, false, duration, { errorType: (error as Error).name });
    throw error;
  }
}
