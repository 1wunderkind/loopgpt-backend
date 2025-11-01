/**
 * push_plan_feedback Edge Function
 * 
 * Marks a plan outcome as "applied" and optionally notifies MealPlannerGPT.
 * This function is called when a user accepts a recommendation.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * @param {string} outcome_id - Plan outcome UUID
 * @param {boolean} applied - Whether user applied the recommendation
 * @param {boolean} notify_mealplanner - Whether to notify MealPlannerGPT (future)
 * 
 * @returns {object} { ok: true, outcome: {...} }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { formatFeedbackConfirmation } from "../_lib/weightTrackerMultilingual.ts";

interface PushPlanFeedbackRequest {
  chatgpt_user_id: string;
  outcome_id: string;
  applied: boolean;
  notify_mealplanner?: boolean;
  language?: string; // Optional language hint
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: PushPlanFeedbackRequest = await req.json();
    const {
      chatgpt_user_id,
      outcome_id,
      applied,
      notify_mealplanner = false,
      language,
    } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!outcome_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "outcome_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof applied !== "boolean") {
      return new Response(
        JSON.stringify({ ok: false, error: "applied must be a boolean" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update plan_outcomes table
    const { data, error } = await supabase
      .from("plan_outcomes")
      .update({ applied })
      .eq("id", outcome_id)
      .eq("chatgpt_user_id", chatgpt_user_id) // Ensure user owns this outcome
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Outcome not found or access denied",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: Notify MealPlannerGPT if requested
    // This would involve calling MealPlannerGPT's API or updating a shared state
    // For MVP, we'll just store the feedback and let MealPlannerGPT query it
    let notification_sent = false;
    if (notify_mealplanner) {
      // Future implementation:
      // - Call MealPlannerGPT's /api/feedback endpoint
      // - Or update a shared "pending_adjustments" table
      // - Or send a webhook to MealPlannerGPT
      console.log(
        `TODO: Notify MealPlannerGPT about outcome ${outcome_id} for user ${chatgpt_user_id}`
      );
      notification_sent = false; // Not implemented yet
    }

    // Format response in user's language
    const userInput = language || "apply recommendation";
    const formatted_message = await formatFeedbackConfirmation(
      {
        meal_plan_id: data.meal_plan_id,
        recommendation_kcal_per_day: data.recommendation_kcal_per_day,
        applied,
      },
      userInput
    );

    // Return success
    return new Response(
      JSON.stringify({
        ok: true,
        outcome: data,
        notification_sent,
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

