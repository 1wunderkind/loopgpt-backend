/**
 * Response Contract Module
 * Implements robust, LLM-friendly response format based on ChatGPT feedback
 */

// API Version following semantic versioning
export const API_VERSION = "2026-01-02";

// Response status types
export type ResponseStatus = "ok" | "degraded" | "error";

// Base response envelope
export interface ResponseEnvelope<T> {
  apiVersion: string;
  requestId: string;
  serverTime: string;
  status: ResponseStatus;
  data?: T;
  error?: ErrorObject;
  degradedReason?: string;
}

// Structured error object
export interface ErrorObject {
  code: string;
  message: string;
  hint?: string;
  retryable: boolean;
}

// Recipe ID generation using content hash
export function generateRecipeId(title: string, ingredients: string[]): string {
  // Create a stable hash from title and ingredients
  const content = `${title.toLowerCase()}:${ingredients.sort().join(",")}`;
  const hash = simpleHash(content);
  return `rcp_${hash}`;
}

// Simple hash function for stable IDs
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(10, '0').substring(0, 10);
}

// Generate unique request ID
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}${random}`;
}

// Create response envelope
export function createResponseEnvelope<T>(
  requestId: string,
  status: ResponseStatus,
  data?: T,
  error?: ErrorObject,
  degradedReason?: string
): ResponseEnvelope<T> {
  return {
    apiVersion: API_VERSION,
    requestId,
    serverTime: new Date().toISOString(),
    status,
    data,
    error,
    degradedReason
  };
}

// Create error response
export function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  hint?: string,
  retryable: boolean = false
): ResponseEnvelope<null> {
  return createResponseEnvelope(
    requestId,
    "error",
    null,
    {
      code,
      message,
      hint,
      retryable
    }
  );
}

// Create degraded response (fallback mode)
export function createDegradedResponse<T>(
  requestId: string,
  reason: string,
  fallbackData: T
): ResponseEnvelope<T> {
  return createResponseEnvelope(
    requestId,
    "degraded",
    fallbackData,
    undefined,
    reason
  );
}

// Recipe response structure
export interface RecipeResponse {
  recipeId: string;
  slug: string;
  title: string;
  summary: string;
  timeMinutes: number;
  difficulty: string;
  primaryIngredients: string[];
  dietTags?: string[];
  fingerprint?: string; // Hash of title + ingredients for validation
}

// Recipe details response structure
export interface RecipeDetailsResponse {
  recipeId: string;
  slug: string;
  title: string;
  timeMinutes: number;
  servings: number;
  difficulty: string;
  ingredients: {
    have: Array<{ name: string; amount?: number; unit?: string }>;
    need: Array<{ name: string; amount?: number; unit?: string }>;
    optional?: Array<{ name: string; amount?: number; unit?: string }>;
  };
  steps: Array<{
    idx: number;
    title?: string;
    minutes?: number;
    text: string;
  }>;
  nutrition?: {
    perServing: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    confidence: string;
  };
  groceryList?: Array<{ name: string }>;
}

// Generate recipes response
export interface GenerateRecipesData {
  recipes: RecipeResponse[];
  text?: string;
}

// Recipe details data
export interface RecipeDetailsData {
  recipe: RecipeDetailsResponse;
  text?: string;
}

// Format recipe from backend response
export function formatRecipeResponse(backendRecipe: any, userIngredients: string[]): RecipeResponse {
  const title = backendRecipe.title || backendRecipe.name || "Untitled Recipe";
  const slug = backendRecipe.id || backendRecipe.slug || title.toLowerCase().replace(/\s+/g, "-");
  const recipeId = generateRecipeId(title, userIngredients);
  
  // Generate fingerprint for validation
  const fingerprint = generateRecipeId(title, userIngredients.sort());
  
  return {
    recipeId,
    slug,
    title,
    summary: backendRecipe.shortDescription || backendRecipe.description || "",
    timeMinutes: backendRecipe.timeMinutes || 30,
    difficulty: backendRecipe.difficulty || "medium",
    primaryIngredients: userIngredients,
    dietTags: backendRecipe.dietTags || [],
    fingerprint
  };
}

// Format recipe details from backend response
export function formatRecipeDetailsResponse(
  backendResponse: any,
  userIngredients: string[],
  recipeId?: string,
  slug?: string
): RecipeDetailsResponse {
  // Handle widget-based response
  const widget = backendResponse.widgets?.[0] || backendResponse;
  
  const title = widget.title || "Untitled Recipe";
  const finalRecipeId = recipeId || generateRecipeId(title, userIngredients);
  const finalSlug = slug || widget.id || title.toLowerCase().replace(/\s+/g, "-");
  
  // Parse ingredients
  const ingredientsHave = (widget.ingredientsHave || []).map((ing: any) => ({
    name: ing.name,
    amount: parseFloat(ing.quantity) || undefined,
    unit: ing.quantity?.replace(/[\d.]/g, "").trim() || undefined
  }));
  
  const ingredientsNeed = (widget.ingredientsNeed || []).map((ing: any) => ({
    name: ing.name,
    amount: parseFloat(ing.quantity) || undefined,
    unit: ing.quantity?.replace(/[\d.]/g, "").trim() || undefined
  }));
  
  // Parse instructions
  const instructions = widget.instructions || [];
  const steps = instructions.map((step: any, idx: number) => {
    const stepText = typeof step === 'string' ? step : (step.text || step.instruction || '');
    const cleanStep = stepText.replace(/^Step \d+:\s*/i, '');
    
    return {
      idx: idx + 1,
      text: cleanStep,
      minutes: step.minutes || undefined,
      title: step.title || undefined
    };
  });
  
  // Parse nutrition
  let nutrition = undefined;
  if (widget.nutrition) {
    nutrition = {
      perServing: {
        kcal: widget.nutrition.calories || 0,
        protein_g: widget.nutrition.protein || 0,
        carbs_g: widget.nutrition.carbs || 0,
        fat_g: widget.nutrition.fat || 0
      },
      confidence: "estimated"
    };
  }
  
  // Generate grocery list from needed ingredients
  const groceryList = ingredientsNeed.map(ing => ({ name: ing.name }));
  
  return {
    recipeId: finalRecipeId,
    slug: finalSlug,
    title,
    timeMinutes: widget.timeMinutes || 30,
    servings: widget.servings || 2,
    difficulty: widget.difficulty || "medium",
    ingredients: {
      have: ingredientsHave,
      need: ingredientsNeed,
      optional: []
    },
    steps,
    nutrition,
    groceryList
  };
}
