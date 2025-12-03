import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSystemAPI } from "../_shared/security/applyMiddleware.ts";


const handler = async (req) => {
  try {
    const { input, chosen_tool, confidence } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Log to tool_choice_log table
    const { data, error } = await supabase
      .from("tool_choice_log")
      .insert({
        input_query: input,
        chosen_tool,
        confidence: confidence || null,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to log tool choice:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        logged: true,
        entry_id: data.id,
        message: "Tool choice logged for QA analysis"
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSystemAPI(handler));

