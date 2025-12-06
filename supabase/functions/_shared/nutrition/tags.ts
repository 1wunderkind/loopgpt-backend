/**
 * Deterministic Diet Tagging Rules
 * 
 * Assigns diet tags based on:
 * 1. Ingredient categories (vegan, vegetarian, gluten-free, etc.)
 * 2. Macro thresholds (low-carb, high-protein, high-fiber, etc.)
 * 
 * All rules are explicit, documented, and deterministic.
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import { FOOD_DATABASE } from "./dictionary.ts";
import type {
  DietTag,
  Macros,
  IngredientQuantity,
  IngredientFlags,
} from "./types.ts";
import { DIET_TAG_THRESHOLDS } from "./types.ts";

// ============================================================================
// Ingredient Category Checking
// ============================================================================

/**
 * Get ingredient flags for a canonical ingredient name
 * 
 * @param canonicalName - Canonical ingredient name
 * @returns Ingredient flags or undefined if not found
 */
function getIngredientFlags(canonicalName: string): IngredientFlags | undefined {
  const foodEntry = FOOD_DATABASE[canonicalName];
  return foodEntry?.flags;
}

/**
 * Check if any ingredient has a specific flag
 * 
 * @param canonicalNames - Array of canonical ingredient names
 * @param flagName - Flag to check (e.g., "meat", "dairy", "gluten")
 * @returns True if any ingredient has this flag
 */
function hasIngredientFlag(canonicalNames: string[], flagName: keyof IngredientFlags): boolean {
  for (const name of canonicalNames) {
    const flags = getIngredientFlags(name);
    if (flags && flags[flagName]) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Ingredient-Based Diet Tags
// ============================================================================

/**
 * Determine ingredient-based diet tags
 * 
 * Rules:
 * - vegan: No animal products (meat, fish, eggs, dairy, honey)
 * - vegetarian: No meat/fish, but eggs/dairy allowed
 * - pescatarian: No meat, but fish allowed
 * - gluten_free: No gluten-containing grains
 * - dairy_free: No dairy products
 * - nut_free: No tree nuts or peanuts
 * - soy_free: No soy products
 * - egg_free: No eggs
 * - paleo_friendly: No grains, dairy, legumes
 * 
 * @param canonicalNames - Array of canonical ingredient names
 * @returns Array of ingredient-based diet tags
 */
export function getIngredientBasedTags(canonicalNames: string[]): DietTag[] {
  const tags: DietTag[] = [];
  
  // Check for animal products
  const hasAnimalProduct = hasIngredientFlag(canonicalNames, "animalProduct");
  const hasMeat = hasIngredientFlag(canonicalNames, "meat");
  const hasFish = hasIngredientFlag(canonicalNames, "fish");
  const hasDairy = hasIngredientFlag(canonicalNames, "dairy");
  const hasEgg = hasIngredientFlag(canonicalNames, "egg");
  const hasGluten = hasIngredientFlag(canonicalNames, "gluten");
  const hasNut = hasIngredientFlag(canonicalNames, "nut");
  const hasSoy = hasIngredientFlag(canonicalNames, "soy");
  const hasLegume = hasIngredientFlag(canonicalNames, "legume");
  const hasGrain = hasIngredientFlag(canonicalNames, "grain");
  
  // Vegan: No animal products at all
  if (!hasAnimalProduct) {
    tags.push("vegan");
    tags.push("vegetarian"); // Vegan implies vegetarian
  } else {
    // Vegetarian: No meat/fish, but eggs/dairy allowed
    if (!hasMeat && !hasFish) {
      tags.push("vegetarian");
    }
    
    // Pescatarian: No meat, but fish allowed
    if (!hasMeat && hasFish) {
      tags.push("pescatarian");
    }
  }
  
  // Gluten-free
  if (!hasGluten) {
    tags.push("gluten_free");
  }
  
  // Dairy-free
  if (!hasDairy) {
    tags.push("dairy_free");
  }
  
  // Egg-free
  if (!hasEgg) {
    tags.push("egg_free");
  }
  
  // Nut-free
  if (!hasNut) {
    tags.push("nut_free");
  }
  
  // Soy-free
  if (!hasSoy) {
    tags.push("soy_free");
  }
  
  // Paleo-friendly: No grains, dairy, legumes
  if (!hasGrain && !hasDairy && !hasLegume) {
    tags.push("paleo_friendly");
  }
  
  return tags;
}

// ============================================================================
// Macro-Based Diet Tags
// ============================================================================

/**
 * Determine macro-based diet tags
 * 
 * Rules (per serving):
 * - low_carb: carbs < 20g
 * - high_protein: protein ≥ 20g
 * - high_fiber: fiber ≥ 5g
 * - keto_friendly: carbs < 10g AND fat ≥ 15g
 * - low_fat: fat < 5g
 * - low_sodium: sodium < 200mg
 * - low_sugar: sugar < 5g
 * 
 * @param perServing - Macros per serving
 * @returns Array of macro-based diet tags
 */
export function getMacroBasedTags(perServing: Macros): DietTag[] {
  const tags: DietTag[] = [];
  
  // Low carb: < 20g carbs per serving
  if (perServing.carbs_g < DIET_TAG_THRESHOLDS.LOW_CARB_MAX_G) {
    tags.push("low_carb");
  }
  
  // High protein: ≥ 20g protein per serving
  if (perServing.protein_g >= DIET_TAG_THRESHOLDS.HIGH_PROTEIN_MIN_G) {
    tags.push("high_protein");
  }
  
  // High fiber: ≥ 5g fiber per serving
  if (perServing.fiber_g !== undefined && perServing.fiber_g >= DIET_TAG_THRESHOLDS.HIGH_FIBER_MIN_G) {
    tags.push("high_fiber");
  }
  
  // Keto-friendly: < 10g carbs AND ≥ 15g fat per serving
  if (
    perServing.carbs_g < DIET_TAG_THRESHOLDS.KETO_MAX_CARBS_G &&
    perServing.fat_g >= DIET_TAG_THRESHOLDS.KETO_MIN_FAT_G
  ) {
    tags.push("keto_friendly");
  }
  
  // Low fat: < 5g fat per serving
  if (perServing.fat_g < DIET_TAG_THRESHOLDS.LOW_FAT_MAX_G) {
    tags.push("low_fat");
  }
  
  // Low sodium: < 200mg sodium per serving
  if (perServing.sodium_mg !== undefined && perServing.sodium_mg < DIET_TAG_THRESHOLDS.LOW_SODIUM_MAX_MG) {
    tags.push("low_sodium");
  }
  
  // Low sugar: < 5g sugar per serving
  if (perServing.sugar_g !== undefined && perServing.sugar_g < DIET_TAG_THRESHOLDS.LOW_SUGAR_MAX_G) {
    tags.push("low_sugar");
  }
  
  return tags;
}

// ============================================================================
// Combined Diet Tagging
// ============================================================================

/**
 * Determine all diet tags for a recipe
 * 
 * Combines ingredient-based and macro-based tags.
 * 
 * @param canonicalNames - Array of canonical ingredient names
 * @param perServing - Macros per serving
 * @returns Complete array of diet tags
 */
export function getDietTags(canonicalNames: string[], perServing: Macros): DietTag[] {
  const ingredientTags = getIngredientBasedTags(canonicalNames);
  const macroTags = getMacroBasedTags(perServing);
  
  // Combine and deduplicate
  const allTags = [...ingredientTags, ...macroTags];
  return Array.from(new Set(allTags));
}

// ============================================================================
// Diet Compliance Checking
// ============================================================================

/**
 * Check if a recipe complies with specific dietary restrictions
 * 
 * This is useful for filtering recipes based on user preferences.
 * 
 * @param dietTags - Diet tags assigned to the recipe
 * @param requiredTags - Tags that must be present
 * @returns True if all required tags are present
 */
export function checkDietCompliance(dietTags: DietTag[], requiredTags: DietTag[]): boolean {
  return requiredTags.every(tag => dietTags.includes(tag));
}

/**
 * Check if a recipe violates specific dietary restrictions
 * 
 * This is useful for excluding recipes that don't meet user requirements.
 * 
 * @param dietTags - Diet tags assigned to the recipe
 * @param forbiddenTags - Tags that must NOT be present (inverse logic)
 * @returns True if none of the forbidden tags are present
 */
export function checkDietViolations(dietTags: DietTag[], forbiddenTags: DietTag[]): boolean {
  return !forbiddenTags.some(tag => dietTags.includes(tag));
}

// ============================================================================
// Human-Readable Tag Descriptions
// ============================================================================

/**
 * Get human-readable description for a diet tag
 * Useful for displaying to users
 */
export const DIET_TAG_DESCRIPTIONS: Record<DietTag, string> = {
  // Ingredient-based
  "vegan": "Contains no animal products (no meat, fish, eggs, dairy, or honey)",
  "vegetarian": "Contains no meat or fish, but may include eggs and dairy",
  "pescatarian": "Contains no meat, but may include fish and seafood",
  "gluten_free": "Contains no gluten-containing grains (wheat, barley, rye)",
  "dairy_free": "Contains no dairy products (milk, cheese, butter, yogurt)",
  "nut_free": "Contains no tree nuts or peanuts",
  "soy_free": "Contains no soy products",
  "egg_free": "Contains no eggs",
  
  // Macro-based
  "low_carb": `Low in carbohydrates (less than ${DIET_TAG_THRESHOLDS.LOW_CARB_MAX_G}g per serving)`,
  "high_protein": `High in protein (at least ${DIET_TAG_THRESHOLDS.HIGH_PROTEIN_MIN_G}g per serving)`,
  "high_fiber": `High in fiber (at least ${DIET_TAG_THRESHOLDS.HIGH_FIBER_MIN_G}g per serving)`,
  "keto_friendly": `Keto-friendly (very low carb, high fat)`,
  "low_fat": `Low in fat (less than ${DIET_TAG_THRESHOLDS.LOW_FAT_MAX_G}g per serving)`,
  "low_sodium": `Low in sodium (less than ${DIET_TAG_THRESHOLDS.LOW_SODIUM_MAX_MG}mg per serving)`,
  "low_sugar": `Low in sugar (less than ${DIET_TAG_THRESHOLDS.LOW_SUGAR_MAX_G}g per serving)`,
  
  // Lifestyle
  "paleo_friendly": "Paleo-friendly (no grains, dairy, or legumes)",
  "whole30": "Whole30 compliant (no grains, dairy, legumes, sugar, or alcohol)",
  "mediterranean": "Mediterranean-style (rich in olive oil, fish, and vegetables)",
};

/**
 * Get description for a diet tag
 */
export function getDietTagDescription(tag: DietTag): string {
  return DIET_TAG_DESCRIPTIONS[tag] || tag;
}

/**
 * Get all descriptions for an array of tags
 */
export function getDietTagDescriptions(tags: DietTag[]): Record<string, string> {
  const descriptions: Record<string, string> = {};
  for (const tag of tags) {
    descriptions[tag] = getDietTagDescription(tag);
  }
  return descriptions;
}
