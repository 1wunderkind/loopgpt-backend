// ============================================================================
// TheLoopGPT.ai - MCP Server
// ============================================================================
// Model Context Protocol server for ChatGPT App Store integration
// 
// This service layer delegates tool execution to specialized Edge Functions
// while providing MCP-compliant request/response handling, validation,
// error handling, and logging.
//
// Architecture: Service Layer Pattern
// - Receives MCP requests from ChatGPT
// - Validates inputs against manifest schemas
// - Delegates to appropriate business logic functions
// - Formats responses in MCP-compliant format
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MANIFEST } from "./manifest_embedded.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";

// Import TheLoopGPT metadata configuration
import {
  THELOOPGPT_METADATA,
  ALL_TOOL_DESCRIPTIONS,
  ROUTING_METADATA,
  getCompleteMetadata,
  getToolWithRouting,
  getRecommendedTool,
  MCP_SERVER_INFO
} from "./metadata.ts";

// ============================================================================
// Environment Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // Optional for elevated privileges

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Manifest Loading
// ============================================================================

// Use embedded manifest instead of loading from file
function loadManifest() {
  return Promise.resolve(MANIFEST);
}

// ============================================================================
// Deprecated Tool Redirects (Taxonomy v2)
// ============================================================================

const DEPRECATED_REDIRECTS: Record<string, string> = {
  "set_weight_goal": "user_set_weight_goal",
  "tracker_set_goals": "user_set_weight_goal",
  "get_user_profile": "user_get_profile",
  "update_diet_preferences": "user_update_diet_preferences",
  "create_meal_plan": "plan_create_meal_plan",
  "generate_recipes": "plan_generate_from_leftovers",
  "random_meal": "plan_random_meal",
  "nutrition_analyze": "nutrition_analyze_food",
  "get_weight_history": "tracker_get_progress",
  "get_weight_trend": "tracker_get_progress",
  "order_meal_delivery": "delivery_place_order",
  "mealme_search": "delivery_search_restaurants"
};

/**
 * Handles deprecated tool names by redirecting to new names
 * Logs usage for sunset tracking
 */
async function handleDeprecatedTool(oldName: string, supabase: any): Promise<string | null> {
  const newName = DEPRECATED_REDIRECTS[oldName];
  
  if (newName) {
    console.warn(`[DEPRECATED] Tool '${oldName}' redirected to '${newName}'`);
    
    // Log to tool_choice_log for sunset tracking
    try {
      await supabase
        .from("tool_choice_log")
        .insert({
          input_query: `[DEPRECATED_ALIAS] ${oldName}`,
          chosen_tool: newName,
          confidence: 1.0,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error("Failed to log deprecated tool usage:", error);
    }
    
    return newName;
  }
  
  return null;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates that a tool name exists in the manifest
 */
function validateToolName(toolName: string, manifest: any): boolean {
  return manifest.tools.some((tool: any) => tool.name === toolName);
}

/**
 * Validates request body against tool's input schema
 * Returns { valid: boolean, errors: string[] }
 */
function validateInput(toolName: string, body: any, manifest: any): { valid: boolean; errors: string[] } {
  const tool = manifest.tools.find((t: any) => t.name === toolName);
  
  if (!tool) {
    return { valid: false, errors: [`Tool '${toolName}' not found in manifest`] };
  }
  
  const schema = tool.input_schema;
  const errors: string[] = [];
  
  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in body) || body[field] === null || body[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  // Basic type checking for provided fields
  if (schema.properties) {
    for (const [key, value] of Object.entries(body)) {
      const propSchema = schema.properties[key];
      if (propSchema && propSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        // Allow integer to be treated as number (JSON doesn't distinguish)
        const isValidType = actualType === propSchema.type || 
                           (propSchema.type === 'integer' && actualType === 'number') ||
                           (propSchema.type === 'number' && actualType === 'number');
        if (!isValidType) {
          errors.push(`Field '${key}' should be type '${propSchema.type}' but got '${actualType}'`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Logging Utilities
// ============================================================================

interface LogEntry {
  timestamp: string;
  tool: string;
  duration_ms: number;
  status: 'success' | 'error';
  error?: string;
}

function log(entry: LogEntry) {
  const logLine = JSON.stringify({
    ...entry,
    service: 'mcp-server',
    version: '1.0.0'
  });
  console.log(logLine);
}

// ============================================================================
// MCP Response Formatters
// ============================================================================

function successResponse(toolName: string, data: any, duration_ms: number) {
  return {
    type: "mcp_result",
    tool: toolName,
    result: data,
    timestamp: new Date().toISOString(),
    duration_ms: Math.round(duration_ms * 100) / 100
  };
}

function errorResponse(toolName: string, message: string, details?: any, duration_ms?: number) {
  return {
    type: "mcp_error",
    tool: toolName,
    error: message,
    details: details || undefined,
    timestamp: new Date().toISOString(),
    duration_ms: duration_ms ? Math.round(duration_ms * 100) / 100 : undefined
  };
}

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ============================================================================
// Main Request Handler
// ============================================================================

serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Debug logging
  console.log(`[MCP] ${req.method} ${url.pathname}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // ========================================================================
  // OAuth Validation (for tool execution only, not manifest)
  // ========================================================================
  if (req.method === 'POST') {
    // Validate OAuth token from ChatGPT
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[MCP] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: 'Valid OAuth token required for tool execution',
          hint: 'Include Authorization: Bearer <token> header'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MCP] Token verification failed:', authError?.message);
      return new Response(
        JSON.stringify({
          error: 'INVALID_TOKEN',
          message: authError?.message || 'Invalid or expired OAuth token',
          hint: 'Token must be issued by Supabase Auth'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    console.log(`[MCP] Authenticated user: ${user.id} (${user.email})`);
  }
  
  // ========================================================================
  // ROUTE 1: Manifest Endpoint (GET / or GET /mcp-server)
  // ========================================================================
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "" || !url.pathname.includes("/tools/"))) {
    try {
      const manifest = await loadManifest();
      return new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
      });
    } catch (error) {
      console.error("Error serving manifest:", error);
      return new Response(
        JSON.stringify({ error: "Failed to load manifest" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // ========================================================================
  // ROUTE 2: Tool Execution (POST /tools/:tool_name or POST /mcp-server/tools/:tool_name)
  // ========================================================================
  const toolMatch = url.pathname.match(/\/tools\/([\w_]+)$/);
  
  if (req.method === "POST" && toolMatch) {
    let toolName = toolMatch[1];
    
    // Handle deprecated tool redirects
    const redirectedName = await handleDeprecatedTool(toolName, supabase);
    if (redirectedName) {
      toolName = redirectedName;
    }
    const startTime = performance.now();
    
    try {
      // Load manifest
      const manifest = await loadManifest();
      
      // Validate tool exists
      if (!validateToolName(toolName, manifest)) {
        const duration = performance.now() - startTime;
        log({
          timestamp: new Date().toISOString(),
          tool: toolName,
          duration_ms: duration,
          status: 'error',
          error: 'Tool not found'
        });
        
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            `Tool '${toolName}' not found`,
            { available_tools: manifest.tools.map((t: any) => t.name) },
            duration
          )),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Parse request body
      let body: any;
      try {
        body = await req.json();
      } catch (error) {
        const duration = performance.now() - startTime;
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            "Invalid JSON in request body",
            { hint: "Ensure request body is valid JSON" },
            duration
          )),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Validate empty body
      if (!body || Object.keys(body).length === 0) {
        const duration = performance.now() - startTime;
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            "Empty request body",
            { hint: "Provide JSON parameters matching the manifest schema" },
            duration
          )),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Validate input against schema
      const validation = validateInput(toolName, body, manifest);
      if (!validation.valid) {
        const duration = performance.now() - startTime;
        log({
          timestamp: new Date().toISOString(),
          tool: toolName,
          duration_ms: duration,
          status: 'error',
          error: 'Validation failed: ' + validation.errors.join(', ')
        });
        
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            "Input validation failed",
            { validation_errors: validation.errors },
            duration
          )),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Optional: Check for Bearer token authentication
      // Uncomment this block to enable authentication
      /*
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const duration = performance.now() - startTime;
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            "Authentication required",
            { hint: "Provide a valid Bearer token in the Authorization header" },
            duration
          )),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      */
      
      // ====================================================================
      // DELEGATION: Invoke the specialized Edge Function
      // ====================================================================
      console.log(`[MCP] Invoking tool: ${toolName}`);
      
      const invocationStart = performance.now();
      const { data, error } = await supabase.functions.invoke(toolName, {
        body,
      });
      const invocationDuration = performance.now() - invocationStart;
      
      if (error) {
        const totalDuration = performance.now() - startTime;
        console.error(`[MCP] ${toolName} failed after ${invocationDuration.toFixed(2)}ms:`, error);
        
        log({
          timestamp: new Date().toISOString(),
          tool: toolName,
          duration_ms: totalDuration,
          status: 'error',
          error: error.message || 'Invocation failed'
        });
        
        return new Response(
          JSON.stringify(errorResponse(
            toolName,
            error.message || "Tool invocation failed",
            {
              error_details: error,
              invocation_duration_ms: Math.round(invocationDuration * 100) / 100
            },
            totalDuration
          )),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      // Success!
      const totalDuration = performance.now() - startTime;
      console.log(`[MCP] ${toolName} succeeded in ${invocationDuration.toFixed(2)}ms`);
      
      log({
        timestamp: new Date().toISOString(),
        tool: toolName,
        duration_ms: totalDuration,
        status: 'success'
      });
      
      return new Response(
        JSON.stringify(successResponse(toolName, data, totalDuration)),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
      
    } catch (err) {
      const duration = performance.now() - startTime;
      console.error(`[MCP] Unexpected error in ${toolName}:`, err);
      
      log({
        timestamp: new Date().toISOString(),
        tool: toolName,
        duration_ms: duration,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      
      return new Response(
        JSON.stringify(errorResponse(
          toolName,
          "Unexpected server error",
          { error: err instanceof Error ? err.message : String(err) },
          duration
        )),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // ========================================================================
  // ROUTE 3: Enhanced Metadata Endpoints
  // ========================================================================
  
  // GET /metadata - Complete metadata package
  if (req.method === "GET" && url.pathname === "/metadata") {
    try {
      const metadata = getCompleteMetadata();
      return new Response(JSON.stringify(metadata, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to load metadata" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // GET /metadata/tool/:tool_id - Tool description with routing hints
  const toolMetadataMatch = url.pathname.match(/\/metadata\/tool\/([\w_]+)$/);
  if (req.method === "GET" && toolMetadataMatch) {
    const toolId = toolMetadataMatch[1];
    try {
      const toolWithRouting = getToolWithRouting(toolId);
      if (!toolWithRouting) {
        return new Response(
          JSON.stringify({ error: `Tool '${toolId}' not found` }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      return new Response(JSON.stringify(toolWithRouting, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to load tool metadata" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // POST /metadata/recommend - Get recommended tool for query
  if (req.method === "POST" && url.pathname === "/metadata/recommend") {
    try {
      const body = await req.json();
      const query = body.query || body.user_query || "";
      
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Missing 'query' field in request body" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
      const recommendation = getRecommendedTool(query);
      return new Response(JSON.stringify(recommendation || { message: "No matching tool found" }, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to process recommendation request" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // GET /metadata/routing - Routing hints and trigger examples
  if (req.method === "GET" && url.pathname === "/metadata/routing") {
    try {
      return new Response(JSON.stringify(ROUTING_METADATA, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to load routing metadata" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // GET /metadata/app - App identity and description
  if (req.method === "GET" && url.pathname === "/metadata/app") {
    try {
      return new Response(JSON.stringify(THELOOPGPT_METADATA, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to load app metadata" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
  
  // ========================================================================
  // ROUTE 4: Fallback - Unknown Route
  // ========================================================================
  return new Response(
    JSON.stringify({
      error: "Not found",
      hint: "Use GET / for manifest or POST /tools/{tool_name} to execute a tool",
      available_routes: [
        "GET /",
        "POST /tools/{tool_name}",
        "GET /metadata",
        "GET /metadata/tool/:tool_id",
        "POST /metadata/recommend",
        "GET /metadata/routing",
        "GET /metadata/app"
      ]
    }),
    {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
});


