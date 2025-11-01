/**
 * evaluate_plan_outcome Edge Function (with Multilingual Support)
 * 
 * Compares planned vs. observed weight change for a week.
 * Generates bounded calorie adjustment recommendations (±300 kcal/day max).
 * Stores result in plan_outcomes table.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * @param {string} meal_plan_id - Meal plan UUID (optional)
 * @param {string} week_start - Week start date (YYYY-MM-DD)
 * @param {number} target_delta_kg - Expected weekly weight change (negative = loss)
 * @param {string} language - Optional language hint for response formatting
 * 
 * @returns {object} { ok: true, observed_delta_kg, prediction_error_kg, recommendation, formatted_message }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { formatPlanEvaluation } from "../_lib/weightTrackerMultilingual.ts";

interface EvaluatePlanOutcomeRequest {
  chatgpt_user_id: string;
  meal_plan_id?: string;
  week_start: string;
  target_delta_kg: number;
  language?: string; // Optional language hint
}

interface Recommendation {
  type: string;
  delta_kcal_per_day?: number;
  message: string;
  rationale?: string;
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: EvaluatePlanOutcomeRequest = await req.json();
    const { chatgpt_user_id, meal_plan_id, week_start, target_delta_kg, language } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!week_start) {
      return new Response(
        JSON.stringify({ ok: false, error: "week_start is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof target_delta_kg !== "number") {
      return new Response(
        JSON.stringify({ ok: false, error: "target_delta_kg must be a number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate week end date
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const week_end = weekEndDate.toISOString().slice(0, 10);

    // Get weight logs for the week
    const { data: weightLogs, error: weightError } = await supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .gte("date", week_start)
      .lte("date", week_end)
      .order("date", { ascending: true });

    if (weightError) {
      console.error("Database error:", weightError);
      return new Response(
        JSON.stringify({ ok: false, error: weightError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if we have enough data
    if (!weightLogs || weightLogs.length < 2) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Insufficient weight data for the specified week (need at least 2 data points)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate observed weight change
    const startWeight = weightLogs[0].weight_kg;
    const endWeight = weightLogs[weightLogs.length - 1].weight_kg;
    const observed_delta_kg = Number((endWeight - startWeight).toFixed(2));

    // Calculate prediction error
    const prediction_error_kg = Number((observed_delta_kg - target_delta_kg).toFixed(2));

    // Generate recommendation
    const recommendation = generateRecommendation(
      target_delta_kg,
      observed_delta_kg,
      prediction_error_kg
    );

    // Store outcome in database
    const { data: outcome, error: outcomeError } = await supabase
      .from("plan_outcomes")
      .insert({
        chatgpt_user_id,
        meal_plan_id,
        week_start,
        week_end,
        target_delta_kg,
        observed_delta_kg,
        prediction_error_kg,
        recommendation_kcal_per_day: recommendation.delta_kcal_per_day || 0,
        recommendation_text: recommendation.message,
        rationale: recommendation.rationale,
      })
      .select()
      .single();

    if (outcomeError) {
      console.error("Database error:", outcomeError);
      return new Response(
        JSON.stringify({ ok: false, error: outcomeError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format response in user's language
    const userInput = language || "evaluate plan";
    const formatted_message = await formatPlanEvaluation(
      {
        target_delta_kg,
        observed_delta_kg,
        prediction_error_kg,
        recommendation_kcal_per_day: recommendation.delta_kcal_per_day || 0,
        recommendation_text: recommendation.message,
        rationale: recommendation.rationale || "",
      },
      userInput
    );

    // Return result
    return new Response(
      JSON.stringify({
        ok: true,
        outcome_id: outcome.id,
        target_delta_kg,
        observed_delta_kg,
        prediction_error_kg,
        recommendation,
        formatted_message, // Multilingual!
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Generate bounded calorie adjustment recommendation
 * Max adjustment: ±300 kcal/day
 * Heuristic: 7700 kcal ≈ 1 kg
 */
function generateRecommendation(
  target_delta_kg: number,
  observed_delta_kg: number,
  prediction_error_kg: number
): Recommendation {
  const MAX_ADJUSTMENT_KCAL = 300;
  const KCAL_PER_KG = 7700;

  // If within 0.2 kg of target, maintain current plan
  if (Math.abs(prediction_error_kg) <= 0.2) {
    return {
      type: "maintain",
      delta_kcal_per_day: 0,
      message: "Plan is working well. Maintain current calorie intake.",
      rationale: `Observed change (${observed_delta_kg} kg) is close to target (${target_delta_kg} kg).`,
    };
  }

  // Calculate needed adjustment
  // If observed > target (e.g., lost 0.6 kg vs target 0.5 kg), need to increase calories
  // If observed < target (e.g., lost 0.3 kg vs target 0.5 kg), need to decrease calories
  const raw_adjustment = (prediction_error_kg * KCAL_PER_KG) / 7;

  // Bound adjustment to ±300 kcal/day
  const bounded_adjustment = Math.max(
    -MAX_ADJUSTMENT_KCAL,
    Math.min(MAX_ADJUSTMENT_KCAL, Math.round(raw_adjustment))
  );

  if (bounded_adjustment > 0) {
    return {
      type: "increase",
      delta_kcal_per_day: bounded_adjustment,
      message: `Increase daily calories by ${bounded_adjustment} kcal.`,
      rationale: `You lost more weight than planned (${observed_delta_kg} kg vs ${target_delta_kg} kg). Adding calories will slow weight loss to target rate.`,
    };
  } else {
    return {
      type: "decrease",
      delta_kcal_per_day: bounded_adjustment,
      message: `Decrease daily calories by ${Math.abs(bounded_adjustment)} kcal.`,
      rationale: `You lost less weight than planned (${observed_delta_kg} kg vs ${target_delta_kg} kg). Reducing calories will accelerate weight loss to target rate.`,
    };
  }
}

// Export with logging middleware
export default withLogging(handler);

