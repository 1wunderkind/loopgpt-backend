/**
 * TheLoopGPT MCP Tools Server
 * Ultra-reliable food and meal planning tools
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MCP_MANIFEST } from "./manifest.ts";
import { ENV, validateEnv } from "./config/env.ts";
import { toUserSafeError } from "./tools/shared/errors.ts";
import { logInfo, logError, logWarn } from "./tools/shared/logging.ts";
import { checkRateLimit } from "./tools/shared/rateLimit.ts";

// Import tools
import { generateRecipes, generateRecipesWithNutrition } from "./tools/recipes.ts";
import { analyzeNutrition } from "./tools/nutrition.ts";
import { generateMealPlan, generateMealPlanWithGroceryList } from "./tools/mealplan.ts";
import { generateGroceryList } from "./tools/grocery.ts";
import { healthCheck, getUsageStats } from "./tools/utils.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Main request handler
 */
serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Strip function name prefix from pathname
  let pathname = url.pathname;
  if (pathname.startsWith('/mcp-tools')) {
    pathname = pathname.replace('/mcp-tools', '') || '/';
  }
  
  logInfo("Request received", {
    method: req.method,
    pathname,
    originalPath: url.pathname
  });
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate environment on startup
    const envCheck = validateEnv();
    if (!envCheck.valid) {
      logError("Environment validation failed", { missing: envCheck.missing });
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          message: "Required environment variables are missing"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // ========================================================================
    // Route: GET / - Manifest
    // ========================================================================
    if (req.method === "GET" && pathname === "/") {
      return new Response(JSON.stringify(MCP_MANIFEST, null, 2), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // ========================================================================
    // Route: GET /health - Health Check
    // ========================================================================
    if (req.method === "GET" && pathname === "/health") {
      const health = await healthCheck();
      return new Response(JSON.stringify(health, null, 2), {
        status: health.status === "healthy" ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // ========================================================================
    // Route: POST /tools/:toolName - Execute Tool
    // ========================================================================
    const toolMatch = pathname.match(/^\/tools\/([a-z.]+)$/);
    if (req.method === "POST" && toolMatch) {
      const toolName = toolMatch[1];
      
      // Parse request body
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
      
      // Extract userId for rate limiting
      const userId = params.userId || req.headers.get("X-User-ID") || "anonymous";
      
      // Rate limiting (skip for utility tools)
      if (ENV.ENABLE_RATE_LIMITING && !toolName.startsWith("health") && !toolName.startsWith("usage")) {
        try {
          await checkRateLimit(userId);
        } catch (err: any) {
          const safeError = toUserSafeError(err);
          return new Response(JSON.stringify(safeError), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      
      // Route to appropriate tool
      try {
        let result: any;
        
        switch (toolName) {
          case "recipes.generate":
            result = await generateRecipes(params);
            break;
          
          case "recipes.generateWithNutrition":
            result = await generateRecipesWithNutrition(params);
            break;
          
          case "nutrition.analyze":
            result = await analyzeNutrition(params);
            break;
          
          case "mealplan.generate":
            result = await generateMealPlan(params);
            break;
          
          case "mealplan.generateWithGroceryList":
            result = await generateMealPlanWithGroceryList(params);
            break;
          
          case "grocery.list":
            result = await generateGroceryList(params);
            break;
          
          case "health.check":
            result = await healthCheck();
            break;
          
          case "usage.stats":
            result = await getUsageStats(params);
            break;
          
          default:
            return new Response(
              JSON.stringify({
                error: "Tool not found",
                message: `Unknown tool: ${toolName}`,
                availableTools: MCP_MANIFEST.tools.map(t => t.name)
              }),
              {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
        }
        
        return new Response(JSON.stringify(result, null, 2), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        logError("Tool execution error", {
          toolName,
          error: err.message,
          stack: err.stack
        });
        
        const safeError = toUserSafeError(err);
        return new Response(JSON.stringify(safeError), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    
    // ========================================================================
    // 404 - Not Found
    // ========================================================================
    return new Response(
      JSON.stringify({
        error: "Not found",
        message: `Route not found: ${pathname}`,
        availableRoutes: [
          "GET /",
          "GET /health",
          "POST /tools/:toolName"
        ],
        availableTools: MCP_MANIFEST.tools.map(t => t.name)
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    logError("Unhandled error", {
      error: err.message,
      stack: err.stack
    });
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

logInfo("TheLoopGPT MCP Tools server started", {
  version: MCP_MANIFEST.version,
  toolCount: MCP_MANIFEST.tools.length,
  cachingEnabled: ENV.ENABLE_CACHING,
  rateLimitingEnabled: ENV.ENABLE_RATE_LIMITING
});
