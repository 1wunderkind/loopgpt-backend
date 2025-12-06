/**
 * LoopGPT Analytics - TypeScript Types
 * 
 * Type definitions for the 7 foundational metrics tables
 * Auto-generated from database schema
 */

// ============================================================================
// Table Types
// ============================================================================

export interface AnalyticsIngredientSubmission {
  id: string;
  user_id: string | null;
  session_id: string | null;
  source_gpt: string;
  ingredients: IngredientInput[];
  ingredient_count?: number; // Generated column
  locale: string | null;
  created_at: string; // ISO timestamp
}

export interface AnalyticsRecipeEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  recipe_id: string;
  recipe_title: string | null;
  event_type: RecipeEventType;
  chaos_rating_shown: number | null;
  persona_used: string | null;
  source_gpt: string;
  response_time_ms: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AnalyticsMealLog {
  id: string;
  user_id: string | null;
  session_id: string | null;
  source_gpt: string;
  logged_at: string; // ISO timestamp (user timezone)
  created_at: string; // ISO timestamp (server time)
  meal_type: MealType | null;
  description: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  raw_payload: any | null;
  total_macros_g?: number; // Generated column
}

export interface AnalyticsMealPlan {
  id: string;
  user_id: string | null;
  session_id: string | null;
  source_gpt: string;
  title: string;
  description: string | null;
  days_planned: number;
  vibe: string | null;
  target_calories_per_day: number | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface AnalyticsAffiliateEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: AffiliateEventType;
  provider: string;
  ingredient_name: string | null;
  url: string | null;
  grocery_order_id: string | null;
  conversion_value: number | null;
  currency: string | null;
  created_at: string;
  converted_at: string | null;
  metadata: Record<string, any> | null;
}

export interface AnalyticsUserGoal {
  id: string;
  user_id: string;
  goal_type: UserGoalType;
  calorie_target: number | null;
  macro_targets: MacroTargets | null;
  dietary_restrictions: string[];
  created_at: string;
  updated_at: string;
  modification_count: number;
  is_active: boolean;
}

export interface AnalyticsSessionEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  gpt_name: string;
  event_type: SessionEventType;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

// ============================================================================
// Enum Types
// ============================================================================

export type RecipeEventType = 
  | 'generated' 
  | 'accepted' 
  | 'rejected' 
  | 'regenerated' 
  | 'cooked';

export type MealType = 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'snack' 
  | 'other';

export type AffiliateEventType = 
  | 'click' 
  | 'impression' 
  | 'conversion';

export type UserGoalType = 
  | 'weight_loss' 
  | 'muscle_gain' 
  | 'maintenance' 
  | 'performance'
  | 'general_health';

export type SessionEventType = 
  | 'session_start' 
  | 'session_end' 
  | 'tool_call';

// ============================================================================
// Input Types (for logging functions)
// ============================================================================

export interface IngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  raw?: string | null;
}

export interface MacroTargets {
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

// ============================================================================
// Logger Function Parameter Types
// ============================================================================

export interface LogIngredientSubmissionParams {
  userId?: string | null;
  sessionId?: string | null;
  sourceGpt: string;
  ingredients: IngredientInput[];
  locale?: string | null;
}

export interface LogRecipeEventParams {
  userId?: string | null;
  sessionId?: string | null;
  recipeId: string;
  recipeTitle?: string | null;
  eventType: RecipeEventType;
  chaosRatingShown?: number | null;
  personaUsed?: string | null;
  sourceGpt: string;
  responseTimeMs?: number | null;
  metadata?: Record<string, any> | null;
}

export interface LogMealLogParams {
  userId?: string | null;
  sessionId?: string | null;
  sourceGpt: string;
  loggedAt: Date | string;
  mealType?: MealType | null;
  description: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  rawPayload?: any | null;
}

export interface LogMealPlanParams {
  userId?: string | null;
  sessionId?: string | null;
  sourceGpt: string;
  title: string;
  description?: string | null;
  daysPlanned: number;
  vibe?: string | null;
  targetCaloriesPerDay?: number | null;
  metadata?: Record<string, any> | null;
}

export interface LogAffiliateEventParams {
  userId?: string | null;
  sessionId?: string | null;
  eventType: AffiliateEventType;
  provider: string;
  ingredientName?: string | null;
  url?: string | null;
  groceryOrderId?: string | null;
  conversionValue?: number | null;
  currency?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpsertUserGoalParams {
  userId: string;
  goalType: UserGoalType;
  calorieTarget?: number | null;
  macroTargets?: MacroTargets | null;
  dietaryRestrictions?: string[];
}

export interface LogSessionEventParams {
  userId?: string | null;
  sessionId: string;
  gptName: string;
  eventType: SessionEventType;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

// ============================================================================
// Materialized View Types
// ============================================================================

export interface DailyActiveUsers {
  date: string;
  dau: number;
  sessions: number;
  total_events: number;
}

export interface RecipeAcceptanceRate {
  date: string;
  source_gpt: string;
  recipes_generated: number;
  recipes_accepted: number;
  recipes_rejected: number;
  acceptance_rate_pct: number;
}

export interface AffiliateConversionRate {
  date: string;
  provider: string;
  clicks: number;
  conversions: number;
  total_revenue: number;
  conversion_rate_pct: number;
}

// ============================================================================
// Helper Function Return Types
// ============================================================================

export interface UserSummary {
  total_recipes_generated: number;
  total_recipes_accepted: number;
  total_meals_logged: number;
  total_meal_plans: number;
  total_affiliate_clicks: number;
  first_seen: string | null;
  last_seen: string | null;
}
