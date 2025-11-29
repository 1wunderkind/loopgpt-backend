/import { createAuthenticatedClient } from "../_lib/auth.ts";
/ =====================================================
// THELOOP TRACKER - QUICK ADD CALORIES
// =====================================================
// Migrated from: K-Cal GPT
// Function: Quickly log calories without detailed food info
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface QuickAddRequest {
  chatgpt_user_id: string
  calories: number
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description?: string
  log_date?: string  // YYYY-MM-DD
}

Deno.serve(async (req) => {
  try {
    // Parse request
    const body: QuickAddRequest = await req.json()
    const {
      chatgpt_user_id,
      calories,
      meal_type = 'snack',
      description = 'Quick add',
      log_date
    } = body

    // Validate
    if (!chatgpt_user_id || !calories) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: chatgpt_user_id, calories'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (calories < 0 || calories > 10000) {
      return new Response(JSON.stringify({
        error: 'Calories must be between 0 and 10000'
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

    // Get or create user
    let { data: user, error: userError } = await supabaseClient
      .from('tracker_users')
      .select('*')
      .eq('chatgpt_user_id', chatgpt_user_id)
      .single()

    if (userError || !user) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient
        .from('tracker_users')
        .insert({
          chatgpt_user_id,
          daily_calorie_target: 2000,
          daily_protein_target_g: 150,
          daily_carbs_target_g: 200,
          daily_fat_target_g: 65
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`)
      }
      user = newUser
    }

    // Determine log date
    const finalLogDate = log_date || new Date().toISOString().split('T')[0]

    // Estimate macros based on calories (rough approximation)
    const protein_g = Math.round(calories * 0.25 / 4)  // 25% from protein
    const carbs_g = Math.round(calories * 0.45 / 4)    // 45% from carbs
    const fat_g = Math.round(calories * 0.30 / 9)      // 30% from fat

    // Insert quick add log
    const { data: logEntry, error: logError } = await supabaseClient
      .from('tracker_food_logs')
      .insert({
        user_id: user.id,
        food_name: description,
        food_id: null,
        quantity: 1,
        quantity_unit: 'serving',
        meal_type,
        log_date: finalLogDate,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g: 0,
        sugar_g: 0,
        notes: 'Quick add entry',
        source: 'quick_add'
      })
      .select()
      .single()

    if (logError) {
      throw new Error(`Failed to log calories: ${logError.message}`)
    }

    // Update daily summary
    await updateDailySummary(supabaseClient, user.id, finalLogDate)

    // Update user stats
    await updateUserStats(supabaseClient, user.id, finalLogDate)

    // Return success
    return new Response(JSON.stringify({
      success: true,
      message: `Quick added ${calories} calories`,
      log_entry: {
        id: logEntry.id,
        description,
        calories,
        meal_type,
        log_date: finalLogDate,
        estimated_macros: {
          protein_g,
          carbs_g,
          fat_g
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in tracker_quick_add_calories:', error)
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

async function updateDailySummary(client: any, userId: string, logDate: string) {
  // Get all logs for this day
  const { data: logs } = await client
    .from('tracker_food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)

  if (!logs || logs.length === 0) return

  // Calculate totals
  const totals = logs.reduce((acc: any, log: any) => ({
    total_calories: acc.total_calories + (log.calories || 0),
    total_protein_g: acc.total_protein_g + (log.protein_g || 0),
    total_carbs_g: acc.total_carbs_g + (log.carbs_g || 0),
    total_fat_g: acc.total_fat_g + (log.fat_g || 0),
    total_fiber_g: acc.total_fiber_g + (log.fiber_g || 0),
    breakfast_calories: acc.breakfast_calories + (log.meal_type === 'breakfast' ? log.calories : 0),
    lunch_calories: acc.lunch_calories + (log.meal_type === 'lunch' ? log.calories : 0),
    dinner_calories: acc.dinner_calories + (log.meal_type === 'dinner' ? log.calories : 0),
    snack_calories: acc.snack_calories + (log.meal_type === 'snack' ? log.calories : 0),
  }), {
    total_calories: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    total_fiber_g: 0,
    breakfast_calories: 0,
    lunch_calories: 0,
    dinner_calories: 0,
    snack_calories: 0
  })

  // Upsert daily summary
  await client
    .from('tracker_daily_summaries')
    .upsert({
      user_id: userId,
      summary_date: logDate,
      ...totals,
      num_logs: logs.length,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'user_id,summary_date'
    })
}

async function updateUserStats(client: any, userId: string, logDate: string) {
  // Get current stats
  let { data: stats } = await client
    .from('tracker_user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!stats) {
    // Create new stats
    await client
      .from('tracker_user_stats')
      .insert({
        user_id: userId,
        current_streak_days: 1,
        longest_streak_days: 1,
        last_log_date: logDate,
        total_days_logged: 1,
        total_foods_logged: 1,
        first_log_date: logDate
      })
    return
  }

  // Update stats
  const lastLogDate = new Date(stats.last_log_date)
  const currentLogDate = new Date(logDate)
  const daysDiff = Math.floor((currentLogDate.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))

  let newStreak = stats.current_streak_days
  if (daysDiff === 1) {
    newStreak = stats.current_streak_days + 1
  } else if (daysDiff > 1) {
    newStreak = 1
  }

  await client
    .from('tracker_user_stats')
    .update({
      current_streak_days: newStreak,
      longest_streak_days: Math.max(newStreak, stats.longest_streak_days),
      last_log_date: logDate,
      total_days_logged: stats.total_days_logged + (daysDiff > 0 ? 1 : 0),
      total_foods_logged: stats.total_foods_logged + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
}

