/**
 * Ingredient Matcher
 * 
 * Detects missing ingredients by comparing required ingredients
 * against user's pantry using smart normalization.
 */

import { normalizeIngredient } from "./cacheKey.ts";
import type { PantryItem } from "./commerceSchemas.ts";

/**
 * Ingredient with availability status
 */
export interface IngredientAvailability {
  name: string;
  quantity: string;
  category?: string;
  missing: boolean; // Is this ingredient missing from pantry?
  pantryMatch?: PantryItem; // Matching pantry item (if found)
}

/**
 * Result of missing ingredient detection
 */
export interface MissingIngredientResult {
  missingIngredients: IngredientAvailability[];
  availableIngredients: IngredientAvailability[];
  totalRequired: number;
  totalMissing: number;
  totalAvailable: number;
}

/**
 * Check if two ingredients match (using normalization from cacheKey.ts)
 */
function ingredientsMatch(required: string, pantryItem: string): boolean {
  const normalizedRequired = normalizeIngredient(required);
  const normalizedPantry = normalizeIngredient(pantryItem);
  
  // Exact match after normalization
  if (normalizedRequired === normalizedPantry) {
    return true;
  }
  
  // Partial match (one contains the other)
  if (normalizedRequired.includes(normalizedPantry) || normalizedPantry.includes(normalizedRequired)) {
    return true;
  }
  
  return false;
}

/**
 * Find matching pantry item for a required ingredient
 */
function findPantryMatch(requiredIngredient: string, pantry: PantryItem[]): PantryItem | undefined {
  for (const pantryItem of pantry) {
    if (ingredientsMatch(requiredIngredient, pantryItem.name)) {
      return pantryItem;
    }
  }
  return undefined;
}

/**
 * Detect missing ingredients by comparing required ingredients against pantry
 * 
 * @param requiredIngredients - List of ingredients needed for recipes/meal plan
 * @param pantry - User's pantry (items they already have)
 * @returns Result with missing and available ingredients
 */
export function detectMissingIngredients(
  requiredIngredients: Array<{ name: string; quantity: string; category?: string }>,
  pantry: PantryItem[]
): MissingIngredientResult {
  const missingIngredients: IngredientAvailability[] = [];
  const availableIngredients: IngredientAvailability[] = [];
  
  for (const ingredient of requiredIngredients) {
    const pantryMatch = findPantryMatch(ingredient.name, pantry);
    
    if (pantryMatch) {
      // Ingredient found in pantry
      availableIngredients.push({
        name: ingredient.name,
        quantity: ingredient.quantity,
        category: ingredient.category,
        missing: false,
        pantryMatch,
      });
    } else {
      // Ingredient missing from pantry
      missingIngredients.push({
        name: ingredient.name,
        quantity: ingredient.quantity,
        category: ingredient.category,
        missing: true,
      });
    }
  }
  
  return {
    missingIngredients,
    availableIngredients,
    totalRequired: requiredIngredients.length,
    totalMissing: missingIngredients.length,
    totalAvailable: availableIngredients.length,
  };
}

/**
 * Annotate grocery list items with missing status
 * 
 * @param groceryItems - Grocery list items
 * @param pantry - User's pantry
 * @returns Grocery items with missing flag added
 */
export function annotateGroceryListWithMissing(
  groceryItems: Array<{ name: string; quantity: string; category?: string }>,
  pantry: PantryItem[]
): Array<{ name: string; quantity: string; category?: string; missing: boolean; source: string }> {
  const result = detectMissingIngredients(groceryItems, pantry);
  
  return groceryItems.map((item) => {
    const isMissing = result.missingIngredients.some((missing) => missing.name === item.name);
    
    return {
      ...item,
      missing: isMissing,
      source: "recipe", // Default source (can be overridden)
    };
  });
}

/**
 * Get summary of missing ingredients
 */
export function getMissingSummary(result: MissingIngredientResult): string {
  if (result.totalMissing === 0) {
    return "You have all ingredients in your pantry!";
  }
  
  if (result.totalAvailable === 0) {
    return `You need to buy all ${result.totalRequired} ingredients.`;
  }
  
  return `You need to buy ${result.totalMissing} out of ${result.totalRequired} ingredients. You already have ${result.totalAvailable} in your pantry.`;
}

/**
 * Get list of missing ingredient names (for display)
 */
export function getMissingNames(result: MissingIngredientResult): string[] {
  return result.missingIngredients.map((item) => item.name);
}

/**
 * Get list of available ingredient names (for display)
 */
export function getAvailableNames(result: MissingIngredientResult): string[] {
  return result.availableIngredients.map((item) => item.name);
}
