
/**
 * LeftoverGPT App Schemas
 * 
 * Strict, minimal schemas for the ChatGPT App Store.
 * NO internal IDs, NO provider metadata, NO trace info.
 */

export interface GenerateRecipeInput {
  ingredients: string[];
  dietary_restrictions?: string[];
  meal_type?: string;
  cooking_time_limit?: string; // e.g. "30 minutes"
}

export interface AdjustRecipeInput {
  original_recipe_name: string;
  adjustment_request: string; // e.g. "make it spicy", "swap chicken for tofu"
}

export interface EstimateNutritionInput {
  recipe_description: string;
  ingredients?: string[];
}

export interface CreateGroceryOrderInput {
  ingredients: string[];
  zip_code?: string; // Optional, for better localization if user provides it
}

// Output Schemas - what the model sees

export interface RecipeOutput {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: string;
  cook_time: string;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface NutritionOutput {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  summary: string;
}

export interface GroceryLinkOutput {
  checkout_url: string;
  store_name: string; // Generic name only, e.g. "Local Grocery"
  expires_in: string;
}
