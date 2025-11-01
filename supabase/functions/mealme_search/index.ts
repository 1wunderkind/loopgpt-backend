/**
 * MealMe Search Edge Function
 * 
 * Searches for stores, restaurants, or products via MealMe API
 * based on user location and query.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";

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

async function searchMealMe(req: SearchRequest): Promise<SearchResponse> {
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
      query,
      limit,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MealMe Search] API error: ${response.status} - ${errorText}`);
    throw new Error(`MealMe API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  console.log(`[MealMe Search] Found ${data?.results?.length || 0} results`);

  return {
    success: true,
    results: data?.results || data || [],
    count: data?.results?.length || 0,
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const body = await req.json() as SearchRequest;

    // Search MealMe
    const result = await searchMealMe(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withLogging(handler, "mealme_search");

