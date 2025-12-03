/**
 * Recipes Tool - Standalone Version
 * Generate recipes from ingredients using OpenAI
 */

import OpenAI from "https://esm.sh/openai@4.28.0";
import { cacheGet, cacheSet } from "./cache.ts";

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
    
    // Check cache
    const cacheKey = `recipes:${JSON.stringify(input)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log("[recipes.generate] Cache hit", { cacheKey });
      return JSON.parse(cached);
    }
    
    // Get OpenAI client
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const client = new OpenAI({ apiKey });
    
    // Build prompts
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
${input.ingredients.map((i: any) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n')}

${input.dietaryTags.length > 0 ? `Dietary requirements: ${input.dietaryTags.join(', ')}` : ''}
${input.excludeIngredients.length > 0 ? `Exclude: ${input.excludeIngredients.join(', ')}` : ''}
${input.difficulty !== 'any' ? `Difficulty level: ${input.difficulty}` : ''}`;

    console.log("[recipes.generate] Calling OpenAI...");
    
    // Call OpenAI with Structured Outputs
    const completion = await client.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      temperature: 0.8,
      max_tokens: 4000,
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
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const recipes = parsed.recipes || parsed;
    
    // Cache the result for 1 hour
    await cacheSet(cacheKey, JSON.stringify(recipes), 3600);
    
    const duration = Date.now() - startTime;
    console.log("[recipes.generate] Success", { recipeCount: recipes.length, duration, cached: false });
    
    return recipes;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("[recipes.generate] Error", { error: error.message, duration });
    throw error;
  }
}
