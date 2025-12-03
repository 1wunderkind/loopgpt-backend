/**
 * Shared Zod Schemas for TheLoopGPT MCP Tools
 * All data types with runtime validation
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// Core Data Schemas
// ============================================================================

export const IngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name cannot be empty"),
  quantity: z.string().optional(),
  unit: z.string().optional(),
});

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  servings: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const RecipeListSchema = z.array(RecipeSchema);

export const NutritionSummarySchema = z.object({
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
});

export const NutritionAnalysisSchema = z.object({
  perRecipe: z.array(
    z.object({
      recipeId: z.string(),
      recipeName: z.string(),
      summary: NutritionSummarySchema,
      confidence: z.enum(["low", "medium", "high"]),
      perServing: NutritionSummarySchema.optional(),
    })
  ),
  total: NutritionSummarySchema.optional(),
});

export const MealPlanRequestSchema = z.object({
  version: z.enum(["v1"]).default("v1"),
  days: z.number().int().min(1).max(30),
  caloriesPerDay: z.number().int().min(800).max(5000).optional(),
  goal: z.enum(["weight_loss", "muscle_gain", "general_health", "maintenance"]).optional(),
  dietTags: z.array(z.string()).optional(),
  excludeIngredients: z.array(z.string()).optional(),
});

export const MealPlanSchema = z.object({
  days: z.array(
    z.object({
      dayIndex: z.number().int().nonnegative(),
      date: z.string().optional(),
      recipes: RecipeListSchema,
      nutrition: NutritionSummarySchema.optional(),
      notes: z.string().optional(),
    })
  ),
  totalNutrition: NutritionSummarySchema.optional(),
  summary: z.string().optional(),
});

export const GroceryItemSchema = z.object({
  name: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  source: z.enum(["recipe", "pantry", "manual"]).optional(),
  recipeIds: z.array(z.string()).optional(),
});

export const GroceryListSchema = z.object({
  items: z.array(GroceryItemSchema),
  categorized: z.record(z.string(), z.array(GroceryItemSchema)).optional(),
  estimatedCost: z.number().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Tool Input Schemas
// ============================================================================

export const RecipesInputSchema = z.object({
  version: z.enum(["v1"]).default("v1"),
  ingredients: z.array(IngredientSchema).min(1, "At least one ingredient required"),
  dietaryTags: z.array(z.string()).optional(),
  excludeIngredients: z.array(z.string()).optional(),
  maxRecipes: z.number().int().min(1).max(10).default(3),
  difficulty: z.enum(["easy", "medium", "hard", "any"]).default("any"),
});

export const RecipesWithNutritionInputSchema = RecipesInputSchema.extend({
  includeNutrition: z.literal(true).default(true),
});

export const NutritionInputSchema = z.object({
  version: z.enum(["v1"]).default("v1"),
  recipes: RecipeListSchema.min(1, "At least one recipe required"),
  perServing: z.boolean().default(false),
});

export const GroceryInputSchema = z.object({
  version: z.enum(["v1"]).default("v1"),
  recipes: RecipeListSchema.optional(),
  mealPlan: MealPlanSchema.optional(),
  additionalItems: z.array(GroceryItemSchema).optional(),
  categorize: z.boolean().default(true),
});

export const MealPlanWithGroceryInputSchema = MealPlanRequestSchema.extend({
  includeGroceryList: z.literal(true).default(true),
});

// ============================================================================
// Utility Schemas
// ============================================================================

export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  services: z.record(z.string(), z.object({
    available: z.boolean(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  })),
});

export const UsageStatsSchema = z.object({
  userId: z.string(),
  period: z.enum(["hour", "day", "week", "month"]),
  requestCount: z.number().int().nonnegative(),
  remainingQuota: z.number().int().nonnegative(),
  resetAt: z.string(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeList = z.infer<typeof RecipeListSchema>;
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;
export type NutritionAnalysis = z.infer<typeof NutritionAnalysisSchema>;
export type MealPlanRequest = z.infer<typeof MealPlanRequestSchema>;
export type MealPlan = z.infer<typeof MealPlanSchema>;
export type GroceryItem = z.infer<typeof GroceryItemSchema>;
export type GroceryList = z.infer<typeof GroceryListSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
