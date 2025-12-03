/**
 * Get Delivery Recommendations Edge Function
 * Returns food delivery affiliate options based on cuisine, diet, and location
 */

import { withLogging } from "../../middleware/logging.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequired,
  AppError,
  ErrorCodes,
} from "../../middleware/errorHandler.ts";
import { buildDeliveryAffiliateLinks, getAffiliateDisclosure } from "../_lib/deliveryAffiliate.ts";
import { rankPartners, suggestAlternativeCuisines } from "../_lib/deliveryMatcher.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
import { withSearchAPI } from "../_shared/security/applyMiddleware.ts";
import type {
  GetDeliveryRecommendationsRequest,
  GetDeliveryRecommendationsResponse,
  DeliveryPartner,
  DeliveryMatchCriteria,
} from "../_lib/types.ts";

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = (await req.json()) as GetDeliveryRecommendationsRequest;

    // Validate required fields
    validateRequired(body, ["chatgpt_user_id"]);

    const {
      chatgpt_user_id,
      cuisine,
      diet,
      calories,
      country = "US",
      limit = 3,
    } = body;

    console.log(
      `Fetching delivery recommendations for user ${chatgpt_user_id}, cuisine: ${cuisine}, diet: ${diet}`
    );

    // Get authenticated Supabase client (enforces RLS)


    const { supabase, userId, error: authError } = await createAuthenticatedClient(req);


    


    if (authError) {


      return new Response(


        JSON.stringify({ ok: false, error: authError }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    if (!userId) {


      return new Response(


        JSON.stringify({ ok: false, error: "Authentication required" }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // Query active delivery partners
    const { data: partners, error: partnersError } = await supabase
      .from("delivery_partners")
      .select("*")
      .eq("active", true);

    if (partnersError) {
      throw new AppError(
        ErrorCodes.DATABASE_ERROR,
        `Failed to fetch delivery partners: ${partnersError.message}`,
        500
      );
    }

    if (!partners || partners.length === 0) {
      throw new AppError(
        ErrorCodes.NOT_FOUND,
        "No delivery partners available",
        404
      );
    }

    console.log(`Found ${partners.length} active delivery partners`);

    // Build match criteria
    const criteria: DeliveryMatchCriteria = {
      cuisine,
      diet,
      country,
      calories,
    };

    // Rank partners by match score
    const rankedPartners = rankPartners(partners as DeliveryPartner[], criteria, limit);

    if (rankedPartners.length === 0) {
      // No matches found - suggest alternatives
      const alternatives = suggestAlternativeCuisines(
        cuisine || "pizza",
        partners as DeliveryPartner[]
      );

      console.log(`No matches for ${cuisine}, suggesting alternatives: ${alternatives.join(", ")}`);

      return createSuccessResponse({
        success: true,
        recommendations: [],
        alternatives,
        disclaimer: getAffiliateDisclosure(),
        message: `No ${cuisine} delivery options found. Try these alternatives: ${alternatives.join(", ")}`,
      });
    }

    // Build affiliate links for matched partners
    const affiliateLinks = buildDeliveryAffiliateLinks(
      rankedPartners.map((r) => r.partner),
      cuisine || "food",
      country
    );

    console.log(`Generated ${affiliateLinks.length} delivery recommendations`);

    // Log recommendations to database for analytics
    const recommendationsToLog = affiliateLinks.map((link) => ({
      chatgpt_user_id,
      cuisine_tag: cuisine,
      diet,
      calories,
      partner_id: link.partner_id,
      partner_name: link.partner_name,
      affiliate_url: link.affiliate_url,
      metadata: {
        country,
        match_score: rankedPartners.find((r) => r.partner.id === link.partner_id)
          ?.matchScore,
        match_reasons: rankedPartners.find((r) => r.partner.id === link.partner_id)
          ?.matchReasons,
      },
    }));

    const { error: logError } = await supabase
      .from("delivery_recommendations")
      .insert(recommendationsToLog);

    if (logError) {
      console.warn(`Failed to log recommendations: ${logError.message}`);
      // Don't fail the request if logging fails
    }

    // Build response
    const response: GetDeliveryRecommendationsResponse = {
      success: true,
      recommendations: affiliateLinks,
      disclaimer: getAffiliateDisclosure(),
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("Error in get_delivery_recommendations:", error);
    return createErrorResponse(error as Error);
  }
}

export default withSearchAPI(withLogging(handler, "get_delivery_recommendations"));

