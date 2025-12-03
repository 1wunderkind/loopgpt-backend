import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import manifest from "../manifest_v2.json" assert { type: "json" };
import { withSystemAPI } from "../_shared/security/applyMiddleware.ts";


const handler = async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ping database
    const { data, error } = await supabase
      .from("tracker_foods")
      .select("count", { count: "exact", head: true });
    
    const dbStatus = error ? "error" : "ok";
    
    // Calculate manifest checksum (simple hash)
    const manifestStr = JSON.stringify(manifest.tools);
    const checksum = manifestStr.length.toString(16);
    
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: manifest.version,
        manifest_checksum: checksum,
        database: {
          status: dbStatus,
          connection: supabaseUrl ? "configured" : "missing"
        },
        tools: {
          total: manifest.tools.length,
          active: manifest.tools.filter((t: any) => !t.deprecated).length,
          deprecated: manifest.tools.filter((t: any) => t.deprecated).length
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
});

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSystemAPI(handler));

