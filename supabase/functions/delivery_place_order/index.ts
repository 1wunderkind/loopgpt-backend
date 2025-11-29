/**
 * MealMe Order Plan Edge Function
 * 
 * Orchestrates the full flow: normalize ingredients → create cart → get quotes → checkout URL
 * This is the main entry point for MealPlannerGPT to order a meal plan.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";

import { createAuthenticatedClient } from "../_lib/auth.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface OrderPlanRequest {
  chatgpt_user_id: string;
  latitude: number;
  longitude: number;
  ingredients: string[];
  mode?: "groceries" | "restaurants";
}

interface OrderPlanResponse {
  success: boolean;
  order_id: string;
  cart: any;
  quotes: any[];
  cheapest?: any;
  fastest?: any;
  checkoutUrl: string;
}

async function orderPlan(req: OrderPlanRequest): Promise<OrderPlanResponse> {
  const { chatgpt_user_id, latitude, longitude, ingredients, mode = "groceries" } = req;

  console.log(`[MealMe Order] Starting order flow for user ${chatgpt_user_id} with ${ingredients.length} ingredients`);

  // Step 1: Normalize ingredients
  console.log("[MealMe Order] Step 1: Normalizing ingredients...");
  
  const normalizeResponse = await fetch(`${SUPABASE_URL}/functions/v1/normalize_ingredients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ ingredients }),
  });

  if (!normalizeResponse.ok) {
    throw new Error(`Failed to normalize ingredients: ${normalizeResponse.statusText}`);
  }

  const { normalized, cartItems } = await normalizeResponse.json();
  console.log(`[MealMe Order] Normalized ${ingredients.length} ingredients to ${cartItems.length} cart items`);

  // Step 2: Create cart
  console.log("[MealMe Order] Step 2: Creating cart...");
  
  const cartResponse = await fetch(`${SUPABASE_URL}/functions/v1/mealme_create_cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      chatgpt_user_id,
      latitude,
      longitude,
      items: cartItems,
      mode,
    }),
  });

  if (!cartResponse.ok) {
    throw new Error(`Failed to create cart: ${cartResponse.statusText}`);
  }

  const { cart, order_id } = await cartResponse.json();
  console.log(`[MealMe Order] Cart created: ${cart.cartId}, order: ${order_id}`);

  // Step 3: Get delivery quotes
  console.log("[MealMe Order] Step 3: Getting delivery quotes...");
  
  const quotesResponse = await fetch(`${SUPABASE_URL}/functions/v1/mealme_get_quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      cartId: cart.cartId,
      mode,
      order_id,
    }),
  });

  if (!quotesResponse.ok) {
    throw new Error(`Failed to get quotes: ${quotesResponse.statusText}`);
  }

  const { quotes, cheapest, fastest } = await quotesResponse.json();
  console.log(`[MealMe Order] Found ${quotes.length} delivery quotes`);

  // Step 4: Generate checkout URL
  console.log("[MealMe Order] Step 4: Generating checkout URL...");
  
  const checkoutResponse = await fetch(`${SUPABASE_URL}/functions/v1/mealme_checkout_url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      cartId: cart.cartId,
      useConnect: true,
    }),
  });

  if (!checkoutResponse.ok) {
    throw new Error(`Failed to generate checkout URL: ${checkoutResponse.statusText}`);
  }

  const { checkoutUrl } = await checkoutResponse.json();
  console.log(`[MealMe Order] Checkout URL generated: ${checkoutUrl}`);

  return {
    success: true,
    order_id,
    cart,
    quotes,
    cheapest,
    fastest,
    checkoutUrl,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as OrderPlanRequest;

    // Validate required fields
    if (!body.chatgpt_user_id) {
      throw new Error("chatgpt_user_id is required");
    }

    if (!body.latitude || !body.longitude) {
      throw new Error("latitude and longitude are required");
    }

    if (!body.ingredients || body.ingredients.length === 0) {
      throw new Error("ingredients array is required and must not be empty");
    }

    // Order plan
    const result = await orderPlan(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withLogging(handler, "mealme_order_plan");

