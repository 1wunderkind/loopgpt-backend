/**
 * Meal Plan Tool - Standalone Version
 * Generate structured meal plans based on dietary goals using OpenAI
 */

import OpenAI from "openai";
import { cacheGet, cacheSet } from "./cache.ts";
import {
  categorizeError,
  logCtaImpression,
  logStructuredError,
  logSuccess,
} from "./errorTypes.ts";
import { getFallbackMealPlan } from "./fallbacks.ts";
import { addCtasToResponse, generateMealPlanCtas } from "./ctaSchemas.ts";
import { Logger } from "../_shared/monitoring/Logger.ts";

// Type for meal plan generation input
export interface MealPlanInput {
  days: number;
  locale?: string;
  dietTags: string[];
  cuisines?: string[];
  caloriesPerDay?: number;
  goals: Record<string, unknown>;
  mealsPerDay: number;
  dietaryTags: string[];
  excludeIngredients: string[];
  servings?: number;
  groupBy?: string;
}

interface MealPlan {
  id: string;
  name: string;
  description: string;
  days: unknown[];
  summary: unknown;
  [key: string]: unknown;
}

// Simple input validation
export function validateMealPlanInput(params: unknown): MealPlanInput {
  if (!params || typeof params !== "object") {
    throw new Error("Invalid input: expected object");
  }

  const typedParams = params as Record<string, unknown>;

  if (!typedParams.goals || typeof typedParams.goals !== "object") {
    throw new Error("goals object is required");
  }

  return {
    goals: typedParams.goals as Record<string, unknown>,
    days: Math.min(Number(typedParams.days) || 7, 30), // Max 30 days
    mealsPerDay: Math.min(Number(typedParams.mealsPerDay) || 3, 6), // Max 6 meals
    dietaryTags: Array.isArray(typedParams.dietaryTags)
      ? typedParams.dietaryTags.map(String)
      : [],
    dietTags: Array.isArray(typedParams.dietTags)
      ? typedParams.dietTags.map(String)
      : [],
    excludeIngredients: Array.isArray(typedParams.excludeIngredients)
      ? typedParams.excludeIngredients.map(String)
      : [],
    locale: typeof typedParams.locale === "string"
      ? typedParams.locale
      : undefined,
    cuisines: Array.isArray(typedParams.cuisines)
      ? typedParams.cuisines.map(String)
      : undefined,
    caloriesPerDay: typeof typedParams.caloriesPerDay === "number"
      ? typedParams.caloriesPerDay
      : undefined,
    servings: typeof typedParams.servings === "number"
      ? typedParams.servings
      : undefined,
    groupBy: typeof typedParams.groupBy === "string"
      ? typedParams.groupBy
      : undefined,
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
                      enum: ["breakfast", "lunch", "dinner", "snack"],
                    },
                    recipeName: { type: "string" },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: "string" },
                        },
                        required: ["name", "quantity"],
                        additionalProperties: false,
                      },
                    },
                    prepTimeMinutes: { type: "number" },
                    calories: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                  },
                  required: [
                    "mealType",
                    "recipeName",
                    "ingredients",
                    "prepTimeMinutes",
                    "calories",
                    "protein",
                    "carbs",
                    "fat",
                  ],
                  additionalProperties: false,
                },
              },
              totalCalories: { type: "number" },
              totalProtein: { type: "number" },
              totalCarbs: { type: "number" },
              totalFat: { type: "number" },
            },
            required: [
              "dayNumber",
              "date",
              "meals",
              "totalCalories",
              "totalProtein",
              "totalCarbs",
              "totalFat",
            ],
            additionalProperties: false,
          },
        },
        summary: {
          type: "object",
          properties: {
            totalDays: { type: "number" },
            avgCaloriesPerDay: { type: "number" },
            avgProteinPerDay: { type: "number" },
            avgCarbsPerDay: { type: "number" },
            avgFatPerDay: { type: "number" },
          },
          required: [
            "totalDays",
            "avgCaloriesPerDay",
            "avgProteinPerDay",
            "avgCarbsPerDay",
            "avgFatPerDay",
          ],
          additionalProperties: false,
        },
      },
      required: ["id", "name", "description", "days", "summary"],
      additionalProperties: false,
    },
  },
  required: ["plan"],
  additionalProperties: false,
};

/**
 * Composite tool: Generate meal plan WITH grocery list
 */
export async function generateMealPlanWithGroceryList(
  params: unknown,
  requestId?: string,
) {
  const startTime = Date.now();
  const logger = new Logger({
    requestId: requestId || Logger.generateRequestId(),
    toolName: "mealplan.generateWithGroceryList",
  });

  try {
    logger.info("Starting composite operation");

    // Validate input first to ensure we have typed params
    const input = validateMealPlanInput(params);

    // Step 1: Generate meal plan
    const mealPlan = await generateMealPlan(input, logger["context"].requestId);

    // Step 2: Generate grocery list from meal plan
    const { generateGroceryList } = await import("./grocery.ts");
    const groceryList = await generateGroceryList({
      mealPlan,
      servings: input.servings || 1,
      groupBy: input.groupBy || "category",
    });

    // Step 3: Combine into single response
    const result = {
      mealPlan,
      groceryList,
    };

    const duration = Date.now() - startTime;
    logger.info("Success", {
      days: (mealPlan as MealPlan).days?.length,
      groceryItems: (groceryList as Record<string, unknown>).totalItems,
      duration,
    });

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error(
      "Composite operation failed",
      error instanceof Error ? error : undefined,
      { duration },
    );
    throw error;
  }
}

export async function generateMealPlan(params: unknown, requestId?: string) {
  const startTime = Date.now();
  const logger = new Logger({
    requestId: requestId || Logger.generateRequestId(),
    toolName: "mealplan.generate",
  });

  try {
    // Validate input
    const input = validateMealPlanInput(params);

    logger.info("Starting meal plan generation", {
      days: input.days,
      mealsPerDay: input.mealsPerDay,
    });

    // Generate cache key from goals and parameters
    const cacheKey = `mealplan:${input.days}d:${JSON.stringify(input.goals)}:${
      input.dietaryTags.join(",")
    }`.substring(0, 200);

    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const plan = JSON.parse(cached) as MealPlan;

      logger.info("Cache hit", { duration, days: plan.days?.length });

      logSuccess("mealplan.generate", duration, {
        days: plan.days?.length,
        cached: true,
        fallbackUsed: false,
        requestId: logger["context"].requestId,
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
    const systemPrompt =
      `You are TheLoopGPT's meal planning engine. Generate balanced, practical meal plans based on dietary goals.

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
      .join("\n");

    const userPrompt =
      `Generate a ${input.days}-day meal plan with ${input.mealsPerDay} meals per day.

Goals:
${goalsText}

${
        input.dietaryTags.length > 0
          ? `Dietary requirements: ${input.dietaryTags.join(", ")}`
          : ""
      }
${
        input.excludeIngredients.length > 0
          ? `Exclude: ${input.excludeIngredients.join(", ")}`
          : ""
      }

Start date: ${new Date().toISOString().split("T")[0]}`;

    logger.info("Calling OpenAI");
    const openAiStartTime = Date.now();

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

    const openAiDuration = Date.now() - openAiStartTime;
    logger.info("OpenAI call completed", { duration: openAiDuration });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const plan = (parsed.plan || parsed) as MealPlan;

    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(plan), 86400);

    const duration = Date.now() - startTime;

    logSuccess("mealplan.generate", duration, {
      days: plan.days?.length,
      cached: false,
      fallbackUsed: false,
      requestId: logger["context"].requestId,
    });

    // Add CTAs to successful response
    const ctas = generateMealPlanCtas(
      plan as unknown as Record<string, unknown>,
      input as unknown as Record<string, unknown>,
    );

    // Log CTA impression
    logCtaImpression("mealplan", ctas.map((c) => c.id), {
      days: plan.days?.length,
      cached: false,
      requestId: logger["context"].requestId,
    });

    return addCtasToResponse(plan, ctas);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "mealplan.generate");

    logger.error(
      "Meal plan generation failed",
      error instanceof Error ? error : undefined,
      {
        duration,
        errorCategory: categorized.type,
      },
    );

    // Log structured error
    logStructuredError(categorized, true, duration);

    // Return fallback meal plan instead of throwing
    logger.warn("Returning fallback meal plan due to error");

    // Safely access days for fallback
    const days = (params as Record<string, unknown>)?.days;
    const fallbackPlan = getFallbackMealPlan(
      Number(days) || 1,
    ) as unknown as MealPlan;

    // Log fallback usage
    logSuccess("mealplan.generate", duration, {
      fallbackUsed: true,
      days: fallbackPlan.days?.length,
      errorType: categorized.type,
      requestId: logger["context"].requestId,
    });

    // Add CTAs to fallback response
    const ctasForFallback = generateMealPlanCtas(
      fallbackPlan as unknown as Record<string, unknown>,
      params as Record<string, unknown>,
    );
    return addCtasToResponse(fallbackPlan, ctasForFallback);
  }
}
