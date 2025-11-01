// =====================================================
// THELOOP TRACKER - GET DAILY SUMMARY
// =====================================================
// Migrated from: K-Cal GPT
// Function: Get daily nutrition summary with progress tracking
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GetSummaryRequest {
  chatgpt_user_id: string
  date?: string  // YYYY-MM-DD, defaults to today
}

Deno.serve(async (req) => {
  try {
    // Parse request
    const body: GetSummaryRequest = await req.json()
    const { chatgpt_user_id, date } = body

    // Validate
    if (!chatgpt_user_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: chatgpt_user_id'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user
    const { data: user, error: userError } = await supabaseClient
      .from('tracker_users')
      .select('*')
      .eq('chatgpt_user_id', chatgpt_user_id)
      .single()

    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'User not found. Please log some food first.',
        suggestion: 'Use tracker_log_food to start tracking'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Determine date
    const summaryDate = date || new Date().toISOString().split('T')[0]

    // Get daily summary
    const { data: summary } = await supabaseClient
      .from('tracker_daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('summary_date', summaryDate)
      .single()

    // Get user stats
    const { data: stats } = await supabaseClient
      .from('tracker_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get food logs for the day
    const { data: logs } = await supabaseClient
      .from('tracker_food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', summaryDate)
      .order('logged_at', { ascending: true })

    // Calculate progress
    const caloriesConsumed = summary?.total_calories || 0
    const caloriesTarget = user.daily_calorie_target || 2000
    const caloriesRemaining = caloriesTarget - caloriesConsumed
    const caloriesProgress = Math.round((caloriesConsumed / caloriesTarget) * 100)

    const proteinConsumed = summary?.total_protein_g || 0
    const proteinTarget = user.daily_protein_target_g || 150
    const proteinRemaining = proteinTarget - proteinConsumed
    const proteinProgress = Math.round((proteinConsumed / proteinTarget) * 100)

    const carbsConsumed = summary?.total_carbs_g || 0
    const carbsTarget = user.daily_carbs_target_g || 200

    const fatConsumed = summary?.total_fat_g || 0
    const fatTarget = user.daily_fat_target_g || 65

    // Build response
    return new Response(JSON.stringify({
      success: true,
      date: summaryDate,
      summary: {
        calories: {
          consumed: caloriesConsumed,
          target: caloriesTarget,
          remaining: caloriesRemaining,
          progress_percent: caloriesProgress
        },
        protein: {
          consumed_g: proteinConsumed,
          target_g: proteinTarget,
          remaining_g: proteinRemaining,
          progress_percent: proteinProgress
        },
        carbs: {
          consumed_g: carbsConsumed,
          target_g: carbsTarget,
          remaining_g: carbsTarget - carbsConsumed
        },
        fat: {
          consumed_g: fatConsumed,
          target_g: fatTarget,
          remaining_g: fatTarget - fatConsumed
        },
        fiber_g: summary?.total_fiber_g || 0
      },
      meals: {
        breakfast: summary?.breakfast_calories || 0,
        lunch: summary?.lunch_calories || 0,
        dinner: summary?.dinner_calories || 0,
        snacks: summary?.snack_calories || 0
      },
      stats: {
        current_streak_days: stats?.current_streak_days || 0,
        longest_streak_days: stats?.longest_streak_days || 0,
        total_days_logged: stats?.total_days_logged || 0,
        total_foods_logged: stats?.total_foods_logged || 0
      },
      logs: logs?.map(log => ({
        id: log.id,
        food_name: log.food_name,
        quantity: log.quantity,
        quantity_unit: log.quantity_unit,
        meal_type: log.meal_type,
        calories: log.calories,
        protein_g: log.protein_g,
        logged_at: log.logged_at
      })) || [],
      insights: generateInsights(caloriesProgress, proteinProgress, stats)
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in tracker_get_daily_summary:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateInsights(caloriesProgress: number, proteinProgress: number, stats: any): string[] {
  const insights: string[] = []

  // Calorie insights
  if (caloriesProgress < 50) {
    insights.push("You're under halfway to your calorie goal. Keep eating!")
  } else if (caloriesProgress > 110) {
    insights.push("You've exceeded your calorie goal. Consider lighter options.")
  } else if (caloriesProgress >= 90 && caloriesProgress <= 110) {
    insights.push("Perfect! You're right on track with your calorie goal.")
  }

  // Protein insights
  if (proteinProgress < 50) {
    insights.push("Low protein intake. Add lean meats, eggs, or protein shakes.")
  } else if (proteinProgress >= 100) {
    insights.push("Great protein intake! This supports muscle growth and recovery.")
  }

  // Streak insights
  if (stats && stats.current_streak_days >= 7) {
    insights.push(`Amazing! You're on a ${stats.current_streak_days}-day logging streak! 🔥`)
  } else if (stats && stats.current_streak_days >= 3) {
    insights.push(`Keep it up! ${stats.current_streak_days} days in a row!`)
  }

  return insights
}

