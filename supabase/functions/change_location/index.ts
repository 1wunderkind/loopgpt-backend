/**
 * Change Location Edge Function
 * 
 * Allows users to change their location (for travelers, expats, or corrections).
 * This is a convenience wrapper around update_user_location with better UX.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";
import { formatCountryDisplay, isValidCountryCode, normalizeCountryCode } from "../_lib/locationUtils.ts";

interface ChangeLocationRequest {
  chatgpt_user_id: string;
  new_country: string;
  language?: string;
}

interface ChangeLocationResponse {
  success: boolean;
  message: string;
  old_country?: string;
  new_country: string;
  user: {
    id: string;
    chatgpt_user_id: string;
    preferred_language?: string;
    confirmed_country: string;
    updated_at: string;
  };
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as ChangeLocationRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id", "new_country"]);

    const { chatgpt_user_id, new_country, language } = body;

    // Normalize and validate country code
    const normalizedCountry = normalizeCountryCode(new_country);

    if (!isValidCountryCode(normalizedCountry)) {
      return createErrorResponse(
        new Error(`Invalid country code: ${new_country}. Must be 2-letter ISO code (e.g., US, IN, ES)`)
      );
    }

    console.log(`[ChangeLocation] User ${chatgpt_user_id} changing location to ${normalizedCountry}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get old location (if exists)
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("confirmed_country")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .maybeSingle();

    const oldCountry = existingProfile?.confirmed_country;

    // Update location
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          chatgpt_user_id,
          preferred_language: language,
          confirmed_country: normalizedCountry,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "chatgpt_user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[ChangeLocation] Error updating location:", error);
      throw error;
    }

    // Build success message
    let message: string;
    if (oldCountry && oldCountry !== normalizedCountry) {
      message = `Location updated from ${formatCountryDisplay(oldCountry)} to ${formatCountryDisplay(normalizedCountry)}`;
    } else {
      message = `Location set to ${formatCountryDisplay(normalizedCountry)}`;
    }

    console.log(`[ChangeLocation] ${message}`);

    return createSuccessResponse<ChangeLocationResponse>({
      success: true,
      message,
      old_country: oldCountry,
      new_country: normalizedCountry,
      user: data,
    });

  } catch (error) {
    console.error("[ChangeLocation] Error:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
serve(withLogging(handler));

