/**
 * Normalize Ingredients Edge Function
 * 
 * Normalizes ingredient names for better MealMe search results.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { 
  normalizeIngredients, 
  groupIngredients, 
  toMealMeCartItems,
  validateIngredients,
} from "../../../lib/ingredientNormalizer.ts";

interface NormalizeRequest {
  ingredients: string[];
  group?: boolean;
}

interface NormalizeResponse {
  success: boolean;
  normalized: Array<{
    original: string;
    normalized: string;
    qty: number;
    unit?: string;
  }>;
  cartItems: Array<{
    name: string;
    qty: number;
    skuHint?: string;
  }>;
}

function normalize(req: NormalizeRequest): NormalizeResponse {
  const { ingredients, group = true } = req;

  // Validate ingredients
  const validation = validateIngredients(ingredients);
  if (!validation.valid) {
    throw new Error(`Invalid ingredients: ${validation.errors.join(", ")}`);
  }

  console.log(`[Normalize] Processing ${ingredients.length} ingredients`);

  // Normalize ingredients
  let normalized = normalizeIngredients(ingredients);

  // Group similar ingredients if requested
  if (group) {
    normalized = groupIngredients(normalized);
    console.log(`[Normalize] Grouped to ${normalized.length} unique ingredients`);
  }

  // Convert to MealMe cart items
  const cartItems = toMealMeCartItems(normalized);

  return {
    success: true,
    normalized,
    cartItems,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as NormalizeRequest;

    // Normalize ingredients
    const result = normalize(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withLogging(handler, "normalize_ingredients");

