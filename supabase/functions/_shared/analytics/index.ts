/**
 * LoopGPT Analytics Module
 * 
 * Centralized exports for analytics logging and types
 * 
 * Usage:
 *   import { logRecipeEvent, logMealPlanGenerated } from '../_shared/analytics/index.ts';
 *   import type { LogRecipeEventParams } from '../_shared/analytics/index.ts';
 */

// Export all types
export type {
  // Table types
  AnalyticsIngredientSubmission,
  AnalyticsRecipeEvent,
  AnalyticsMealLog,
  AnalyticsMealPlan,
  AnalyticsAffiliateEvent,
  AnalyticsUserGoal,
  AnalyticsSessionEvent,
  
  // Enum types
  RecipeEventType,
  MealType,
  AffiliateEventType,
  UserGoalType,
  SessionEventType,
  
  // Input types
  IngredientInput,
  MacroTargets,
  
  // Logger parameter types
  LogIngredientSubmissionParams,
  LogRecipeEventParams,
  LogMealLogParams,
  LogMealPlanParams,
  LogAffiliateEventParams,
  UpsertUserGoalParams,
  LogSessionEventParams,
  
  // View types
  DailyActiveUsers,
  RecipeAcceptanceRate,
  AffiliateConversionRate,
  UserSummary,
} from './types.ts';

// Export all logger functions
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
} from './logger.ts';
