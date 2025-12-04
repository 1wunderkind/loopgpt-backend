/**
 * TheLoopGPT MCP Tools Server - Minimal Version
 * Testing deployment first, then adding features incrementally
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateRecipes, generateRecipesWithNutrition } from "./recipes.ts";
import { analyzeNutrition } from "./nutrition.ts";
import { generateMealPlan, generateMealPlanWithGroceryList } from "./mealplan.ts";
import { generateGroceryList } from "./grocery.ts";
import { checkRateLimit } from "./rateLimit.ts";
import { StreamingResponse, wantsStreaming } from "./streaming.ts";
import { routeFood } from "./foodRouter.ts";

// Helper function to execute tools with optional streaming
async function executeTool(toolName: string, params: any, stream?: StreamingResponse): Promise<any> {
  switch (toolName) {
    case "food.router":
      return await routeFood(params);
    case "recipes.generate":
      return await generateRecipes(params);
    case "recipes.generateWithNutrition":
      return await generateRecipesWithNutrition(params);
    case "nutrition.analyze":
      return await analyzeNutrition(params);
    case "mealplan.generate":
      return await generateMealPlan(params);
    case "mealplan.generateWithGroceryList":
      return await generateMealPlanWithGroceryList(params);
    case "grocery.list":
      return await generateGroceryList(params);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

const MANIFEST = {
  name: "TheLoopGPT Tools",
  version: "1.1.0-hybrid-router",
  description: "Ultra-reliable food and meal planning tools powered by AI with smart routing",
  status: "Optimized: Postgres caching + streaming + smart routing + intent classification",
  tools: [
    {
      name: "health.check",
      description: "Check system health and service availability",
      status: "available"
    },
    {
      name: "food.router",
      description: "🌟 PRIMARY ENTRYPOINT: Smart router for any food-related query. Automatically classifies intent (recipes/nutrition/meal planning/grocery) and routes to the appropriate tool. Use this for vague or natural-language queries like 'I'm hungry', 'what should I eat?', 'help me plan meals', etc. For specific requests, you can still use specialized tools directly.",
      status: "available",
      primary: true
    },
    {
      name: "recipes.generate",
      description: "Generate creative recipes from available ingredients (direct access)",
      status: "available"
    },
    {
      name: "nutrition.analyze",
      description: "Analyze nutritional content of recipes",
      status: "available"
    },
    {
      name: "mealplan.generate",
      description: "Generate structured meal plans",
      status: "available"
    },
    {
      name: "grocery.list",
      description: "Generate organized shopping lists",
      status: "available"
    },
    {
      name: "recipes.generateWithNutrition",
      description: "Generate recipes with nutrition analysis (composite)",
      status: "available"
    },
    {
      name: "mealplan.generateWithGroceryList",
      description: "Generate meal plan with grocery list (composite)",
      status: "available"
    }
  ]
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Strip function name prefix
  let pathname = url.pathname;
  if (pathname.startsWith('/mcp-tools')) {
    pathname = pathname.replace('/mcp-tools', '') || '/';
  }
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // GET / - Manifest
    if (req.method === "GET" && pathname === "/") {
      return new Response(JSON.stringify(MANIFEST, null, 2), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // GET /health - Health check
    if (req.method === "GET" && pathname === "/health") {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: MANIFEST.version,
        services: {
          server: { available: true },
          environment: {
            available: !!Deno.env.get("OPENAI_API_KEY"),
            hasOpenAI: !!Deno.env.get("OPENAI_API_KEY"),
            hasSupabase: !!Deno.env.get("SUPABASE_URL")
          }
        }
      };
      
      return new Response(JSON.stringify(health, null, 2), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // POST /tools/:toolName - Tool execution
    const toolMatch = pathname.match(/^\/tools\/([a-zA-Z.]+)$/);
    if (req.method === "POST" && toolMatch) {
      const toolName = toolMatch[1];
      
      // Check if client wants streaming
      const streaming = wantsStreaming(req);
      const stream = streaming ? new StreamingResponse() : null;
      
      // If streaming, return stream immediately
      if (streaming && stream) {
        const response = stream.createStream();
        
        // Process in background
        (async () => {
          try {
            stream.sendProgress("Checking rate limit...", 5);
            const userId = req.headers.get("x-user-id") || "anonymous";
            await checkRateLimit(userId);
            
            stream.sendProgress("Parsing request...", 10);
            const params = await req.json();
            
            stream.sendProgress("Starting tool execution...", 15);
            const result = await executeTool(toolName, params, stream);
            stream.sendComplete(result);
          } catch (error: any) {
            stream.sendError(error.message || "Unknown error");
          }
        })();
        
        return response;
      }
      
      // Non-streaming path
      const userId = req.headers.get("x-user-id") || "anonymous";
      try {
        await checkRateLimit(userId);
      } catch (rateLimitError: any) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: rateLimitError.message,
            retryAfter: 3600
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      try {
        let params: any;
        try {
          params = await req.json();
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: "Invalid JSON",
              message: "Request body must be valid JSON"
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        let result: any;
        
        if (toolName === "food.router") {
          result = await routeFood(params);
        } else if (toolName === "recipes.generate") {
          result = await generateRecipes(params);
        } else if (toolName === "recipes.generateWithNutrition") {
          result = await generateRecipesWithNutrition(params);
        } else if (toolName === "nutrition.analyze") {
          result = await analyzeNutrition(params);
        } else if (toolName === "mealplan.generate") {
          result = await generateMealPlan(params);
        } else if (toolName === "mealplan.generateWithGroceryList") {
          result = await generateMealPlanWithGroceryList(params);
        } else if (toolName === "grocery.list") {
          result = await generateGroceryList(params);
        } else {
          return new Response(
            JSON.stringify({
              error: "Not implemented",
              message: `Tool ${toolName} is not yet implemented`,
              availableTools: [
                "food.router",
                "recipes.generate",
                "recipes.generateWithNutrition",
                "nutrition.analyze",
                "mealplan.generate",
                "mealplan.generateWithGroceryList",
                "grocery.list"
              ]
            }),
            {
              status: 501,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        return new Response(JSON.stringify(result, null, 2), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        console.error(`[${toolName}] Error:`, err);
        
        return new Response(
          JSON.stringify({
            error: err.name || "Error",
            message: err.message || "An error occurred",
            toolName
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }
    
    // 404
    return new Response(
      JSON.stringify({
        error: "Not found",
        message: `Route not found: ${pathname}`,
        availableRoutes: [
          "GET /",
          "GET /health",
          "POST /tools/:toolName (not yet implemented)"
        ]
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    console.error("Error:", err);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

console.log(`[${new Date().toISOString()}] TheLoopGPT MCP Tools server started (minimal version)`);
