/**
 * Nutrition Tool - Standalone Version
 * Analyze nutritional content of recipes using OpenAI
 */

import OpenAI from "https://esm.sh/openai@4.28.0";

// Simple input validation
function validateNutritionInput(params: any) {
  if (!params.recipes || !Array.isArray(params.recipes) || params.recipes.length === 0) {
    throw new Error("recipes array is required and must not be empty");
  }
  
  return {
    recipes: params.recipes
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
              sodium: { type: "number" }
            },
            required: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
            additionalProperties: false
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
              sodium: { type: "number" }
            },
            required: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
            additionalProperties: false
          },
          servings: { type: "number" },
          healthScore: { type: "number" },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          warnings: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["recipeId", "recipeName", "perServing", "total", "servings", "healthScore", "tags", "warnings"],
        additionalProperties: false
      }
    }
  },
  required: ["analyses"],
  additionalProperties: false
};

export async function analyzeNutrition(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[nutrition.analyze] Starting...", { recipeCount: params.recipes?.length });
    
    // Validate input
    const input = validateNutritionInput(params);
    
    // Get OpenAI client
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const client = new OpenAI({ apiKey });
    
    // Build prompts
    const systemPrompt = `Analyze nutrition for ${input.recipes.length} recipe(s). Return per-serving & total values for: calories, protein, carbs, fat, fiber, sugar, sodium. Add health score (0-100) and tags.`;

    const recipesText = input.recipes.map((r: any, i: number) => {
      const ingredients = r.ingredients?.map((ing: any) => 
        `- ${ing.quantity || ''} ${ing.name}`.trim()
      ).join('\n') || 'No ingredients provided';
      
      return `Recipe ${i + 1}: ${r.name || 'Unnamed'}
ID: ${r.id || `recipe_${i}`}
Servings: ${r.servings || 'unknown'}
Ingredients:
${ingredients}`;
    }).join('\n\n---\n\n');

    const userPrompt = `Analyze the nutritional content of these recipes:\n\n${recipesText}`;

    console.log("[nutrition.analyze] Calling OpenAI...");
    
    // Call OpenAI with Structured Outputs
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      temperature: 0.3, // Lower temperature for more consistent nutrition data
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

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const analyses = parsed.analyses || parsed;
    
    const duration = Date.now() - startTime;
    console.log("[nutrition.analyze] Success", { analysisCount: analyses.length, duration });
    
    return analyses;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[nutrition.analyze] Error", { error: error.message, duration });
    throw error;
  }
}
