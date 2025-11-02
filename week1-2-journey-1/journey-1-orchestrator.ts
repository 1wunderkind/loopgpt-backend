/**
 * Journey 1 Orchestrator: Onboarding & First Meal Plan
 * 
 * This orchestrator coordinates multiple tool calls and formats responses
 * to ensure a consistent, high-quality onboarding experience.
 */

import { createClient } from '@supabase/supabase-js';
import { formatCompleteOnboarding, formatGroceryList } from './response-formatter';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface OnboardingInput {
  chatgpt_user_id: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'health';
  calories_target?: number;
  dietary_restrictions?: string[];
  preferences?: Record<string, any>;
  ip_address?: string;
}

interface OnboardingResult {
  success: boolean;
  formatted_response: string;
  meal_plan_id?: string;
  country_code?: string;
  error?: string;
}

/**
 * Main orchestration function for Journey 1
 * 
 * This function:
 * 1. Gets user location
 * 2. Creates meal plan
 * 3. Gets affiliate partners
 * 4. Formats complete response
 * 5. Logs analytics
 */
export async function orchestrateOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const startTime = Date.now();

  try {
    // Step 1: Get user location
    console.log('[Journey 1] Step 1: Getting user location...');
    const { data: locationData, error: locationError } = await supabase.functions.invoke(
      'get_user_location',
      {
        body: {
          chatgpt_user_id: input.chatgpt_user_id,
          ip_address: input.ip_address
        }
      }
    );

    if (locationError) {
      console.error('[Journey 1] Location error:', locationError);
      // Continue with default US if location fails
    }

    const countryCode = locationData?.country_code || 'US';
    console.log(`[Journey 1] User location: ${countryCode}`);

    // Step 2: Create meal plan
    console.log('[Journey 1] Step 2: Creating meal plan...');
    const { data: mealPlanData, error: mealPlanError } = await supabase.functions.invoke(
      'plan_create_meal_plan',
      {
        body: {
          chatgpt_user_id: input.chatgpt_user_id,
          goal_type: input.goal_type,
          calories_target: input.calories_target,
          dietary_restrictions: input.dietary_restrictions || [],
          preferences: input.preferences || {}
        }
      }
    );

    if (mealPlanError || !mealPlanData) {
      throw new Error(`Failed to create meal plan: ${mealPlanError?.message || 'Unknown error'}`);
    }

    console.log(`[Journey 1] Meal plan created: ${mealPlanData.id}`);

    // Step 3: Get affiliate partners for grocery delivery
    console.log('[Journey 1] Step 3: Getting affiliate partners...');
    const { data: affiliateData, error: affiliateError } = await supabase.functions.invoke(
      'get_affiliate_by_country',
      {
        body: {
          country_code: countryCode,
          partner_type: 'grocery'
        }
      }
    );

    const affiliatePartners = affiliateData?.partners || [];
    console.log(`[Journey 1] Found ${affiliatePartners.length} affiliate partners`);

    // Step 4: Format complete response
    console.log('[Journey 1] Step 4: Formatting response...');
    const formattedResponse = formatCompleteOnboarding(
      mealPlanData,
      affiliatePartners,
      countryCode
    );

    // Step 5: Log analytics
    const duration = Date.now() - startTime;
    console.log('[Journey 1] Step 5: Logging analytics...');
    
    await logJourneyAnalytics({
      user_id: input.chatgpt_user_id,
      journey_name: 'journey_1_onboarding',
      meal_plan_id: mealPlanData.id,
      country_code: countryCode,
      affiliate_partners_shown: affiliatePartners.length,
      duration_ms: duration,
      success: true
    });

    console.log(`[Journey 1] Complete! Duration: ${duration}ms`);

    return {
      success: true,
      formatted_response: formattedResponse,
      meal_plan_id: mealPlanData.id,
      country_code: countryCode
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Journey 1] Error:', error);

    // Log error analytics
    await logJourneyAnalytics({
      user_id: input.chatgpt_user_id,
      journey_name: 'journey_1_onboarding',
      duration_ms: duration,
      success: false,
      error_message: error.message
    });

    return {
      success: false,
      formatted_response: '',
      error: error.message
    };
  }
}

/**
 * Logs analytics for Journey 1
 */
async function logJourneyAnalytics(data: {
  user_id: string;
  journey_name: string;
  meal_plan_id?: string;
  country_code?: string;
  affiliate_partners_shown?: number;
  duration_ms: number;
  success: boolean;
  error_message?: string;
}) {
  try {
    // Log user event
    await supabase.rpc('log_user_event', {
      p_user_id: data.user_id,
      p_event_name: data.journey_name,
      p_event_data: {
        meal_plan_id: data.meal_plan_id,
        country_code: data.country_code,
        affiliate_partners_shown: data.affiliate_partners_shown,
        duration_ms: data.duration_ms,
        success: data.success,
        error_message: data.error_message
      }
    });

    // If affiliate partners were shown, log that too
    if (data.affiliate_partners_shown && data.affiliate_partners_shown > 0) {
      await supabase.from('affiliate_performance').insert({
        user_id: data.user_id,
        country_code: data.country_code,
        partner_name: 'Multiple',
        category: 'grocery',
        journey_name: data.journey_name,
        link_clicked: false
      });
    }

    console.log('[Journey 1] Analytics logged successfully');
  } catch (error) {
    console.error('[Journey 1] Failed to log analytics:', error);
    // Don't throw - analytics failures shouldn't break the user experience
  }
}

/**
 * Helper function to generate a grocery list
 */
export async function generateGroceryList(
  chatgpt_user_id: string
): Promise<{ success: boolean; grocery_list: string; error?: string }> {
  try {
    // Get active meal plan
    const { data: mealPlanData, error } = await supabase.functions.invoke(
      'plan_get_active_plan',
      {
        body: { chatgpt_user_id }
      }
    );

    if (error || !mealPlanData) {
      throw new Error('No active meal plan found');
    }

    const groceryList = formatGroceryList(mealPlanData);

    return {
      success: true,
      grocery_list: groceryList
    };

  } catch (error) {
    return {
      success: false,
      grocery_list: '',
      error: error.message
    };
  }
}
