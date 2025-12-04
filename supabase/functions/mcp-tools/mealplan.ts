/**
 * Meal Plan Tool - Standalone Version
 * Generate structured meal plans based on dietary goals using OpenAI
 */

import OpenAI from "https://esm.sh/openai@4.28.0";
import { cacheGet, cacheSet } from "./cache.ts";
import { categorizeError, logStructuredError, logSuccess } from "./errorTypes.ts";
import { getFallbackMealPlan } from "./fallbacks.ts";

// Simple input validation
function validateMealPlanInput(params: any) {
  if (!params.goals || typeof params.goals !== 'object') {
    throw new Error("goals object is required");
  }
  
  return {
    goals: params.goals,
    days: Math.min(params.days || 7, 30), // Max 30 days
    mealsPerDay: Math.min(params.mealsPerDay || 3, 6), // Max 6 meals
    dietaryTags: params.dietaryTags || [],
    excludeIngredients: params.excludeIngredients || []
  };
}

// JSON Schema for OpenAI Structured Outputs
const MealPlanJsonSchema = {
  type: "object",
  properties: {
    plan: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dayNumber: { type: "number" },
              date: { type: "string" },
              meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    mealType: {
                      type: "string",
                      enum: ["breakfast", "lunch", "dinner", "snack"]
                    },
                    recipeName: { type: "string" },
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
                    prepTimeMinutes: { type: "number" },
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" }
                  },
                  required: ["mealType", "recipeName", "ingredients", "prepTimeMinutes", "calories", "protein", "carbs", "fat"],
                  additionalProperties: false
                }
              },
              totalCalories: { type: "number" },
              totalProtein: { type: "number" },
              totalCarbs: { type: "number" },
              totalFat: { type: "number" }
            },
            required: ["dayNumber", "date", "meals", "totalCalories", "totalProtein", "totalCarbs", "totalFat"],
            additionalProperties: false
          }
        },
        summary: {
          type: "object",
          properties: {
            totalDays: { type: "number" },
            avgCaloriesPerDay: { type: "number" },
            avgProteinPerDay: { type: "number" },
            avgCarbsPerDay: { type: "number" },
            avgFatPerDay: { type: "number" }
          },
          required: ["totalDays", "avgCaloriesPerDay", "avgProteinPerDay", "avgCarbsPerDay", "avgFatPerDay"],
          additionalProperties: false
        }
      },
      required: ["id", "name", "description", "days", "summary"],
      additionalProperties: false
    }
  },
  required: ["plan"],
  additionalProperties: false
};

/**
 * Composite tool: Generate meal plan WITH grocery list
 */
export async function generateMealPlanWithGroceryList(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[mealplan.generateWithGroceryList] Starting composite operation...");
    
    // Step 1: Generate meal plan
    const mealPlan = await generateMealPlan(params);
    
    // Step 2: Generate grocery list from meal plan
    const { generateGroceryList } = await import("./grocery.ts");
    const groceryList = await generateGroceryList({ 
      mealPlan,
      servings: params.servings || 1,
      groupBy: params.groupBy || "category"
    });
    
    // Step 3: Combine into single response
    const result = {
      mealPlan,
      groceryList
    };
    
    const duration = Date.now() - startTime;
    console.log("[mealplan.generateWithGroceryList] Success", { days: mealPlan.days?.length, groceryItems: groceryList.totalItems, duration });
    
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[mealplan.generateWithGroceryList] Error", { error: error.message, duration });
    throw error;
  }
}

export async function generateMealPlan(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[mealplan.generate] Starting...", { params });
    
    // Validate input
    const input = validateMealPlanInput(params);
    
    // Generate cache key from goals and parameters
    const cacheKey = `mealplan:${input.days}d:${JSON.stringify(input.goals)}:${input.dietaryTags.join(',')}`.substring(0, 200);
    
    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const plan = JSON.parse(cached);
      logSuccess("mealplan.generate", duration, {
        days: plan.days?.length,
        cached: true,
        fallbackUsed: false,
      });
      return plan;
    }
    
    // Cache miss - generate meal plan
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const client = new OpenAI({ apiKey });
    
    // Build prompts
    const systemPrompt = `You are TheLoopGPT's meal planning engine. Generate balanced, practical meal plans based on dietary goals.

Rules:
- Create ${input.days} days of meals with ${input.mealsPerDay} meals per day
- Balance macros (protein, carbs, fat) according to goals
- Ensure variety - don't repeat the same meal too often
- Include realistic prep times
- Calculate accurate nutrition per meal and per day
- Provide shopping-friendly ingredient quantities
- Consider meal prep efficiency (e.g., batch cooking)`;

    const goalsText = Object.entries(input.goals)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const userPrompt = `Generate a ${input.days}-day meal plan with ${input.mealsPerDay} meals per day.

Goals:
${goalsText}

${input.dietaryTags.length > 0 ? `Dietary requirements: ${input.dietaryTags.join(', ')}` : ''}
${input.excludeIngredients.length > 0 ? `Exclude: ${input.excludeIngredients.join(', ')}` : ''}

Start date: ${new Date().toISOString().split('T')[0]}`;

    console.log("[mealplan.generate] Calling OpenAI...");
    
    // Call OpenAI with Structured Outputs
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      temperature: 0.7,
      max_tokens: 3000,
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
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const plan = parsed.plan || parsed;
    
    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(plan), 86400);
    
    const duration = Date.now() - startTime;
    logSuccess("mealplan.generate", duration, {
      days: plan.days?.length,
      cached: false,
      fallbackUsed: false,
    });
    
    return plan;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "mealplan.generate");
    
    // Log structured error
    logStructuredError(categorized, true, duration);
    
    // Return fallback meal plan instead of throwing
    console.warn("[mealplan.generate] Returning fallback meal plan due to error");
    const fallbackPlan = getFallbackMealPlan(params.days || 1);
    
    // Log fallback usage
    logSuccess("mealplan.generate", duration, {
      fallbackUsed: true,
      days: fallbackPlan.days?.length,
      errorType: categorized.type,
    });
    
    return fallbackPlan;
  }
}
