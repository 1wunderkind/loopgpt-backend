// =====================================================
// THELOOP TRACKER - LOG FOOD
// =====================================================
// Migrated from: K-Cal GPT
// Function: Log food intake with automatic nutrition calculation
// Updated: Integrated with 1,000-food resolver (Nov 2025)
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { lookupFoodForTracker, convertToGrams } from '../../lib/tracker_food_integration.ts'

interface LogFoodRequest {
  chatgpt_user_id: string
  food_name: string
  quantity: number
  quantity_unit: string
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  log_date?: string  // YYYY-MM-DD
  notes?: string
}

Deno.serve(async (req) => {
  try {
    // Parse request
    const body: LogFoodRequest = await req.json()
    const {
      chatgpt_user_id,
      food_name,
      quantity,
      quantity_unit,
      meal_type = 'snack',
      log_date,
      notes
    } = body

    // Validate required fields
    if (!chatgpt_user_id || !food_name || !quantity || !quantity_unit) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: chatgpt_user_id, food_name, quantity, quantity_unit'
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
          daily_calorie_target: 2000,  // Default
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

    // Look up food using resolver (with database fallback)
    const foodLookup = await lookupFoodForTracker(food_name, user.id)

    let calories = 0
    let protein_g = 0
    let carbs_g = 0
    let fat_g = 0
    let fiber_g = 0
    let sugar_g = 0
    let food_id = foodLookup.food_id

    if (foodLookup.source !== 'not_found') {
      // Calculate nutrition based on quantity
      const multiplier = convertToGrams(quantity, quantity_unit) / 100

      calories = Math.round(foodLookup.calories_per_100g * multiplier)
      protein_g = parseFloat((foodLookup.protein_per_100g * multiplier).toFixed(1))
      carbs_g = parseFloat((foodLookup.carbs_per_100g * multiplier).toFixed(1))
      fat_g = parseFloat((foodLookup.fat_per_100g * multiplier).toFixed(1))
      fiber_g = parseFloat((foodLookup.fiber_per_100g * multiplier).toFixed(1))
      sugar_g = parseFloat((foodLookup.sugar_per_100g * multiplier).toFixed(1))
      
      console.log(`✅ Food found via ${foodLookup.source}: ${food_name}`);
    } else {
      // Estimate using simple heuristics (fallback)
      const grams = convertToGrams(quantity, quantity_unit)
      calories = Math.round(grams * 2)  // Rough estimate: 2 cal/gram
      protein_g = parseFloat((grams * 0.1).toFixed(1))
      carbs_g = parseFloat((grams * 0.3).toFixed(1))
      fat_g = parseFloat((grams * 0.05).toFixed(1))
      
      console.warn(`⚠️  Food not found, using estimates: ${food_name}`);
    }

    // Determine log date
    const finalLogDate = log_date || new Date().toISOString().split('T')[0]

    // Insert food log
    const { data: logEntry, error: logError } = await supabaseClient
      .from('tracker_food_logs')
      .insert({
        user_id: user.id,
        food_name,
        food_id,
        quantity,
        quantity_unit,
        meal_type,
        log_date: finalLogDate,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        sugar_g,
        notes,
        source: 'manual'
      })
      .select()
      .single()

    if (logError) {
      throw new Error(`Failed to log food: ${logError.message}`)
    }

    // Update daily summary
    await updateDailySummary(supabaseClient, user.id, finalLogDate)

    // Update user stats
    await updateUserStats(supabaseClient, user.id, finalLogDate)

    // Return success
    return new Response(JSON.stringify({
      success: true,
      message: `Logged ${quantity} ${quantity_unit} of ${food_name}`,
      log_entry: {
        id: logEntry.id,
        food_name: logEntry.food_name,
        quantity: logEntry.quantity,
        quantity_unit: logEntry.quantity_unit,
        meal_type: logEntry.meal_type,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        log_date: finalLogDate
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in tracker_log_food:', error)
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
// Note: convertToGrams is now imported from tracker_food_integration.ts

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
    // Consecutive day
    newStreak = stats.current_streak_days + 1
  } else if (daysDiff > 1) {
    // Streak broken
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

