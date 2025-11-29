/**
 * get_weight_prefs Edge Function
 * 
 * Retrieves user preferences for weight tracking.
 * Returns sensible defaults if no preferences exist yet.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * 
 * @returns {object} { ok: true, prefs: {...} }
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError, createErrorResponse } from "../../middleware/errorHandler.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
import { formatPreferencesMessage } from "../_lib/weightTrackerMultilingual.ts";

interface GetWeightPrefsRequest {
  chatgpt_user_id: string;
  language?: string; // Optional language hint
}

interface WeightPrefs {
  chatgpt_user_id: string;
  unit: string;
  weigh_time: string;
  safe_loss_kg_per_week: number;
  daily_reminder_enabled: boolean;
  reminder_time: string;
  timezone: string;
  last_updated?: string;
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: GetWeightPrefsRequest = await req.json();
    const { chatgpt_user_id, language } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get authenticated Supabase client (enforces RLS)
    const { supabase, userId, error: authError } = await createAuthenticatedClient(req);
    
    if (authError) {
      return createErrorResponse("AUTH_ERROR", authError, 401);
    }
    
    if (!userId) {
      return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // Query preferences
    const { data, error } = await supabase
      .from("weight_prefs")
      .select("*")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    // If error and it's not "no rows found", return error
    if (error && error.code !== "PGRST116") {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Default preferences if no row exists
    const defaultPrefs: WeightPrefs = {
      chatgpt_user_id,
      unit: "kg",
      weigh_time: "morning_fasted",
      safe_loss_kg_per_week: 0.5,
      daily_reminder_enabled: false,
      reminder_time: "08:00",
      timezone: "UTC",
    };

    // Return existing preferences or defaults
    const prefs: WeightPrefs = data || defaultPrefs;

    // Format response in user's language
    const userInput = language || "get preferences";
    const formatted_message = await formatPreferencesMessage(
      {
        unit: prefs.unit,
        weigh_in_time: prefs.weigh_time,
        safe_loss_kg_per_week: prefs.safe_loss_kg_per_week,
        daily_reminder_enabled: prefs.daily_reminder_enabled,
        reminder_time: prefs.reminder_time,
        reminder_timezone: prefs.timezone,
      },
      userInput,
      false // isUpdate = false (this is a get, not an update)
    );

    return new Response(
      JSON.stringify({
        ok: true,
        prefs,
        is_new_user: !data, // Indicates if this is first time user
        formatted_message, // Multilingual!
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleError(error);
  }
}

// Export with logging middleware
export default withLogging(handler);

