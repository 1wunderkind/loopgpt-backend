/**
 * MealMe Checkout URL Edge Function
 * 
 * Generates a checkout URL for MealMe SDK.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";

const SDK_BASE = Deno.env.get("MEALME_SDK_BASE") || "https://sdk.mealme.ai";
const PARTNER = Deno.env.get("MEALME_PARTNER_NAME") || "whatsfordinner";

interface CheckoutUrlRequest {
  cartId: string;
  useConnect?: boolean;
}

interface CheckoutUrlResponse {
  success: boolean;
  checkoutUrl: string;
}

function generateCheckoutUrl(req: CheckoutUrlRequest): CheckoutUrlResponse {
  const { cartId, useConnect = true } = req;

  // Validate inputs
  if (!cartId) {
    throw new Error("cartId is required");
  }

  console.log(`[MealMe Checkout] Generating checkout URL for cart ${cartId}`);

  // Build checkout URL
  const url = new URL(`${SDK_BASE}/checkout`);
  url.searchParams.set("api", PARTNER);
  url.searchParams.set("cartId", cartId);

  if (useConnect) {
    url.searchParams.set("useMealmeConnect", "true");
  }

  const checkoutUrl = url.toString();

  console.log(`[MealMe Checkout] Generated URL: ${checkoutUrl}`);

  return {
    success: true,
    checkoutUrl,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as CheckoutUrlRequest;

    // Generate checkout URL
    const result = generateCheckoutUrl(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withLogging(handler, "mealme_checkout_url");

