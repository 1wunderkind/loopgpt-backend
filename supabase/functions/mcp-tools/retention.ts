/**
 * Retention Tools
 * 
 * Daily suggestions and weekly refresh tools for user re-engagement.
 */

import { getProfileOrDefaults } from "./userProfile.ts";
import { generateRecipes, type RecipesInput } from "./recipes.ts";
import { generateMealPlan, type MealPlanInput } from "./mealplan.ts";
import { getUserProfileStore } from "./userProfile.ts";
import { type Cta } from "./ctaSchemas.ts";
import { logSuccess, logStructuredError, categorizeError } from "./errorTypes.ts";

/**
 * Daily Suggestion Input
 */
export interface DailySuggestionInput {
  userId: string;
  locale?: string; // e.g., "en", "es"
}

/**
 * Daily Suggestion Output
 * 
 * Card-friendly format with 1-3 recipes and CTAs.
 */
export interface DailySuggestionOutput {
  suggestions: Array<{
    id: string;
    name: string;
    description: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: string;
    tags: string[];
    image?: string;
  }>;
  message: string; // Personalized message (e.g., "Based on your vegetarian preferences...")
  suggestedActions: Cta[];
}

/**
 * Weekly Refresh Input
 */
export interface WeeklyRefreshInput {
  userId: string;
  days?: number; // Default 7
  locale?: string;
}

/**
 * Weekly Refresh Output
 */
export interface WeeklyRefreshOutput {
  mealPlan: {
    id: string;
    name: string;
    days: Array<{
      dayNumber: number;
      date: string;
      meals: Array<{
        type: string;
        recipe: any;
      }>;
      nutrition: any;
    }>;
    totalNutrition: any;
  };
  message: string;
  suggestedActions: Cta[];
}

/**
 * Validate daily suggestion input
 */
function validateDailySuggestionInput(input: any): DailySuggestionInput {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object");
  }
  
  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("userId is required and must be a string");
  }
  
  return {
    userId: input.userId,
    locale: input.locale || "en",
  };
}

/**
 * Validate weekly refresh input
 */
function validateWeeklyRefreshInput(input: any): WeeklyRefreshInput {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object");
  }
  
  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("userId is required and must be a string");
  }
  
  const days = input.days || 7;
  if (typeof days !== "number" || days < 1 || days > 14) {
    throw new Error("days must be a number between 1 and 14");
  }
  
  return {
    userId: input.userId,
    days,
    locale: input.locale || "en",
  };
}

/**
 * Generate personalized message based on profile
 */
function generatePersonalizedMessage(profile: any, type: "daily" | "weekly"): string {
  const parts: string[] = [];
  
  if (type === "daily") {
    parts.push("Here are today's meal suggestions");
  } else {
    parts.push("Here's your weekly meal plan");
  }
  
  if (profile.dietTags && profile.dietTags.length > 0) {
    parts.push(`tailored for your ${profile.dietTags.join(", ")} diet`);
  }
  
  if (profile.cuisines && profile.cuisines.length > 0) {
    parts.push(`featuring ${profile.cuisines.join(", ")} cuisine`);
  }
  
  if (profile.caloriesPerDay) {
    parts.push(`targeting ${profile.caloriesPerDay} calories per day`);
  }
  
  return parts.join(" ") + ".";
}

/**
 * Daily Suggestion Tool
 * 
 * Generates 1-3 personalized meal suggestions based on user profile.
 * Returns card-friendly format with CTAs.
 */
export async function generateDailySuggestion(
  input: any
): Promise<DailySuggestionOutput> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validatedInput = validateDailySuggestionInput(input);
    
    // Load user profile
    const profile = await getProfileOrDefaults(validatedInput.userId);
    
    // Generate 3 recipes using user preferences
    const recipesInput: RecipesInput = {
      ingredients: [], // No specific ingredients - let AI suggest
      count: 3,
      locale: validatedInput.locale,
      dietTags: profile.dietTags,
      cuisines: profile.cuisines,
      caloriesPerServing: profile.caloriesPerDay ? Math.floor(profile.caloriesPerDay / 3) : undefined,
    };
    
    const recipesResult = await generateRecipes(recipesInput);
    
    // Transform to card-friendly format
    const suggestions = recipesResult.recipes.map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      image: recipe.image,
    }));
    
    // Generate personalized message
    const message = generatePersonalizedMessage(profile, "daily");
    
    // Generate CTAs
    const suggestedActions: Cta[] = [
      {
        id: "view-recipe-1",
        label: "📖 Show full recipe",
        description: `View complete recipe for ${suggestions[0]?.name}`,
        actionType: "NAVIGATE",
        payload: {
          route: `/recipe/${suggestions[0]?.id}`,
        },
      },
      {
        id: "create-meal-plan",
        label: "📅 Turn into meal plan",
        description: "Create a 7-day meal plan from these suggestions",
        actionType: "TOOL_CALL",
        payload: {
          tool: "mealplan.generate",
          params: {
            days: 7,
            dietTags: profile.dietTags,
            cuisines: profile.cuisines,
            caloriesPerDay: profile.caloriesPerDay,
          },
        },
      },
      {
        id: "generate-grocery",
        label: "🛒 Generate grocery list",
        description: "Create shopping list for these recipes",
        actionType: "TOOL_CALL",
        payload: {
          tool: "grocery.list",
          params: {
            recipes: recipesResult.recipes,
          },
        },
      },
      {
        id: "refresh-suggestions",
        label: "🔄 Get new suggestions",
        description: "Generate different meal ideas",
        actionType: "TOOL_CALL",
        payload: {
          tool: "retention.dailySuggestion",
          params: {
            userId: validatedInput.userId,
          },
        },
      },
    ];
    
    const duration = Date.now() - startTime;
    logSuccess("retention.dailySuggestion", duration, {
      userId: validatedInput.userId,
      suggestionCount: suggestions.length,
      hasProfile: !!profile.dietTags || !!profile.cuisines,
    });
    
    return {
      suggestions,
      message,
      suggestedActions,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const mcpError = categorizeError(error, "retention.dailySuggestion");
    logStructuredError(mcpError, false, duration);
    throw mcpError;
  }
}

/**
 * Weekly Refresh Tool
 * 
 * Generates a personalized weekly meal plan and updates lastPlanDate.
 */
export async function generateWeeklyRefresh(
  input: any
): Promise<WeeklyRefreshOutput> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validatedInput = validateWeeklyRefreshInput(input);
    
    // Load user profile
    const profile = await getProfileOrDefaults(validatedInput.userId);
    
    // Generate meal plan using user preferences
    const mealPlanInput: MealPlanInput = {
      days: validatedInput.days!,
      locale: validatedInput.locale,
      dietTags: profile.dietTags,
      cuisines: profile.cuisines,
      caloriesPerDay: profile.caloriesPerDay,
    };
    
    const mealPlanResult = await generateMealPlan(mealPlanInput);
    
    // Update lastPlanDate in profile
    const store = getUserProfileStore();
    profile.lastPlanDate = new Date().toISOString();
    await store.upsertProfile(profile);
    
    // Generate personalized message
    const message = generatePersonalizedMessage(profile, "weekly");
    
    // Generate CTAs
    const suggestedActions: Cta[] = [
      {
        id: "regenerate-plan",
        label: "🔄 Regenerate plan",
        description: "Generate a different meal plan",
        actionType: "TOOL_CALL",
        payload: {
          tool: "retention.weeklyRefresh",
          params: {
            userId: validatedInput.userId,
            days: validatedInput.days,
          },
        },
      },
      {
        id: "adjust-calories",
        label: "⚖️ Adjust calories",
        description: "Modify daily calorie target",
        actionType: "TOOL_CALL",
        payload: {
          tool: "user.updatePreferences",
          params: {
            userId: validatedInput.userId,
            caloriesPerDay: (profile.caloriesPerDay || 2000) + 200,
          },
        },
      },
      {
        id: "generate-grocery",
        label: "🛒 Generate grocery list",
        description: "Create shopping list for the week",
        actionType: "TOOL_CALL",
        payload: {
          tool: "mealplan.generateWithGroceryList",
          params: {
            days: validatedInput.days,
            dietTags: profile.dietTags,
            cuisines: profile.cuisines,
            caloriesPerDay: profile.caloriesPerDay,
          },
        },
      },
    ];
    
    const duration = Date.now() - startTime;
    logSuccess("retention.weeklyRefresh", duration, {
      userId: validatedInput.userId,
      days: validatedInput.days,
      hasProfile: !!profile.dietTags || !!profile.cuisines,
    });
    
    return {
      mealPlan: mealPlanResult,
      message,
      suggestedActions,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const mcpError = categorizeError(error, "retention.weeklyRefresh");
    logStructuredError(mcpError, false, duration);
    throw mcpError;
  }
}
