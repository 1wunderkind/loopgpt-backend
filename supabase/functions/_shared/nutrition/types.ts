/**
 * Canonical Nutrition Types
 * 
 * Defines the single source of truth for nutrition-related types used across:
 * - MCP tools (nutrition analysis, meal planning)
 * - Meal logging (analytics.meal_logs)
 * - Recipe nutrition estimation
 * - Diet compliance checking
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

// ============================================================================
// Input Types
// ============================================================================

/**
 * Ingredient with quantity and unit
 * This is the input format from recipes (LeftoverGPT, MealPlannerGPT, etc.)
 */
export interface IngredientQuantity {
  /** Raw ingredient name from recipe (e.g., "chicken breast", "鸡胸肉") */
  name: string;
  
  /** Canonical normalized name after mapping (e.g., "chicken breast") */
  normalizedName?: string;
  
  /** Numeric quantity */
  quantity: number;
  
  /** Unit of measurement (g, ml, cup, tbsp, piece, etc.) */
  unit: string;
}

/**
 * Recipe nutrition input
 * Used by estimateRecipeNutrition() function
 */
export interface RecipeNutritionInput {
  /** Optional recipe ID for tracking */
  recipeId?: string;
  
  /** Recipe name (can be in any language) */
  recipeName: string;
  
  /** List of ingredients with quantities */
  ingredients: IngredientQuantity[];
  
  /** Number of servings this recipe makes */
  servings: number;
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Macronutrient data
 * All values are per serving unless specified otherwise
 */
export interface Macros {
  /** Total calories (kcal) */
  calories: number;
  
  /** Protein in grams */
  protein_g: number;
  
  /** Carbohydrates in grams */
  carbs_g: number;
  
  /** Fat in grams */
  fat_g: number;
  
  /** Fiber in grams (optional) */
  fiber_g?: number;
  
  /** Sugar in grams (optional) */
  sugar_g?: number;
  
  /** Sodium in milligrams (optional) */
  sodium_mg?: number;
}

/**
 * Micronutrient data (optional)
 * All values are per serving
 */
export interface Micronutrients {
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_e_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  magnesium_mg?: number;
  zinc_mg?: number;
}

/**
 * Diet tags based on ingredients and macros
 * These are deterministically assigned based on rules
 */
export type DietTag =
  // Ingredient-based tags
  | "vegan"           // No animal products
  | "vegetarian"      // No meat/fish, but eggs/dairy allowed
  | "pescatarian"     // No meat, but fish allowed
  | "gluten_free"     // No gluten-containing grains
  | "dairy_free"      // No dairy products
  | "nut_free"        // No tree nuts or peanuts
  | "soy_free"        // No soy products
  | "egg_free"        // No eggs
  
  // Macro-based tags
  | "low_carb"        // Carbs per serving < 20g
  | "high_protein"    // Protein per serving ≥ 20g
  | "high_fiber"      // Fiber per serving ≥ 5g
  | "keto_friendly"   // Very low carb (< 10g) + high fat
  | "low_fat"         // Fat per serving < 5g
  | "low_sodium"      // Sodium per serving < 200mg
  | "low_sugar"       // Sugar per serving < 5g
  
  // Lifestyle tags
  | "paleo_friendly"  // No grains, dairy, legumes
  | "whole30"         // No grains, dairy, legumes, sugar, alcohol
  | "mediterranean";  // Rich in olive oil, fish, vegetables

/**
 * Confidence level for nutrition estimation
 * Based on ingredient coverage and data quality
 */
export type ConfidenceLevel = "low" | "medium" | "high";

/**
 * Complete nutrition result for a recipe
 * This is the output of estimateRecipeNutrition()
 */
export interface RecipeNutritionResult {
  /** Optional recipe ID (passed through from input) */
  recipeId?: string;
  
  /** Recipe name (passed through from input) */
  recipeName: string;
  
  /** Number of servings */
  servings: number;
  
  /** Total macros for entire recipe */
  total: Macros;
  
  /** Macros per single serving */
  perServing: Macros;
  
  /** Optional micronutrients per serving */
  micronutrients?: Micronutrients;
  
  /** Diet tags assigned based on rules */
  dietTags: DietTag[];
  
  /** Confidence level of the estimation */
  confidence: ConfidenceLevel;
  
  /** Optional debug information for testing/inspection */
  debug?: {
    /** Per-ingredient macro breakdown */
    ingredientBreakdown?: Record<string, Macros>;
    
    /** List of rules that were applied */
    rulesApplied?: string[];
    
    /** Ingredients that couldn't be matched */
    unmatchedIngredients?: string[];
    
    /** Ingredients that were matched */
    matchedIngredients?: string[];
  };
}

// ============================================================================
// Internal Types (for engine implementation)
// ============================================================================

/**
 * Canonical food entry in nutrition database
 * Represents a single food item with per-unit nutrition data
 */
export interface FoodEntry {
  /** Canonical name (lowercase, normalized) */
  canonicalName: string;
  
  /** Display name (human-readable) */
  displayName: string;
  
  /** Base unit for nutrition data (g, ml, piece, cup, etc.) */
  baseUnit: string;
  
  /** Grams per base unit (for conversion) */
  gramsPerUnit?: number;
  
  /** Nutrition data per base unit */
  nutrition: Macros & {
    sodium_mg?: number;
  };
  
  /** Optional micronutrients per base unit */
  micronutrients?: Micronutrients;
  
  /** Category flags for diet tagging */
  flags?: IngredientFlags;
}

/**
 * Ingredient category flags for diet tagging
 * Used to determine which diet tags apply
 */
export interface IngredientFlags {
  /** Is this an animal product? (meat, fish, eggs, dairy, honey) */
  animalProduct?: boolean;
  
  /** Is this meat? (beef, pork, chicken, lamb, etc.) */
  meat?: boolean;
  
  /** Is this fish/seafood? */
  fish?: boolean;
  
  /** Is this dairy? (milk, cheese, yogurt, butter, cream) */
  dairy?: boolean;
  
  /** Is this an egg? */
  egg?: boolean;
  
  /** Contains gluten? (wheat, barley, rye, spelt) */
  gluten?: boolean;
  
  /** Is this a tree nut or peanut? */
  nut?: boolean;
  
  /** Contains soy? */
  soy?: boolean;
  
  /** Is this a legume? (beans, lentils, peanuts) */
  legume?: boolean;
  
  /** Is this a grain? (rice, wheat, oats, quinoa) */
  grain?: boolean;
  
  /** Is this a processed/refined food? */
  processed?: boolean;
  
  /** Contains added sugar? */
  addedSugar?: boolean;
}

/**
 * Unit conversion factor
 * Maps a unit to grams or milliliters
 */
export interface UnitConversion {
  /** Conversion factor to base unit */
  factor: number;
  
  /** Base unit (g or ml) */
  baseUnit: "g" | "ml";
}

// ============================================================================
// Constants for Diet Tag Rules
// ============================================================================

/**
 * Macro thresholds for diet tags
 * These are the canonical values used by the engine
 */
export const DIET_TAG_THRESHOLDS = {
  /** Low carb: carbs per serving < 20g */
  LOW_CARB_MAX_G: 20,
  
  /** High protein: protein per serving ≥ 20g */
  HIGH_PROTEIN_MIN_G: 20,
  
  /** High fiber: fiber per serving ≥ 5g */
  HIGH_FIBER_MIN_G: 5,
  
  /** Keto: carbs per serving < 10g */
  KETO_MAX_CARBS_G: 10,
  
  /** Keto: fat per serving ≥ 15g */
  KETO_MIN_FAT_G: 15,
  
  /** Low fat: fat per serving < 5g */
  LOW_FAT_MAX_G: 5,
  
  /** Low sodium: sodium per serving < 200mg */
  LOW_SODIUM_MAX_MG: 200,
  
  /** Low sugar: sugar per serving < 5g */
  LOW_SUGAR_MAX_G: 5,
} as const;

/**
 * Confidence thresholds
 * Determines confidence level based on ingredient match rate
 */
export const CONFIDENCE_THRESHOLDS = {
  /** High confidence: ≥80% ingredients matched */
  HIGH_MATCH_RATE: 0.8,
  
  /** Medium confidence: ≥60% ingredients matched */
  MEDIUM_MATCH_RATE: 0.6,
} as const;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result of ingredient lookup
 */
export interface IngredientLookupResult {
  /** Original ingredient name */
  originalName: string;
  
  /** Canonical name (if matched) */
  canonicalName?: string;
  
  /** Whether ingredient was found in database */
  matched: boolean;
  
  /** Food entry data (if matched) */
  foodEntry?: FoodEntry;
  
  /** Reason for failure (if not matched) */
  reason?: string;
}

/**
 * Rounding configuration
 * Defines how to round nutrition values for consistency
 */
export const ROUNDING_CONFIG = {
  /** Calories: round to nearest integer */
  calories: 0,
  
  /** Macros (protein, carbs, fat, fiber, sugar): 1 decimal place */
  macros: 1,
  
  /** Micronutrients: round to nearest integer */
  micronutrients: 0,
} as const;
