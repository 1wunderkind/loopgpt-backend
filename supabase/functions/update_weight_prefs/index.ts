/**
 * update_weight_prefs Edge Function
 * 
 * Updates user preferences for weight tracking.
 * Upserts by chatgpt_user_id to create or update.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * @param {string} unit - Unit preference ('kg' or 'lb')
 * @param {string} weigh_time - Preferred weigh-in time
 * @param {number} safe_loss_kg_per_week - Safe weekly loss rate (0.25-1.0 kg)
 * @param {boolean} daily_reminder_enabled - Enable daily reminders
 * @param {string} reminder_time - Reminder time (HH:MM format)
 * @param {string} timezone - User timezone
 * 
 * @returns {object} { ok: true, prefs: {...} }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { formatPreferencesMessage } from "../_lib/weightTrackerMultilingual.ts";

interface UpdateWeightPrefsRequest {
  chatgpt_user_id: string;
  unit?: string;
  weigh_time?: string;
  safe_loss_kg_per_week?: number;
  daily_reminder_enabled?: boolean;
  reminder_time?: string;
  timezone?: string;
  language?: string; // Optional language hint
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: UpdateWeightPrefsRequest = await req.json();
    const {
      chatgpt_user_id,
      unit,
      weigh_time,
      safe_loss_kg_per_week,
      daily_reminder_enabled,
      reminder_time,
      timezone,
      language,
    } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate unit if provided
    if (unit && unit !== "kg" && unit !== "lb") {
      return new Response(
        JSON.stringify({ ok: false, error: "Unit must be 'kg' or 'lb'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate safe_loss_kg_per_week if provided
    if (
      safe_loss_kg_per_week !== undefined &&
      (safe_loss_kg_per_week < 0.25 || safe_loss_kg_per_week > 1.0)
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "safe_loss_kg_per_week must be between 0.25 and 1.0",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate reminder_time format if provided (HH:MM)
    if (reminder_time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(reminder_time)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "reminder_time must be in HH:MM format (e.g., 08:00)",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build update object (only include provided fields)
    const updateData: any = {
      chatgpt_user_id,
      last_updated: new Date().toISOString(),
    };

    if (unit !== undefined) updateData.unit = unit;
    if (weigh_time !== undefined) updateData.weigh_time = weigh_time;
    if (safe_loss_kg_per_week !== undefined)
      updateData.safe_loss_kg_per_week = safe_loss_kg_per_week;
    if (daily_reminder_enabled !== undefined)
      updateData.daily_reminder_enabled = daily_reminder_enabled;
    if (reminder_time !== undefined) updateData.reminder_time = reminder_time;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Upsert preferences
    const { data, error } = await supabase
      .from("weight_prefs")
      .upsert(updateData, {
        onConflict: "chatgpt_user_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format response in user's language
    const userInput = language || "update preferences";
    const formatted_message = await formatPreferencesMessage(
      {
        unit: data.unit,
        weigh_in_time: data.weigh_time,
        safe_loss_kg_per_week: data.safe_loss_kg_per_week,
        daily_reminder_enabled: data.daily_reminder_enabled,
        reminder_time: data.reminder_time,
        reminder_timezone: data.timezone,
      },
      userInput,
      true // isUpdate = true (this is an update)
    );

    // Return updated preferences
    return new Response(
      JSON.stringify({
        ok: true,
        prefs: data,
        message: formatted_message, // Multilingual!
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleError(error);
  }
}

// Export with logging middleware
export default withLogging(handler);

