/**
 * Fallback Data for Graceful Degradation
 * 
 * Provides hardcoded fallback responses when tools fail.
 * Ensures users always get something useful, never raw errors.
 */

/**
 * Fallback recipes - simple, universally accessible recipes
 */
export function getFallbackRecipes(count: number = 3): any[] {
  const fallbackRecipes = [
    {
      id: "fallback-1",
      name: "Simple Pasta with Olive Oil",
      ingredients: [
        { name: "pasta", quantity: "200g" },
        { name: "olive oil", quantity: "2 tbsp" },
        { name: "salt", quantity: "to taste" },
        { name: "black pepper", quantity: "to taste" },
      ],
      instructions: [
        "Boil water in a large pot with salt.",
        "Cook pasta according to package directions (usually 8-10 minutes).",
        "Drain pasta and return to pot.",
        "Drizzle with olive oil and toss to coat.",
        "Season with salt and black pepper to taste.",
        "Serve immediately.",
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      servings: 2,
      tags: ["fallback", "simple", "quick", "vegetarian"],
      difficulty: "easy",
    },
    {
      id: "fallback-2",
      name: "Rice with Fried Egg",
      ingredients: [
        { name: "rice", quantity: "1 cup" },
        { name: "eggs", quantity: "2" },
        { name: "butter", quantity: "1 tbsp" },
        { name: "salt", quantity: "to taste" },
        { name: "soy sauce", quantity: "1 tsp (optional)" },
      ],
      instructions: [
        "Cook rice according to package directions.",
        "Heat butter in a pan over medium heat.",
        "Crack eggs into the pan and fry until whites are set.",
        "Serve fried eggs over cooked rice.",
        "Season with salt and soy sauce if desired.",
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 15,
      servings: 2,
      tags: ["fallback", "simple", "quick", "protein"],
      difficulty: "easy",
    },
    {
      id: "fallback-3",
      name: "Toast with Peanut Butter and Banana",
      ingredients: [
        { name: "bread", quantity: "2 slices" },
        { name: "peanut butter", quantity: "2 tbsp" },
        { name: "banana", quantity: "1" },
        { name: "honey", quantity: "1 tsp (optional)" },
      ],
      instructions: [
        "Toast bread slices until golden brown.",
        "Spread peanut butter evenly on toast.",
        "Slice banana and arrange on top of peanut butter.",
        "Drizzle with honey if desired.",
        "Serve immediately.",
      ],
      prepTimeMinutes: 5,
      cookTimeMinutes: 2,
      servings: 1,
      tags: ["fallback", "simple", "quick", "breakfast", "vegetarian"],
      difficulty: "easy",
    },
    {
      id: "fallback-4",
      name: "Scrambled Eggs",
      ingredients: [
        { name: "eggs", quantity: "3" },
        { name: "butter", quantity: "1 tbsp" },
        { name: "milk", quantity: "2 tbsp" },
        { name: "salt", quantity: "to taste" },
        { name: "black pepper", quantity: "to taste" },
      ],
      instructions: [
        "Crack eggs into a bowl and whisk with milk, salt, and pepper.",
        "Heat butter in a pan over medium-low heat.",
        "Pour in egg mixture and let sit for 20 seconds.",
        "Gently stir with a spatula, creating soft curds.",
        "Remove from heat when eggs are still slightly wet (they'll continue cooking).",
        "Serve immediately.",
      ],
      prepTimeMinutes: 2,
      cookTimeMinutes: 5,
      servings: 2,
      tags: ["fallback", "simple", "quick", "breakfast", "protein"],
      difficulty: "easy",
    },
    {
      id: "fallback-5",
      name: "Cheese Quesadilla",
      ingredients: [
        { name: "tortillas", quantity: "2" },
        { name: "cheese", quantity: "1 cup shredded" },
        { name: "butter", quantity: "1 tbsp" },
        { name: "salsa", quantity: "for serving (optional)" },
      ],
      instructions: [
        "Place cheese on one tortilla and top with second tortilla.",
        "Heat butter in a pan over medium heat.",
        "Place quesadilla in pan and cook for 2-3 minutes until golden.",
        "Flip and cook other side for 2-3 minutes.",
        "Remove from pan and cut into wedges.",
        "Serve with salsa if desired.",
      ],
      prepTimeMinutes: 2,
      cookTimeMinutes: 6,
      servings: 1,
      tags: ["fallback", "simple", "quick", "vegetarian"],
      difficulty: "easy",
    },
  ];

  return fallbackRecipes.slice(0, Math.min(count, fallbackRecipes.length));
}

/**
 * Fallback nutrition - heuristic estimates for common ingredients
 */
export function getFallbackNutrition(recipes: any[]): any[] {
  // Simple heuristic: estimate based on ingredient types
  const analyses = recipes.map((recipe, index) => {
    const servings = recipe.servings || 2;
    
    // Very rough estimates (per serving)
    let calories = 300;
    let protein = 10;
    let carbs = 40;
    let fat = 10;
    let fiber = 5;
    let sugar = 5;
    let sodium = 500;

    // Adjust based on recipe tags
    if (recipe.tags?.includes("protein")) {
      protein += 10;
      calories += 50;
    }
    if (recipe.tags?.includes("vegetarian")) {
      fat -= 2;
      fiber += 3;
    }
    if (recipe.tags?.includes("breakfast")) {
      carbs += 10;
      sugar += 5;
    }

    return {
      recipeId: recipe.id || `recipe_${index}`,
      recipeName: recipe.name || "Unknown Recipe",
      perServing: {
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
      },
      total: {
        calories: calories * servings,
        protein: protein * servings,
        carbs: carbs * servings,
        fat: fat * servings,
        fiber: fiber * servings,
        sugar: sugar * servings,
        sodium: sodium * servings,
      },
      servings,
      healthScore: 60, // Neutral score
      tags: ["fallback", "estimated"],
      warnings: ["These are estimated values. Actual nutrition may vary."],
    };
  });

  return analyses;
}

/**
 * Fallback meal plan - minimal 1-day plan
 */
export function getFallbackMealPlan(days: number = 1): any {
  const fallbackRecipes = getFallbackRecipes(3);
  
  const plan = {
    id: "fallback-plan",
    name: "Simple Fallback Meal Plan",
    description: "A basic meal plan with simple, easy-to-make recipes.",
    days: Array.from({ length: Math.min(days, 3) }, (_, i) => ({
      dayNumber: i + 1,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [
        {
          mealType: "breakfast",
          recipeName: fallbackRecipes[2]?.name || "Toast with Peanut Butter",
          ingredients: fallbackRecipes[2]?.ingredients || [],
          prepTimeMinutes: 5,
          calories: 300,
          protein: 10,
          carbs: 40,
          fat: 12,
        },
        {
          mealType: "lunch",
          recipeName: fallbackRecipes[0]?.name || "Simple Pasta",
          ingredients: fallbackRecipes[0]?.ingredients || [],
          prepTimeMinutes: 15,
          calories: 400,
          protein: 12,
          carbs: 60,
          fat: 10,
        },
        {
          mealType: "dinner",
          recipeName: fallbackRecipes[1]?.name || "Rice with Fried Egg",
          ingredients: fallbackRecipes[1]?.ingredients || [],
          prepTimeMinutes: 20,
          calories: 450,
          protein: 15,
          carbs: 55,
          fat: 15,
        },
      ],
      totalCalories: 1150,
      totalProtein: 37,
      totalCarbs: 155,
      totalFat: 37,
    })),
    summary: {
      totalDays: Math.min(days, 3),
      avgCaloriesPerDay: 1150,
      avgProteinPerDay: 37,
      avgCarbsPerDay: 155,
      avgFatPerDay: 37,
    },
    metadata: {
      fallback: true,
      note: "This is a simplified fallback meal plan.",
    },
  };

  return plan;
}

/**
 * Fallback grocery list - simple string list
 */
export function getFallbackGroceryList(recipes: any[] = []): any {
  // Extract all ingredients from recipes
  const ingredients = new Set<string>();
  
  recipes.forEach(recipe => {
    recipe.ingredients?.forEach((ing: any) => {
      ingredients.add(ing.name);
    });
  });

  // If no recipes, use basic staples
  if (ingredients.size === 0) {
    ["eggs", "bread", "milk", "rice", "pasta", "olive oil", "salt", "pepper"].forEach(item => {
      ingredients.add(item);
    });
  }

  const list = {
    id: "fallback-list",
    name: "Simple Grocery List",
    totalItems: ingredients.size,
    categories: [
      {
        name: "All Items",
        items: Array.from(ingredients).map(name => ({
          name,
          quantity: "as needed",
          unit: "",
          notes: "Fallback item",
          usedIn: ["various recipes"],
        })),
      },
    ],
    estimatedCost: ingredients.size * 3, // Rough estimate: $3 per item
    tips: [
      "This is a simplified grocery list.",
      "Check your pantry before shopping.",
      "Buy in quantities that work for you.",
    ],
    metadata: {
      fallback: true,
    },
  };

  return list;
}
