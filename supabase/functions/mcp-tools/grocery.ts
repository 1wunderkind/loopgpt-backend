/**
 * Grocery List Tool - Standalone Version
 * Generate organized shopping lists from recipes or meal plans using OpenAI
 */

import OpenAI from "https://esm.sh/openai@4.28.0";
import { cacheGet, cacheSet } from "./cache.ts";
import { categorizeError, logStructuredError, logSuccess, logCtaImpression } from "./errorTypes.ts";
import { getFallbackGroceryList } from "./fallbacks.ts";
import { generateGroceryCtas, addCtasToResponse } from "./ctaSchemas.ts";

// Simple input validation
function validateGroceryInput(params: any) {
  const hasRecipes = params.recipes && Array.isArray(params.recipes) && params.recipes.length > 0;
  const hasMealPlan = params.mealPlan && typeof params.mealPlan === 'object';
  
  if (!hasRecipes && !hasMealPlan) {
    throw new Error("Either recipes array or mealPlan object is required");
  }
  
  return {
    recipes: params.recipes || [],
    mealPlan: params.mealPlan || null,
    servings: params.servings || 1,
    groupBy: params.groupBy || "category" // category, aisle, recipe
  };
}

// JSON Schema for OpenAI Structured Outputs
const GroceryListJsonSchema = {
  type: "object",
  properties: {
    list: {
      type: "object",
      properties: {
    id: { type: "string" },
    name: { type: "string" },
    totalItems: { type: "number" },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                unit: { type: "string" },
                notes: { type: "string" },
                usedIn: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "quantity", "unit", "notes", "usedIn"],
              additionalProperties: false
            }
          }
        },
        required: ["name", "items"],
        additionalProperties: false
      }
    },
    estimatedCost: { type: "number" },
    tips: {
      type: "array",
      items: { type: "string" }
    }
      },
      required: ["id", "name", "totalItems", "categories", "estimatedCost", "tips"],
      additionalProperties: false
    }
  },
  required: ["list"],
  additionalProperties: false
};

export async function generateGroceryList(params: any) {
  const startTime = Date.now();
  
  try {
    console.log("[grocery.list] Starting...", { params });
    
    // Validate input
    const input = validateGroceryInput(params);
    
    // Generate cache key from recipes/mealplan
    const recipeIds = input.recipes.map((r: any) => r.id || r.name).join(',');
    const mealPlanId = input.mealPlan?.id || input.mealPlan?.name || '';
    const cacheKey = `grocery:${recipeIds}:${mealPlanId}:${input.servings}`.substring(0, 200);
    
    // Check cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      const list = JSON.parse(cached);
      logSuccess("grocery.list", duration, {
        totalItems: list.totalItems,
        cached: true,
        fallbackUsed: false,
      });
      return list;
    }
    
    // Cache miss - generate grocery list
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const client = new OpenAI({ apiKey });
    
    // Build prompts
    const systemPrompt = `You are TheLoopGPT's grocery list generator. Create organized, practical shopping lists from recipes or meal plans.

Rules:
- Consolidate duplicate ingredients (e.g., "2 cups milk" + "1 cup milk" = "3 cups milk")
- Group items by category (Produce, Dairy, Meat, Pantry, etc.) or aisle
- Include notes for special items (e.g., "organic", "fresh", "frozen")
- Track which recipes use each ingredient
- Provide estimated total cost (USD)
- Add shopping tips (e.g., "Buy in bulk", "Check for sales")
- Use standard grocery quantities (e.g., "1 lb" not "453g")`;

    let sourceText = "";
    
    if (input.recipes.length > 0) {
      sourceText = `Recipes:\n${input.recipes.map((r: any, i: number) => {
        const ingredients = r.ingredients?.map((ing: any) => 
          `- ${ing.quantity || ''} ${ing.name}`.trim()
        ).join('\n') || 'No ingredients';
        
        return `${i + 1}. ${r.name || 'Unnamed Recipe'}\n${ingredients}`;
      }).join('\n\n')}`;
    }
    
    if (input.mealPlan) {
      const days = input.mealPlan.days || [];
      sourceText += `\n\nMeal Plan: ${input.mealPlan.name || 'Unnamed Plan'}\n`;
      sourceText += days.map((day: any) => {
        const meals = day.meals || [];
        return `Day ${day.dayNumber}:\n${meals.map((m: any) => {
          const ingredients = m.ingredients?.map((ing: any) => 
            `  - ${ing.quantity || ''} ${ing.name}`.trim()
          ).join('\n') || '';
          return `${m.mealType}: ${m.recipeName}\n${ingredients}`;
        }).join('\n')}`;
      }).join('\n\n');
    }

    const userPrompt = `Generate a grocery list for ${input.servings} serving(s).
Group items by: ${input.groupBy}

${sourceText}`;

    console.log("[grocery.list] Calling OpenAI...");
    
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
          name: "grocery_list",
          strict: true,
          schema: GroceryListJsonSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(rawContent);
    const list = parsed.list || parsed;
    
    // Cache the result for 24 hours
    await cacheSet(cacheKey, JSON.stringify(list), 86400);
    
    const duration = Date.now() - startTime;
    logSuccess("grocery.list", duration, {
      totalItems: list.totalItems,
      cached: false,
      fallbackUsed: false,
    });
    
    // Add CTAs to successful response
    const ctas = generateGroceryCtas(list, input);
    
    // Log CTA impression
    logCtaImpression("grocery", ctas.map(c => c.id), {
      totalItems: list.totalItems,
      cached: false,
    });
    
    return addCtasToResponse(list, ctas);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "grocery.list");
    
    // Log structured error
    logStructuredError(categorized, true, duration);
    
    // Return fallback grocery list instead of throwing
    console.warn("[grocery.list] Returning fallback grocery list due to error");
    const fallbackList = getFallbackGroceryList(params.recipes || []);
    
    // Log fallback usage
    logSuccess("grocery.list", duration, {
      fallbackUsed: true,
      totalItems: fallbackList.totalItems,
      errorType: categorized.type,
    });
    
    // Add CTAs to fallback response
    const ctasForFallback = generateGroceryCtas(fallbackList, params);
    return addCtasToResponse(fallbackList, ctasForFallback);
  }
}
