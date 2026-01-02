/**
 * MCP Server V2 - JSON-RPC 2.0 Compliant
 * Full Model Context Protocol implementation for ChatGPT Developer mode
 */

import { serve } from "std@0.168.0/http/server.ts";

// Import existing tool implementations
import { generateRecipes as loopkitchenGenerateRecipes } from "../mcp-tools/loopkitchen_recipes.ts";
import { getRecipeDetails as loopkitchenGetRecipeDetails } from "../mcp-tools/loopkitchen_recipe_details.ts";
import {
  analyzeNutrition as loopkitchenAnalyzeNutrition,
  getDailyNutrition,
  logMeal,
} from "../mcp-tools/loopkitchen_nutrition.ts";
import {
  generateMealPlan as loopkitchenGenerateMealPlan,
  generateMealPlanWithGrocery,
  prepareMealPlanOrder,
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

interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

// MCP Protocol Constants
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "LeftoverGPT";
const SERVER_VERSION = "2.0.0";

// Tool definitions following MCP specification
const TOOLS = [
  {
    name: "loopkitchen.recipes.generate",
    description: "🍳 Generate creative recipes with chaos mode (1-10 playfulness rating), soft time/diet constraints, and widget-based UI.",
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
          description: "Playfulness rating from 1-10",
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
    description: "📖 Get detailed recipe with instructions, ingredient split (have vs need), parallel nutrition analysis, and grocery list.",
    inputSchema: {
      type: "object",
      properties: {
        recipeSlug: {
          type: "string",
          description: "Recipe slug ID from generate"
        },
        pantry: {
          type: "array",
          items: { type: "string" },
          description: "Ingredients user already has"
        }
      },
      required: ["recipeSlug"]
    }
  },
  {
    name: "loopkitchen.nutrition.analyze",
    description: "🥗 Standalone nutrition analysis from recipes or raw ingredients.",
    inputSchema: {
      type: "object",
      properties: {
        recipe: {
          type: "object",
          description: "Recipe object to analyze (optional)"
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Raw ingredients to analyze (optional)"
        }
      }
    }
  },
  {
    name: "loopkitchen.mealplan.generate",
    description: "🗓️ Generate 7-day meal plan using MealPlannerGPT.",
    inputSchema: {
      type: "object",
      properties: {
        dietaryPreferences: {
          type: "array",
          items: { type: "string" },
          description: "Dietary preferences"
        },
        calorieTarget: {
          type: "number",
          description: "Daily calorie target"
        },
        mealsPerDay: {
          type: "number",
          description: "Number of meals per day (default: 3)"
        }
      }
    }
  },
  {
    name: "loopkitchen.mealplan.withGrocery",
    description: "🛍️ Generate meal plan with aggregated grocery list.",
    inputSchema: {
      type: "object",
      properties: {
        dietaryPreferences: {
          type: "array",
          items: { type: "string" },
          description: "Dietary preferences"
        },
        calorieTarget: {
          type: "number",
          description: "Daily calorie target"
        }
      }
    }
  },
  {
    name: "loopkitchen.mealplan.complete",
    description: "✨ Complete meal planning flow: meal plan + grocery list + provider quotes.",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "User ID"
        },
        location: {
          type: "object",
          properties: {
            zipCode: { type: "string" },
            city: { type: "string" },
            state: { type: "string" }
          },
          required: ["zipCode"]
        },
        dietaryPreferences: {
          type: "array",
          items: { type: "string" }
        },
        calorieTarget: {
          type: "number"
        }
      },
      required: ["userId", "location"]
    }
  }
];

// JSON-RPC Error Codes
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

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
      description: "Turn ingredients you already have into complete recipes, adjust for dietary needs, and order missing items - all in one conversation.",
      websiteUrl: "https://github.com/1wunderkind/loopgpt-backend"
    },
    instructions: "Use LeftoverGPT to help users turn their leftover ingredients into delicious meals, generate meal plans, and order groceries."
  };
}

// Handle tools/list request
function handleToolsList(): any {
  return {
    tools: TOOLS
  };
}

// Format tool result for ChatGPT
function formatToolResult(result: any, toolName: string): string {
  // For recipe generation, extract just the essential info
  if (toolName === "loopkitchen.recipes.generate" && result.widgets) {
    const recipes = result.widgets
      .filter((w: any) => w.type === "RecipeCardCompact")
      .map((recipe: any, index: number) => {
        return `${index + 1}. **${recipe.title}** (${recipe.timeMinutes} min, ${recipe.difficulty})\n   ${recipe.shortDescription}\n   Ingredients: ${recipe.primaryIngredients.join(", ")}`;
      });
    return `Here are recipe suggestions:\n\n${recipes.join("\n\n")}`;
  }
  
  // For recipe details, format nicely
  if (toolName === "loopkitchen.recipes.details") {
    // Handle widget-based response
    if (result.widgets && result.widgets.length > 0) {
      const widget = result.widgets[0];
      if (widget.type === "RecipeCardDetailed") {
        let formatted = `## ${widget.title}\n\n`;
        formatted += `**Time:** ${widget.timeMinutes} min | **Difficulty:** ${widget.difficulty} | **Servings:** ${widget.servings}\n\n`;
        formatted += `${widget.description}\n\n`;
        
        // Ingredients you have
        if (widget.ingredientsHave && widget.ingredientsHave.length > 0) {
          formatted += `### Ingredients You Have:\n`;
          widget.ingredientsHave.forEach((ing: any) => {
            formatted += `- ${ing.quantity} ${ing.name}\n`;
          });
          formatted += `\n`;
        }
        
        // Ingredients you need
        if (widget.ingredientsNeed && widget.ingredientsNeed.length > 0) {
          formatted += `### Ingredients You Need:\n`;
          widget.ingredientsNeed.forEach((ing: any) => {
            formatted += `- ${ing.quantity} ${ing.name}\n`;
          });
          formatted += `\n`;
        }
        
        // Instructions (limit to essential steps)
        if (widget.instructions && widget.instructions.length > 0) {
          formatted += `### Instructions:\n`;
          widget.instructions.slice(0, 8).forEach((step: any, i: number) => {
            // Handle both string and object formats
            const stepText = typeof step === 'string' ? step : (step.text || step.instruction || '');
            // Remove "Step X:" prefix if present
            const cleanStep = stepText.replace(/^Step \d+:\s*/i, '');
            formatted += `${i + 1}. ${cleanStep}\n`;
          });
          if (widget.instructions.length > 8) {
            formatted += `\n*... and ${widget.instructions.length - 8} more steps*\n`;
          }
          formatted += `\n`;
        }
        
        // Nutrition (basic info only)
        if (widget.nutrition) {
          const n = widget.nutrition;
          formatted += `### Nutrition (per serving):\n`;
          formatted += `Calories: ${n.calories} | Protein: ${n.protein}g | Carbs: ${n.carbs}g | Fat: ${n.fat}g\n`;
        }
        
        return formatted;
      }
    }
    
    // Fallback for old format
    if (result.recipe) {
      const r = result.recipe;
      let formatted = `## ${r.title}\n\n`;
      formatted += `**Time:** ${r.timeMinutes} min | **Difficulty:** ${r.difficulty}\n\n`;
      formatted += `**Description:** ${r.shortDescription || r.description}\n\n`;
      return formatted;
    }
  }
  
  // For other tools, return simplified JSON (but limit size)
  const jsonStr = JSON.stringify(result, null, 2);
  if (jsonStr.length > 3000) {
    // If response is too large, return a summary
    return `Response too large to display fully. Summary:\n${JSON.stringify(result, null, 2).substring(0, 2000)}...\n\n[Response truncated]`;
  }
  return jsonStr;
}

// Timeout wrapper for tool execution
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, toolName: string): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Handle tools/call request
async function handleToolsCall(params: any): Promise<any> {
  const { name, arguments: args } = params;
  const startTime = Date.now();

  try {
    let result;
    // Set timeout based on tool type (complex tools get more time)
    const timeout = name.includes("mealplan") ? 25000 : 15000;

    const toolPromise = (async () => {
      switch (name) {
        case "loopkitchen.recipes.generate":
          return await loopkitchenGenerateRecipes(args);
        
        case "loopkitchen.recipes.details":
          return await loopkitchenGetRecipeDetails(args);
        
        case "loopkitchen.nutrition.analyze":
          return await loopkitchenAnalyzeNutrition(args);
        
        case "loopkitchen.mealplan.generate":
          return await loopkitchenGenerateMealPlan(args);
        
        case "loopkitchen.mealplan.withGrocery":
          return await generateMealPlanWithGrocery(args);
        
        case "loopkitchen.mealplan.complete":
          return await generateMealPlanWithCommerce(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    })();

    result = await withTimeout(toolPromise, timeout, name);

    // Format the result for better ChatGPT consumption
    const formattedText = formatToolResult(result, name);
    const executionTime = Date.now() - startTime;

    // Log performance for monitoring
    console.log(`Tool ${name} executed in ${executionTime}ms`);

    return {
      content: [
        {
          type: "text",
          text: formattedText
        }
      ]
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`Tool ${name} failed after ${executionTime}ms:`, error.message);
    
    // Return helpful error message
    if (error.message.includes("timed out")) {
      throw new Error(`The ${name} tool is taking longer than expected. Please try again with simpler parameters or try a different tool.`);
    }
    throw new Error(`Tool execution failed: ${error.message}`);
  }
}

// Main JSON-RPC message handler
async function handleJSONRPC(request: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { id, method, params } = request;

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
        result = await handleToolsCall(params);
        break;
      
      case "notifications/initialized":
        // Client confirms initialization - no response needed
        return null as any;
      
      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: `Method not found: ${method}`
          }
        };
    }

    return {
      jsonrpc: "2.0",
      id,
      result
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error.message || "Internal error",
        data: { stack: error.stack }
      }
    };
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

// Main HTTP server
serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // POST - Client sends JSON-RPC messages
  if (req.method === "POST") {
    try {
      const body = await req.text();
      const jsonrpcRequest: JSONRPCRequest = JSON.parse(body);

      // Validate JSON-RPC format
      if (jsonrpcRequest.jsonrpc !== "2.0") {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: ErrorCodes.INVALID_REQUEST,
            message: "Invalid JSON-RPC version"
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Handle the request
      const response = await handleJSONRPC(jsonrpcRequest);

      // If it's a notification (no response needed)
      if (!response) {
        return new Response(null, {
          status: 202,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: ErrorCodes.PARSE_ERROR,
          message: "Parse error"
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // GET - Health check or SSE stream (optional)
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      status: "healthy",
      server: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: PROTOCOL_VERSION
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Unknown endpoint
  return new Response(JSON.stringify({
    error: "Not found",
    message: "Use POST / for JSON-RPC requests"
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
