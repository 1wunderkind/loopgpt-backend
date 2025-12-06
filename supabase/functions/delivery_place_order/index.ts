/**
 * MealMe Order Plan Edge Function
 * 
 * Orchestrates the full flow: normalize ingredients → create cart → get quotes → checkout URL
 * This is the main entry point for MealPlannerGPT to order a meal plan.
 * 
 * RELIABILITY: Wrapped with timeout but NO retries (write operation)
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import { 
  withToolReliability, 
  fetchWithTimeout,
  type ToolResult 
} from "../mcp-server/lib/reliability.ts";

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

/**
 * Core order implementation (extracted for reliability wrapping)
 * NOTE: This is a WRITE operation, so we do NOT retry to avoid duplicate orders
 */
async function implOrderPlan(req: OrderPlanRequest): Promise<OrderPlanResponse> {
  const { chatgpt_user_id, latitude, longitude, ingredients, mode = "groceries" } = req;

  console.log(`[MealMe Order] Starting order flow for user ${chatgpt_user_id} with ${ingredients.length} ingredients`);

  // Step 1: Normalize ingredients
  console.log("[MealMe Order] Step 1: Normalizing ingredients...");
  
  const normalizeResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/normalize_ingredients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ ingredients }),
    },
    10000 // 10 second timeout for normalization
  );

  if (!normalizeResponse.ok) {
    const error: any = new Error(`Failed to normalize ingredients: ${normalizeResponse.statusText}`);
    error.status = normalizeResponse.status;
    throw error;
  }

  const { normalized, cartItems } = await normalizeResponse.json();
  console.log(`[MealMe Order] Normalized ${ingredients.length} ingredients to ${cartItems.length} cart items`);

  // Step 2: Create cart
  console.log("[MealMe Order] Step 2: Creating cart...");
  
  const cartResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_create_cart`,
    {
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
    },
    10000 // 10 second timeout
  );

  if (!cartResponse.ok) {
    const error: any = new Error(`Failed to create cart: ${cartResponse.statusText}`);
    error.status = cartResponse.status;
    throw error;
  }

  const { cart, order_id } = await cartResponse.json();
  console.log(`[MealMe Order] Cart created: ${cart.cartId}, order: ${order_id}`);

  // Step 3: Get delivery quotes
  console.log("[MealMe Order] Step 3: Getting delivery quotes...");
  
  const quotesResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_get_quotes`,
    {
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
    },
    10000 // 10 second timeout
  );

  if (!quotesResponse.ok) {
    const error: any = new Error(`Failed to get quotes: ${quotesResponse.statusText}`);
    error.status = quotesResponse.status;
    throw error;
  }

  const { quotes, cheapest, fastest } = await quotesResponse.json();
  console.log(`[MealMe Order] Found ${quotes.length} delivery quotes`);

  // Step 4: Generate checkout URL
  console.log("[MealMe Order] Step 4: Generating checkout URL...");
  
  const checkoutResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_checkout_url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        cartId: cart.cartId,
        useConnect: true,
      }),
    },
    10000 // 10 second timeout
  );

  if (!checkoutResponse.ok) {
    const error: any = new Error(`Failed to generate checkout URL: ${checkoutResponse.statusText}`);
    error.status = checkoutResponse.status;
    throw error;
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

/**
 * Wrapped order function with reliability features
 * NOTE: NO RETRIES for write operations to avoid duplicate orders
 */
async function orderPlan(req: OrderPlanRequest): Promise<ToolResult<OrderPlanResponse>> {
  return withToolReliability(
    () => implOrderPlan(req),
    {
      toolName: "delivery_place_order",
      timeoutMs: 45000,          // 45 second total timeout (4 steps × ~10s each)
      maxRetries: 0,             // NO RETRIES for write operations
      retryDelayMs: 0,           // Not used (no retries)
      retryOnCodes: [],          // Do not retry any errors
    }
  );
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

    // Order plan with reliability wrapper
    const result = await orderPlan(body);

    // Handle success/failure from reliability layer
    if (result.ok) {
      return new Response(JSON.stringify(result.data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Return error in response body (not as HTTP error)
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error.message,
          code: result.error.code,
          retryable: result.error.retryable,
          details: result.error.details,
        }),
        {
          status: 200, // Return 200 even for errors
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging and security middleware
export default withOrderAPI(withLogging(handler, "mealme_order_plan"));
