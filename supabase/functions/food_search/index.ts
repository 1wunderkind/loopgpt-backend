/**
 * Food Search Endpoint
 * 
 * Provides fuzzy search for the FoodSearchInput autocomplete component.
 * Returns top N matching foods with nutrition data.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFoodSuggestions } from "../../lib/food_lookup_helper.ts";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SearchRequest {
  query: string;
  limit?: number;
}

const handler = async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: SearchRequest = await req.json();
    const { query, limit = 5 } = body;

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user ID from auth header (optional)
    const authHeader = req.headers.get("Authorization");
    let userId: string | undefined;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      } catch (error) {
        console.warn("Failed to get user from token:", error);
      }
    }

    // Search for foods
    const results = await getFoodSuggestions(query, limit, userId);

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        query,
        results,
        count: results.length,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in food_search:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSearchAPI(handler));

