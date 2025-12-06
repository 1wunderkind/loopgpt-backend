/**
 * MealMe Search Edge Function
 * 
 * Searches for stores, restaurants, or products via MealMe API
 * based on user location and query.
 * 
 * RELIABILITY: Wrapped with timeout and retry logic
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";
import { 
  withToolReliability, 
  fetchWithTimeout,
  type ToolResult 
} from "../mcp-server/lib/reliability.ts";

const MEALME_API = Deno.env.get("MEALME_API_BASE") || "https://api.mealme.ai";
const API_KEY = Deno.env.get("MEALME_API_KEY");

interface SearchRequest {
  latitude: number;
  longitude: number;
  query?: string;
  mode: "groceries" | "restaurants";
  limit?: number;
}

interface SearchResponse {
  success: boolean;
  results: any[];
  count: number;
}

/**
 * Core search implementation (extracted for reliability wrapping)
 */
async function implSearchMealMe(req: SearchRequest): Promise<SearchResponse> {
  if (!API_KEY) {
    throw new Error("MEALME_API_KEY environment variable is not set");
  }

  const { latitude, longitude, query = "", mode, limit = 20 } = req;

  // Validate inputs
  if (!latitude || !longitude) {
    throw new Error("latitude and longitude are required");
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }

  if (!["groceries", "restaurants"].includes(mode)) {
    throw new Error("mode must be 'groceries' or 'restaurants'");
  }

  // Determine endpoint
  const endpoint = mode === "groceries"
    ? `${MEALME_API}/groceries/search`
    : `${MEALME_API}/restaurants/search`;

  console.log(`[MealMe Search] Searching ${mode} near (${latitude}, ${longitude}) for "${query}"`);

  // Call MealMe API with timeout
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        query,
        limit,
      }),
    },
    8000 // 8 second timeout
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MealMe Search] API error: ${response.status} - ${errorText}`);
    
    // Create error with status code for proper classification
    const error: any = new Error(`MealMe API error: ${response.status} - ${errorText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  console.log(`[MealMe Search] Found ${data?.results?.length || 0} results`);

  return {
    success: true,
    results: data?.results || data || [],
    count: data?.results?.length || 0,
  };
}

/**
 * Wrapped search function with reliability features
 */
async function searchMealMe(req: SearchRequest): Promise<ToolResult<SearchResponse>> {
  return withToolReliability(
    () => implSearchMealMe(req),
    {
      toolName: "delivery_search_restaurants",
      timeoutMs: 8000,           // 8 second timeout
      maxRetries: 2,             // Retry up to 2 times (3 total attempts)
      retryDelayMs: 400,         // Start with 400ms, exponential backoff
      retryOnCodes: ["NETWORK_ERROR", "UPSTREAM_5XX", "TIMEOUT"], // Only retry on safe errors
    }
  );
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as SearchRequest;

    // Search MealMe with reliability wrapper
    const result = await searchMealMe(body);

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

// Export with logging middleware
export default withSearchAPI(withLogging(handler, "mealme_search"));
