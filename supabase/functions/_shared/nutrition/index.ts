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
  estimateRecipeNutrition,
  estimateMultipleRecipes,
  aggregateRecipeNutrition,
  lookupIngredient,
  convertToBaseUnit,
  calculateIngredientMacros,
  aggregateMacros,
  aggregateMicronutrients,
  calculateConfidence,
} from "./engine.ts";

// ============================================================================
// Diet Tagging Functions
// ============================================================================

export {
  getDietTags,
  getIngredientBasedTags,
  getMacroBasedTags,
  checkDietCompliance,
  checkDietViolations,
  getDietTagDescription,
  getDietTagDescriptions,
  DIET_TAG_DESCRIPTIONS,
} from "./tags.ts";

// ============================================================================
// Dictionary Functions
// ============================================================================

export {
  normalizeIngredientName,
  FOOD_DATABASE,
  INGREDIENT_SYNONYMS,
  UNIT_CONVERSIONS,
} from "./dictionary.ts";

// ============================================================================
// Types
// ============================================================================

export type {
  // Input types
  RecipeNutritionInput,
  IngredientQuantity,
  
  // Output types
  RecipeNutritionResult,
  Macros,
  Micronutrients,
  DietTag,
  ConfidenceLevel,
  
  // Internal types
  FoodEntry,
  IngredientFlags,
  IngredientLookupResult,
  UnitConversion,
} from "./types.ts";

export {
  DIET_TAG_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  ROUNDING_CONFIG,
} from "./types.ts";
