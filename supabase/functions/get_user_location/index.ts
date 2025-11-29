/**
 * Get User Location Edge Function
 * 
 * Returns user's confirmed location from profile, or falls back to geo hint.
 * 
 * Purpose: Enable language-independent location detection for affiliate routing
 * Pattern: Check stored profile first, then use geo hint, then return null
 * 
 * Use Case: Hindi speaker in US needs US affiliates, not Indian
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";

import { createAuthenticatedClient } from "../_lib/auth.ts";
interface GetUserLocationRequest {
  chatgpt_user_id: string;
  detected_language?: string;
  geo_hint?: string; // Optional hint from ChatGPT metadata
}

interface GetUserLocationResponse {
  success: boolean;
  language?: string;
  country?: string;
  source: "stored_profile" | "geo_hint" | "not_found";
  needs_confirmation: boolean;
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as GetUserLocationRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id"]);

    const { chatgpt_user_id, detected_language, geo_hint } = body;

    console.log(`[GetUserLocation] User: ${chatgpt_user_id}, Language: ${detected_language}, Geo Hint: ${geo_hint}`);

    // Get authenticated Supabase client (enforces RLS)


    const { supabase, userId, error: authError } = await createAuthenticatedClient(req);


    


    if (authError) {


      return new Response(


        JSON.stringify({ ok: false, error: authError }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    if (!userId) {


      return new Response(


        JSON.stringify({ ok: false, error: "Authentication required" }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // 1. Try to get stored profile
    const { data: existingProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .maybeSingle();

    if (profileError) {
      console.error("[GetUserLocation] Error fetching profile:", profileError);
      throw profileError;
    }

    // 2. If profile exists with confirmed country, return it
    if (existingProfile?.confirmed_country) {
      console.log(`[GetUserLocation] Found stored profile: ${existingProfile.confirmed_country}`);
      
      return createSuccessResponse<GetUserLocationResponse>({
        success: true,
        language: existingProfile.preferred_language || detected_language,
        country: existingProfile.confirmed_country,
        source: "stored_profile",
        needs_confirmation: false,
      });
    }

    // 3. If no stored profile, check geo hint
    if (geo_hint) {
      console.log(`[GetUserLocation] Using geo hint: ${geo_hint}`);
      
      return createSuccessResponse<GetUserLocationResponse>({
        success: true,
        language: detected_language,
        country: geo_hint,
        source: "geo_hint",
        needs_confirmation: true, // Needs user confirmation
      });
    }

    // 4. No stored profile and no geo hint - needs user input
    console.log(`[GetUserLocation] No location found, needs user confirmation`);
    
    return createSuccessResponse<GetUserLocationResponse>({
      success: true,
      language: detected_language,
      country: undefined,
      source: "not_found",
      needs_confirmation: true,
    });

  } catch (error) {
    console.error("[GetUserLocation] Error:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
serve(withLogging(handler));

