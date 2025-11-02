/**
 * Journey 1: Onboarding & First Meal Plan (Standalone Version)
 * 
 * This is a simplified standalone version for testing that creates
 * mock meal plans without depending on other Edge Functions.
 * 
 * Once the full backend is deployed, this will be replaced with
 * the orchestration version that calls real Edge Functions.
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

    // Step 1: Detect country (simplified - default to US for now)
    const countryCode = 'US';
    console.log(`[Journey 1] User location: ${countryCode}`);

    // Step 2: Calculate calories
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

    // Step 3: Create mock meal plan (simplified for testing)
    const mealPlan = createMockMealPlan(body.goal_type, caloriesTarget, body.dietary_restrictions || []);
    console.log(`[Journey 1] Mock meal plan created`);

    // Step 4: Get affiliate partners
    console.log('[Journey 1] Getting affiliate partners...');
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
    console.log('[Journey 1] Formatting response...');
    const formattedResponse = formatCompleteOnboarding(
      mealPlan,
      affiliatePartners,
      countryCode,
      body.goal_type,
      caloriesTarget
    );

    // Step 6: Log analytics
    const duration = Date.now() - startTime;
    console.log('[Journey 1] Logging analytics...');
    
    await logJourneyAnalytics({
      user_id: body.chatgpt_user_id,
      journey_name: 'journey_1_onboarding',
      meal_plan_id: `mock_${Date.now()}`,
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
        meal_plan_id: `mock_${Date.now()}`,
        country_code: countryCode,
        calories_target: caloriesTarget,
        duration_ms: duration,
        note: "This is a test version with mock meal plans. Full version will call real Edge Functions."
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
    calories = tdee - 500;
  } else if (goal_type === 'muscle_gain') {
    calories = tdee + 300;
  }

  return Math.round(calories / 50) * 50;
}

/**
 * Create mock meal plan for testing
 */
function createMockMealPlan(goalType: string, calories: number, restrictions: string[]) {
  const protein = Math.round(calories * 0.30 / 4);
  const carbs = Math.round(calories * 0.40 / 4);
  const fat = Math.round(calories * 0.30 / 9);

  return {
    id: `mock_${Date.now()}`,
    goal_type: goalType,
    calories_target: calories,
    macros_target: {
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat
    },
    dietary_restrictions: restrictions,
    days: 7
  };
}

/**
 * Format complete onboarding response
 */
function formatCompleteOnboarding(
  mealPlan: any,
  affiliatePartners: any[],
  countryCode: string,
  goalType: string,
  calories: number
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
  output += `- 🎯 **Daily Target**: ${calories} calories\n`;
  output += `- 💪 **Protein**: ${mealPlan.macros_target.protein_g}g | `;
  output += `🍞 **Carbs**: ${mealPlan.macros_target.carbs_g}g | `;
  output += `🥑 **Fat**: ${mealPlan.macros_target.fat_g}g\n`;
  output += `- 📅 **Duration**: 7 days\n`;
  output += `- 🥗 **Meals**: Breakfast, Lunch, Dinner, Snacks\n\n`;

  output += `---\n\n`;

  // Demo Loop
  output += `## 🔄 The Loop: How Your Plan Adapts\n\n`;
  output += `Here's the magic of LoopGPT - your plan **learns and adapts** based on your results:\n\n`;
  
  output += `### 📊 Week 1 (This Week)\n`;
  output += `- 🎯 Target: ${calories} calories/day\n`;
  output += `- 📝 You follow the plan and track your weight\n`;
  output += `- 📈 We measure your progress\n\n`;

  const adjustedCalories = goalType === 'weight_loss' 
    ? calories - 100 
    : calories + 100;

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
      if (partner.commission_rate) {
        output += `- 💵 **Commission**: ${partner.commission_rate}\n`;
      }
      output += `- 🔗 [Order Now](${partner.base_url})\n\n`;
    });

    output += `> 💡 **Tip**: These links support LoopGPT at no extra cost to you. Thank you!\n\n`;
  } else {
    output += `## 🛒 Get Your Ingredients\n\n`;
    output += `You can purchase ingredients from your local grocery store or use online delivery services like Amazon Fresh, Instacart, or Walmart Grocery.\n\n`;
  }

  output += `---\n\n`;
  output += `## 🚀 Ready to Start?\n\n`;
  output += `Your personalized plan is ready! Here's what to do next:\n\n`;
  output += `1. 📋 Review your meal plan\n`;
  output += `2. 🛒 Order groceries (use links above)\n`;
  output += `3. 📅 Start tomorrow morning\n`;
  output += `4. ⚖️ Weigh yourself Monday mornings\n`;
  output += `5. 💬 Check in with me weekly for adjustments\n\n`;
  output += `Let's do this! 💪\n`;

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
  }
}
