/**
 * Shared TypeScript types for MealPlanner GPT Backend
 */

// ============================================================================
// MEAL PLAN TYPES
// ============================================================================

export interface MealPlanParams {
  goal_type?: string;
  calories_target?: number;
  macros_target?: MacroTargets;
  vibe?: string;
  recipes_per_day?: number;
}

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealPlan {
  id: string;
  chatgpt_user_id: string;
  plan_name?: string;
  start_date: string;
  end_date: string;
  goal_type?: string;
  calories_target?: number;
  macros_target?: MacroTargets;
  vibe?: string;
  recipes_per_day?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MEAL TYPES
// ============================================================================

export interface Ingredient {
  name: string;
  qty: number | string;
  unit?: string;
}

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface AffiliateLinks {
  amazon_fresh?: string;
  instacart?: string;
  walmart?: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  day: number;
  day_date?: string;
  meal_type: string;
  meal_order?: number;
  recipe_id?: string;
  recipe_name: string;
  recipe_source?: string;
  ingredients?: Ingredient[];
  instructions?: string;
  macros?: NutritionInfo;
  affiliate_links?: AffiliateLinks;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RECIPE TYPES
// ============================================================================

export interface Recipe {
  id: string;
  recipe_id?: string;
  title: string;
  source?: string;
  chef_persona?: string;
  chaos_level?: number;
  diet_tags?: string[];
  ingredients: Ingredient[];
  instructions?: string[];
  nutrition_per_serving?: NutritionInfo;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXTERNAL GPT INTEGRATION TYPES
// ============================================================================

export interface KCalGoals {
  chatgpt_user_id: string;
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
  daily_carbs_goal?: number;
  daily_fat_goal?: number;
}

export interface LeftoverRecipeRequest {
  chatgpt_user_id?: string;
  ingredients?: string[];
  vibe?: string;
  diet?: string;
  chef_persona?: string;
}

export interface LeftoverRecipeResponse {
  recipe_name: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition?: NutritionInfo;
  chef_persona?: string;
  chaos_level?: number;
}

export interface NutritionAnalysisRequest {
  recipe_name: string;
  ingredients: Ingredient[];
  servings?: number;
}

export interface NutritionAnalysisResponse {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micronutrients?: Record<string, unknown>;
}

// ============================================================================
// MCP WRAPPER TYPES
// ============================================================================

export interface MCPRequest {
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// FEATURE FLAG TYPES
// ============================================================================

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rollout_percentage?: number;
  config?: Record<string, unknown>;
  description?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface GenerateWeekPlanRequest {
  chatgpt_user_id: string;
  start_date?: string;
  end_date?: string;
  goal_type?: string;
  calories_target?: number;
  macros_target?: MacroTargets;
  vibe?: string;
  recipes_per_day?: number;
  dietary_restrictions?: string[];
  language?: string; // ISO language code (en, es, zh, fr, etc.) - optional, auto-detected if not provided
}

export interface GenerateWeekPlanResponse {
  meal_plan: MealPlan;
  daily_meals: MealPlanItem[];
  total_nutrition: NutritionInfo;
  affiliate_summary?: {
    total_ingredients: number;
    platforms: string[];
  };
}

// ============================================================================
// AFFILIATE TYPES
// ============================================================================

export interface AffiliateLink {
  id: string;
  ingredient: string;
  normalized_ingredient?: string;
  amazon_url?: string;
  instacart_url?: string;
  walmart_url?: string;
  last_updated: string;
  ttl_hours?: number;
}

export interface BuildAffiliateLinksRequest {
  ingredients: string[];
  language?: string; // ISO language code - optional
}

export interface BuildAffiliateLinksResponse {
  links: Record<string, AffiliateLinks>;
}

// ============================================================================
// DELIVERY AFFILIATE TYPES
// ============================================================================

export interface DeliveryPartner {
  id: string;
  name: string;
  base_url: string;
  api_key?: string;
  affiliate_id: string;
  supported_countries: string[];
  cuisine_tags: string[];
  diet_tags?: string[];
  commission_rate?: number;
  active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRecommendation {
  id: string;
  chatgpt_user_id: string;
  cuisine_tag?: string;
  diet?: string;
  calories?: number;
  partner_id: string;
  partner_name: string;
  affiliate_url: string;
  clicked: boolean;
  clicked_at?: string;
  converted: boolean;
  converted_at?: string;
  order_value?: number;
  commission_earned?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DeliveryAffiliateLink {
  partner_id: string;
  partner_name: string;
  affiliate_url: string;
  cuisine: string;
  commission_rate?: number;
  metadata?: Record<string, unknown>;
}

export interface DeliveryMatchCriteria {
  cuisine?: string;
  diet?: string;
  country?: string;
  calories?: number;
}

export interface GetDeliveryRecommendationsRequest {
  chatgpt_user_id: string;
  cuisine?: string;
  diet?: string;
  calories?: number;
  country?: string;
  limit?: number;
  language?: string; // ISO language code - optional
}

export interface GetDeliveryRecommendationsResponse {
  success: boolean;
  recommendations: DeliveryAffiliateLink[];
  alternatives?: string[];
  disclaimer: string;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

