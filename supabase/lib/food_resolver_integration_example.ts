/**
 * Food Resolver Integration Example
 * 
 * This shows how to integrate the new 1,000-food database
 * into existing TheLoop nutrition tools.
 */

import { initFoodResolver, getFoodResolver } from "./food_resolver.ts";

// CDN base URL for Supabase Storage
const CDN_BASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";

/**
 * Example 1: Initialize in your Edge Function
 * (Call this once at the top of your handler)
 */
export function initializeFood Database() {
  return initFoodResolver(CDN_BASE_URL, "v1");
}

/**
 * Example 2: Find food by exact name
 */
export async function findFoodByName(name: string) {
  const resolver = getFoodResolver();
  
  // Try exact match first
  let food = await resolver.findExact(name);
  
  // If no exact match, try fuzzy search
  if (!food) {
    const results = await resolver.findFuzzy(name, 1);
    if (results.length > 0) {
      food = results[0].food;
      console.log(`Fuzzy matched "${name}" → "${food.name}" (score: ${results[0].score})`);
    }
  }
  
  return food;
}

/**
 * Example 3: Calculate nutrition for a meal
 */
export async function calculateMealNutrition(ingredients: Array<{ name: string; grams: number }>) {
  const resolver = getFoodResolver();
  
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  
  const foundIngredients = [];
  const notFoundIngredients = [];
  
  for (const ingredient of ingredients) {
    const food = await findFoodByName(ingredient.name);
    
    if (food) {
      // Calculate nutrition for the given amount
      const multiplier = ingredient.grams / 100;
      
      totalKcal += food.kcal * multiplier;
      totalProtein += food.protein * multiplier;
      totalCarbs += food.carbs * multiplier;
      totalFat += food.fat * multiplier;
      totalFiber += (food.fiber || 0) * multiplier;
      totalSugar += (food.sugar || 0) * multiplier;
      
      foundIngredients.push({
        name: food.name,
        grams: ingredient.grams,
        kcal: Math.round(food.kcal * multiplier),
      });
    } else {
      notFoundIngredients.push(ingredient.name);
    }
  }
  
  return {
    totals: {
      kcal: Math.round(totalKcal),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
      sugar: Math.round(totalSugar * 10) / 10,
    },
    found: foundIngredients,
    notFound: notFoundIngredients,
  };
}

/**
 * Example 4: Search foods by group
 */
export async function searchFoodsByGroup(group: string, limit: number = 20) {
  const resolver = getFoodResolver();
  const allFoods = await resolver.getAll();
  
  return allFoods
    .filter(f => f.group === group)
    .slice(0, limit);
}

/**
 * Example 5: Get food suggestions for autocomplete
 */
export async function getFoodSuggestions(query: string, limit: number = 10) {
  const resolver = getFoodResolver();
  
  // Try exact match first
  const exactMatch = await resolver.findExact(query);
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Otherwise return fuzzy matches
  const results = await resolver.findFuzzy(query, limit);
  return results.map(r => r.food);
}

/**
 * Example 6: Integration with existing analyze_nutrition tool
 */
export async function analyzeNutritionWithNewDB(ingredients: string[]) {
  // Initialize resolver (call once per Edge Function invocation)
  initializeFoodDatabase();
  
  // Parse ingredients (assume format: "100g chicken breast")
  const parsed = ingredients.map(ing => {
    const match = ing.match(/(\d+)\s*g\s+(.+)/i);
    if (match) {
      return { grams: parseInt(match[1]), name: match[2].trim() };
    }
    return { grams: 100, name: ing }; // Default to 100g
  });
  
  // Calculate nutrition
  const result = await calculateMealNutrition(parsed);
  
  return {
    success: true,
    nutrition: result.totals,
    ingredients: result.found,
    warnings: result.notFound.length > 0 
      ? [`Could not find: ${result.notFound.join(", ")}`]
      : [],
  };
}

/**
 * Example 7: Migration helper - check if food exists in new DB
 */
export async function checkFoodMigration(oldFoodName: string) {
  const resolver = getFoodResolver();
  
  const exact = await resolver.findExact(oldFoodName);
  if (exact) {
    return { status: "exact_match", food: exact };
  }
  
  const fuzzy = await resolver.findFuzzy(oldFoodName, 3);
  if (fuzzy.length > 0) {
    return { 
      status: "fuzzy_match", 
      suggestions: fuzzy.map(r => ({ name: r.food.name, score: r.score }))
    };
  }
  
  return { status: "not_found" };
}

