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

// Handle tools/call request
async function handleToolsCall(params: any): Promise<any> {
  const { name, arguments: args } = params;

  try {
    let result;

    switch (name) {
      case "loopkitchen.recipes.generate":
        result = await loopkitchenGenerateRecipes(args);
        break;
      
      case "loopkitchen.recipes.details":
        result = await loopkitchenGetRecipeDetails(args);
        break;
      
      case "loopkitchen.nutrition.analyze":
        result = await loopkitchenAnalyzeNutrition(args);
        break;
      
      case "loopkitchen.mealplan.generate":
        result = await loopkitchenGenerateMealPlan(args);
        break;
      
      case "loopkitchen.mealplan.withGrocery":
        result = await generateMealPlanWithGrocery(args);
        break;
      
      case "loopkitchen.mealplan.complete":
        result = await generateMealPlanWithCommerce(args);
        break;
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
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
