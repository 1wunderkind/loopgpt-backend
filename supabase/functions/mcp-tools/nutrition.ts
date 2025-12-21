/**
 * Nutrition Tool - Standalone Version
 * Analyze nutritional content of recipes using OpenAI
 */

import OpenAI from "openai";
import { cacheGet, cacheSet } from "./cache.ts";
import {
  categorizeError,
  logCtaImpression,
  logStructuredError,
  logSuccess,
} from "./errorTypes.ts";
import { getFallbackNutrition } from "./fallbacks.ts";
import { generateNutritionCtas } from "./ctaSchemas.ts";
import { Logger } from "../_shared/monitoring/Logger.ts";

interface NutritionInput {
  recipes: Record<string, unknown>[];
}

interface NutritionAnalysis {
  recipeId: string;
  recipeName: string;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  servings: number;
  healthScore: number;
  tags: string[];
  warnings: string[];
}

interface NutritionResponse {
  analyses: NutritionAnalysis[];
  suggestedActions: unknown[];
}

// Simple input validation
export function validateNutritionInput(params: unknown): NutritionInput {
  if (!params || typeof params !== "object") {
    throw new Error("Invalid input: expected object");
  }

  const typedParams = params as Record<string, unknown>;

  if (
    !typedParams.recipes || !Array.isArray(typedParams.recipes) ||
    typedParams.recipes.length === 0
  ) {
    throw new Error("recipes array is required and must not be empty");
  }

  return {
    recipes: typedParams.recipes as Record<string, unknown>[],
  };
}

// JSON Schema for OpenAI Structured Outputs
const NutritionAnalysisJsonSchema = {
  type: "object",
  properties: {
    analyses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          recipeId: { type: "string" },
          recipeName: { type: "string" },
          perServing: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fat: { type: "number" },
              fiber: { type: "number" },
              sugar: { type: "number" },
              sodium: { type: "number" },
            },
            required: [
              "calories",
              "protein",
              "carbs",
              "fat",
              "fiber",
              "sugar",
              "sodium",
            ],
            additionalProperties: false,
          },
          total: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fat: { type: "number" },
              fiber: { type: "number" },
              sugar: { type: "number" },
              sodium: { type: "number" },
            },
            required: [
              "calories",
              "protein",
              "carbs",
              "fat",
              "fiber",
              "sugar",
              "sodium",
            ],
            additionalProperties: false,
          },
          servings: { type: "number" },
          healthScore: { type: "number" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          warnings: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "recipeId",
          "recipeName",
          "perServing",
          "total",
          "servings",
          "healthScore",
          "tags",
          "warnings",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["analyses"],
  additionalProperties: false,
};

export async function analyzeNutrition(
  params: unknown,
  requestId?: string,
): Promise<NutritionResponse> {
  const startTime = Date.now();
  const logger = new Logger({
    requestId: requestId || Logger.generateRequestId(),
    toolName: "nutrition.analyze",
  });

  try {
    // Validate input
    const input = validateNutritionInput(params);

    logger.info("Starting nutrition analysis", {
      recipeCount: input.recipes.length,
    });

    // Generate cache key from recipe IDs
    const cacheKey = `nutrition:${
      input.recipes.map((r) => r.id || r.name).join(",")
    }`.substring(0, 200);

    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const analyses = JSON.parse(cached) as NutritionAnalysis[];

      logger.info("Cache hit", { duration, analysisCount: analyses.length });

      logSuccess("nutrition.analyze", duration, {
        analysisCount: analyses.length,
        cached: true,
        fallbackUsed: false,
        requestId: logger["context"].requestId,
      });
      return {
        analyses,
        suggestedActions: [], // Will be populated by caller if needed, or we can add here
      };
    }

    // Cache miss - analyze nutrition
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const client = new OpenAI({ apiKey });

    // Build prompts
    const systemPrompt =
      `Analyze nutrition for ${input.recipes.length} recipe(s). Return per-serving & total values for: calories, protein, carbs, fat, fiber, sugar, sodium. Add health score (0-100) and tags.`;

    const recipesText = input.recipes.map((r, i) => {
      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: unknown) => {
          const typedIng = ing as Record<string, unknown>;
          return `- ${typedIng.quantity || ""} ${typedIng.name}`.trim();
        }).join("\n")
        : "No ingredients provided";

      return `Recipe ${i + 1}: ${r.name || "Unnamed"}
ID: ${r.id || `recipe_${i}`}
Servings: ${r.servings || "unknown"}
Ingredients:
${ingredients}`;
    }).join("\n\n---\n\n");

    const userPrompt =
      `Analyze the nutritional content of these recipes:\n\n${recipesText}`;

    logger.info("Calling OpenAI");
    const openAiStartTime = Date.now();

    // Call OpenAI with Structured Outputs
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      temperature: 0.3,
      max_tokens: 2000,
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

    const openAiDuration = Date.now() - openAiStartTime;
    logger.info("OpenAI call completed", { duration: openAiDuration });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const analyses = (parsed.analyses || parsed) as NutritionAnalysis[];

    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(analyses), 86400);

    const duration = Date.now() - startTime;

    logSuccess("nutrition.analyze", duration, {
      analysisCount: analyses.length,
      cached: false,
      fallbackUsed: false,
      requestId: logger["context"].requestId,
    });

    // Add CTAs to successful response
    const ctas = generateNutritionCtas(
      analyses as unknown as Record<string, unknown>[],
      input as unknown as Record<string, unknown>,
    );

    // Log CTA impression
    logCtaImpression("nutrition", ctas.map((c) => c.id), {
      analysisCount: analyses.length,
      cached: false,
      requestId: logger["context"].requestId,
    });

    // Return object with analyses and CTAs
    return {
      analyses,
      suggestedActions: ctas,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "nutrition.analyze");

    logger.error(
      "Nutrition analysis failed",
      error instanceof Error ? error : undefined,
      {
        duration,
        errorCategory: categorized.type,
      },
    );

    // Log structured error
    logStructuredError(categorized, true, duration);

    // Return fallback nutrition instead of throwing
    logger.warn("Returning fallback nutrition due to error");

    // Safely access recipes for fallback
    const recipes = (params as Record<string, unknown>)?.recipes as Record<
      string,
      unknown
    >[] || [];
    const fallbackNutrition = getFallbackNutrition(
      recipes,
    ) as unknown as NutritionAnalysis[];

    // Log fallback usage
    logSuccess("nutrition.analyze", duration, {
      fallbackUsed: true,
      analysisCount: fallbackNutrition.length,
      errorType: categorized.type,
      requestId: logger["context"].requestId,
    });

    // Add CTAs to fallback response
    const ctasForFallback = generateNutritionCtas(
      fallbackNutrition as unknown as Record<string, unknown>[],
      params as Record<string, unknown>,
    );

    // Return object with analyses and CTAs
    return {
      analyses: fallbackNutrition,
      suggestedActions: ctasForFallback,
    };
  }
}
