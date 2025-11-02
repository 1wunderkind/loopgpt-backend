/**
 * Journey 1: Onboarding & First Meal Plan
 * 
 * This Edge Function orchestrates the complete onboarding experience:
 * 1. Detects user location
 * 2. Creates personalized meal plan
 * 3. Gets affiliate partners for grocery delivery
 * 4. Formats complete response with Demo Loop
 * 5. Logs analytics
 * 
 * This is a single tool call from ChatGPT's perspective, ensuring
 * consistent, reliable UX with guaranteed affiliate link appearance.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OnboardingRequest {
  chatgpt_user_id: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'health';
  target_weight?: number;
  current_weight?: number;
  height_cm?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  calories_target?: number;
  dietary_restrictions?: string[];
  preferences?: Record<string, any>;
  ip_address?: string;
}

serve(async (req) => {
  // CORS headers
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
    const body: OnboardingRequest = await req.json();
    console.log('[Journey 1] Starting onboarding for user:', body.chatgpt_user_id);

    // Validate required fields
    if (!body.chatgpt_user_id || !body.goal_type) {
      throw new Error('Missing required fields: chatgpt_user_id and goal_type');
    }

    // Step 1: Get user location
    console.log('[Journey 1] Step 1: Getting user location...');
    const { data: locationData, error: locationError } = await supabase.functions.invoke(
      'get_user_location',
      {
        body: {
          chatgpt_user_id: body.chatgpt_user_id,
          ip_address: body.ip_address
        }
      }
    );

    const countryCode = locationData?.country_code || 'US';
    console.log(`[Journey 1] User location: ${countryCode}`);

    // Step 2: Calculate calories if not provided
    let caloriesTarget = body.calories_target;
    if (!caloriesTarget && body.current_weight && body.height_cm && body.age && body.gender) {
      caloriesTarget = calculateCalories(
        body.current_weight,
        body.height_cm,
        body.age,
        body.gender,
        body.activity_level || 'moderate',
        body.goal_type
      );
      console.log(`[Journey 1] Calculated calories: ${caloriesTarget}`);
    } else if (!caloriesTarget) {
      // Default calories by goal
      caloriesTarget = {
        weight_loss: 1800,
        muscle_gain: 2400,
        maintenance: 2000,
        health: 2000
      }[body.goal_type];
      console.log(`[Journey 1] Using default calories: ${caloriesTarget}`);
    }

    // Step 3: Create meal plan
    console.log('[Journey 1] Step 2: Creating meal plan...');
    const { data: mealPlanData, error: mealPlanError } = await supabase.functions.invoke(
      'plan_create_meal_plan',
      {
        body: {
          chatgpt_user_id: body.chatgpt_user_id,
          goal_type: body.goal_type,
          calories_target: caloriesTarget,
          dietary_restrictions: body.dietary_restrictions || [],
          preferences: body.preferences || {}
        }
      }
    );

    if (mealPlanError || !mealPlanData) {
      throw new Error(`Failed to create meal plan: ${mealPlanError?.message || 'Unknown error'}`);
    }

    console.log(`[Journey 1] Meal plan created: ${mealPlanData.id}`);

    // Step 4: Get affiliate partners for grocery delivery
    console.log('[Journey 1] Step 3: Getting affiliate partners...');
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliate_partner_map')
      .select('*')
      .eq('country', countryCode)
      .eq('partner_type', 'grocery')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(5);

    const affiliatePartners = affiliateData || [];
    console.log(`[Journey 1] Found ${affiliatePartners.length} affiliate partners`);

    // Step 5: Format complete response
    console.log('[Journey 1] Step 4: Formatting response...');
    const formattedResponse = formatCompleteOnboarding(
      mealPlanData,
      affiliatePartners,
      countryCode,
      body.goal_type
    );

    // Step 6: Log analytics
    const duration = Date.now() - startTime;
    console.log('[Journey 1] Step 5: Logging analytics...');
    
    await logJourneyAnalytics({
      user_id: body.chatgpt_user_id,
      journey_name: 'journey_1_onboarding',
      meal_plan_id: mealPlanData.id,
      country_code: countryCode,
      affiliate_partners_shown: affiliatePartners.length,
      duration_ms: duration,
      success: true,
      goal_type: body.goal_type,
      calories_target: caloriesTarget
    });

    console.log(`[Journey 1] Complete! Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        formatted_response: formattedResponse,
        meal_plan_id: mealPlanData.id,
        country_code: countryCode,
        calories_target: caloriesTarget,
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
    console.error('[Journey 1] Error:', error);

    // Log error analytics
    try {
      await logJourneyAnalytics({
        user_id: (await req.json()).chatgpt_user_id || 'unknown',
        journey_name: 'journey_1_onboarding',
        duration_ms: duration,
        success: false,
        error_message: error.message
      });
    } catch (logError) {
      console.error('[Journey 1] Failed to log error:', logError);
    }

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
 * Calculate daily calorie target using Mifflin-St Jeor equation
 */
function calculateCalories(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: string,
  activity_level: string,
  goal_type: string
): number {
  // BMR calculation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  const tdee = bmr * (activityMultipliers[activity_level] || 1.55);

  // Goal adjustment
  let calories = tdee;
  if (goal_type === 'weight_loss') {
    calories = tdee - 500; // 500 cal deficit for ~1 lb/week loss
  } else if (goal_type === 'muscle_gain') {
    calories = tdee + 300; // 300 cal surplus for muscle gain
  }

  // Round to nearest 50
  return Math.round(calories / 50) * 50;
}

/**
 * Format complete onboarding response
 */
function formatCompleteOnboarding(
  mealPlan: any,
  affiliatePartners: any[],
  countryCode: string,
  goalType: string
): string {
  const goalEmoji = {
    weight_loss: '🎯',
    muscle_gain: '💪',
    maintenance: '⚖️',
    health: '🌟'
  }[goalType] || '🎯';

  const goalText = {
    weight_loss: 'Your Weight Loss Journey',
    muscle_gain: 'Your Muscle Building Journey',
    maintenance: 'Your Maintenance Plan',
    health: 'Your Health Transformation'
  }[goalType] || 'Your Personalized Plan';

  let output = `# ${goalEmoji} ${goalText}\n\n`;
  output += `## 📖 Your Week 1 Meal Plan\n\n`;
  output += `Your personalized meal plan is ready! Here's what makes it special:\n\n`;
  output += `- 🎯 **Daily Target**: ${mealPlan.calories_target} calories\n`;
  output += `- 💪 **Protein**: ${mealPlan.macros_target?.protein_g || 'TBD'}g | `;
  output += `🍞 **Carbs**: ${mealPlan.macros_target?.carbs_g || 'TBD'}g | `;
  output += `🥑 **Fat**: ${mealPlan.macros_target?.fat_g || 'TBD'}g\n`;
  output += `- 📅 **Duration**: 7 days\n\n`;

  output += `---\n\n`;

  // Demo Loop
  output += `## 🔄 The Loop: How Your Plan Adapts\n\n`;
  output += `Here's the magic of LoopGPT - your plan **learns and adapts** based on your results:\n\n`;
  
  output += `### 📊 Week 1 (This Week)\n`;
  output += `- 🎯 Target: ${mealPlan.calories_target} calories/day\n`;
  output += `- 📝 You follow the plan and track your weight\n`;
  output += `- 📈 We measure your progress\n\n`;

  const adjustedCalories = goalType === 'weight_loss' 
    ? mealPlan.calories_target - 100 
    : mealPlan.calories_target + 100;

  output += `### 🔄 Week 2 (Next Week)\n`;
  output += `- 📊 Based on your Week 1 results, we adjust:\n`;
  output += `  - ✅ **On track?** → Keep calories the same\n`;
  output += `  - 📉 **Too fast?** → Increase calories slightly\n`;
  output += `  - 📈 **Too slow?** → Adjust to ~${adjustedCalories} cal/day\n`;
  output += `- 🎯 Your plan automatically updates every week\n\n`;

  output += `### 💡 Why This Works\n`;
  output += `Most diets fail because they're static. **The Loop adapts to YOUR body's response**, ensuring sustainable progress without guesswork.\n\n`;

  output += `> 🎯 **Your Mission**: Follow this week's plan and weigh yourself next Monday morning. I'll adjust Week 2 based on your results!\n\n`;

  output += `---\n\n`;

  // Affiliate Partners
  if (affiliatePartners.length > 0) {
    output += `## 🛒 Get Your Ingredients Delivered\n\n`;
    output += `Save time with grocery delivery - here are your best options:\n\n`;

    affiliatePartners.slice(0, 3).forEach((partner, index) => {
      const emoji = index === 0 ? '⭐' : '💰';
      output += `### ${emoji} ${partner.partner_name}\n`;
      output += `${partner.description || 'Convenient grocery delivery'}\n\n`;
      output += `- 💡 **Benefit**: ${partner.benefit || 'Fast delivery'}\n`;
      output += `- 🔗 [Order Now](${partner.base_url})\n\n`;
    });

    output += `> 💡 **Tip**: These links support LoopGPT at no extra cost to you. Thank you!\n\n`;
  }

  return output;
}

/**
 * Log analytics for Journey 1
 */
async function logJourneyAnalytics(data: {
  user_id: string;
  journey_name: string;
  meal_plan_id?: string;
  country_code?: string;
  affiliate_partners_shown?: number;
  duration_ms: number;
  success: boolean;
  goal_type?: string;
  calories_target?: number;
  error_message?: string;
}) {
  try {
    // Log to user_events table
    await supabase.from('user_events').insert({
      user_id: data.user_id,
      event_name: data.journey_name,
      event_data: {
        meal_plan_id: data.meal_plan_id,
        country_code: data.country_code,
        affiliate_partners_shown: data.affiliate_partners_shown,
        duration_ms: data.duration_ms,
        success: data.success,
        goal_type: data.goal_type,
        calories_target: data.calories_target,
        error_message: data.error_message
      }
    });

    // Log tool call
    await supabase.from('tool_calls').insert({
      user_id: data.user_id,
      tool_name: 'journey_1_onboarding',
      parameters: {
        goal_type: data.goal_type,
        calories_target: data.calories_target
      },
      success: data.success,
      error_message: data.error_message,
      duration_ms: data.duration_ms
    });

    console.log('[Journey 1] Analytics logged successfully');
  } catch (error) {
    console.error('[Journey 1] Failed to log analytics:', error);
    // Don't throw - analytics failures shouldn't break the user experience
  }
}
