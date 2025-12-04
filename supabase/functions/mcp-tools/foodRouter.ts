/**
 * Food Router Tool
 * 
 * Single entrypoint for vague/natural-language food queries.
 * Classifies intent and routes to appropriate specialized tool.
 * 
 * This is the "smart assistant" layer that makes TheLoopGPT easy to use
 * without requiring ChatGPT to choose the exact right tool.
 */

import { classifyFoodIntent } from "./foodIntent.ts";
import { generateRecipes } from "./recipes.ts";
import { analyzeNutrition } from "./nutrition.ts";
import { generateMealPlan } from "./mealplan.ts";
import { generateGroceryList } from "./grocery.ts";
import { categorizeError, logStructuredError, logSuccess, ValidationError } from "./errorTypes.ts";
import { getFallbackRecipes } from "./fallbacks.ts";

// Input schema for the router
export interface FoodRouterInput {
  query: string;
  locale?: string;
  userGoals?: {
    caloriesPerDay?: number;
    goal?: "weight_loss" | "muscle_gain" | "general_health";
    dietTags?: string[];
  };
}

// Output schema - discriminated union based on intent type
export type FoodRouterResult =
  | {
      type: "recipes";
      intent: string;
      confidence: "low" | "medium" | "high";
      recipes: any; // RecipeList from recipes.ts
    }
  | {
      type: "nutrition";
      intent: string;
      confidence: "low" | "medium" | "high";
      analysis: any; // NutritionAnalysis from nutrition.ts
    }
  | {
      type: "mealplan";
      intent: string;
      confidence: "low" | "medium" | "high";
      mealPlan: any; // MealPlan from mealplan.ts
    }
  | {
      type: "grocery";
      intent: string;
      confidence: "low" | "medium" | "high";
      groceryList: any; // GroceryList from grocery.ts
    }
  | {
      type: "fallback";
      intent: string;
      confidence: "low" | "medium" | "high";
      message: string;
      suggestions?: string[];
    };

/**
 * Validate router input
 */
function validateRouterInput(params: any): FoodRouterInput {
  if (!params || typeof params !== "object") {
    throw new Error("Invalid input: expected object");
  }

  if (!params.query || typeof params.query !== "string" || params.query.trim().length === 0) {
    throw new Error("Invalid input: query is required and must be a non-empty string");
  }

  return {
    query: params.query.trim(),
    locale: params.locale || "en",
    userGoals: params.userGoals || {},
  };
}

/**
 * Extract ingredients from a natural language query
 * Simple heuristic-based extraction for now
 */
function extractIngredientsFromQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Common patterns that indicate ingredients
  const patterns = [
    /with\s+([^.?!]+)/i,
    /using\s+([^.?!]+)/i,
    /have\s+([^.?!]+)/i,
    /got\s+([^.?!]+)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      // Split by common delimiters
      const ingredients = match[1]
        .split(/\s+and\s+|,\s*|\s+&\s+/)
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0 && ing.length < 50); // Reasonable length
      
      if (ingredients.length > 0) {
        return ingredients;
      }
    }
  }

  // Fallback: look for common food words
  const commonFoods = [
    "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp",
    "rice", "pasta", "noodles", "bread", "quinoa",
    "tomato", "onion", "garlic", "potato", "carrot", "broccoli",
    "egg", "cheese", "milk", "butter",
  ];

  const foundIngredients = commonFoods.filter(food => 
    lowerQuery.includes(food)
  );

  return foundIngredients.length > 0 ? foundIngredients : [];
}

/**
 * Main router function
 */
export async function routeFood(params: any): Promise<FoodRouterResult> {
  const startTime = Date.now();
  
  try {
    console.log("[foodRouter] Starting", { params });

    // Validate input
    const input = validateRouterInput(params);
    const { query, locale, userGoals } = input;

    // Classify intent
    const intent = await classifyFoodIntent(query, locale);
    console.log("[foodRouter] Intent classified", {
      query,
      primaryIntent: intent.primaryIntent,
      confidence: intent.confidence,
    });

    // Route based on primary intent
    let result: FoodRouterResult;

    switch (intent.primaryIntent) {
      case "recipes": {
        console.log("[foodRouter] Routing to recipes.generate");
        
        // Try to extract ingredients from the query
        const ingredients = extractIngredientsFromQuery(query);
        
        // Build params for recipes tool
        const recipeParams: any = {
          ingredients: ingredients.length > 0 ? ingredients : ["chicken"], // Fallback ingredient
          count: 3,
          dietary_restrictions: userGoals?.dietTags || [],
        };

        // If no ingredients found, this is a free-form query
        // We'll pass it as-is and let the recipes tool handle it
        if (ingredients.length === 0) {
          console.log("[foodRouter] No ingredients extracted, using query as free-form");
          // For now, use a default ingredient set
          // TODO: Enhance recipes.generate to accept free-form queries
          recipeParams.ingredients = ["seasonal ingredients"];
        }

        const recipes = await generateRecipes(recipeParams);
        
        result = {
          type: "recipes",
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          recipes,
        };
        break;
      }

      case "nutrition": {
        console.log("[foodRouter] Routing to nutrition.analyze");
        
        // For nutrition, we need to extract what they want analyzed
        // This is tricky - for now, return a helpful message
        // TODO: Enhance nutrition.analyze to accept free-form queries
        
        result = {
          type: "fallback",
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          message: "To analyze nutrition, please provide specific recipes or meals. For example: 'Analyze the nutrition of grilled chicken with rice and broccoli'",
          suggestions: [
            "Use recipes.generate first to get recipes, then analyze their nutrition",
            "Provide specific meal details for analysis",
          ],
        };
        break;
      }

      case "mealplan": {
        console.log("[foodRouter] Routing to mealplan.generate");
        
        // Extract goals from query or use userGoals
        const mealPlanParams: any = {
          goals: {
            dailyCalories: userGoals?.caloriesPerDay || 2000,
            proteinGrams: 100, // Default
            dietTags: userGoals?.dietTags || [],
          },
          days: 7, // Default to 1 week
          mealsPerDay: 3,
        };

        // Try to extract days from query
        const daysMatch = query.match(/(\d+)\s*[-]?\s*day/i);
        if (daysMatch) {
          mealPlanParams.days = parseInt(daysMatch[1]);
        }

        // Try to extract calorie goal from query
        const caloriesMatch = query.match(/(\d+)\s*cal/i);
        if (caloriesMatch) {
          mealPlanParams.goals.dailyCalories = parseInt(caloriesMatch[1]);
        }

        const mealPlan = await generateMealPlan(mealPlanParams);
        
        result = {
          type: "mealplan",
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          mealPlan,
        };
        break;
      }

      case "grocery": {
        console.log("[foodRouter] Routing to grocery.list");
        
        // For grocery lists, we need recipes or a meal plan
        // For now, return a helpful message
        // TODO: Enhance grocery.list to accept free-form queries
        
        result = {
          type: "fallback",
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          message: "To create a grocery list, I need recipes or a meal plan first. Would you like me to generate a meal plan and then create a grocery list from it?",
          suggestions: [
            "Use mealplan.generate first, then create a grocery list",
            "Provide specific recipes to convert into a shopping list",
          ],
        };
        break;
      }

      case "other":
      default: {
        console.log("[foodRouter] Intent is 'other' or unknown, attempting fallback to recipes");
        
        // Try to handle as a recipe request anyway
        try {
          const ingredients = extractIngredientsFromQuery(query);
          
          if (ingredients.length > 0) {
            const recipes = await generateRecipes({
              ingredients,
              count: 3,
              dietary_restrictions: userGoals?.dietTags || [],
            });
            
            result = {
              type: "recipes",
              intent: "recipes",
              confidence: "low",
              recipes,
            };
          } else {
            // No ingredients found, return helpful fallback
            result = {
              type: "fallback",
              intent: intent.primaryIntent,
              confidence: intent.confidence,
              message: "I'm not sure what you're looking for. I can help with recipes, nutrition analysis, meal planning, and grocery lists.",
              suggestions: [
                "Try: 'What can I cook with chicken and rice?'",
                "Try: 'Create a 3-day meal plan for weight loss'",
                "Try: 'How many calories are in a chicken salad?'",
                "Try: 'Make me a grocery list for this week'",
              ],
            };
          }
        } catch (error: any) {
          console.error("[foodRouter] Fallback to recipes failed", { error: error.message });
          
          result = {
            type: "fallback",
            intent: intent.primaryIntent,
            confidence: "low",
            message: "I couldn't understand your request. I can help with recipes, nutrition, meal planning, and grocery lists. What would you like to do?",
            suggestions: [
              "Ask for recipe ideas with specific ingredients",
              "Request a meal plan with your goals",
              "Ask about nutrition information",
            ],
          };
        }
        break;
      }
    }

    const duration = Date.now() - startTime;
    logSuccess("food.router", duration, {
      type: result.type,
      confidence: result.confidence,
      fallbackUsed: result.type === "fallback",
    });

    return result;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Categorize and log error
    const categorized = categorizeError(error, "food.router");
    logStructuredError(categorized, true, duration);
    
    // For validation errors, provide specific guidance
    if (categorized instanceof ValidationError) {
      return {
        type: "fallback",
        intent: "validation_error",
        confidence: "low",
        message: "I couldn't understand your request. Please provide more details about what you'd like to do.",
        suggestions: [
          "Try: 'What can I cook with chicken and rice?'",
          "Try: 'Create a 3-day meal plan for 2000 calories'",
          "Try: 'How many calories are in a grilled chicken salad?'",
        ],
      };
    }
    
    // For any other error, try to provide fallback recipes
    console.warn("[foodRouter] Attempting fallback recipes due to error");
    try {
      const fallbackRecipes = getFallbackRecipes(3);
      
      logSuccess("food.router", duration, {
        type: "recipes",
        confidence: "low",
        fallbackUsed: true,
        errorType: categorized.type,
      });
      
      return {
        type: "recipes",
        intent: "fallback",
        confidence: "low",
        recipes: fallbackRecipes,
      };
    } catch (fallbackError: any) {
      // Even fallback failed - return helpful message
      console.error("[foodRouter] Fallback also failed", { error: fallbackError.message });
      
      return {
        type: "fallback",
        intent: "error",
        confidence: "low",
        message: "I'm having trouble processing your request right now. Please try again in a moment or use one of the specialized tools directly.",
        suggestions: [
          "Try again in a few moments",
          "Use recipes.generate for recipe ideas",
          "Use mealplan.generate for meal planning",
        ],
      };
    }
  }
}
