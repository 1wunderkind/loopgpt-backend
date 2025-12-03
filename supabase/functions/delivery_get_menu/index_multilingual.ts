/**
 * Get Delivery Recommendations Edge Function (MULTILINGUAL VERSION)
 * Returns delivery partner recommendations with multilingual support
 */

import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";
import { matchDeliveryPartners } from "../_lib/deliveryMatcher.ts";
import { formatDeliveryRecommendations, detectLanguage } from "../_lib/multilingual.ts";
import type { GetDeliveryRecommendationsRequest, GetDeliveryRecommendationsResponse } from "../_lib/types.ts";

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as GetDeliveryRecommendationsRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id"]);

    const {
      chatgpt_user_id,
      cuisine,
      diet,
      calories,
      country = "US",
      limit = 3,
      language, // NEW: Optional language parameter
    } = body;

    // NEW: Detect language from user input
    const userInput = cuisine || diet || "food delivery";
    const detectedLanguage = language || detectLanguage(userInput);
    
    console.log(`[MULTILINGUAL] Detected language: ${detectedLanguage} from input: "${userInput}"`);

    // Match delivery partners
    const recommendations = await matchDeliveryPartners({
      cuisine,
      diet,
      country,
      calories,
    }, limit);

    console.log(`Found ${recommendations.length} delivery partner recommendations`);

    // Build response data
    const responseData: GetDeliveryRecommendationsResponse = {
      success: true,
      recommendations: recommendations.map(r => ({
        partner_id: r.partner_id,
        partner_name: r.partner_name,
        affiliate_url: r.affiliate_url,
        cuisine: r.cuisine,
        commission_rate: r.commission_rate,
        metadata: r.metadata,
      })),
      alternatives: recommendations.length < limit ? ["Try different cuisine", "Expand search area"] : undefined,
      disclaimer: "As a delivery affiliate partner, we earn from qualifying orders.",
    };

    // NEW: Format response in user's language
    const formattedMessage = await formatDeliveryRecommendations(recommendations, userInput);

    console.log(`[MULTILINGUAL] Formatted delivery recommendations in ${detectedLanguage}`);

    // Return response with formatted message
    return createSuccessResponse({
      ...responseData,
      formatted_message: formattedMessage,
      language: detectedLanguage,
    });

  } catch (error) {
    console.error("Error getting delivery recommendations:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
export default withLogging(handler);

