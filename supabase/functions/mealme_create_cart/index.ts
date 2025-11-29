/**
 * MealMe Create Cart Edge Function
 * 
 * Creates a shopping cart from meal plan ingredients or prepared meals
 * via MealMe API.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
const MEALME_API = Deno.env.get("MEALME_API_BASE") || "https://api.mealme.ai";
const API_KEY = Deno.env.get("MEALME_API_KEY");
const PARTNER = Deno.env.get("MEALME_PARTNER_NAME") || "whatsfordinner";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CartItem {
  name: string;
  qty: number;
  skuHint?: string;
}

interface CreateCartRequest {
  chatgpt_user_id: string;
  latitude: number;
  longitude: number;
  items: CartItem[];
  mode: "groceries" | "restaurants";
}

interface CreateCartResponse {
  success: boolean;
  cart: any;
  order_id: string;
}

async function createCart(req: CreateCartRequest): Promise<CreateCartResponse> {
  if (!API_KEY) {
    throw new Error("MEALME_API_KEY environment variable is not set");
  }

  const { chatgpt_user_id, latitude, longitude, items, mode } = req;

  // Validate inputs
  if (!chatgpt_user_id) {
    throw new Error("chatgpt_user_id is required");
  }

  if (!latitude || !longitude) {
    throw new Error("latitude and longitude are required");
  }

  if (!items || items.length === 0) {
    throw new Error("items array is required and must not be empty");
  }

  if (!["groceries", "restaurants"].includes(mode)) {
    throw new Error("mode must be 'groceries' or 'restaurants'");
  }

  // Determine endpoint
  const endpoint = mode === "groceries"
    ? `${MEALME_API}/groceries/search/cart`
    : `${MEALME_API}/restaurants/search/cart`;

  console.log(`[MealMe Cart] Creating ${mode} cart with ${items.length} items for user ${chatgpt_user_id}`);

  // Call MealMe API
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      latitude,
      longitude,
      items: items.map(i => ({
        name: i.name,
        quantity: i.qty,
        sku: i.skuHint,
      })),
      partner: PARTNER,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MealMe Cart] API error: ${response.status} - ${errorText}`);
    throw new Error(`MealMe API error: ${response.status} - ${errorText}`);
  }

  const cartData = await response.json();

  console.log(`[MealMe Cart] Cart created: ${cartData?.cartId || 'unknown'}`);

  // Create order record in database
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      chatgpt_user_id,
      country: "US", // US-only for now
      cart_id: cartData?.cartId,
      provider: "mealme",
      subtotal: cartData?.estimatedSubtotal || 0,
      status: "cart_created",
    })
    .select()
    .single();

  if (orderError) {
    console.error(`[MealMe Cart] Database error: ${orderError.message}`);
    throw new Error(`Failed to create order record: ${orderError.message}`);
  }

  // Insert order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    name: item.name,
    qty: item.qty,
    sku: item.skuHint,
    meta: {},
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error(`[MealMe Cart] Failed to insert order items: ${itemsError.message}`);
  }

  console.log(`[MealMe Cart] Order record created: ${order.id}`);

  return {
    success: true,
    cart: cartData,
    order_id: order.id,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as CreateCartRequest;

    // Create cart
    const result = await createCart(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withLogging(handler, "mealme_create_cart");

