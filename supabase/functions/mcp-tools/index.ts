/**
 * TheLoopGPT MCP Tools Server - Minimal Version
 * Testing deployment first, then adding features incrementally
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MANIFEST = {
  name: "TheLoopGPT Tools",
  version: "1.0.0-minimal",
  description: "Ultra-reliable food and meal planning tools powered by AI",
  status: "Minimal test deployment - full features coming soon",
  tools: [
    {
      name: "health.check",
      description: "Check system health and service availability",
      status: "available"
    },
    {
      name: "recipes.generate",
      description: "Generate creative recipes from available ingredients",
      status: "coming_soon"
    },
    {
      name: "nutrition.analyze",
      description: "Analyze nutritional content of recipes",
      status: "coming_soon"
    },
    {
      name: "mealplan.generate",
      description: "Generate structured meal plans",
      status: "coming_soon"
    },
    {
      name: "grocery.list",
      description: "Generate organized shopping lists",
      status: "coming_soon"
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
    
    // POST /tools/:toolName - Tool execution (placeholder)
    const toolMatch = pathname.match(/^\/tools\/([a-z.]+)$/);
    if (req.method === "POST" && toolMatch) {
      const toolName = toolMatch[1];
      
      return new Response(
        JSON.stringify({
          error: "Not implemented",
          message: `Tool ${toolName} is not yet implemented in this minimal version`,
          hint: "Check /health for deployment status"
        }),
        {
          status: 501,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
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
