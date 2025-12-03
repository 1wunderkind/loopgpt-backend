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

const MANIFEST = {
  name: "TheLoopGPT Tools",
  version: "1.0.0-step6",
  description: "Ultra-reliable food and meal planning tools powered by AI",
  status: "Step 6: All 6 tools + caching + rate limiting",
  tools: [
    {
      name: "health.check",
      description: "Check system health and service availability",
      status: "available"
    },
    {
      name: "recipes.generate",
      description: "Generate creative recipes from available ingredients",
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
      
      // Rate limiting
      const userId = req.headers.get("x-user-id") || "anonymous";
      try {
        await checkRateLimit(userId);
      } catch (rateLimitError: any) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: rateLimitError.message,
            retryAfter: 3600 // 1 hour in seconds
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
        
        if (toolName === "recipes.generate") {
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
