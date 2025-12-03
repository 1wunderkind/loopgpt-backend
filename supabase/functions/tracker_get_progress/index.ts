/**
 * weekly_trend Edge Function
 * 
 * Returns weight trend data with EWMA (Exponentially Weighted Moving Average) smoothing.
 * Fetches last 14-28 days of weight data and calculates smoothed trend.
 * 
 * @param {string} chatgpt_user_id - User identifier
 * @param {number} days - Number of days to fetch (default: 28)
 * @param {number} alpha - EWMA smoothing factor (default: 0.3)
 * 
 * @returns {object} { ok: true, series: [...], trend: [...], latest_trend_kg: number }
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { formatWeeklyTrend } from "../_lib/weightTrackerMultilingual.ts";

import { createAuthenticatedClient } from "../_lib/auth.ts";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";
interface WeeklyTrendRequest {
  chatgpt_user_id: string;
  days?: number;
  alpha?: number;
  language?: string; // Optional language hint for response formatting
  unit?: string; // Optional unit preference for display
}

interface WeightDataPoint {
  date: string;
  kg: number;
}

/**
 * Calculate EWMA (Exponentially Weighted Moving Average)
 * @param values - Array of weight values
 * @param alpha - Smoothing factor (0-1), higher = more weight on recent values
 * @returns Array of smoothed values
 */
function ewma(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  
  let s = values[0]; // Initialize with first value
  return values.map((v) => {
    s = alpha * v + (1 - alpha) * s;
    return Number(s.toFixed(2));
  });
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body: WeeklyTrendRequest = await req.json();
    const { chatgpt_user_id, days = 28, alpha = 0.3, language, unit = "kg" } = body;

    // Validation
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "chatgpt_user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (days < 7 || days > 90) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "days must be between 7 and 90",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (alpha < 0.1 || alpha > 0.9) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "alpha must be between 0.1 and 0.9",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    // Query weight logs
    const { data, error } = await supabase
      .from("weight_logs")
      .select("date, weight_kg")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle no data case
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          series: [],
          trend: [],
          latest_trend_kg: null,
          message: "No weight data found for the specified period",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle insufficient data case (need at least 2 points for trend)
    if (data.length < 2) {
      const series: WeightDataPoint[] = data.map((r) => ({
        date: r.date,
        kg: Number(r.weight_kg),
      }));

      return new Response(
        JSON.stringify({
          ok: true,
          series,
          trend: [],
          latest_trend_kg: series[0].kg,
          message: "Insufficient data for trend calculation (need at least 2 data points)",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build series
    const series: WeightDataPoint[] = data.map((r) => ({
      date: r.date,
      kg: Number(r.weight_kg),
    }));

    // Calculate EWMA trend
    const weights = series.map((s) => s.kg);
    const trendValues = ewma(weights, alpha);

    // Build trend series with dates
    const trend = series.map((s, i) => ({
      date: s.date,
      kg: trendValues[i],
    }));

    // Get latest trend value
    const latest_trend_kg = trendValues[trendValues.length - 1];

    // Calculate 7-day change (if we have at least 7 days of data)
    let weekly_change_kg = null;
    if (trendValues.length >= 7) {
      const sevenDaysAgo = trendValues[trendValues.length - 7];
      weekly_change_kg = Number((latest_trend_kg - sevenDaysAgo).toFixed(2));
    }

    // Format response in user's language
    const userInput = language || "weekly trend";
    const formatted_message = await formatWeeklyTrend(
      {
        raw_series: series,
        smoothed_series: trend,
        change_kg: weekly_change_kg || 0,
        change_rate_kg_per_week: weekly_change_kg || 0,
        unit,
      },
      userInput
    );

    // Return trend data
    return new Response(
      JSON.stringify({
        ok: true,
        series,
        trend,
        latest_trend_kg,
        weekly_change_kg,
        data_points: series.length,
        date_range: {
          start: series[0].date,
          end: series[series.length - 1].date,
        },
        smoothing: {
          alpha,
          description: "EWMA (Exponentially Weighted Moving Average)",
        },
        formatted_message, // Multilingual!
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return handleError(error);
  }
}

// Export with logging middleware
export default withStandardAPI(withLogging(handler));

