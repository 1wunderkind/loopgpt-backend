/**
 * Nutrition Dictionary
 *
 * Canonical food database with USDA-based nutrition data and synonym mappings.
 * This is the single source of truth for ingredient → nutrition lookups.
 *
 * All mappings are deterministic and documented.
 *
 * Part of: Step 4 - Deterministic Nutrition Engine
 *
 * UPDATED: Now uses 1,000-food USDA database from dictionary.generated.ts
 */

import type { FoodEntry, UnitConversion } from "./types.ts";

// ============================================================================
// Import Generated Food Database (1,000 foods)
// ============================================================================

import {
  FOOD_DATABASE as FOOD_DATABASE_GENERATED,
  normalizeIngredientName as normalizeIngredientNameGenerated,
  SYNONYM_MAP as SYNONYM_MAP_GENERATED,
} from "./dictionary.generated.ts";

// Re-export for use by other modules
export { FOOD_DATABASE_GENERATED as FOOD_DATABASE };
export { SYNONYM_MAP_GENERATED as SYNONYM_MAP };

// ============================================================================
// Unit Conversions
// ============================================================================

/**
 * Fixed unit conversion factors
 * All conversions are deterministic and well-documented
 */
export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight units → grams
  "g": { factor: 1, baseUnit: "g" },
  "gram": { factor: 1, baseUnit: "g" },
  "grams": { factor: 1, baseUnit: "g" },
  "kg": { factor: 1000, baseUnit: "g" },
  "kilogram": { factor: 1000, baseUnit: "g" },
  "kilograms": { factor: 1000, baseUnit: "g" },
  "oz": { factor: 28.35, baseUnit: "g" },
  "ounce": { factor: 28.35, baseUnit: "g" },
  "ounces": { factor: 28.35, baseUnit: "g" },
  "lb": { factor: 453.59, baseUnit: "g" },
  "pound": { factor: 453.59, baseUnit: "g" },
  "pounds": { factor: 453.59, baseUnit: "g" },

  // Volume units → milliliters
  "ml": { factor: 1, baseUnit: "ml" },
  "milliliter": { factor: 1, baseUnit: "ml" },
  "milliliters": { factor: 1, baseUnit: "ml" },
  "l": { factor: 1000, baseUnit: "ml" },
  "liter": { factor: 1000, baseUnit: "ml" },
  "liters": { factor: 1000, baseUnit: "ml" },
  "cup": { factor: 240, baseUnit: "ml" },
  "cups": { factor: 240, baseUnit: "ml" },
  "tbsp": { factor: 15, baseUnit: "ml" },
  "tablespoon": { factor: 15, baseUnit: "ml" },
  "tablespoons": { factor: 15, baseUnit: "ml" },
  "tsp": { factor: 5, baseUnit: "ml" },
  "teaspoon": { factor: 5, baseUnit: "ml" },
  "teaspoons": { factor: 5, baseUnit: "ml" },
  "fl oz": { factor: 29.57, baseUnit: "ml" },
  "fluid ounce": { factor: 29.57, baseUnit: "ml" },
  "fluid ounces": { factor: 29.57, baseUnit: "ml" },

  // Count units (handled by ingredient gramsPerUnit)
  "piece": { factor: 1, baseUnit: "g" },
  "pieces": { factor: 1, baseUnit: "g" },
  "slice": { factor: 1, baseUnit: "g" },
  "slices": { factor: 1, baseUnit: "g" },
  "whole": { factor: 1, baseUnit: "g" },
  "item": { factor: 1, baseUnit: "g" },
  "items": { factor: 1, baseUnit: "g" },

  // Special units (fixed assumptions)
  "pinch": { factor: 0.3, baseUnit: "g" }, // ~0.3g salt
  "dash": { factor: 0.6, baseUnit: "g" }, // ~0.6g
  "handful": { factor: 30, baseUnit: "g" }, // ~30g
};

// ============================================================================
// Additional Manual Synonyms
// ============================================================================

/**
 * Additional ingredient synonyms not covered by auto-generated SYNONYM_MAP
 * These are manually curated for common ingredient variations
 */
export const INGREDIENT_SYNONYMS: Record<string, string> = {
  // Common variations
  "sea salt": "salt",
  "table salt": "salt",
  "kosher salt": "salt",
  "iodized salt": "salt",

  // Rice variations
  "rice": "white rice",
  "cooked rice": "white rice",
  "steamed rice": "white rice",

  // Cheese variations
  "cheese": "cheddar cheese",
  "shredded cheese": "cheddar cheese",

  // International names
  "盐": "salt", // Chinese
  "sal": "salt", // Spanish
  "sel": "salt", // French
  "salz": "salt", // German

  // Cooking oils
  "cooking oil": "vegetable oil",
  "canola": "canola oil",
  "sunflower": "sunflower oil",

  // Common misspellings and variations
  "chick pea": "chickpeas",
  "garbanzo beans": "chickpeas",
  "garbanzo": "chickpeas",
};

/**
 * Normalize ingredient name with both auto-generated and manual synonyms
 *
 * Priority:
 * 1. Check auto-generated SYNONYM_MAP (1,129 synonyms)
 * 2. Check manual INGREDIENT_SYNONYMS
 * 3. Return normalized name
 */
export function normalizeIngredientName(name: string): string {
  const normalized = name.toLowerCase().trim();

  // Check auto-generated synonyms first
  if (SYNONYM_MAP_GENERATED[normalized]) {
    return SYNONYM_MAP_GENERATED[normalized];
  }

  // Check manual synonyms
  if (INGREDIENT_SYNONYMS[normalized]) {
    return INGREDIENT_SYNONYMS[normalized];
  }

  // Return normalized name
  return normalized;
}
