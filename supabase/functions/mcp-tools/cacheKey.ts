/**
 * Smart Cache Key Generation
 * 
 * Generates cache keys that maximize hit rate through:
 * 1. Ingredient normalization (chicken breast → chicken)
 * 2. Sorted ingredients (chicken,rice = rice,chicken)
 * 3. Fuzzy matching (ignore quantities, descriptions)
 */

// Common ingredient normalizations
const INGREDIENT_NORMALIZATIONS: Record<string, string> = {
  // Proteins
  "chicken breast": "chicken",
  "chicken thigh": "chicken",
  "chicken drumstick": "chicken",
  "ground beef": "beef",
  "beef steak": "beef",
  "pork chop": "pork",
  "salmon fillet": "salmon",
  "tuna steak": "tuna",
  
  // Vegetables
  "cherry tomato": "tomato",
  "cherry tomatoes": "tomato",
  "roma tomato": "tomato",
  "roma tomatoes": "tomato",
  "tomatoes": "tomato",
  "red onion": "onion",
  "yellow onion": "onion",
  "white onion": "onion",
  "green bell pepper": "bell pepper",
  "red bell pepper": "bell pepper",
  
  // Grains
  "white rice": "rice",
  "brown rice": "rice",
  "jasmine rice": "rice",
  "basmati rice": "rice",
  "whole wheat pasta": "pasta",
  "spaghetti": "pasta",
  "penne": "pasta",
  
  // Dairy
  "cheddar cheese": "cheese",
  "mozzarella cheese": "cheese",
  "parmesan cheese": "cheese",
  "whole milk": "milk",
  "skim milk": "milk",
  
  // Common variations
  "extra virgin olive oil": "olive oil",
  "sea salt": "salt",
  "black pepper": "pepper",
  "garlic cloves": "garlic",
  "fresh basil": "basil",
  "dried oregano": "oregano",
};

/**
 * Normalize an ingredient name for caching
 */
export function normalizeIngredient(name: string): string {
  // Convert to lowercase and trim
  let normalized = name.toLowerCase().trim();
  
  // Remove common descriptors
  normalized = normalized
    .replace(/\b(fresh|frozen|dried|canned|raw|cooked|organic|free-range)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Apply specific normalizations
  if (INGREDIENT_NORMALIZATIONS[normalized]) {
    return INGREDIENT_NORMALIZATIONS[normalized];
  }
  
  // Remove quantities and measurements
  normalized = normalized
    .replace(/\d+(\.\d+)?\s*(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|pound|pounds|ounce|ounces|tablespoon|tablespoons|teaspoon|teaspoons)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Generate a smart cache key for recipes
 */
export function generateRecipesCacheKey(input: {
  ingredients: Array<string | { name: string; quantity?: string }>;
  maxRecipes?: number;
  dietaryTags?: string[];
  excludeIngredients?: string[];
}): string {
  // Normalize and sort ingredients (handle both string[] and object[] formats)
  const normalizedIngredients = input.ingredients
    .map(ing => {
      // Handle both string and object formats
      const name = typeof ing === 'string' ? ing : ing.name;
      return normalizeIngredient(name);
    })
    .filter(name => name.length > 0)
    .sort()
    .join(',');
  
  // Sort dietary tags
  const dietaryTags = (input.dietaryTags || [])
    .map(tag => tag.toLowerCase())
    .sort()
    .join(',');
  
  // Sort exclude ingredients
  const excludeIngredients = (input.excludeIngredients || [])
    .map(ing => normalizeIngredient(ing))
    .sort()
    .join(',');
  
  // Generate key
  const parts = [
    'recipes',
    normalizedIngredients,
    dietaryTags,
    excludeIngredients,
    input.maxRecipes || 3
  ];
  
  return parts.filter(p => p).join(':');
}

/**
 * Generate a smart cache key for nutrition analysis
 */
export function generateNutritionCacheKey(input: {
  recipes: Array<{ name: string; ingredients?: any[] }>;
}): string {
  // Use recipe names (normalized) as cache key
  const recipeNames = input.recipes
    .map(r => (r.name || '').toLowerCase().trim())
    .sort()
    .join(',');
  
  return `nutrition:${recipeNames}`;
}

/**
 * Generate a smart cache key for meal plans
 */
export function generateMealPlanCacheKey(input: {
  goals: any;
  days?: number;
  mealsPerDay?: number;
  dietaryTags?: string[];
}): string {
  const goals = input.goals || {};
  
  // Extract key goal parameters
  const calories = goals.dailyCalories || goals.calories || 2000;
  const protein = goals.proteinGrams || goals.protein || 0;
  const dietaryTags = (input.dietaryTags || [])
    .map(tag => tag.toLowerCase())
    .sort()
    .join(',');
  
  const parts = [
    'mealplan',
    `cal${calories}`,
    protein > 0 ? `pro${protein}` : '',
    dietaryTags,
    `d${input.days || 7}`,
    `m${input.mealsPerDay || 3}`
  ];
  
  return parts.filter(p => p).join(':');
}

/**
 * Generate a smart cache key for grocery lists
 */
export function generateGroceryCacheKey(input: {
  recipes?: any[];
  mealPlan?: any;
}): string {
  if (input.mealPlan) {
    // Use meal plan ID or name
    const planId = input.mealPlan.id || input.mealPlan.name || 'plan';
    return `grocery:plan:${planId}`;
  }
  
  if (input.recipes) {
    // Use recipe names (normalized)
    const recipeNames = input.recipes
      .map((r: any) => (r.name || '').toLowerCase().trim())
      .sort()
      .join(',');
    return `grocery:recipes:${recipeNames}`;
  }
  
  return `grocery:unknown`;
}
