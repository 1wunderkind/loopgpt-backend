/**
 * Nutrition Analyze (Deterministic) - Edge Function
 * 
 * Deterministic nutrition analysis using rule-based engine.
 * No LLM calls in calculation path - pure computation.
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import { analyzeNutrition } from "../mcp-tools/nutrition_deterministic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Handler
// ============================================================================

const handler = async (req: Request): Promise<Response> => {
  console.log("[nutrition_analyze_deterministic] Request received");

  try {
    // Parse request body
    const body = await req.json();
    console.log("[nutrition_analyze_deterministic] Input:", {
      hasRecipes: !!body.recipes,
      hasIngredients: !!body.ingredients,
      servings: body.servings,
    });

    // Call deterministic engine
    const result = await analyzeNutrition(body);

    console.log("[nutrition_analyze_deterministic] Success:", {
      calories: result.perServing.calories,
      confidence: result.confidence,
      tags: result.tags.length,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[nutrition_analyze_deterministic] Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// ============================================================================
// Serve with Middleware
// ============================================================================

serve(withOrderAPI(handler));
