import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSystemAPI } from "../_shared/security/applyMiddleware.ts";

const TOTAL_TOOLS = 48; // Total number of edge functions deployed
const VERSION = "2.0.0";

const handler = async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ping database
    const { data, error } = await supabase
      .from("tracker_foods")
      .select("count", { count: "exact", head: true });
    
    const dbStatus = error ? "error" : "ok";
    
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: VERSION,
        database: {
          status: dbStatus,
          connection: supabaseUrl ? "configured" : "missing"
        },
        tools: {
          total: TOTAL_TOOLS,
          active: TOTAL_TOOLS,
          deprecated: 0
        },
        features: {
          security_middleware: true,
          rate_limiting: true,
          request_size_limits: true,
          phase3_commerce_routing: true,
          gdpr_ccpa_compliance: true,
          mcp_server: true
        }
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message 
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSystemAPI(handler));
