/**
 * MealMe Get Quotes Edge Function
 * 
 * Retrieves delivery quotes for a cart from MealMe API.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";
const MEALME_API = Deno.env.get("MEALME_API_BASE") || "https://api.mealme.ai";
const API_KEY = Deno.env.get("MEALME_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface GetQuotesRequest {
  cartId: string;
  mode: "groceries" | "restaurants";
  order_id?: string;
}

interface GetQuotesResponse {
  success: boolean;
  quotes: any[];
  cheapest?: any;
  fastest?: any;
}

async function getQuotes(req: GetQuotesRequest): Promise<GetQuotesResponse> {
  if (!API_KEY) {
    throw new Error("MEALME_API_KEY environment variable is not set");
  }

  const { cartId, mode, order_id } = req;

  // Validate inputs
  if (!cartId) {
    throw new Error("cartId is required");
  }

  if (!["groceries", "restaurants"].includes(mode)) {
    throw new Error("mode must be 'groceries' or 'restaurants'");
  }

  // Determine endpoint
  const endpoint = mode === "groceries"
    ? `${MEALME_API}/groceries/details/quotes`
    : `${MEALME_API}/restaurants/details/quotes`;

  console.log(`[MealMe Quotes] Fetching ${mode} quotes for cart ${cartId}`);

  // Call MealMe API
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ cartId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MealMe Quotes] API error: ${response.status} - ${errorText}`);
    throw new Error(`MealMe API error: ${response.status} - ${errorText}`);
  }

  const quotesData = await response.json();
  const quotes = quotesData?.quotes || quotesData || [];

  console.log(`[MealMe Quotes] Found ${quotes.length} delivery quotes`);

  // Find cheapest and fastest
  let cheapest = null;
  let fastest = null;

  if (quotes.length > 0) {
    cheapest = quotes.reduce((prev: any, curr: any) => 
      (curr.fee < prev.fee) ? curr : prev
    );

    fastest = quotes.reduce((prev: any, curr: any) => 
      (curr.eta_minutes < prev.eta_minutes) ? curr : prev
    );
  }

  // Store quotes in database if order_id provided
  if (order_id) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const quoteRecords = quotes.map((quote: any) => ({
      order_id,
      provider: quote.provider || quote.name || "unknown",
      eta_minutes: quote.eta_minutes || quote.eta || 0,
      fee: quote.fee || 0,
      is_cheapest: quote === cheapest,
      is_fastest: quote === fastest,
      raw: quote,
    }));

    const { error: quotesError } = await supabase
      .from("delivery_quotes")
      .insert(quoteRecords);

    if (quotesError) {
      console.error(`[MealMe Quotes] Failed to store quotes: ${quotesError.message}`);
    } else {
      console.log(`[MealMe Quotes] Stored ${quoteRecords.length} quotes for order ${order_id}`);
    }
  }

  return {
    success: true,
    quotes,
    cheapest,
    fastest,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as GetQuotesRequest;

    // Get quotes
    const result = await getQuotes(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withSearchAPI(withLogging(handler, "mealme_get_quotes"));

