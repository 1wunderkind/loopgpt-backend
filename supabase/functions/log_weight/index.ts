/**
 * log_weight Edge Function
 * 
 * Logs a user's daily weight measurement.
 * Converts units to kg internally (canonical format).
 * Upserts by (chatgpt_user_id, date) to prevent duplicates.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * @param {number} weight - Weight value
 * @param {string} unit - Unit ('kg' or 'lb'), defaults to 'kg'
 * @param {string} date - Date in YYYY-MM-DD format, defaults to today
 * @param {string} source - Source of measurement ('manual', 'apple_health', 'fitbit')
 * 
 * @returns {object} { ok: true, data: {...} }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { formatWeightLogConfirmation } from "../_lib/weightTrackerMultilingual.ts";

interface LogWeightRequest {
  chatgpt_user_id: string;
  weight: number;
  unit?: string;
  date?: string;
  source?: string;
  language?: string; // Optional language hint for response formatting
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: LogWeightRequest = await req.json();
    const { chatgpt_user_id, weight, unit = "kg", date, source = "manual", language } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!weight || typeof weight !== "number" || weight <= 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Valid weight is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (unit !== "kg" && unit !== "lb") {
      return new Response(
        JSON.stringify({ ok: false, error: "Unit must be 'kg' or 'lb'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert weight to kg (canonical format)
    const weight_kg = unit === "lb" ? weight * 0.45359237 : weight;

    // Validate converted weight is within reasonable bounds
    if (weight_kg < 20 || weight_kg > 500) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Weight out of reasonable range (20-500 kg)" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use provided date or default to today
    const log_date = date || new Date().toISOString().slice(0, 10);

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(log_date)) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Date must be in YYYY-MM-DD format" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert weight log (prevents duplicates for same user/date)
    const { data, error } = await supabase
      .from("weight_logs")
      .upsert(
        {
          chatgpt_user_id,
          date: log_date,
          weight_kg: Number(weight_kg.toFixed(2)), // Round to 2 decimal places
          source,
        },
        {
          onConflict: "chatgpt_user_id,date",
        }
      )
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
    const weight_display = unit === "lb" 
      ? `${(data.weight_kg / 0.45359237).toFixed(1)} lb`
      : `${data.weight_kg.toFixed(1)} kg`;

    // Use user input for language detection
    const userInput = language || `${weight} ${unit}`;

    // Format confirmation message in user's language
    const formatted_message = await formatWeightLogConfirmation(
      {
        weight_kg: data.weight_kg,
        weight_display,
        date: data.date,
      },
      userInput
    );

    // Return success with logged data
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          id: data.id,
          chatgpt_user_id: data.chatgpt_user_id,
          date: data.date,
          weight_kg: data.weight_kg,
          weight_display,
          source: data.source,
          created_at: data.created_at,
        },
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

