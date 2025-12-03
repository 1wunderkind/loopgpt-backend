/import { createAuthenticatedClient } from "../_lib/auth.ts";
/ =====================================================
// THELOOP TRACKER - SET GOALS
// =====================================================
// Migrated from: K-Cal GPT
// Function: Set or update user nutrition goals and profile
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SetGoalsRequest {
  chatgpt_user_id: string
  
  // Personal info (optional)
  age?: number
  height_cm?: number
  weight_kg?: number
  gender?: 'male' | 'female' | 'other'
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  
  // Goals
  goal_type?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'health'
  daily_calorie_target?: number
  daily_protein_target_g?: number
  daily_carbs_target_g?: number
  daily_fat_target_g?: number
  
  // Preferences
  preferred_units?: 'metric' | 'imperial'
  timezone?: string
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request
    const body: SetGoalsRequest = await req.json()
    const { chatgpt_user_id, ...updates } = body

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

    // Check if user exists
    const { data: existingUser } = await supabaseClient
      .from('tracker_users')
      .select('*')
      .eq('chatgpt_user_id', chatgpt_user_id)
      .single()

    // Calculate recommended macros if provided
    let calculatedGoals = {}
    if (updates.weight_kg && updates.goal_type && !updates.daily_calorie_target) {
      calculatedGoals = calculateMacros(
        updates.weight_kg,
        updates.height_cm,
        updates.age,
        updates.gender,
        updates.activity_level || 'moderate',
        updates.goal_type
      )
    }

    const finalUpdates = {
      ...updates,
      ...calculatedGoals,
      updated_at: new Date().toISOString()
    }

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('tracker_users')
        .update(finalUpdates)
        .eq('chatgpt_user_id', chatgpt_user_id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update goals: ${updateError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Goals updated successfully',
        user: {
          chatgpt_user_id: updatedUser.chatgpt_user_id,
          age: updatedUser.age,
          weight_kg: updatedUser.weight_kg,
          height_cm: updatedUser.height_cm,
          gender: updatedUser.gender,
          activity_level: updatedUser.activity_level,
          goal_type: updatedUser.goal_type,
          daily_targets: {
            calories: updatedUser.daily_calorie_target,
            protein_g: updatedUser.daily_protein_target_g,
            carbs_g: updatedUser.daily_carbs_target_g,
            fat_g: updatedUser.daily_fat_target_g
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient
        .from('tracker_users')
        .insert({
          chatgpt_user_id,
          ...finalUpdates
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'User profile created with goals',
        user: {
          chatgpt_user_id: newUser.chatgpt_user_id,
          age: newUser.age,
          weight_kg: newUser.weight_kg,
          height_cm: newUser.height_cm,
          gender: newUser.gender,
          activity_level: newUser.activity_level,
          goal_type: newUser.goal_type,
          daily_targets: {
            calories: newUser.daily_calorie_target,
            protein_g: newUser.daily_protein_target_g,
            carbs_g: newUser.daily_carbs_target_g,
            fat_g: newUser.daily_fat_target_g
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Error in tracker_set_goals:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
};

Deno.serve(withStandardAPI(handler));

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculateMacros(
  weight_kg: number,
  height_cm?: number,
  age?: number,
  gender?: string,
  activity_level: string = 'moderate',
  goal_type: string = 'maintenance'
) {
  // Calculate BMR using Mifflin-St Jeor equation (simplified)
  let bmr = 10 * weight_kg + 6.25 * (height_cm || 170) - 5 * (age || 30)
  if (gender === 'male') {
    bmr += 5
  } else {
    bmr -= 161
  }

  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  }

  // Calculate TDEE
  const tdee = bmr * (activityMultipliers[activity_level] || 1.55)

  // Adjust for goal
  let calories = tdee
  if (goal_type === 'weight_loss') {
    calories = tdee - 500  // 500 cal deficit
  } else if (goal_type === 'muscle_gain') {
    calories = tdee + 300  // 300 cal surplus
  }

  // Calculate macros
  const protein_g = Math.round(weight_kg * 2.2)  // 2.2g per kg for muscle
  const fat_g = Math.round((calories * 0.25) / 9)  // 25% of calories from fat
  const carbs_g = Math.round((calories - (protein_g * 4) - (fat_g * 9)) / 4)  // Rest from carbs

  return {
    daily_calorie_target: Math.round(calories),
    daily_protein_target_g: protein_g,
    daily_carbs_target_g: carbs_g,
    daily_fat_target_g: fat_g
  }
}

