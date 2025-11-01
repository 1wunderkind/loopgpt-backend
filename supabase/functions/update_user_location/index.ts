/**
 * Update User Location Edge Function
 * 
 * Stores or updates user's confirmed country and language preference.
 * 
 * Purpose: Persist user location after confirmation for future sessions
 * Pattern: Upsert to user_profiles table
 * 
 * Use Cases:
 * - First-time user confirms location
 * - Returning user changes location (e.g., traveling)
 * - User corrects incorrect location
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";

interface UpdateUserLocationRequest {
  chatgpt_user_id: string;
  language?: string;
  confirmed_country: string;
}

interface UpdateUserLocationResponse {
  success: boolean;
  user: {
    id: string;
    chatgpt_user_id: string;
    preferred_language?: string;
    confirmed_country: string;
    created_at: string;
    updated_at: string;
  };
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as UpdateUserLocationRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id", "confirmed_country"]);

    const { chatgpt_user_id, language, confirmed_country } = body;

    console.log(`[UpdateUserLocation] User: ${chatgpt_user_id}, Country: ${confirmed_country}, Language: ${language}`);

    // Validate country code format (2-letter ISO code)
    if (!/^[A-Z]{2}$/.test(confirmed_country)) {
      return createErrorResponse(
        new Error(`Invalid country code: ${confirmed_country}. Must be 2-letter ISO code (e.g., US, IN, ES)`)
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert user profile
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          chatgpt_user_id,
          preferred_language: language,
          confirmed_country,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "chatgpt_user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[UpdateUserLocation] Error upserting profile:", error);
      throw error;
    }

    console.log(`[UpdateUserLocation] Successfully updated profile for user ${chatgpt_user_id}`);

    return createSuccessResponse<UpdateUserLocationResponse>({
      success: true,
      user: data,
    });

  } catch (error) {
    console.error("[UpdateUserLocation] Error:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
serve(withLogging(handler));

