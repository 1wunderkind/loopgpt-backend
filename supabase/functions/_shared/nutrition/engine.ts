/**
 * Deterministic Nutrition Engine
 * 
 * Core engine for recipe nutrition estimation with:
 * - Deterministic ingredient mapping
 * - Fixed unit conversions
 * - Rule-based macro calculation
 * - Confidence scoring
 * - Zero LLM calls (pure computation)
 * 
 * Guarantees: Same input → Same output (idempotent)
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import {
  FOOD_DATABASE,
  UNIT_CONVERSIONS,
  normalizeIngredientName,
} from "./dictionary.ts";

import type {
  RecipeNutritionInput,
  RecipeNutritionResult,
  Macros,
  Micronutrients,
  IngredientQuantity,
  IngredientLookupResult,
  FoodEntry,
  ConfidenceLevel,
} from "./types.ts";

import {
  CONFIDENCE_THRESHOLDS,
  ROUNDING_CONFIG,
} from "./types.ts";

import { getDietTags } from "./tags.ts";
import { normalizeIngredientName as normalizeForLookup } from "./dictionary.ts";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round a number to specified decimal places
 * Ensures consistent rounding across all calculations
 */
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round macros according to standard rounding rules
 */
function roundMacros(macros: Macros): Macros {
  return {
    calories: round(macros.calories, ROUNDING_CONFIG.calories),
    protein_g: round(macros.protein_g, ROUNDING_CONFIG.macros),
    carbs_g: round(macros.carbs_g, ROUNDING_CONFIG.macros),
    fat_g: round(macros.fat_g, ROUNDING_CONFIG.macros),
    fiber_g: macros.fiber_g !== undefined ? round(macros.fiber_g, ROUNDING_CONFIG.macros) : undefined,
    sugar_g: macros.sugar_g !== undefined ? round(macros.sugar_g, ROUNDING_CONFIG.macros) : undefined,
    sodium_mg: macros.sodium_mg !== undefined ? round(macros.sodium_mg, ROUNDING_CONFIG.micronutrients) : undefined,
  };
}

/**
 * Round micronutrients according to standard rounding rules
 */
function roundMicronutrients(micros: Micronutrients): Micronutrients {
  const rounded: Micronutrients = {};
  
  for (const [key, value] of Object.entries(micros)) {
    if (value !== undefined) {
      rounded[key as keyof Micronutrients] = round(value, ROUNDING_CONFIG.micronutrients);
    }
  }
  
  return rounded;
}

// ============================================================================
// Ingredient Lookup
// ============================================================================

/**
 * Look up an ingredient in the food database
 * 
 * Steps:
 * 1. Normalize ingredient name (lowercase, trim, remove punctuation)
 * 2. Check synonyms map
 * 3. Check canonical names
 * 4. Try partial matching (last resort)
 * 
 * @param ingredient - Ingredient with name, quantity, unit
 * @returns Lookup result with matched food entry or null
 */
export function lookupIngredient(ingredient: IngredientQuantity): IngredientLookupResult {
  const canonicalName = normalizeIngredientName(ingredient.name);
  const foodEntry = FOOD_DATABASE[canonicalName];
  
  if (foodEntry) {
    return {
      originalName: ingredient.name,
      canonicalName,
      matched: true,
      foodEntry,
    };
  }
  
  // Not found
  return {
    originalName: ingredient.name,
    canonicalName: undefined,
    matched: false,
    reason: `Ingredient "${ingredient.name}" not found in database`,
  };
}

// ============================================================================
// Unit Conversion
// ============================================================================

/**
 * Convert ingredient quantity to grams or milliliters
 * 
 * Rules:
 * 1. If ingredient has gramsPerUnit, use it (for pieces, slices, etc.)
 * 2. If unit matches ingredient's baseUnit, use quantity directly
 * 3. Otherwise, use standard unit conversion factors
 * 4. If unit not found, assume grams (default)
 * 
 * @param quantity - Numeric quantity
 * @param unit - Unit string (g, cup, tbsp, piece, etc.)
 * @param foodEntry - Food entry from database (may have gramsPerUnit)
 * @returns Quantity in grams or milliliters
 */
export function convertToBaseUnit(
  quantity: number,
  unit: string,
  foodEntry: FoodEntry
): number {
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Case 1: Ingredient has gramsPerUnit (for pieces, slices, etc.)
  if (foodEntry.gramsPerUnit && 
      (normalizedUnit === "piece" || normalizedUnit === "pieces" || 
       normalizedUnit === "slice" || normalizedUnit === "slices" ||
       normalizedUnit === "whole" || normalizedUnit === "item" || normalizedUnit === "items")) {
    return quantity * foodEntry.gramsPerUnit;
  }
  
  // Case 2: Unit matches ingredient's baseUnit
  if (normalizedUnit === foodEntry.baseUnit) {
    return quantity;
  }
  
  // Case 3: Standard unit conversion
  const conversion = UNIT_CONVERSIONS[normalizedUnit];
  if (conversion) {
    // Check if conversion is compatible with food entry's base unit
    // For now, assume all conversions are compatible
    return quantity * conversion.factor;
  }
  
  // Case 4: Unknown unit - assume quantity is already in base unit
  console.warn(`[NutritionEngine] Unknown unit "${unit}" for "${foodEntry.canonicalName}", assuming base unit`);
  return quantity;
}

// ============================================================================
// Macro Calculation
// ============================================================================

/**
 * Calculate macros for a single ingredient
 * 
 * Steps:
 * 1. Convert quantity to base unit (grams or ml)
 * 2. Scale nutrition data by quantity
 * 3. Return macros + micronutrients
 * 
 * @param ingredient - Ingredient with quantity and unit
 * @param foodEntry - Food entry from database
 * @returns Macros for this ingredient
 */
export function calculateIngredientMacros(
  ingredient: IngredientQuantity,
  foodEntry: FoodEntry
): { macros: Macros; micronutrients?: Micronutrients } {
  // Convert to base unit
  const baseQuantity = convertToBaseUnit(ingredient.quantity, ingredient.unit, foodEntry);
  
  // Scale nutrition data
  const macros: Macros = {
    calories: foodEntry.nutrition.calories * baseQuantity,
    protein_g: foodEntry.nutrition.protein_g * baseQuantity,
    carbs_g: foodEntry.nutrition.carbs_g * baseQuantity,
    fat_g: foodEntry.nutrition.fat_g * baseQuantity,
    fiber_g: foodEntry.nutrition.fiber_g ? foodEntry.nutrition.fiber_g * baseQuantity : undefined,
    sugar_g: foodEntry.nutrition.sugar_g ? foodEntry.nutrition.sugar_g * baseQuantity : undefined,
    sodium_mg: foodEntry.nutrition.sodium_mg ? foodEntry.nutrition.sodium_mg * baseQuantity : undefined,
  };
  
  // Scale micronutrients if present
  let micronutrients: Micronutrients | undefined;
  if (foodEntry.micronutrients) {
    micronutrients = {};
    for (const [key, value] of Object.entries(foodEntry.micronutrients)) {
      if (value !== undefined) {
        micronutrients[key as keyof Micronutrients] = value * baseQuantity;
      }
    }
  }
  
  return { macros, micronutrients };
}

/**
 * Aggregate macros across multiple ingredients
 * 
 * @param ingredientMacros - Array of macros from individual ingredients
 * @returns Total macros
 */
export function aggregateMacros(ingredientMacros: Macros[]): Macros {
  const totals: Macros = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  };
  
  for (const macros of ingredientMacros) {
    totals.calories += macros.calories;
    totals.protein_g += macros.protein_g;
    totals.carbs_g += macros.carbs_g;
    totals.fat_g += macros.fat_g;
    
    if (macros.fiber_g !== undefined) {
      totals.fiber_g = (totals.fiber_g || 0) + macros.fiber_g;
    }
    if (macros.sugar_g !== undefined) {
      totals.sugar_g = (totals.sugar_g || 0) + macros.sugar_g;
    }
    if (macros.sodium_mg !== undefined) {
      totals.sodium_mg = (totals.sodium_mg || 0) + macros.sodium_mg;
    }
  }
  
  return totals;
}

/**
 * Aggregate micronutrients across multiple ingredients
 * 
 * @param ingredientMicros - Array of micronutrients from individual ingredients
 * @returns Total micronutrients
 */
export function aggregateMicronutrients(ingredientMicros: (Micronutrients | undefined)[]): Micronutrients {
  const totals: Micronutrients = {};
  
  for (const micros of ingredientMicros) {
    if (!micros) continue;
    
    for (const [key, value] of Object.entries(micros)) {
      if (value !== undefined) {
        const k = key as keyof Micronutrients;
        totals[k] = (totals[k] || 0) + value;
      }
    }
  }
  
  return totals;
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Calculate confidence level based on ingredient match rate
 * 
 * Rules:
 * - High: ≥80% ingredients matched
 * - Medium: ≥60% ingredients matched
 * - Low: <60% ingredients matched
 * 
 * @param matchedCount - Number of ingredients found in database
 * @param totalCount - Total number of ingredients
 * @returns Confidence level
 */
export function calculateConfidence(matchedCount: number, totalCount: number): ConfidenceLevel {
  if (totalCount === 0) return "low";
  
  const matchRate = matchedCount / totalCount;
  
  if (matchRate >= CONFIDENCE_THRESHOLDS.HIGH_MATCH_RATE) {
    return "high";
  } else if (matchRate >= CONFIDENCE_THRESHOLDS.MEDIUM_MATCH_RATE) {
    return "medium";
  } else {
    return "low";
  }
}

// ============================================================================
// Main Estimation Function
// ============================================================================

/**
 * Estimate nutrition for a recipe
 * 
 * This is the main entry point for nutrition estimation.
 * Guaranteed to be deterministic: same input → same output.
 * 
 * Steps:
 * 1. Look up each ingredient in database
 * 2. Calculate macros for matched ingredients
 * 3. Aggregate total macros
 * 4. Calculate per-serving macros
 * 5. Calculate confidence based on match rate
 * 6. Return complete nutrition result
 * 
 * @param input - Recipe nutrition input
 * @returns Complete nutrition result with macros, confidence, debug info
 */
export function estimateRecipeNutrition(input: RecipeNutritionInput): RecipeNutritionResult {
  const debug = {
    ingredientBreakdown: {} as Record<string, Macros>,
    rulesApplied: [] as string[],
    unmatchedIngredients: [] as string[],
    matchedIngredients: [] as string[],
  };
  
  // Track matched ingredients
  let matchedCount = 0;
  const allMacros: Macros[] = [];
  const allMicronutrients: (Micronutrients | undefined)[] = [];
  
  // Process each ingredient
  for (const ingredient of input.ingredients) {
    const lookup = lookupIngredient(ingredient);
    
    if (lookup.matched && lookup.foodEntry) {
      // Ingredient found - calculate macros
      matchedCount++;
      debug.matchedIngredients.push(ingredient.name);
      
      const { macros, micronutrients } = calculateIngredientMacros(ingredient, lookup.foodEntry);
      allMacros.push(macros);
      allMicronutrients.push(micronutrients);
      
      // Store breakdown for debugging
      debug.ingredientBreakdown[ingredient.name] = roundMacros(macros);
      
      debug.rulesApplied.push(
        `Matched "${ingredient.name}" → "${lookup.canonicalName}" (${ingredient.quantity} ${ingredient.unit})`
      );
    } else {
      // Ingredient not found - use zeros
      debug.unmatchedIngredients.push(ingredient.name);
      debug.rulesApplied.push(
        `Unknown ingredient "${ingredient.name}" - using zero macros`
      );
      
      allMacros.push({
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
      });
    }
  }
  
  // Aggregate totals
  const totalMacros = aggregateMacros(allMacros);
  const totalMicronutrients = aggregateMicronutrients(allMicronutrients);
  
  // Calculate per-serving macros
  const perServingMacros: Macros = {
    calories: totalMacros.calories / input.servings,
    protein_g: totalMacros.protein_g / input.servings,
    carbs_g: totalMacros.carbs_g / input.servings,
    fat_g: totalMacros.fat_g / input.servings,
    fiber_g: totalMacros.fiber_g ? totalMacros.fiber_g / input.servings : undefined,
    sugar_g: totalMacros.sugar_g ? totalMacros.sugar_g / input.servings : undefined,
    sodium_mg: totalMacros.sodium_mg ? totalMacros.sodium_mg / input.servings : undefined,
  };
  
  // Calculate per-serving micronutrients
  const perServingMicronutrients: Micronutrients = {};
  for (const [key, value] of Object.entries(totalMicronutrients)) {
    if (value !== undefined) {
      perServingMicronutrients[key as keyof Micronutrients] = value / input.servings;
    }
  }
  
  // Calculate confidence
  const confidence = calculateConfidence(matchedCount, input.ingredients.length);
  debug.rulesApplied.push(
    `Confidence: ${confidence} (${matchedCount}/${input.ingredients.length} ingredients matched)`
  );
  
  // Round all values
  const roundedTotal = roundMacros(totalMacros);
  const roundedPerServing = roundMacros(perServingMacros);
  const roundedMicronutrients = Object.keys(perServingMicronutrients).length > 0
    ? roundMicronutrients(perServingMicronutrients)
    : undefined;
  
  // Calculate diet tags
  const canonicalNames = input.ingredients
    .map(ing => normalizeForLookup(ing.name))
    .filter(name => FOOD_DATABASE[name] !== undefined);
  
  const dietTags = getDietTags(canonicalNames, roundedPerServing);
  
  return {
    recipeId: input.recipeId,
    recipeName: input.recipeName,
    servings: input.servings,
    total: roundedTotal,
    perServing: roundedPerServing,
    micronutrients: roundedMicronutrients,
    dietTags,
    confidence,
    debug,
  };
}

// ============================================================================
// Batch Estimation (for meal plans)
// ============================================================================

/**
 * Estimate nutrition for multiple recipes
 * Useful for meal plans with multiple recipes
 * 
 * @param inputs - Array of recipe nutrition inputs
 * @returns Array of nutrition results
 */
export function estimateMultipleRecipes(inputs: RecipeNutritionInput[]): RecipeNutritionResult[] {
  return inputs.map(input => estimateRecipeNutrition(input));
}

/**
 * Aggregate nutrition across multiple recipes
 * Useful for daily/weekly meal plan totals
 * 
 * @param results - Array of nutrition results
 * @returns Aggregated macros and micronutrients
 */
export function aggregateRecipeNutrition(results: RecipeNutritionResult[]): {
  totalMacros: Macros;
  totalMicronutrients: Micronutrients;
} {
  const allMacros = results.map(r => r.total);
  const allMicros = results.map(r => r.micronutrients).filter(m => m !== undefined) as Micronutrients[];
  
  return {
    totalMacros: roundMacros(aggregateMacros(allMacros)),
    totalMicronutrients: roundMicronutrients(aggregateMicronutrients(allMicros)),
  };
}
