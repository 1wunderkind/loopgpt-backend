/**
 * Nutrition Engine - Public API
 *
 * Single entry point for all nutrition-related functionality.
 *
 * Usage:
 *   import { estimateRecipeNutrition } from "../_shared/nutrition/index.ts";
 *
 *   const result = estimateRecipeNutrition({
 *     recipeName: "Chicken and Rice",
 *     servings: 4,
 *     ingredients: [
 *       { name: "chicken breast", quantity: 500, unit: "g" },
 *       { name: "rice", quantity: 2, unit: "cup" },
 *     ],
 *   });
 *
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

// ============================================================================
// Core Engine Functions
// ============================================================================

export {
  aggregateMacros,
  aggregateMicronutrients,
  aggregateRecipeNutrition,
  calculateConfidence,
  calculateIngredientMacros,
  convertToBaseUnit,
  estimateMultipleRecipes,
  estimateRecipeNutrition,
  lookupIngredient,
} from "./engine.ts";

// ============================================================================
// Diet Tagging Functions
// ============================================================================

export {
  checkDietCompliance,
  checkDietViolations,
  DIET_TAG_DESCRIPTIONS,
  getDietTagDescription,
  getDietTagDescriptions,
  getDietTags,
  getIngredientBasedTags,
  getMacroBasedTags,
} from "./tags.ts";

// ============================================================================
// Dictionary Functions
// ============================================================================

export {
  FOOD_DATABASE,
  INGREDIENT_SYNONYMS,
  normalizeIngredientName,
  UNIT_CONVERSIONS,
} from "./dictionary.ts";

// ============================================================================
// Types
// ============================================================================

export type {
  ConfidenceLevel,
  DietTag,
  // Internal types
  FoodEntry,
  IngredientFlags,
  IngredientLookupResult,
  IngredientQuantity,
  Macros,
  Micronutrients,
  // Input types
  RecipeNutritionInput,
  // Output types
  RecipeNutritionResult,
  UnitConversion,
} from "./types.ts";

export {
  CONFIDENCE_THRESHOLDS,
  DIET_TAG_THRESHOLDS,
  ROUNDING_CONFIG,
} from "./types.ts";
