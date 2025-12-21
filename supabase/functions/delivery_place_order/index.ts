/**
 * MealMe Order Plan Edge Function
 *
 * Orchestrates the full flow: normalize ingredients → create cart → get quotes → checkout URL
 * This is the main entry point for MealPlannerGPT to order a meal plan.
 *
 * RELIABILITY: Wrapped with timeout but NO retries (write operation)
 */

import { Logger, withLogging } from "../../middleware/logging.ts";
import {
  ErrorHandler,
  ExternalServiceError,
  ValidationError,
} from "../../middleware/errorHandler.ts";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import {
  fetchWithTimeout,
  type ToolResult,
  withToolReliability,
} from "../mcp-server/lib/reliability.ts";

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
  cart: Record<string, unknown>;
  quotes: Record<string, unknown>[];
  cheapest?: Record<string, unknown>;
  fastest?: Record<string, unknown>;
  checkoutUrl: string;
}

interface NormalizeResponse {
  normalized: unknown[];
  cartItems: unknown[];
}

interface CreateCartResponse {
  cart: {
    cartId: string;
    [key: string]: unknown;
  };
  order_id: string;
}

interface GetQuotesResponse {
  quotes: Record<string, unknown>[];
  cheapest?: Record<string, unknown>;
  fastest?: Record<string, unknown>;
}

interface CheckoutUrlResponse {
  checkoutUrl: string;
}

/**
 * Core order implementation (extracted for reliability wrapping)
 * NOTE: This is a WRITE operation, so we do NOT retry to avoid duplicate orders
 */
async function implOrderPlan(
  req: OrderPlanRequest,
  logger: Logger,
): Promise<OrderPlanResponse> {
  const {
    chatgpt_user_id,
    latitude,
    longitude,
    ingredients,
    mode = "groceries",
  } = req;

  logger.info(`Starting order flow`, {
    userId: chatgpt_user_id,
    ingredientCount: ingredients.length,
  });

  // Step 1: Normalize ingredients
  logger.info("Step 1: Normalizing ingredients");

  const normalizeResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/normalize_ingredients`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "x-request-id": logger["context"].requestId || crypto.randomUUID(),
      },
      body: JSON.stringify({ ingredients }),
    },
    10000, // 10 second timeout for normalization
  );

  if (!normalizeResponse.ok) {
    throw new ExternalServiceError(
      "NormalizeIngredients",
      `Failed to normalize ingredients: ${normalizeResponse.statusText}`,
      normalizeResponse.status >= 500,
    );
  }

  const normalizeData = await normalizeResponse.json() as NormalizeResponse;
  const { cartItems } = normalizeData;
  logger.info(`Normalized ingredients`, {
    originalCount: ingredients.length,
    cartItemCount: cartItems.length,
  });

  // Step 2: Create cart
  logger.info("Step 2: Creating cart");

  const cartResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_create_cart`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "x-request-id": logger["context"].requestId || crypto.randomUUID(),
      },
      body: JSON.stringify({
        chatgpt_user_id,
        latitude,
        longitude,
        items: cartItems,
        mode,
      }),
    },
    10000, // 10 second timeout
  );

  if (!cartResponse.ok) {
    throw new ExternalServiceError(
      "CreateCart",
      `Failed to create cart: ${cartResponse.statusText}`,
      cartResponse.status >= 500,
    );
  }

  const cartData = await cartResponse.json() as CreateCartResponse;
  const { cart, order_id } = cartData;
  logger.info(`Cart created`, { cartId: cart.cartId, orderId: order_id });

  // Step 3: Get delivery quotes
  logger.info("Step 3: Getting delivery quotes");

  const quotesResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_get_quotes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "x-request-id": logger["context"].requestId || crypto.randomUUID(),
      },
      body: JSON.stringify({
        cartId: cart.cartId,
        mode,
        order_id,
      }),
    },
    10000, // 10 second timeout
  );

  if (!quotesResponse.ok) {
    throw new ExternalServiceError(
      "GetQuotes",
      `Failed to get quotes: ${quotesResponse.statusText}`,
      quotesResponse.status >= 500,
    );
  }

  const quotesData = await quotesResponse.json() as GetQuotesResponse;
  const { quotes, cheapest, fastest } = quotesData;
  logger.info(`Found delivery quotes`, { count: quotes.length });

  // Step 4: Generate checkout URL
  logger.info("Step 4: Generating checkout URL");

  const checkoutResponse = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/mealme_checkout_url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "x-request-id": logger["context"].requestId || crypto.randomUUID(),
      },
      body: JSON.stringify({
        cartId: cart.cartId,
        useConnect: true,
      }),
    },
    10000, // 10 second timeout
  );

  if (!checkoutResponse.ok) {
    throw new ExternalServiceError(
      "CheckoutUrl",
      `Failed to generate checkout URL: ${checkoutResponse.statusText}`,
      checkoutResponse.status >= 500,
    );
  }

  const checkoutData = await checkoutResponse.json() as CheckoutUrlResponse;
  const { checkoutUrl } = checkoutData;
  logger.info(`Checkout URL generated`);

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
function orderPlan(
  req: OrderPlanRequest,
  logger: Logger,
): Promise<ToolResult<OrderPlanResponse>> {
  return withToolReliability(
    () => implOrderPlan(req, logger),
    {
      toolName: "delivery_place_order",
      timeoutMs: 45000, // 45 second total timeout (4 steps × ~10s each)
      maxRetries: 0, // NO RETRIES for write operations
      retryDelayMs: 0, // Not used (no retries)
      retryOnCodes: [], // Do not retry any errors
    },
  );
}

const handler = async (req: Request, logger: Logger): Promise<Response> => {
  try {
    // Kill Switch Check
    if (Deno.env.get("DISABLE_ORDERING") === "true") {
      logger.warn("Ordering is disabled via kill switch");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ordering is temporarily disabled for maintenance.",
          code: "ORDERING_DISABLED",
          retryable: true, // Client can try again later
        }),
        {
          status: 503, // Service Unavailable
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body = await req.json() as unknown;

    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid request body");
    }

    const typedBody = body as Record<string, unknown>;

    // Validate required fields
    if (typeof typedBody.chatgpt_user_id !== "string") {
      throw new ValidationError("chatgpt_user_id is required");
    }

    if (
      typeof typedBody.latitude !== "number" ||
      typeof typedBody.longitude !== "number"
    ) {
      throw new ValidationError("latitude and longitude are required");
    }

    if (
      !Array.isArray(typedBody.ingredients) ||
      typedBody.ingredients.length === 0
    ) {
      throw new ValidationError(
        "ingredients array is required and must not be empty",
      );
    }

    const request: OrderPlanRequest = {
      chatgpt_user_id: typedBody.chatgpt_user_id,
      latitude: typedBody.latitude,
      longitude: typedBody.longitude,
      ingredients: typedBody.ingredients.map(String),
      mode: (typedBody.mode === "restaurants" || typedBody.mode === "groceries")
        ? typedBody.mode
        : undefined,
    };

    // Order plan with reliability wrapper
    const result = await orderPlan(request, logger);

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
        },
      );
    }
  } catch (error) {
    return ErrorHandler.handleError(error);
  }
};

// Export with logging and security middleware
export default withOrderAPI(withLogging(handler, "mealme_order_plan"));
