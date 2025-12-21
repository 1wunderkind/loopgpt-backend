
/**
 * LeftoverGPT MCP Server Entrypoint
 * 
 * STRICT ADAPTER MODE
 * This server exposes ONLY the LeftoverGPT application to ChatGPT.
 * All other LooptOS functionality is hidden from this surface.
 */

import { serve } from "std@0.177.0/http/server.ts";
import { handleLeftoverGPTRequest } from "../apps/leftovergpt/index.ts";
import { LEFTOVERGPT_TOOLS } from "../apps/leftovergpt/tools.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

console.log("[LeftoverGPT] MCP Server starting in STRICT ADAPTER MODE");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const url = new URL(req.url);

    // Health Check
    if (url.pathname.endsWith("/health")) {
      return new Response(JSON.stringify({ status: "ok", mode: "adapter", app: "leftovergpt" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Manifest Endpoint - The "Face" of the App
    // This is what ChatGPT reads to know what tools are available
    if (req.method === "GET" && (url.pathname.endsWith("/manifest") || url.pathname.endsWith("/mcp/manifest"))) {
      return new Response(JSON.stringify({
        schema_version: "v1",
        display_name: "LeftoverGPT",
        description: "Turn your leftovers into delicious meals. Generate recipes, adjust them to your taste, and order missing ingredients. Powered by LooptOS.",
        tools: LEFTOVERGPT_TOOLS
      }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Execution Endpoint - The "Brain" of the App
    // Routes execution to the LeftoverGPT Adapter
    if (req.method === "POST" && (url.pathname.endsWith("/execute") || url.pathname.endsWith("/mcp/execute"))) {
      // Add CORS headers to the response from the adapter
      const response = await handleLeftoverGPTRequest(req);
      
      // We need to clone the response to add headers if they are immutable, 
      // or just create a new one. The adapter returns a Response object.
      // Easiest way is to read the body and create a new response with merged headers.
      const body = await response.text();
      const headers = new Headers(response.headers);
      
      // Merge CORS headers
      const cors = getCorsHeaders(req);
      for (const [key, value] of Object.entries(cors)) {
        headers.set(key, value);
      }

      return new Response(body, {
        status: response.status,
        headers: headers
      });
    }

    return new Response("Not Found", { status: 404 });

  } catch (error) {
    console.error("[LeftoverGPT] Server Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
