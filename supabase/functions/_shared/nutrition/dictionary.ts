/**
 * Nutrition Dictionary
 * 
 * Canonical food database with USDA-based nutrition data and synonym mappings.
 * This is the single source of truth for ingredient → nutrition lookups.
 * 
 * All mappings are deterministic and documented.
 * 
 * Part of: Step 4 - Deterministic Nutrition Engine
 */

import type { FoodEntry, UnitConversion } from "./types.ts";

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
  "pinch": { factor: 0.3, baseUnit: "g" },  // ~0.3g salt
  "dash": { factor: 0.6, baseUnit: "g" },   // ~0.6g
  "handful": { factor: 30, baseUnit: "g" }, // ~30g
};

// ============================================================================
// Canonical Food Database
// ============================================================================

/**
 * Canonical food entries with USDA-based nutrition data
 * 
 * Format:
 * - canonicalName: lowercase, no punctuation, singular form
 * - baseUnit: the unit for which nutrition data is provided
 * - gramsPerUnit: if baseUnit is "piece", "slice", etc., this is the weight
 * - nutrition: per baseUnit values
 * - flags: for diet tagging
 */
export const FOOD_DATABASE: Record<string, FoodEntry> = {
  // ============================================================================
  // Proteins - Meat
  // ============================================================================
  
  "chicken breast": {
    canonicalName: "chicken breast",
    displayName: "Chicken Breast",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 1.65,
      protein_g: 0.31,
      carbs_g: 0,
      fat_g: 0.036,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0.74,
    },
    flags: {
      animalProduct: true,
      meat: true,
    },
  },
  
  "beef": {
    canonicalName: "beef",
    displayName: "Beef",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 2.5,
      protein_g: 0.26,
      carbs_g: 0,
      fat_g: 0.15,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0.55,
    },
    flags: {
      animalProduct: true,
      meat: true,
    },
  },
  
  "pork": {
    canonicalName: "pork",
    displayName: "Pork",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 2.4,
      protein_g: 0.27,
      carbs_g: 0,
      fat_g: 0.14,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0.6,
    },
    flags: {
      animalProduct: true,
      meat: true,
    },
  },
  
  "bacon": {
    canonicalName: "bacon",
    displayName: "Bacon",
    baseUnit: "slice",
    gramsPerUnit: 13, // ~13g per slice
    nutrition: {
      calories: 43,
      protein_g: 3,
      carbs_g: 0.1,
      fat_g: 3.3,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 137,
    },
    flags: {
      animalProduct: true,
      meat: true,
      processed: true,
    },
  },
  
  // ============================================================================
  // Proteins - Fish
  // ============================================================================
  
  "salmon": {
    canonicalName: "salmon",
    displayName: "Salmon",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 2.08,
      protein_g: 0.20,
      carbs_g: 0,
      fat_g: 0.13,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0.4,
    },
    micronutrients: {
      vitamin_d_mcg: 0.11,
    },
    flags: {
      animalProduct: true,
      fish: true,
    },
  },
  
  "tuna": {
    canonicalName: "tuna",
    displayName: "Tuna",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 1.32,
      protein_g: 0.29,
      carbs_g: 0,
      fat_g: 0.005,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0.37,
    },
    flags: {
      animalProduct: true,
      fish: true,
    },
  },
  
  // ============================================================================
  // Proteins - Dairy & Eggs
  // ============================================================================
  
  "egg": {
    canonicalName: "egg",
    displayName: "Egg",
    baseUnit: "piece",
    gramsPerUnit: 50, // ~50g per large egg
    nutrition: {
      calories: 72,
      protein_g: 6.3,
      carbs_g: 0.4,
      fat_g: 4.8,
      fiber_g: 0,
      sugar_g: 0.2,
      sodium_mg: 71,
    },
    flags: {
      animalProduct: true,
      egg: true,
    },
  },
  
  "milk": {
    canonicalName: "milk",
    displayName: "Milk",
    baseUnit: "cup",
    gramsPerUnit: 244, // ~244g per cup
    nutrition: {
      calories: 122,
      protein_g: 8,
      carbs_g: 12,
      fat_g: 4.8,
      fiber_g: 0,
      sugar_g: 12,
      sodium_mg: 95,
    },
    micronutrients: {
      calcium_mg: 276,
    },
    flags: {
      animalProduct: true,
      dairy: true,
    },
  },
  
  "cheese": {
    canonicalName: "cheese",
    displayName: "Cheese",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 4.02,
      protein_g: 0.25,
      carbs_g: 0.012,
      fat_g: 0.33,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 6.2,
    },
    flags: {
      animalProduct: true,
      dairy: true,
    },
  },
  
  "cheddar cheese": {
    canonicalName: "cheddar cheese",
    displayName: "Cheddar Cheese",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 4.02,
      protein_g: 0.25,
      carbs_g: 0.012,
      fat_g: 0.33,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 6.2,
    },
    flags: {
      animalProduct: true,
      dairy: true,
    },
  },
  
  "butter": {
    canonicalName: "butter",
    displayName: "Butter",
    baseUnit: "tbsp",
    gramsPerUnit: 14, // ~14g per tbsp
    nutrition: {
      calories: 102,
      protein_g: 0.1,
      carbs_g: 0,
      fat_g: 12,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 82,
    },
    flags: {
      animalProduct: true,
      dairy: true,
    },
  },
  
  "yogurt": {
    canonicalName: "yogurt",
    displayName: "Yogurt",
    baseUnit: "cup",
    gramsPerUnit: 245, // ~245g per cup
    nutrition: {
      calories: 150,
      protein_g: 8.5,
      carbs_g: 17,
      fat_g: 3.8,
      fiber_g: 0,
      sugar_g: 16,
      sodium_mg: 80,
    },
    micronutrients: {
      calcium_mg: 250,
    },
    flags: {
      animalProduct: true,
      dairy: true,
    },
  },
  
  // ============================================================================
  // Proteins - Plant-Based
  // ============================================================================
  
  "tofu": {
    canonicalName: "tofu",
    displayName: "Tofu",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 0.76,
      protein_g: 0.08,
      carbs_g: 0.015,
      fat_g: 0.045,
      fiber_g: 0.002,
      sugar_g: 0,
      sodium_mg: 0.8,
    },
    flags: {
      soy: true,
    },
  },
  
  "lentils": {
    canonicalName: "lentils",
    displayName: "Lentils",
    baseUnit: "cup",
    gramsPerUnit: 198, // ~198g cooked per cup
    nutrition: {
      calories: 230,
      protein_g: 18,
      carbs_g: 40,
      fat_g: 0.8,
      fiber_g: 16,
      sugar_g: 4,
      sodium_mg: 4,
    },
    micronutrients: {
      iron_mg: 6.6,
    },
    flags: {
      legume: true,
    },
  },
  
  // ============================================================================
  // Grains & Carbs
  // ============================================================================
  
  "rice": {
    canonicalName: "rice",
    displayName: "Rice",
    baseUnit: "cup",
    gramsPerUnit: 158, // ~158g cooked per cup
    nutrition: {
      calories: 205,
      protein_g: 4.3,
      carbs_g: 45,
      fat_g: 0.4,
      fiber_g: 0.6,
      sugar_g: 0,
      sodium_mg: 2,
    },
    flags: {
      grain: true,
    },
  },
  
  "pasta": {
    canonicalName: "pasta",
    displayName: "Pasta",
    baseUnit: "cup",
    gramsPerUnit: 140, // ~140g cooked per cup
    nutrition: {
      calories: 220,
      protein_g: 8,
      carbs_g: 43,
      fat_g: 1.3,
      fiber_g: 2.5,
      sugar_g: 1,
      sodium_mg: 1,
    },
    flags: {
      grain: true,
      gluten: true,
    },
  },
  
  "quinoa": {
    canonicalName: "quinoa",
    displayName: "Quinoa",
    baseUnit: "cup",
    gramsPerUnit: 185, // ~185g cooked per cup
    nutrition: {
      calories: 222,
      protein_g: 8,
      carbs_g: 39,
      fat_g: 3.6,
      fiber_g: 5,
      sugar_g: 1.6,
      sodium_mg: 13,
    },
    flags: {
      grain: true,
    },
  },
  
  "bread": {
    canonicalName: "bread",
    displayName: "Bread",
    baseUnit: "slice",
    gramsPerUnit: 25, // ~25g per slice
    nutrition: {
      calories: 65,
      protein_g: 3,
      carbs_g: 13,
      fat_g: 1,
      fiber_g: 1,
      sugar_g: 1.5,
      sodium_mg: 120,
    },
    flags: {
      grain: true,
      gluten: true,
      processed: true,
    },
  },
  
  "wholegrain bread": {
    canonicalName: "wholegrain bread",
    displayName: "Wholegrain Bread",
    baseUnit: "slice",
    gramsPerUnit: 28, // ~28g per slice
    nutrition: {
      calories: 65,
      protein_g: 3.5,
      carbs_g: 12,
      fat_g: 1,
      fiber_g: 2,
      sugar_g: 1.5,
      sodium_mg: 120,
    },
    flags: {
      grain: true,
      gluten: true,
    },
  },
  
  "flour": {
    canonicalName: "flour",
    displayName: "Flour",
    baseUnit: "cup",
    gramsPerUnit: 120, // ~120g per cup
    nutrition: {
      calories: 455,
      protein_g: 13,
      carbs_g: 95,
      fat_g: 1.2,
      fiber_g: 3.4,
      sugar_g: 0.3,
      sodium_mg: 2,
    },
    flags: {
      grain: true,
      gluten: true,
    },
  },
  
  // ============================================================================
  // Vegetables
  // ============================================================================
  
  "potato": {
    canonicalName: "potato",
    displayName: "Potato",
    baseUnit: "piece",
    gramsPerUnit: 173, // ~173g per medium potato
    nutrition: {
      calories: 161,
      protein_g: 4.3,
      carbs_g: 37,
      fat_g: 0.2,
      fiber_g: 4,
      sugar_g: 2,
      sodium_mg: 17,
    },
    micronutrients: {
      potassium_mg: 926,
    },
  },
  
  "sweet potato": {
    canonicalName: "sweet potato",
    displayName: "Sweet Potato",
    baseUnit: "piece",
    gramsPerUnit: 130, // ~130g per medium sweet potato
    nutrition: {
      calories: 112,
      protein_g: 2,
      carbs_g: 26,
      fat_g: 0.1,
      fiber_g: 4,
      sugar_g: 5,
      sodium_mg: 72,
    },
    micronutrients: {
      vitamin_a_mcg: 19200,
    },
  },
  
  "carrot": {
    canonicalName: "carrot",
    displayName: "Carrot",
    baseUnit: "piece",
    gramsPerUnit: 61, // ~61g per medium carrot
    nutrition: {
      calories: 25,
      protein_g: 0.6,
      carbs_g: 6,
      fat_g: 0.1,
      fiber_g: 2,
      sugar_g: 3,
      sodium_mg: 42,
    },
    micronutrients: {
      vitamin_a_mcg: 835,
    },
  },
  
  "tomato": {
    canonicalName: "tomato",
    displayName: "Tomato",
    baseUnit: "piece",
    gramsPerUnit: 123, // ~123g per medium tomato
    nutrition: {
      calories: 22,
      protein_g: 1,
      carbs_g: 5,
      fat_g: 0.2,
      fiber_g: 1.5,
      sugar_g: 3,
      sodium_mg: 6,
    },
    micronutrients: {
      vitamin_c_mg: 16,
    },
  },
  
  "spinach": {
    canonicalName: "spinach",
    displayName: "Spinach",
    baseUnit: "cup",
    gramsPerUnit: 30, // ~30g raw per cup
    nutrition: {
      calories: 7,
      protein_g: 0.9,
      carbs_g: 1,
      fat_g: 0.1,
      fiber_g: 0.7,
      sugar_g: 0.1,
      sodium_mg: 24,
    },
    micronutrients: {
      vitamin_a_mcg: 2813,
      iron_mg: 0.8,
    },
  },
  
  "broccoli": {
    canonicalName: "broccoli",
    displayName: "Broccoli",
    baseUnit: "cup",
    gramsPerUnit: 91, // ~91g chopped per cup
    nutrition: {
      calories: 31,
      protein_g: 2.5,
      carbs_g: 6,
      fat_g: 0.3,
      fiber_g: 2.4,
      sugar_g: 1.5,
      sodium_mg: 30,
    },
    micronutrients: {
      vitamin_c_mg: 81,
    },
  },
  
  "onion": {
    canonicalName: "onion",
    displayName: "Onion",
    baseUnit: "piece",
    gramsPerUnit: 110, // ~110g per medium onion
    nutrition: {
      calories: 44,
      protein_g: 1.2,
      carbs_g: 10,
      fat_g: 0.1,
      fiber_g: 1.9,
      sugar_g: 4.7,
      sodium_mg: 4,
    },
  },
  
  "pepper": {
    canonicalName: "pepper",
    displayName: "Bell Pepper",
    baseUnit: "piece",
    gramsPerUnit: 119, // ~119g per medium pepper
    nutrition: {
      calories: 24,
      protein_g: 1,
      carbs_g: 6,
      fat_g: 0.2,
      fiber_g: 2,
      sugar_g: 3,
      sodium_mg: 2,
    },
    micronutrients: {
      vitamin_c_mg: 127,
      vitamin_a_mcg: 186,
    },
  },
  
  // ============================================================================
  // Fruits
  // ============================================================================
  
  "avocado": {
    canonicalName: "avocado",
    displayName: "Avocado",
    baseUnit: "piece",
    gramsPerUnit: 136, // ~136g per medium avocado
    nutrition: {
      calories: 160,
      protein_g: 2,
      carbs_g: 9,
      fat_g: 15,
      fiber_g: 7,
      sugar_g: 0.7,
      sodium_mg: 7,
    },
    micronutrients: {
      potassium_mg: 485,
    },
  },
  
  "banana": {
    canonicalName: "banana",
    displayName: "Banana",
    baseUnit: "piece",
    gramsPerUnit: 118, // ~118g per medium banana
    nutrition: {
      calories: 105,
      protein_g: 1.3,
      carbs_g: 27,
      fat_g: 0.3,
      fiber_g: 3,
      sugar_g: 14,
      sodium_mg: 1,
    },
    micronutrients: {
      potassium_mg: 422,
    },
  },
  
  "apple": {
    canonicalName: "apple",
    displayName: "Apple",
    baseUnit: "piece",
    gramsPerUnit: 182, // ~182g per medium apple
    nutrition: {
      calories: 95,
      protein_g: 0.5,
      carbs_g: 25,
      fat_g: 0.3,
      fiber_g: 4,
      sugar_g: 19,
      sodium_mg: 2,
    },
    micronutrients: {
      vitamin_c_mg: 8,
    },
  },
  
  "strawberry": {
    canonicalName: "strawberry",
    displayName: "Strawberry",
    baseUnit: "cup",
    gramsPerUnit: 152, // ~152g per cup
    nutrition: {
      calories: 50,
      protein_g: 1,
      carbs_g: 12,
      fat_g: 0.5,
      fiber_g: 3,
      sugar_g: 7,
      sodium_mg: 2,
    },
    micronutrients: {
      vitamin_c_mg: 85,
    },
  },
  
  "orange": {
    canonicalName: "orange",
    displayName: "Orange",
    baseUnit: "piece",
    gramsPerUnit: 131, // ~131g per medium orange
    nutrition: {
      calories: 62,
      protein_g: 1.2,
      carbs_g: 15,
      fat_g: 0.2,
      fiber_g: 3,
      sugar_g: 12,
      sodium_mg: 0,
    },
    micronutrients: {
      vitamin_c_mg: 70,
    },
  },
  
  // ============================================================================
  // Fats & Oils
  // ============================================================================
  
  "olive oil": {
    canonicalName: "olive oil",
    displayName: "Olive Oil",
    baseUnit: "tbsp",
    gramsPerUnit: 14, // ~14g per tbsp
    nutrition: {
      calories: 120,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 14,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
    },
    micronutrients: {
      vitamin_e_mg: 1.9,
    },
  },
  
  // ============================================================================
  // Nuts & Seeds
  // ============================================================================
  
  "almond": {
    canonicalName: "almond",
    displayName: "Almond",
    baseUnit: "g",
    gramsPerUnit: 1,
    nutrition: {
      calories: 5.79,
      protein_g: 0.21,
      carbs_g: 0.22,
      fat_g: 0.50,
      fiber_g: 0.13,
      sugar_g: 0.04,
      sodium_mg: 0.01,
    },
    micronutrients: {
      vitamin_e_mg: 0.26,
      calcium_mg: 26.9,
    },
    flags: {
      nut: true,
    },
  },
  
  "peanut butter": {
    canonicalName: "peanut butter",
    displayName: "Peanut Butter",
    baseUnit: "tbsp",
    gramsPerUnit: 16, // ~16g per tbsp
    nutrition: {
      calories: 95,
      protein_g: 4,
      carbs_g: 3,
      fat_g: 8,
      fiber_g: 1,
      sugar_g: 1,
      sodium_mg: 73,
    },
    micronutrients: {
      vitamin_e_mg: 1.9,
    },
    flags: {
      nut: true,
      legume: true,
    },
  },
  
  // ============================================================================
  // Condiments & Seasonings
  // ============================================================================
  
  "sugar": {
    canonicalName: "sugar",
    displayName: "Sugar",
    baseUnit: "tsp",
    gramsPerUnit: 4, // ~4g per tsp
    nutrition: {
      calories: 16,
      protein_g: 0,
      carbs_g: 4,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 4,
      sodium_mg: 0,
    },
    flags: {
      addedSugar: true,
    },
  },
  
  "salt": {
    canonicalName: "salt",
    displayName: "Salt",
    baseUnit: "tsp",
    gramsPerUnit: 6, // ~6g per tsp
    nutrition: {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 2325,
    },
  },
};

// ============================================================================
// Synonym Mappings
// ============================================================================

/**
 * Deterministic synonym mappings
 * Maps variant names to canonical names
 * 
 * Rules:
 * - All keys are lowercase
 * - Singular and plural forms both map to canonical
 * - Common misspellings included
 * - Multilingual support (Chinese, Spanish, French, etc.)
 */
export const INGREDIENT_SYNONYMS: Record<string, string> = {
  // Chicken variations
  "chicken": "chicken breast",
  "chicken breasts": "chicken breast",
  "chicken fillet": "chicken breast",
  "chicken fillets": "chicken breast",
  "鸡胸肉": "chicken breast",
  "pechuga de pollo": "chicken breast",
  "poulet": "chicken breast",
  
  // Beef variations
  "ground beef": "beef",
  "beef steak": "beef",
  "steak": "beef",
  "牛肉": "beef",
  "carne de res": "beef",
  "boeuf": "beef",
  
  // Pork variations
  "pork chop": "pork",
  "pork chops": "pork",
  "pork loin": "pork",
  "猪肉": "pork",
  "carne de cerdo": "pork",
  "porc": "pork",
  
  // Fish variations
  "salmon fillet": "salmon",
  "salmon fillets": "salmon",
  "三文鱼": "salmon",
  "salmón": "salmon",
  "saumon": "salmon",
  
  "tuna steak": "tuna",
  "tuna can": "tuna",
  "canned tuna": "tuna",
  "金枪鱼": "tuna",
  "atún": "tuna",
  "thon": "tuna",
  
  // Eggs
  "eggs": "egg",
  "large egg": "egg",
  "large eggs": "egg",
  "鸡蛋": "egg",
  "huevo": "egg",
  "huevos": "egg",
  "oeuf": "egg",
  "oeufs": "egg",
  
  // Dairy
  "whole milk": "milk",
  "skim milk": "milk",
  "2% milk": "milk",
  "牛奶": "milk",
  "leche": "milk",
  "lait": "milk",
  
  "cheddar": "cheddar cheese",
  "cheese slice": "cheese",
  "cheese slices": "cheese",
  "奶酪": "cheese",
  "queso": "cheese",
  "fromage": "cheese",
  
  "unsalted butter": "butter",
  "salted butter": "butter",
  "黄油": "butter",
  "mantequilla": "butter",
  "beurre": "butter",
  
  "greek yogurt": "yogurt",
  "plain yogurt": "yogurt",
  "酸奶": "yogurt",
  "yogur": "yogurt",
  "yaourt": "yogurt",
  
  // Grains
  "white rice": "rice",
  "brown rice": "rice",
  "cooked rice": "rice",
  "米饭": "rice",
  "arroz": "rice",
  "riz": "rice",
  
  "spaghetti": "pasta",
  "penne": "pasta",
  "macaroni": "pasta",
  "noodles": "pasta",
  "意大利面": "pasta",
  "fideos": "pasta",
  "pâtes": "pasta",
  
  "white bread": "bread",
  "wheat bread": "bread",
  "bread slice": "bread",
  "面包": "bread",
  "pan": "bread",
  "pain": "bread",
  
  "whole grain bread": "wholegrain bread",
  "whole wheat bread": "wholegrain bread",
  "全麦面包": "wholegrain bread",
  
  "all purpose flour": "flour",
  "wheat flour": "flour",
  "面粉": "flour",
  "harina": "flour",
  "farine": "flour",
  
  // Vegetables
  "potatoes": "potato",
  "baked potato": "potato",
  "土豆": "potato",
  "patata": "potato",
  "pomme de terre": "potato",
  
  "sweet potatoes": "sweet potato",
  "yam": "sweet potato",
  "红薯": "sweet potato",
  "batata": "sweet potato",
  "patate douce": "sweet potato",
  
  "carrots": "carrot",
  "baby carrot": "carrot",
  "baby carrots": "carrot",
  "胡萝卜": "carrot",
  "zanahoria": "carrot",
  "carotte": "carrot",
  
  "tomatoes": "tomato",
  "cherry tomato": "tomato",
  "cherry tomatoes": "tomato",
  "西红柿": "tomato",
  "tomate": "tomato",
  
  "baby spinach": "spinach",
  "spinach leaves": "spinach",
  "菠菜": "spinach",
  "espinaca": "spinach",
  "épinard": "spinach",
  
  "broccoli florets": "broccoli",
  "西兰花": "broccoli",
  "brócoli": "broccoli",
  
  "onions": "onion",
  "yellow onion": "onion",
  "white onion": "onion",
  "洋葱": "onion",
  "cebolla": "onion",
  "oignon": "onion",
  
  "bell pepper": "pepper",
  "bell peppers": "pepper",
  "red pepper": "pepper",
  "green pepper": "pepper",
  "彩椒": "pepper",
  "pimiento": "pepper",
  "poivron": "pepper",
  
  // Fruits
  "avocados": "avocado",
  "牛油果": "avocado",
  "aguacate": "avocado",
  "avocat": "avocado",
  
  "bananas": "banana",
  "香蕉": "banana",
  "plátano": "banana",
  "banane": "banana",
  
  "apples": "apple",
  "red apple": "apple",
  "green apple": "apple",
  "苹果": "apple",
  "manzana": "apple",
  "pomme": "apple",
  
  "strawberries": "strawberry",
  "草莓": "strawberry",
  "fresa": "strawberry",
  "fraise": "strawberry",
  
  "oranges": "orange",
  "橙子": "orange",
  "naranja": "orange",
  
  // Oils
  "extra virgin olive oil": "olive oil",
  "evoo": "olive oil",
  "橄榄油": "olive oil",
  "aceite de oliva": "olive oil",
  "huile d'olive": "olive oil",
  
  // Nuts
  "almonds": "almond",
  "杏仁": "almond",
  "almendra": "almond",
  "amande": "almond",
  
  "peanut": "peanut butter",
  "pb": "peanut butter",
  "花生酱": "peanut butter",
  "mantequilla de maní": "peanut butter",
  "beurre de cacahuète": "peanut butter",
  
  // Condiments
  "white sugar": "sugar",
  "granulated sugar": "sugar",
  "糖": "sugar",
  "azúcar": "sugar",
  "sucre": "sugar",
  
  "table salt": "salt",
  "sea salt": "salt",
  "kosher salt": "salt",
  "盐": "salt",
  "sal": "salt",
  "sel": "salt",
};

/**
 * Normalize ingredient name for lookup
 * 
 * Rules:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Remove punctuation (except hyphens in compound words)
 * 4. Check synonyms map
 * 5. Check canonical names
 * 
 * @param rawName - Raw ingredient name from recipe
 * @returns Canonical name or original if not found
 */
export function normalizeIngredientName(rawName: string): string {
  // Step 1: Lowercase and trim
  let normalized = rawName.toLowerCase().trim();
  
  // Step 2: Remove punctuation (keep hyphens)
  normalized = normalized.replace(/[^\w\s-]/g, "");
  
  // Step 3: Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ");
  
  // Step 4: Check synonyms first
  if (INGREDIENT_SYNONYMS[normalized]) {
    return INGREDIENT_SYNONYMS[normalized];
  }
  
  // Step 5: Check if it's already canonical
  if (FOOD_DATABASE[normalized]) {
    return normalized;
  }
  
  // Step 6: Try partial matching (last resort)
  // Only match if the ingredient name contains a canonical name as a substring
  for (const canonicalName of Object.keys(FOOD_DATABASE)) {
    if (normalized.includes(canonicalName)) {
      return canonicalName;
    }
  }
  
  // Not found - return original normalized form
  return normalized;
}
