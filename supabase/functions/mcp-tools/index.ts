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
import { prepareCart, confirmOrder, cancelOrder } from "./commerce.ts";
import { updateUserPreferences } from "./userPreferences.ts";
import { generateDailySuggestion, generateWeeklyRefresh } from "./retention.ts";
import { recordSentimentFeedback, getUserFavorites, getContentStats } from "./sentiment.ts";
import { generateRecipes as loopkitchenGenerateRecipes } from "./loopkitchen_recipes.ts";
import { getRecipeDetails as loopkitchenGetRecipeDetails } from "./loopkitchen_recipe_details.ts";
import { analyzeNutrition as loopkitchenAnalyzeNutrition, logMeal, getDailyNutrition } from "./loopkitchen_nutrition.ts";
import { generateMealPlan as loopkitchenGenerateMealPlan, generateMealPlanWithGrocery, prepareMealPlanOrder, generateMealPlanWithCommerce } from "./loopkitchen_mealplan.ts";
import { logSessionEvent } from "../_shared/analytics/index.ts";

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
    case "commerce.prepareCart":
      return await prepareCart(params);
    case "commerce.confirmOrder":
      return await confirmOrder(params);
    case "commerce.cancelOrder":
      return await cancelOrder(params);
    case "user.updatePreferences":
      return await updateUserPreferences(params);
    case "retention.dailySuggestion":
      return await generateDailySuggestion(params);
    case "retention.weeklyRefresh":
      return await generateWeeklyRefresh(params);
    case "feedback.sentiment":
      return await recordSentimentFeedback(params);
    case "feedback.getFavorites":
      return await getUserFavorites(params);
    case "feedback.getStats":
      return await getContentStats(params);
    // LoopKitchen Tools
    case "loopkitchen.recipes.generate":
      return await loopkitchenGenerateRecipes(params);
    case "loopkitchen.recipes.details":
      return await loopkitchenGetRecipeDetails(params);
    case "loopkitchen.nutrition.analyze":
      return await loopkitchenAnalyzeNutrition(params);
    case "loopkitchen.nutrition.logMeal":
      return await logMeal(params);
    case "loopkitchen.nutrition.daily":
      return await getDailyNutrition(params);
    case "loopkitchen.mealplan.generate":
      return await loopkitchenGenerateMealPlan(params);
    case "loopkitchen.mealplan.withGrocery":
      return await generateMealPlanWithGrocery(params);
    case "loopkitchen.mealplan.prepareOrder":
      return await prepareMealPlanOrder(params);
    case "loopkitchen.mealplan.complete":
      return await generateMealPlanWithCommerce(params);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

const MANIFEST = {
  name: "TheLoopGPT Tools",
  version: "1.8.0-loopkitchen-phase4",
  description: "Complete food commerce platform: recipes, meal planning, grocery lists, and intelligent order routing",
  status: "Optimized: Postgres caching + streaming + smart routing + intent classification + commerce integration",
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
    },
    {
      name: "commerce.prepareCart",
      description: "🛒 Prepare shopping cart and route order through intelligent provider selection. Detects missing ingredients (if pantry provided) and calls the LoopGPT Commerce Router to get best provider quotes with multi-factor scoring (price, speed, availability, margin, reliability).",
      status: "available"
    },
    {
      name: "commerce.confirmOrder",
      description: "Confirm and place order with selected provider using confirmation token from prepareCart",
      status: "available"
    },
    {
      name: "commerce.cancelOrder",
      description: "Cancel pending order using confirmation token",
      status: "available"
    },
    {
      name: "user.updatePreferences",
      description: "👤 Update user dietary preferences, calorie targets, and cuisine preferences. Stores preferences for personalized meal suggestions and retention features.",
      status: "available"
    },
    {
      name: "retention.dailySuggestion",
      description: "☀️ Generate personalized daily meal suggestions (1-3 recipes) based on user profile. Perfect for re-engagement and 'What should I eat today?' queries. Returns card-friendly format with CTAs.",
      status: "available"
    },
    {
      name: "retention.weeklyRefresh",
      description: "📅 Generate personalized weekly meal plan based on user profile. Updates lastPlanDate for retention tracking. Perfect for 'Refresh my weekly plan' or 'Plan my meals for the week' queries.",
      status: "available"
    },
    {
      name: "feedback.sentiment",
      description: "💬 Record user feedback on recipes, meal plans, and grocery lists. Supports: 👍 Helpful / 👎 Not Helpful, ⭐ Star Ratings (1-5), ❤️ Favorites. Use this to capture user sentiment for analytics and personalization.",
      status: "available"
    },
    {
      name: "feedback.getFavorites",
      description: "❤️ Retrieve user's favorited content (recipes, meal plans, grocery lists). Returns list of favorites with metadata.",
      status: "available"
    },
    {
      name: "feedback.getStats",
      description: "📊 Get aggregated sentiment statistics for content. Returns helpful percentage, average rating, favorite count, etc. Useful for ranking and analytics.",
      status: "available"
    },
    {
      name: "loopkitchen.recipes.generate",
      description: "🍳 LoopKitchen: Generate creative recipes with chaos mode (1-10 playfulness rating), soft time/diet constraints, and widget-based UI. Returns RecipeCardCompact widgets with slug IDs, vibe normalization, and constraint flags.",
      status: "available"
    },
    {
      name: "loopkitchen.recipes.details",
      description: "📖 LoopKitchen: Get detailed recipe with instructions, ingredient split (have vs need), parallel nutrition analysis, and grocery list. Returns RecipeCardDetailed + NutritionSummary + GroceryList widgets.",
      status: "available"
    },
    {
      name: "loopkitchen.nutrition.analyze",
      description: "🥗 LoopKitchen: Standalone nutrition analysis from recipes or raw ingredients. Returns NutritionSummary widget with health score, confidence indicators, insights, and warnings. Supports both recipe-based and ingredient-based analysis.",
      status: "available"
    },
    {
      name: "loopkitchen.nutrition.logMeal",
      description: "📝 LoopKitchen: Log meal with nutrition data for daily/weekly tracking (planned for Phase 4 database integration).",
      status: "planned"
    },
    {
      name: "loopkitchen.nutrition.daily",
      description: "📊 LoopKitchen: Get daily nutrition summary aggregating all logged meals (planned for Phase 4 database integration).",
      status: "planned"
    },
    {
      name: "loopkitchen.mealplan.generate",
      description: "🗓️ LoopKitchen: Generate 7-day meal plan using MealPlannerGPT. Returns WeekPlanner widget with breakfast/lunch/dinner for each day, calorie targets, and weekly summary. Optimizes for ingredient reuse and diet preferences.",
      status: "available"
    },
    {
      name: "loopkitchen.mealplan.withGrocery",
      description: "🛍️ LoopKitchen: Generate meal plan with aggregated grocery list. Returns WeekPlanner + GroceryList widgets. Uses GroceryGPT to organize ingredients into categories.",
      status: "available"
    },
    {
      name: "loopkitchen.mealplan.prepareOrder",
      description: "📦 LoopKitchen: Prepare grocery order from meal plan. Generates grocery list and gets provider quotes via commerce layer. Requires userId and location.",
      status: "available"
    },
    {
      name: "loopkitchen.mealplan.complete",
      description: "✨ LoopKitchen: Complete meal planning flow. Generates meal plan + grocery list + provider quotes in one call. Returns WeekPlanner, GroceryList, and commerce data. Ultimate convenience function.",
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
        
        // Log session event (analytics)
        const sessionId = params.sessionId || req.headers.get("x-session-id") || `session-${Date.now()}`;
        const userAgent = req.headers.get("user-agent") || null;
        const startTime = Date.now();
        
        logSessionEvent({
          userId: userId !== "anonymous" ? userId : null,
          sessionId,
          gptName: toolName.split('.')[0], // e.g., "loopkitchen" from "loopkitchen.recipes.generate"
          eventType: 'tool_call',
          userAgent,
          metadata: { tool: toolName },
        }).catch(err => console.error('[Analytics] Failed to log session event:', err));
        
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
        } else if (toolName === "commerce.prepareCart") {
          result = await prepareCart(params);
        } else if (toolName === "commerce.confirmOrder") {
          result = await confirmOrder(params);
        } else if (toolName === "commerce.cancelOrder") {
          result = await cancelOrder(params);
        } else if (toolName === "user.updatePreferences") {
          result = await updateUserPreferences(params);
        } else if (toolName === "retention.dailySuggestion") {
          result = await generateDailySuggestion(params);
        } else if (toolName === "retention.weeklyRefresh") {
          result = await generateWeeklyRefresh(params);
        } else if (toolName === "feedback.sentiment") {
          result = await recordSentimentFeedback(params);
        } else if (toolName === "feedback.getFavorites") {
          result = await getUserFavorites(params);
        } else if (toolName === "feedback.getStats") {
          result = await getContentStats(params);
        } else if (toolName === "loopkitchen.recipes.generate") {
          result = await loopkitchenGenerateRecipes(params);
        } else if (toolName === "loopkitchen.recipes.details") {
          result = await loopkitchenGetRecipeDetails(params);
        } else if (toolName === "loopkitchen.nutrition.analyze") {
          result = await loopkitchenAnalyzeNutrition(params);
        } else if (toolName === "loopkitchen.nutrition.logMeal") {
          result = await logMeal(params);
        } else if (toolName === "loopkitchen.nutrition.daily") {
          result = await getDailyNutrition(params);
        } else if (toolName === "loopkitchen.mealplan.generate") {
          result = await loopkitchenGenerateMealPlan(params);
        } else if (toolName === "loopkitchen.mealplan.withGrocery") {
          result = await generateMealPlanWithGrocery(params);
        } else if (toolName === "loopkitchen.mealplan.prepareOrder") {
          result = await prepareMealPlanOrder(params);
        } else if (toolName === "loopkitchen.mealplan.complete") {
          result = await generateMealPlanWithCommerce(params);
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
                "grocery.list",
                "commerce.prepareCart",
                "commerce.confirmOrder",
                "commerce.cancelOrder"
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
