/**
 * Journey 2: Weight Tracking & Plan Adaptation
 * 
 * This is the core "Loop" feature - automatic plan adaptation based on results.
 * 
 * User logs weight → System evaluates progress → Adjusts plan if needed
 * 
 * This creates the adaptive feedback loop that makes LoopGPT unique.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TrackingRequest {
  chatgpt_user_id: string;
  weight_kg: number;
  weight_unit?: 'kg' | 'lbs';
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const startTime = Date.now();
  
  try {
    const body: TrackingRequest = await req.json();
    console.log('[Journey 2] Weight tracking for user:', body.chatgpt_user_id);

    if (!body.chatgpt_user_id || !body.weight_kg) {
      throw new Error('Missing required fields: chatgpt_user_id and weight_kg');
    }

    // Convert lbs to kg if needed
    let weightKg = body.weight_kg;
    if (body.weight_unit === 'lbs') {
      weightKg = body.weight_kg * 0.453592;
      console.log(`[Journey 2] Converted ${body.weight_kg} lbs to ${weightKg.toFixed(2)} kg`);
    }

    // Step 1: Log the weight
    console.log('[Journey 2] Logging weight...');
    const { data: weightLog, error: logError } = await supabase
      .from('weight_logs')
      .insert({
        user_id: body.chatgpt_user_id,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        weight_kg: weightKg,
        notes: body.notes
      })
      .select()
      .single();

    if (logError) {
      console.error('[Journey 2] Error logging weight:', logError);
      throw new Error(`Failed to log weight: ${logError.message}`);
    }

    console.log('[Journey 2] Weight logged successfully');

    // Step 2: Get user's current meal plan
    console.log('[Journey 2] Getting active meal plan...');
    const { data: activePlan, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', body.chatgpt_user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !activePlan) {
      console.log('[Journey 2] No active plan found');
      // User hasn't started a plan yet
      const response = formatNoActivePlan(weightKg, body.weight_unit || 'kg');
      return new Response(JSON.stringify({
        success: true,
        formatted_response: response,
        weight_logged: true,
        has_active_plan: false,
        needs_onboarding: true
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Step 3: Get weight history for evaluation
    console.log('[Journey 2] Getting weight history...');
    const { data: weightHistory, error: historyError } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', body.chatgpt_user_id)
      .order('date', { ascending: false })
      .limit(10);

    const weights = weightHistory || [];
    console.log(`[Journey 2] Found ${weights.length} weight logs`);

    // Step 4: Evaluate progress
    console.log('[Journey 2] Evaluating progress...');
    const evaluation = evaluateProgress(
      weights,
      activePlan.goal_type,
      activePlan.calories_target
    );

    console.log('[Journey 2] Evaluation:', evaluation);

    // Step 5: Determine if adjustment needed
    const adjustment = determineAdjustment(evaluation, activePlan);
    console.log('[Journey 2] Adjustment:', adjustment);

    // Step 6: Update plan if needed
    if (adjustment.should_adjust) {
      console.log('[Journey 2] Updating plan...');
      await supabase
        .from('meal_plans')
        .update({
          calories_target: adjustment.new_calories,
          updated_at: new Date().toISOString()
        })
        .eq('id', activePlan.id);
    }

    // Step 7: Format response
    const formattedResponse = formatTrackingResponse(
      weightKg,
      body.weight_unit || 'kg',
      evaluation,
      adjustment,
      activePlan
    );

    // Step 8: Log analytics
    const duration = Date.now() - startTime;
    await logJourneyAnalytics({
      user_id: body.chatgpt_user_id,
      journey_name: 'journey_2_tracking',
      weight_kg: weightKg,
      plan_adjusted: adjustment.should_adjust,
      old_calories: activePlan.calories_target,
      new_calories: adjustment.new_calories,
      progress_status: evaluation.status,
      duration_ms: duration,
      success: true
    });

    console.log(`[Journey 2] Complete! Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        formatted_response: formattedResponse,
        weight_logged: true,
        has_active_plan: true,
        plan_adjusted: adjustment.should_adjust,
        old_calories: activePlan.calories_target,
        new_calories: adjustment.new_calories,
        progress_status: evaluation.status,
        duration_ms: duration
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Journey 2] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Evaluate user's progress based on weight history
 */
function evaluateProgress(
  weights: any[],
  goalType: string,
  currentCalories: number
): {
  status: 'on_track' | 'too_fast' | 'too_slow' | 'insufficient_data';
  weekly_change_kg: number;
  weekly_change_percent: number;
  weeks_tracked: number;
  message: string;
} {
  if (weights.length < 2) {
    return {
      status: 'insufficient_data',
      weekly_change_kg: 0,
      weekly_change_percent: 0,
      weeks_tracked: 0,
      message: 'Keep tracking! I need at least 2 weigh-ins to evaluate progress.'
    };
  }

  // Calculate weekly change
  const latest = weights[0].weight_kg;
  const oldest = weights[weights.length - 1].weight_kg;
  const daysBetween = (new Date(weights[0].date).getTime() - new Date(weights[weights.length - 1].date).getTime()) / (1000 * 60 * 60 * 24);
  const weeksBetween = daysBetween / 7;

  const totalChange = latest - oldest;
  const weeklyChange = totalChange / (weeksBetween || 1);
  const weeklyChangePercent = (weeklyChange / oldest) * 100;

  console.log(`[Progress] Weekly change: ${weeklyChange.toFixed(2)} kg (${weeklyChangePercent.toFixed(2)}%)`);

  // Evaluate based on goal type
  if (goalType === 'weight_loss') {
    // Target: -0.5 to -1 kg per week (-0.5% to -1% body weight)
    if (weeklyChange >= -0.3) {
      return {
        status: 'too_slow',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Progress is slower than expected. Let\'s adjust your plan.'
      };
    } else if (weeklyChange <= -1.2) {
      return {
        status: 'too_fast',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'You\'re losing weight too quickly! Let\'s slow down for sustainable results.'
      };
    } else {
      return {
        status: 'on_track',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Perfect progress! You\'re right on track.'
      };
    }
  } else if (goalType === 'muscle_gain') {
    // Target: +0.25 to +0.5 kg per week
    if (weeklyChange <= 0.1) {
      return {
        status: 'too_slow',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Muscle gain is slower than expected. Let\'s increase calories.'
      };
    } else if (weeklyChange >= 0.7) {
      return {
        status: 'too_fast',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'You\'re gaining too quickly - might be adding fat. Let\'s adjust.'
      };
    } else {
      return {
        status: 'on_track',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Excellent progress! Your muscle gain is right on target.'
      };
    }
  } else {
    // Maintenance
    if (Math.abs(weeklyChange) > 0.3) {
      return {
        status: 'too_fast',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Your weight is fluctuating. Let\'s stabilize your plan.'
      };
    } else {
      return {
        status: 'on_track',
        weekly_change_kg: weeklyChange,
        weekly_change_percent: weeklyChangePercent,
        weeks_tracked: weeksBetween,
        message: 'Great! Your weight is stable.'
      };
    }
  }
}

/**
 * Determine if calorie adjustment is needed
 */
function determineAdjustment(
  evaluation: any,
  activePlan: any
): {
  should_adjust: boolean;
  new_calories: number;
  adjustment_amount: number;
  reason: string;
} {
  if (evaluation.status === 'on_track' || evaluation.status === 'insufficient_data') {
    return {
      should_adjust: false,
      new_calories: activePlan.calories_target,
      adjustment_amount: 0,
      reason: 'No adjustment needed - progress is on track'
    };
  }

  let adjustment = 0;
  let reason = '';

  if (evaluation.status === 'too_slow') {
    if (activePlan.goal_type === 'weight_loss') {
      adjustment = -150; // Decrease calories
      reason = 'Decreasing calories to accelerate fat loss';
    } else if (activePlan.goal_type === 'muscle_gain') {
      adjustment = +200; // Increase calories
      reason = 'Increasing calories to support muscle growth';
    }
  } else if (evaluation.status === 'too_fast') {
    if (activePlan.goal_type === 'weight_loss') {
      adjustment = +150; // Increase calories
      reason = 'Increasing calories for sustainable fat loss';
    } else if (activePlan.goal_type === 'muscle_gain') {
      adjustment = -150; // Decrease calories
      reason = 'Decreasing calories to minimize fat gain';
    }
  }

  const newCalories = Math.round((activePlan.calories_target + adjustment) / 50) * 50;

  return {
    should_adjust: true,
    new_calories: newCalories,
    adjustment_amount: adjustment,
    reason
  };
}

/**
 * Format response for user with no active plan
 */
function formatNoActivePlan(weightKg: number, unit: string): string {
  const displayWeight = unit === 'lbs' ? (weightKg / 0.453592).toFixed(1) : weightKg.toFixed(1);
  
  return `## ⚖️ Weight Logged: ${displayWeight} ${unit}\n\n` +
    `Great! I've recorded your weight. However, you don't have an active meal plan yet.\n\n` +
    `**To start your journey:**\n` +
    `Tell me your goal (e.g., "I want to lose 15 pounds" or "Help me build muscle") and I'll create a personalized plan that adapts to YOUR body's response!\n\n` +
    `That's the power of The Loop - your plan evolves with you. 🔄`;
}

/**
 * Format complete tracking response
 */
function formatTrackingResponse(
  weightKg: number,
  unit: string,
  evaluation: any,
  adjustment: any,
  activePlan: any
): string {
  const displayWeight = unit === 'lbs' ? (weightKg / 0.453592).toFixed(1) : weightKg.toFixed(1);
  const changeDisplay = unit === 'lbs' 
    ? (evaluation.weekly_change_kg / 0.453592).toFixed(1)
    : evaluation.weekly_change_kg.toFixed(1);

  let output = `## ⚖️ Weight Update: ${displayWeight} ${unit}\n\n`;
  
  // Progress evaluation
  output += `### 📊 Your Progress\n\n`;
  output += `${evaluation.message}\n\n`;
  
  if (evaluation.status !== 'insufficient_data') {
    const changeEmoji = evaluation.weekly_change_kg < 0 ? '📉' : '📈';
    output += `- ${changeEmoji} **Weekly Change**: ${changeDisplay} ${unit}/week\n`;
    output += `- 📅 **Tracking Period**: ${evaluation.weeks_tracked.toFixed(1)} weeks\n`;
    output += `- 🎯 **Current Target**: ${activePlan.calories_target} cal/day\n\n`;
  }

  // Plan adjustment
  if (adjustment.should_adjust) {
    output += `---\n\n`;
    output += `## 🔄 The Loop: Plan Adjusted!\n\n`;
    output += `Based on your results, I'm updating your plan:\n\n`;
    output += `- 📊 **Old Target**: ${activePlan.calories_target} cal/day\n`;
    output += `- ✨ **New Target**: ${adjustment.new_calories} cal/day\n`;
    output += `- 🔧 **Adjustment**: ${adjustment.adjustment_amount > 0 ? '+' : ''}${adjustment.adjustment_amount} calories\n`;
    output += `- 💡 **Why**: ${adjustment.reason}\n\n`;
    output += `> 🎯 **This is The Loop in action!** Your plan adapts automatically based on YOUR body's response. No guesswork, just results.\n\n`;
  } else {
    output += `---\n\n`;
    output += `## ✅ Plan Status: No Changes Needed\n\n`;
    output += `Your current plan is working perfectly! Keep following your ${activePlan.calories_target} cal/day target.\n\n`;
  }

  // Next steps
  output += `---\n\n`;
  output += `## 🚀 What's Next?\n\n`;
  output += `1. ⚖️ **Weigh yourself** every Monday morning\n`;
  output += `2. 📝 **Log your weight** with me\n`;
  output += `3. 🔄 **I'll adjust** your plan automatically\n`;
  output += `4. 💪 **Keep going** - consistency is key!\n\n`;
  output += `The more you track, the better The Loop adapts to you. Let's keep this momentum going! 🎯\n`;

  return output;
}

/**
 * Log analytics for Journey 2
 */
async function logJourneyAnalytics(data: {
  user_id: string;
  journey_name: string;
  weight_kg: number;
  plan_adjusted: boolean;
  old_calories: number;
  new_calories: number;
  progress_status: string;
  duration_ms: number;
  success: boolean;
}) {
  try {
    await supabase.from('user_events').insert({
      user_id: data.user_id,
      event_name: data.journey_name,
      event_data: {
        weight_kg: data.weight_kg,
        plan_adjusted: data.plan_adjusted,
        old_calories: data.old_calories,
        new_calories: data.new_calories,
        progress_status: data.progress_status,
        duration_ms: data.duration_ms,
        success: data.success
      }
    });

    await supabase.from('tool_calls').insert({
      user_id: data.user_id,
      tool_name: 'journey_2_tracking',
      parameters: { weight_kg: data.weight_kg },
      success: data.success,
      duration_ms: data.duration_ms
    });

    console.log('[Journey 2] Analytics logged');
  } catch (error) {
    console.error('[Journey 2] Failed to log analytics:', error);
  }
}
