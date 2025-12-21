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
  AffiliateConversionRate,
  AffiliateEventType,
  AnalyticsAffiliateEvent,
  // Table types
  AnalyticsIngredientSubmission,
  AnalyticsMealLog,
  AnalyticsMealPlan,
  AnalyticsRecipeEvent,
  AnalyticsSessionEvent,
  AnalyticsUserGoal,
  // View types
  DailyActiveUsers,
  // Input types
  IngredientInput,
  LogAffiliateEventParams,
  // Logger parameter types
  LogIngredientSubmissionParams,
  LogMealLogParams,
  LogMealPlanParams,
  LogRecipeEventParams,
  LogSessionEventParams,
  MacroTargets,
  MealType,
  RecipeAcceptanceRate,
  // Enum types
  RecipeEventType,
  SessionEventType,
  UpsertUserGoalParams,
  UserGoalType,
  UserSummary,
} from "./types.ts";

// Export all logger functions
export {
  // Batch helpers
  batchLog,
  // Query helpers
  getUserSummary,
  logAffiliateClick,
  logAffiliateConversion,
  // Core logging functions
  logIngredientSubmission,
  logMealLog,
  logMealPlanGenerated,
  logRecipeEvent,
  logSessionEvent,
  refreshAnalyticsViews,
  upsertUserGoal,
} from "./logger.ts";
