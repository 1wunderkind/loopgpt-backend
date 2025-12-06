/**
 * LoopGPT Analytics Logger
 * 
 * Centralized logging module for the 7 foundational metrics
 * 
 * Usage:
 *   import { logIngredientSubmission, logRecipeEvent } from '../_shared/analytics/logger.ts';
 *   
 *   await logIngredientSubmission({
 *     userId: 'user-123',
 *     sessionId: 'session-456',
 *     sourceGpt: 'LeftoverGPT',
 *     ingredients: [{name: 'chicken', quantity: 500, unit: 'g'}]
 *   });
 * 
 * Features:
 * - Type-safe logging functions
 * - Graceful error handling (never breaks user flow)
 * - Async fire-and-forget (non-blocking)
 * - Automatic timestamp handling
 * - Supabase client integration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  LogIngredientSubmissionParams,
  LogRecipeEventParams,
  LogMealLogParams,
  LogMealPlanParams,
  LogAffiliateEventParams,
  UpsertUserGoalParams,
  LogSessionEventParams,
} from './types.ts';

// ============================================================================
// Supabase Client
// ============================================================================

/**
 * Get Supabase client for analytics operations
 * Uses service role key for unrestricted access
 */
function getAnalyticsClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('[Analytics] Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// Internal Helper
// ============================================================================

/**
 * Generic insert helper with error handling
 * Fails gracefully - logs error but doesn't throw
 */
async function insertAnalyticsRow<T>(
  table: string,
  payload: T,
  context: string
): Promise<void> {
  try {
    const client = getAnalyticsClient();
    const { error } = await client
      .from(`analytics.${table}`)
      .insert(payload as any);
    
    if (error) {
      console.error(`[Analytics] Failed to insert into ${table}:`, error);
      console.error(`[Analytics] Context: ${context}`);
      console.error(`[Analytics] Payload:`, JSON.stringify(payload, null, 2));
    }
  } catch (error) {
    // Graceful degradation - log but don't throw
    console.error(`[Analytics] Exception in insertAnalyticsRow (${table}):`, error);
    console.error(`[Analytics] Context: ${context}`);
  }
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log ingredient submission to LeftoverGPT or other recipe tools
 * 
 * @example
 * await logIngredientSubmission({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   sourceGpt: 'LeftoverGPT',
 *   ingredients: [
 *     {name: 'chicken breast', quantity: 500, unit: 'g'},
 *     {name: 'broccoli', quantity: 200, unit: 'g'}
 *   ],
 *   locale: 'en-US'
 * });
 */
export async function logIngredientSubmission(
  params: LogIngredientSubmissionParams
): Promise<void> {
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId || null,
    source_gpt: params.sourceGpt,
    ingredients: params.ingredients,
    locale: params.locale || null,
  };
  
  await insertAnalyticsRow(
    'ingredient_submissions',
    payload,
    `logIngredientSubmission: ${params.sourceGpt}, ${params.ingredients.length} ingredients`
  );
}

/**
 * Log recipe generation or user reaction event
 * 
 * @example
 * // Recipe generated
 * await logRecipeEvent({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   recipeId: 'recipe-789',
 *   recipeTitle: 'Spicy Chicken Stir-Fry',
 *   eventType: 'generated',
 *   chaosRatingShown: 75,
 *   sourceGpt: 'LeftoverGPT',
 *   responseTimeMs: 3500
 * });
 * 
 * // Recipe accepted
 * await logRecipeEvent({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   recipeId: 'recipe-789',
 *   eventType: 'accepted',
 *   sourceGpt: 'LeftoverGPT'
 * });
 */
export async function logRecipeEvent(
  params: LogRecipeEventParams
): Promise<void> {
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId || null,
    recipe_id: params.recipeId,
    recipe_title: params.recipeTitle || null,
    event_type: params.eventType,
    chaos_rating_shown: params.chaosRatingShown || null,
    persona_used: params.personaUsed || null,
    source_gpt: params.sourceGpt,
    response_time_ms: params.responseTimeMs || null,
    metadata: params.metadata || null,
  };
  
  await insertAnalyticsRow(
    'recipe_events',
    payload,
    `logRecipeEvent: ${params.eventType} - ${params.recipeId}`
  );
}

/**
 * Log meal consumption from KCalGPT or manual entry
 * 
 * @example
 * await logMealLog({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   sourceGpt: 'KCalGPT',
 *   loggedAt: new Date(),
 *   mealType: 'lunch',
 *   description: 'Grilled chicken salad with olive oil',
 *   caloriesKcal: 450,
 *   proteinG: 35,
 *   carbsG: 20,
 *   fatG: 25,
 *   fiberG: 8
 * });
 */
export async function logMealLog(
  params: LogMealLogParams
): Promise<void> {
  const loggedAt = typeof params.loggedAt === 'string' 
    ? params.loggedAt 
    : params.loggedAt.toISOString();
  
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId || null,
    source_gpt: params.sourceGpt,
    logged_at: loggedAt,
    meal_type: params.mealType || null,
    description: params.description,
    calories_kcal: params.caloriesKcal || null,
    protein_g: params.proteinG || null,
    carbs_g: params.carbsG || null,
    fat_g: params.fatG || null,
    fiber_g: params.fiberG || null,
    raw_payload: params.rawPayload || null,
  };
  
  await insertAnalyticsRow(
    'meal_logs',
    payload,
    `logMealLog: ${params.mealType || 'unknown'} - ${params.description.substring(0, 50)}`
  );
}

/**
 * Log meal plan generation
 * 
 * @example
 * await logMealPlanGenerated({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   sourceGpt: 'MealPlannerGPT',
 *   title: '7-day High-Protein Plan',
 *   description: 'Balanced meal plan for muscle gain',
 *   daysPlanned: 7,
 *   vibe: 'high-protein',
 *   targetCaloriesPerDay: 2500,
 *   metadata: {
 *     macroTargets: {protein_g: 180, carbs_g: 250, fat_g: 80}
 *   }
 * });
 */
export async function logMealPlanGenerated(
  params: LogMealPlanParams
): Promise<void> {
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId || null,
    source_gpt: params.sourceGpt,
    title: params.title,
    description: params.description || null,
    days_planned: params.daysPlanned,
    vibe: params.vibe || null,
    target_calories_per_day: params.targetCaloriesPerDay || null,
    metadata: params.metadata || null,
  };
  
  await insertAnalyticsRow(
    'meal_plans',
    payload,
    `logMealPlanGenerated: ${params.daysPlanned} days - ${params.vibe || 'default'}`
  );
}

/**
 * Log affiliate link click
 * 
 * @example
 * // Click event
 * await logAffiliateClick({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   provider: 'Instacart',
 *   ingredientName: 'chicken breast',
 *   url: 'https://instacart.com/...'
 * });
 * 
 * // Conversion event (when order completes)
 * await logAffiliateConversion({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   provider: 'Instacart',
 *   groceryOrderId: 'order-789',
 *   conversionValue: 45.99,
 *   currency: 'USD'
 * });
 */
export async function logAffiliateClick(
  params: LogAffiliateEventParams
): Promise<void> {
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId || null,
    event_type: params.eventType,
    provider: params.provider,
    ingredient_name: params.ingredientName || null,
    url: params.url || null,
    grocery_order_id: params.groceryOrderId || null,
    conversion_value: params.conversionValue || null,
    currency: params.currency || 'USD',
    metadata: params.metadata || null,
  };
  
  await insertAnalyticsRow(
    'affiliate_events',
    payload,
    `logAffiliateClick: ${params.eventType} - ${params.provider}`
  );
}

/**
 * Convenience wrapper for logging affiliate conversions
 */
export async function logAffiliateConversion(
  params: Omit<LogAffiliateEventParams, 'eventType'>
): Promise<void> {
  return logAffiliateClick({
    ...params,
    eventType: 'conversion',
  });
}

/**
 * Upsert user goal (deactivates previous goals, inserts new active goal)
 * 
 * @example
 * await upsertUserGoal({
 *   userId: 'user-123',
 *   goalType: 'muscle_gain',
 *   calorieTarget: 2800,
 *   macroTargets: {
 *     protein_g: 200,
 *     carbs_g: 300,
 *     fat_g: 90
 *   },
 *   dietaryRestrictions: ['gluten_free', 'dairy_free']
 * });
 */
export async function upsertUserGoal(
  params: UpsertUserGoalParams
): Promise<void> {
  try {
    const client = getAnalyticsClient();
    
    // Step 1: Deactivate all previous goals for this user
    const { error: updateError } = await client
      .from('analytics.user_goals')
      .update({ is_active: false })
      .eq('user_id', params.userId)
      .eq('is_active', true);
    
    if (updateError) {
      console.error('[Analytics] Failed to deactivate previous goals:', updateError);
    }
    
    // Step 2: Insert new active goal
    const payload = {
      user_id: params.userId,
      goal_type: params.goalType,
      calorie_target: params.calorieTarget || null,
      macro_targets: params.macroTargets || null,
      dietary_restrictions: params.dietaryRestrictions || [],
      is_active: true,
      modification_count: 0,
    };
    
    const { error: insertError } = await client
      .from('analytics.user_goals')
      .insert(payload);
    
    if (insertError) {
      console.error('[Analytics] Failed to insert new goal:', insertError);
      console.error('[Analytics] Payload:', JSON.stringify(payload, null, 2));
    }
  } catch (error) {
    console.error('[Analytics] Exception in upsertUserGoal:', error);
  }
}

/**
 * Log session event (start, end, tool call)
 * 
 * @example
 * // Session start
 * await logSessionEvent({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   gptName: 'LeftoverGPT',
 *   eventType: 'session_start',
 *   userAgent: 'Mozilla/5.0...',
 *   metadata: {route: '/recipes/generate'}
 * });
 * 
 * // Tool call
 * await logSessionEvent({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   gptName: 'LeftoverGPT',
 *   eventType: 'tool_call',
 *   metadata: {tool: 'loopkitchen.recipes.generate', duration: 3500}
 * });
 * 
 * // Session end
 * await logSessionEvent({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   gptName: 'LeftoverGPT',
 *   eventType: 'session_end',
 *   metadata: {duration: 120000, toolsCalled: 5}
 * });
 */
export async function logSessionEvent(
  params: LogSessionEventParams
): Promise<void> {
  const payload = {
    user_id: params.userId || null,
    session_id: params.sessionId,
    gpt_name: params.gptName,
    event_type: params.eventType,
    user_agent: params.userAgent || null,
    metadata: params.metadata || null,
  };
  
  await insertAnalyticsRow(
    'session_events',
    payload,
    `logSessionEvent: ${params.eventType} - ${params.gptName}`
  );
}

// ============================================================================
// Batch Logging Helpers
// ============================================================================

/**
 * Log multiple events in a single transaction (best effort)
 * Useful for logging related events together
 * 
 * @example
 * await batchLog([
 *   () => logIngredientSubmission({...}),
 *   () => logRecipeEvent({...}),
 *   () => logSessionEvent({...})
 * ]);
 */
export async function batchLog(
  logFunctions: Array<() => Promise<void>>
): Promise<void> {
  try {
    await Promise.all(logFunctions.map(fn => fn()));
  } catch (error) {
    console.error('[Analytics] Batch logging failed:', error);
  }
}

// ============================================================================
// Analytics Query Helpers
// ============================================================================

/**
 * Get user activity summary
 * 
 * @example
 * const summary = await getUserSummary('user-123');
 * console.log(`User has generated ${summary.total_recipes_generated} recipes`);
 */
export async function getUserSummary(userId: string) {
  try {
    const client = getAnalyticsClient();
    const { data, error } = await client
      .rpc('analytics.get_user_summary', { p_user_id: userId });
    
    if (error) {
      console.error('[Analytics] Failed to get user summary:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[Analytics] Exception in getUserSummary:', error);
    return null;
  }
}

/**
 * Refresh all materialized views
 * Should be called periodically (e.g., daily via cron)
 * 
 * @example
 * await refreshAnalyticsViews();
 */
export async function refreshAnalyticsViews(): Promise<void> {
  try {
    const client = getAnalyticsClient();
    const { error } = await client.rpc('analytics.refresh_all_views');
    
    if (error) {
      console.error('[Analytics] Failed to refresh views:', error);
    } else {
      console.log('[Analytics] Successfully refreshed all materialized views');
    }
  } catch (error) {
    console.error('[Analytics] Exception in refreshAnalyticsViews:', error);
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Core logging functions
  logIngredientSubmission,
  logRecipeEvent,
  logMealLog,
  logMealPlanGenerated,
  logAffiliateClick,
  logAffiliateConversion,
  upsertUserGoal,
  logSessionEvent,
  
  // Batch helpers
  batchLog,
  
  // Query helpers
  getUserSummary,
  refreshAnalyticsViews,
};
