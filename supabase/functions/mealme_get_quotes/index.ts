/**
 * MealMe Get Quotes Edge Function
 *
 * Retrieves delivery quotes for a cart from MealMe API.
 */

import { Logger, withLogging } from "../../middleware/logging.ts";
import {
  ErrorHandler,
  ExternalServiceError,
  ValidationError,
} from "../../middleware/errorHandler.ts";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";
import { createClient } from "@supabase/supabase-js";

const MEALME_API = Deno.env.get("MEALME_API_BASE") || "https://api.mealme.ai";
const API_KEY = Deno.env.get("MEALME_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface GetQuotesRequest {
  cartId: string;
  mode: "groceries" | "restaurants";
  order_id?: string;
}

interface Quote {
  provider?: string;
  name?: string;
  fee?: number;
  eta_minutes?: number;
  eta?: number;
  [key: string]: unknown;
}

interface GetQuotesResponse {
  success: boolean;
  quotes: Quote[];
  cheapest?: Quote | null;
  fastest?: Quote | null;
}

interface MealMeQuotesResponse {
  quotes?: Quote[];
  [key: string]: unknown;
}

async function getQuotes(
  req: GetQuotesRequest,
  logger: Logger,
): Promise<GetQuotesResponse> {
  if (!API_KEY) {
    throw new Error("MEALME_API_KEY environment variable is not set");
  }

  const { cartId, mode, order_id } = req;

  // Validate inputs
  if (!cartId) {
    throw new ValidationError("cartId is required");
  }

  if (!["groceries", "restaurants"].includes(mode)) {
    throw new ValidationError("mode must be 'groceries' or 'restaurants'");
  }

  // Determine endpoint
  const endpoint = mode === "groceries"
    ? `${MEALME_API}/groceries/details/quotes`
    : `${MEALME_API}/restaurants/details/quotes`;

  logger.info(`Fetching ${mode} quotes`, { cartId, mode });

  // Call MealMe API
  const startTime = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ cartId }),
  });
  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`MealMe API error`, undefined, {
      statusCode: response.status,
      errorText,
      duration,
    });
    throw new ExternalServiceError(
      "MealMe",
      `API error: ${response.status} - ${errorText}`,
      response.status >= 500,
    );
  }

  const quotesData = await response.json() as MealMeQuotesResponse | Quote[];

  // Handle both array response and object with quotes property
  let quotes: Quote[] = [];
  if (Array.isArray(quotesData)) {
    quotes = quotesData;
  } else if (quotesData && Array.isArray(quotesData.quotes)) {
    quotes = quotesData.quotes;
  }

  logger.info(`Found delivery quotes`, { count: quotes.length, duration });

  // Find cheapest and fastest
  let cheapest: Quote | null = null;
  let fastest: Quote | null = null;

  if (quotes.length > 0) {
    cheapest = quotes.reduce((prev, curr) =>
      ((curr.fee || 0) < (prev.fee || 0)) ? curr : prev
    );

    fastest = quotes.reduce((prev, curr) =>
      ((curr.eta_minutes || curr.eta || 0) <
          (prev.eta_minutes || prev.eta || 0))
        ? curr
        : prev
    );
  }

  // Store quotes in database if order_id provided
  if (order_id) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const quoteRecords = quotes.map((quote) => ({
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
      logger.error(`Failed to store quotes`, new Error(quotesError.message));
    } else {
      logger.info(`Stored quotes for order`, {
        orderId: order_id,
        count: quoteRecords.length,
      });
    }
  }

  return {
    success: true,
    quotes,
    cheapest,
    fastest,
  };
}

const handler = async (req: Request, logger: Logger): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as unknown;

    // Validate request body
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid request body");
    }

    const typedBody = body as Record<string, unknown>;

    if (typeof typedBody.cartId !== "string") {
      throw new ValidationError("cartId is required and must be a string");
    }

    if (typedBody.mode !== "groceries" && typedBody.mode !== "restaurants") {
      throw new ValidationError("mode must be 'groceries' or 'restaurants'");
    }

    const request: GetQuotesRequest = {
      cartId: typedBody.cartId,
      mode: typedBody.mode,
      order_id: typeof typedBody.order_id === "string"
        ? typedBody.order_id
        : undefined,
    };

    // Get quotes
    const result = await getQuotes(request, logger);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return ErrorHandler.handleError(error);
  }
};

// Export with logging middleware
// withLogging is not compatible with withSearchAPI in this context, using withSearchAPI directly
// We need to wrap withLogging manually or update withSearchAPI to handle it
// For now, let's assume withSearchAPI expects a simple handler, so we wrap it inside
export default withSearchAPI(withLogging(handler, "mealme_get_quotes"));
