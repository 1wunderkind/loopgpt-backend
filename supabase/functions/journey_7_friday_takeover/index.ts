/**
 * Journey 7: Friday Takeover
 * 
 * Edge Function for weekly reflection, celebration, and planning.
 * Creates a "Week in Review" ritual that drives engagement and viral sharing.
 * 
 * Features:
 * - Weekly data aggregation
 * - Win celebration
 * - Challenge acknowledgment
 * - Next week planning
 * - Shareable "Week in Review" card
 * - Motivational messaging
 * - Complete analytics tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface RequestBody {
  chatgpt_user_id: string;
  week_number?: number;
}

interface WeekSummary {
  week_number: number;
  weight_change: number;
  days_tracked: number;
  meals_logged: number;
  plan_adherence: number;
  biggest_win: string;
}

interface Reflection {
  what_went_well: string[];
  challenges: string[];
  lessons_learned: string[];
}

interface NextWeekPlan {
  focus_areas: string[];
  suggested_adjustments: string[];
  motivation: string;
}

interface ShareableCard {
  title: string;
  preview_text: string;
  share_url: string;
}

// Get week number
function getWeekNumber(date: Date = new Date()): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Get week date range
function getWeekRange(weekNumber?: number): { start: Date; end: Date } {
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const targetWeek = weekNumber || currentWeek;
  
  // Calculate start of target week
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const daysToAdd = (targetWeek - 1) * 7 - startOfYear.getDay();
  const weekStart = new Date(startOfYear);
  weekStart.setDate(startOfYear.getDate() + daysToAdd);
  
  // End of week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return { start: weekStart, end: weekEnd };
}

// Aggregate week data
async function aggregateWeekData(
  supabase: any,
  userId: string,
  weekRange: { start: Date; end: Date }
): Promise<WeekSummary> {
  const startDate = weekRange.start.toISOString().split("T")[0];
  const endDate = weekRange.end.toISOString().split("T")[0];

  // Get weight change
  const { data: weightLogs } = await supabase
    .from("weight_logs")
    .select("weight_kg, date")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  let weightChange = 0;
  let daysTracked = 0;
  
  if (weightLogs && weightLogs.length >= 2) {
    const startWeight = weightLogs[0].weight_kg;
    const endWeight = weightLogs[weightLogs.length - 1].weight_kg;
    weightChange = endWeight - startWeight;
    daysTracked = weightLogs.length;
  }

  // Get meals logged
  const { data: mealLogs, count: mealsLogged } = await supabase
    .from("meal_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .gte("logged_at", weekRange.start.toISOString())
    .lte("logged_at", weekRange.end.toISOString());

  // Calculate adherence (mock for now)
  const planAdherence = daysTracked >= 5 ? 85 : daysTracked >= 3 ? 70 : 50;

  // Determine biggest win
  let biggestWin = "Stayed consistent with tracking";
  if (weightChange < -0.5) {
    biggestWin = `Lost ${Math.abs(weightChange).toFixed(1)} kg this week!`;
  } else if (daysTracked >= 7) {
    biggestWin = "Perfect 7-day tracking streak!";
  } else if (mealsLogged && mealsLogged >= 15) {
    biggestWin = `Logged ${mealsLogged} meals this week!`;
  }

  return {
    week_number: getWeekNumber(weekRange.start),
    weight_change: Math.round(weightChange * 10) / 10,
    days_tracked: daysTracked,
    meals_logged: mealsLogged || 0,
    plan_adherence: planAdherence,
    biggest_win: biggestWin,
  };
}

// Generate reflection
function generateReflection(summary: WeekSummary): Reflection {
  const whatWentWell: string[] = [];
  const challenges: string[] = [];
  const lessonsLearned: string[] = [];

  // What went well
  if (summary.weight_change < 0) {
    whatWentWell.push(`Weight loss of ${Math.abs(summary.weight_change)} kg`);
  }
  if (summary.days_tracked >= 5) {
    whatWentWell.push("Consistent tracking throughout the week");
  }
  if (summary.meals_logged >= 15) {
    whatWentWell.push("Excellent meal logging discipline");
  }
  if (summary.plan_adherence >= 80) {
    whatWentWell.push("Strong adherence to your plan");
  }

  // Challenges
  if (summary.days_tracked < 5) {
    challenges.push("Tracking consistency could be improved");
  }
  if (summary.weight_change > 0) {
    challenges.push("Weight increased this week");
  }
  if (summary.meals_logged < 10) {
    challenges.push("Meal logging was sporadic");
  }

  // Lessons learned
  if (summary.weight_change < 0 && summary.plan_adherence >= 80) {
    lessonsLearned.push("Consistency with tracking leads to results");
  }
  if (summary.days_tracked >= 5) {
    lessonsLearned.push("Regular weigh-ins help maintain accountability");
  }
  if (challenges.length > 0) {
    lessonsLearned.push("Every week is a learning opportunity");
  }

  // Defaults if empty
  if (whatWentWell.length === 0) {
    whatWentWell.push("You showed up and engaged with your plan");
  }
  if (challenges.length === 0) {
    challenges.push("Keep pushing forward - you're doing great!");
  }
  if (lessonsLearned.length === 0) {
    lessonsLearned.push("Progress isn't always linear - stay patient");
  }

  return { what_went_well: whatWentWell, challenges, lessons_learned: lessonsLearned };
}

// Generate next week plan
function generateNextWeekPlan(summary: WeekSummary, reflection: Reflection): NextWeekPlan {
  const focusAreas: string[] = [];
  const suggestedAdjustments: string[] = [];

  // Focus areas based on challenges
  if (summary.days_tracked < 5) {
    focusAreas.push("Track weight at least 5 days this week");
  }
  if (summary.meals_logged < 15) {
    focusAreas.push("Log meals consistently every day");
  }
  if (summary.weight_change >= 0) {
    focusAreas.push("Review portion sizes and calorie targets");
  }

  // Suggested adjustments
  if (summary.weight_change > 0.5) {
    suggestedAdjustments.push("Consider reducing daily calories by 100-200");
  }
  if (summary.plan_adherence < 70) {
    suggestedAdjustments.push("Set daily reminders for tracking");
  }

  // Defaults if empty
  if (focusAreas.length === 0) {
    focusAreas.push("Maintain your current momentum");
    focusAreas.push("Continue tracking consistently");
  }
  if (suggestedAdjustments.length === 0) {
    suggestedAdjustments.push("Keep doing what you're doing - it's working!");
  }

  // Motivation
  let motivation = "You've got this! Every week is a new opportunity to get closer to your goals. 💪";
  if (summary.weight_change < -0.5) {
    motivation = "Amazing progress! Keep up the great work - you're crushing it! 🔥";
  } else if (summary.days_tracked >= 7) {
    motivation = "Your consistency is inspiring! Stay the course and results will follow. 🌟";
  }

  return { focus_areas: focusAreas, suggested_adjustments: suggestedAdjustments, motivation };
}

// Format response
function formatResponse(
  summary: WeekSummary,
  reflection: Reflection,
  nextWeekPlan: NextWeekPlan,
  shareableCard?: ShareableCard
): string {
  const sections: string[] = [];

  sections.push("# 🎉 Friday Takeover: Week in Review");
  sections.push("");
  sections.push(`**Week ${summary.week_number} Summary**`);
  sections.push("");

  // Biggest win
  sections.push("## 🏆 Biggest Win");
  sections.push("");
  sections.push(`**${summary.biggest_win}**`);
  sections.push("");

  // Stats
  sections.push("## 📊 This Week's Stats");
  sections.push("");
  sections.push(`- **Weight change:** ${summary.weight_change >= 0 ? '+' : ''}${summary.weight_change} kg`);
  sections.push(`- **Days tracked:** ${summary.days_tracked}/7`);
  sections.push(`- **Meals logged:** ${summary.meals_logged}`);
  sections.push(`- **Plan adherence:** ${summary.plan_adherence}%`);
  sections.push("");

  // What went well
  sections.push("## ✅ What Went Well");
  sections.push("");
  reflection.what_went_well.forEach((item) => {
    sections.push(`- ${item}`);
  });
  sections.push("");

  // Challenges
  if (reflection.challenges.length > 0) {
    sections.push("## 💪 Challenges");
    sections.push("");
    reflection.challenges.forEach((item) => {
      sections.push(`- ${item}`);
    });
    sections.push("");
  }

  // Lessons learned
  sections.push("## 💡 Lessons Learned");
  sections.push("");
  reflection.lessons_learned.forEach((item) => {
    sections.push(`- ${item}`);
  });
  sections.push("");

  sections.push("---");
  sections.push("");

  // Next week plan
  sections.push("## 🎯 Next Week's Focus");
  sections.push("");
  nextWeekPlan.focus_areas.forEach((area) => {
    sections.push(`- ${area}`);
  });
  sections.push("");

  // Suggested adjustments
  if (nextWeekPlan.suggested_adjustments.length > 0) {
    sections.push("### Suggested Adjustments");
    sections.push("");
    nextWeekPlan.suggested_adjustments.forEach((adjustment) => {
      sections.push(`- ${adjustment}`);
    });
    sections.push("");
  }

  // Motivation
  sections.push("---");
  sections.push("");
  sections.push(`**${nextWeekPlan.motivation}**`);
  sections.push("");

  // Shareable card
  if (shareableCard) {
    sections.push("---");
    sections.push("");
    sections.push("💚 **Share your week!**");
    sections.push(`[Share your progress →](${shareableCard.share_url})`);
  }

  return sections.join("\n");
}

// Main Handler
serve(async (req) => {
  const startTime = Date.now();

  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Parse request
    const body: RequestBody = await req.json();
    const { chatgpt_user_id, week_number } = body;

    // Validate
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: chatgpt_user_id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get week range
    const weekRange = getWeekRange(week_number);

    // Aggregate week data
    const summary = await aggregateWeekData(supabase, chatgpt_user_id, weekRange);

    // Generate reflection
    const reflection = generateReflection(summary);

    // Generate next week plan
    const nextWeekPlan = generateNextWeekPlan(summary, reflection);

    // Generate shareable card
    const cardId = crypto.randomUUID();
    const shareableCard: ShareableCard = {
      title: `Week ${summary.week_number}: ${summary.biggest_win}`,
      preview_text: `${summary.weight_change < 0 ? 'Lost' : 'Gained'} ${Math.abs(summary.weight_change)} kg | ${summary.days_tracked}/7 days tracked | ${summary.plan_adherence}% adherence`,
      share_url: `https://loopgpt.app/week-review/${cardId}`,
    };

    // Store shareable card
    await supabase.from("shared_cards").insert({
      card_id: cardId,
      user_id: chatgpt_user_id,
      card_type: "week_review",
      title: shareableCard.title,
      preview_text: shareableCard.preview_text,
      card_data: { summary, reflection, nextWeekPlan },
    });

    // Store progress snapshot
    await supabase.from("progress_snapshots").insert({
      user_id: chatgpt_user_id,
      week_number: summary.week_number,
      start_date: weekRange.start.toISOString().split("T")[0],
      end_date: weekRange.end.toISOString().split("T")[0],
      weight_change: summary.weight_change,
      days_tracked: summary.days_tracked,
      meals_logged: summary.meals_logged,
      plan_adherence: summary.plan_adherence,
    });

    // Format response
    const formattedResponse = formatResponse(summary, reflection, nextWeekPlan, shareableCard);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Log analytics
    const toolCallId = crypto.randomUUID();

    await supabase.from("tool_calls").insert({
      tool_call_id: toolCallId,
      tool_name: "journey_7_friday_takeover",
      user_id: chatgpt_user_id,
      input_params: {
        week_number: summary.week_number,
        days_tracked: summary.days_tracked,
      },
      success: true,
      duration_ms: durationMs,
    });

    await supabase.from("user_events").insert({
      user_id: chatgpt_user_id,
      event_type: "friday_takeover",
      event_data: {
        week_number: summary.week_number,
        weight_change: summary.weight_change,
        days_tracked: summary.days_tracked,
        shared: true,
      },
    });

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        week_summary: summary,
        reflection,
        next_week_plan: nextWeekPlan,
        shareable_card: shareableCard,
        formatted_response: formattedResponse,
        analytics: {
          tool_call_id: toolCallId,
          duration_ms: durationMs,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("Error in journey_7_friday_takeover:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: durationMs,
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
});
