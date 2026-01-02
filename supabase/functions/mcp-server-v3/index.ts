/**
 * MCP Server V3 - Robust Contract Implementation
 * Based on ChatGPT feedback for stable, LLM-friendly responses
 */

import { serve } from "std@0.168.0/http/server.ts";

// Import response contract module
import {
  API_VERSION,
  generateRequestId,
  generateRecipeId,
  createResponseEnvelope,
  createErrorResponse,
  createDegradedResponse,
  formatRecipeResponse,
  formatRecipeDetailsResponse,
  type ResponseEnvelope,
  type GenerateRecipesData,
  type RecipeDetailsData,
  type RecipeResponse
} from "./response_contract.ts";

// Import recipe cache module
import {
  cacheRecipe,
  getCachedRecipe,
  cacheRecipeDetails,
  getCachedRecipeDetails,
  cleanupCache
} from "./recipe_cache.ts";

// Import existing tool implementations
import { generateRecipes as loopkitchenGenerateRecipes } from "../mcp-tools/loopkitchen_recipes.ts";
import { getRecipeDetails as loopkitchenGetRecipeDetails } from "../mcp-tools/loopkitchen_recipe_details.ts";
import {
  analyzeNutrition as loopkitchenAnalyzeNutrition,
} from "../mcp-tools/loopkitchen_nutrition.ts";
import {
  generateMealPlan as loopkitchenGenerateMealPlan,
  generateMealPlanWithGrocery,
  generateMealPlanWithCommerce,
} from "../mcp-tools/loopkitchen_mealplan.ts";

// JSON-RPC 2.0 Types
interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// MCP Protocol Constants
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "LeftoverGPT";
const SERVER_VERSION = "3.0.0";

// Tool definitions with support for both recipeId and slug
const TOOLS = [
  {
    name: "loopkitchen.recipes.generate",
    description: "Generate creative recipe suggestions from ingredients. Returns recipes with stable recipeId that can be used with recipes.details.",
    inputSchema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of available ingredients"
        },
        chaosMode: {
          type: "number",
          description: "Creativity level from 1-10 (optional, default: 5)",
          minimum: 1,
          maximum: 10
        },
        dietaryRestrictions: {
          type: "array",
          items: { type: "string" },
          description: "Dietary restrictions (optional)"
        },
        maxTime: {
          type: "number",
          description: "Maximum cooking time in minutes (optional)"
        }
      },
      required: ["ingredients"]
    }
  },
  {
    name: "loopkitchen.recipes.details",
    description: "Get detailed recipe with instructions, ingredients split (have/need), and nutrition. Accepts recipeId (preferred) or recipeSlug from generate.",
    inputSchema: {
      type: "object",
      properties: {
        recipeId: {
          type: "string",
          description: "Recipe ID from generate (preferred)"
        },
        recipeSlug: {
          type: "string",
          description: "Recipe slug from generate (legacy, for backwards compatibility)"
        },
        pantry: {
          type: "array",
          items: { type: "string" },
          description: "Ingredients user already has"
        }
      },
      required: []
    }
  },
  {
    name: "loopkitchen.nutrition.analyze",
    description: "Analyze nutritional content of ingredients or a recipe",
    inputSchema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredients to analyze"
        }
      },
      required: ["ingredients"]
    }
  },
  {
    name: "loopkitchen.mealplan.generate",
    description: "Generate a meal plan for specified duration and dietary preferences",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days for meal plan"
        },
        mealsPerDay: {
          type: "number",
          description: "Number of meals per day"
        },
        dietaryRestrictions: {
          type: "array",
          items: { type: "string" },
          description: "Dietary restrictions"
        },
        calorieTarget: {
          type: "number",
          description: "Daily calorie target (optional)"
        }
      },
      required: ["days", "mealsPerDay"]
    }
  },
  {
    name: "loopkitchen.mealplan.withGrocery",
    description: "Generate meal plan with grocery list",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days"
        },
        mealsPerDay: {
          type: "number",
          description: "Meals per day"
        },
        zipCode: {
          type: "string",
          description: "Zip code for grocery availability"
        }
      },
      required: ["days", "mealsPerDay", "zipCode"]
    }
  },
  {
    name: "loopkitchen.mealplan.complete",
    description: "Complete meal planning flow: meal plan + grocery list + provider quotes",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days"
        },
        mealsPerDay: {
          type: "number",
          description: "Meals per day"
        },
        zipCode: {
          type: "string",
          description: "Zip code"
        },
        dietaryRestrictions: {
          type: "array",
          items: { type: "string" },
          description: "Dietary restrictions"
        }
      },
      required: ["days", "mealsPerDay", "zipCode"]
    }
  }
];

// Handle initialize request
function handleInitialize(params: any): any {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {
        listChanged: false
      },
      logging: {}
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description: "Turn ingredients you already have into complete recipes with stable IDs, meal planning, and grocery ordering.",
      websiteUrl: "https://github.com/1wunderkind/loopgpt-backend"
    },
    instructions: "Use LeftoverGPT to help users turn their leftover ingredients into delicious meals. Always use recipeId from generate when calling details."
  };
}

// Handle tools/list request
function handleToolsList(): any {
  return {
    tools: TOOLS
  };
}

// Timeout wrapper for tool execution
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolName: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`TIMEOUT`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Handle tools/call request with robust contract
async function handleToolsCall(params: any, requestId: string): Promise<any> {
  const { name, arguments: args } = params;
  const startTime = Date.now();

  try {
    // Validate inputs based on tool
    if (name === "loopkitchen.recipes.generate") {
      if (!args.ingredients || args.ingredients.length === 0) {
        return createErrorResponse(
          requestId,
          "MISSING_INGREDIENTS",
          "ingredients array is required and must not be empty",
          "Provide at least one ingredient to generate recipes",
          false
        );
      }
    }

    if (name === "loopkitchen.recipes.details") {
      if (!args.recipeId && !args.recipeSlug) {
        return createErrorResponse(
          requestId,
          "MISSING_RECIPE_ID",
          "Either recipeId or recipeSlug is required",
          "Use recipeId from recipes.generate response",
          false
        );
      }
    }

    // Set timeout based on tool type
    const timeout = name.includes("mealplan") ? 25000 
                  : name === "loopkitchen.recipes.details" ? 30000 
                  : 15000;

    let backendResult;
    const toolPromise = (async () => {
      switch (name) {
        case "loopkitchen.recipes.generate":
          return await loopkitchenGenerateRecipes(args);
        
        case "loopkitchen.recipes.details":
          // First check if we have full details cached
          const cachedDetails = getCachedRecipeDetails(args.recipeId);
          if (cachedDetails) {
            console.log(`[${requestId}] Returning cached details for ${args.recipeId}`);
            return cachedDetails;
          }
          
          // Look up recipe from cache to get original slug
          const cached = getCachedRecipe(args.recipeId);
          
          let detailsResult;
          if (cached) {
            // Use cached slug and ingredients for accurate lookup
            const lookupArgs = {
              recipeId: cached.slug,
              recipeTitle: cached.title,
              ingredients: cached.ingredients || args.userIngredients,
              vibes: args.vibes,
              chaosTarget: args.chaosTarget,
              timeLimit: args.timeLimit
            };
            detailsResult = await loopkitchenGetRecipeDetails(lookupArgs);
          } else {
            // Fallback: try to use recipeId as slug (backwards compatible)
            console.warn(`[${requestId}] Recipe not in cache: ${args.recipeId}`);
            const lookupArgs = {
              ...args,
              recipeId: args.recipeSlug || args.recipeId
            };
            detailsResult = await loopkitchenGetRecipeDetails(lookupArgs);
          }
          
          // Cache the full details response
          cacheRecipeDetails(args.recipeId, detailsResult);
          return detailsResult;
        
        case "loopkitchen.nutrition.analyze":
          return await loopkitchenAnalyzeNutrition(args);
        
        case "loopkitchen.mealplan.generate":
          return await loopkitchenGenerateMealPlan(args);
        
        case "loopkitchen.mealplan.withGrocery":
          return await generateMealPlanWithGrocery(args);
        
        case "loopkitchen.mealplan.complete":
          return await generateMealPlanWithCommerce(args);
        
        default:
          throw new Error(`UNKNOWN_TOOL: ${name}`);
      }
    })();

    backendResult = await withTimeout(toolPromise, timeout, name);
    const executionTime = Date.now() - startTime;
    console.log(`[${requestId}] Tool ${name} executed in ${executionTime}ms`);

    // Format response based on tool type
    let responseData;
    let responseText;

    if (name === "loopkitchen.recipes.generate") {
      // Extract recipes and format with stable IDs
      const recipes: RecipeResponse[] = [];
      
      if (backendResult.widgets) {
        for (const widget of backendResult.widgets) {
          if (widget.type === "RecipeCardCompact") {
            const recipe = formatRecipeResponse(widget, args.ingredients);
            recipes.push(recipe);
            
            // Cache the recipe ID -> slug mapping
            cacheRecipe(
              recipe.recipeId,
              recipe.slug,
              recipe.title,
              args.ingredients
            );
          }
        }
      }

      // Create human-readable text
      responseText = recipes.length > 0
        ? `Found ${recipes.length} recipe${recipes.length > 1 ? 's' : ''}:\n\n` +
          recipes.map((r, i) => 
            `${i + 1}. **${r.title}** (${r.timeMinutes} min, ${r.difficulty})\n` +
            `   ${r.summary}\n` +
            `   Recipe ID: ${r.recipeId}`
          ).join("\n\n")
        : "No recipes found for the given ingredients.";

      responseData = {
        recipes,
        text: responseText
      };

      const envelope = createResponseEnvelope<GenerateRecipesData>(
        requestId,
        "ok",
        responseData
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(envelope, null, 2)
          }
        ]
      };
    }

    if (name === "loopkitchen.recipes.details") {
      // Format recipe details with stable structure
      const recipeDetails = formatRecipeDetailsResponse(
        backendResult,
        args.pantry || [],
        args.recipeId,
        args.recipeSlug
      );

      // Create human-readable text
      responseText = `## ${recipeDetails.title}\n\n`;
      responseText += `**Time:** ${recipeDetails.timeMinutes} min | **Difficulty:** ${recipeDetails.difficulty} | **Servings:** ${recipeDetails.servings}\n\n`;
      
      if (recipeDetails.ingredients.have.length > 0) {
        responseText += `### Ingredients You Have:\n`;
        recipeDetails.ingredients.have.forEach(ing => {
          responseText += `- ${ing.amount || ''} ${ing.unit || ''} ${ing.name}\n`.trim() + '\n';
        });
        responseText += `\n`;
      }
      
      if (recipeDetails.ingredients.need.length > 0) {
        responseText += `### Ingredients You Need:\n`;
        recipeDetails.ingredients.need.forEach(ing => {
          responseText += `- ${ing.amount || ''} ${ing.unit || ''} ${ing.name}\n`.trim() + '\n';
        });
        responseText += `\n`;
      }
      
      responseText += `### Instructions:\n`;
      recipeDetails.steps.slice(0, 8).forEach(step => {
        responseText += `${step.idx}. ${step.text}\n`;
      });
      if (recipeDetails.steps.length > 8) {
        responseText += `\n*... and ${recipeDetails.steps.length - 8} more steps*\n`;
      }
      
      if (recipeDetails.nutrition) {
        const n = recipeDetails.nutrition.perServing;
        responseText += `\n### Nutrition (per serving):\n`;
        responseText += `Calories: ${n.kcal} | Protein: ${n.protein_g}g | Carbs: ${n.carbs_g}g | Fat: ${n.fat_g}g\n`;
      }

      responseData = {
        recipe: recipeDetails,
        text: responseText
      };

      const envelope = createResponseEnvelope<RecipeDetailsData>(
        requestId,
        "ok",
        responseData
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(envelope, null, 2)
          }
        ]
      };
    }

    // For other tools, return simplified format
    responseText = JSON.stringify(backendResult, null, 2);
    if (responseText.length > 3000) {
      responseText = responseText.substring(0, 2000) + "\n\n[Response truncated for brevity]";
    }

    const envelope = createResponseEnvelope(
      requestId,
      "ok",
      { result: backendResult, text: responseText }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(envelope, null, 2)
        }
      ]
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[${requestId}] Tool ${name} failed after ${executionTime}ms:`, error.message);
    
    // Handle timeout with degraded response
    if (error.message === "TIMEOUT") {
      // Return degraded response with fallback
      const fallbackData = {
        recipes: [{
          recipeId: "fallback_1",
          slug: "fallback-recipe",
          title: "Simple Recipe (Fallback)",
          summary: "The recipe service is temporarily slow. Try again or use simpler parameters.",
          timeMinutes: 30,
          difficulty: "easy",
          primaryIngredients: args.ingredients || []
        }],
        text: "⚠️ Recipe generation is taking longer than expected. This is a simplified fallback response."
      };

      const envelope = createDegradedResponse(
        requestId,
        "tool_timeout",
        fallbackData
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(envelope, null, 2)
          }
        ]
      };
    }

    // Return structured error
    const errorResponse = createErrorResponse(
      requestId,
      "TOOL_EXECUTION_FAILED",
      error.message,
      "Try again with different parameters or contact support if the issue persists",
      true
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(errorResponse, null, 2)
        }
      ]
    };
  }
}

// Main JSON-RPC message handler
async function handleJSONRPC(request: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { id, method, params } = request;
  const requestId = generateRequestId();

  try {
    let result;

    switch (method) {
      case "initialize":
        result = handleInitialize(params);
        break;
      
      case "tools/list":
        result = handleToolsList();
        break;
      
      case "tools/call":
        result = await handleToolsCall(params, requestId);
        break;
      
      case "initialized":
        // Notification, no response needed
        console.log(`[${requestId}] Client initialized`);
        return null as any;
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result
    };
  } catch (error) {
    console.error(`[${requestId}] JSON-RPC error:`, error.message);
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code: -32603,
        message: error.message
      }
    };
  }
}

// HTTP server handler
serve(async (req: Request) => {
  // Handle POST requests (JSON-RPC)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const response = await handleJSONRPC(body);
      
      // Handle notifications (no response)
      if (response === null) {
        return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error"
          }
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  // Handle GET requests (health check)
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        server: SERVER_NAME,
        version: SERVER_VERSION,
        apiVersion: API_VERSION,
        status: "ok",
        message: "MCP Server V3 is running. Use POST for JSON-RPC requests."
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  return new Response("Method not allowed", { status: 405 });
});
