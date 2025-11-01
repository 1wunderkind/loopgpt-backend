/**
 * Get Delivery Recommendations Edge Function (WITH GEOLOCATION)
 * Returns food delivery affiliate options based on cuisine, diet, and user's confirmed location
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequired,
  AppError,
  ErrorCodes,
} from "../../middleware/errorHandler.ts";
import { buildDeliveryAffiliateLinks, getAffiliateDisclosure } from "../../../../lib/deliveryAffiliate.ts";
import { rankPartners, suggestAlternativeCuisines } from "../../../../lib/deliveryMatcher.ts";
import { formatDeliveryRecommendations, detectLanguage } from "../../../../lib/multilingual.ts";
import {
  formatCountryDisplay,
  needsLocationConfirmation,
  generateLocationConfirmationPrompt,
  getAlternativeCountries,
  calculateLocationConfidence,
} from "../../../../lib/locationUtils.ts";
import type {
  GetDeliveryRecommendationsRequest,
  GetDeliveryRecommendationsResponse,
  DeliveryPartner,
  DeliveryMatchCriteria,
} from "../../../../lib/types.ts";

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
      language,
      confirmed_country, // NEW: User-confirmed country (if provided)
      limit = 3,
    } = body;

    console.log(
      `Fetching delivery recommendations for user ${chatgpt_user_id}, cuisine: ${cuisine}, diet: ${diet}`
    );

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Detect language from user input
    const userInput = cuisine || diet || "food delivery";
    const detectedLanguage = language || detectLanguage(userInput);

    console.log(`[MULTILINGUAL] Detected language: ${detectedLanguage}`);

    // Step 2: Get user location (NEW - GEOLOCATION)
    const geoHint = req.headers.get("X-User-Country") || undefined;

    const locationResponse = await fetch(`${supabaseUrl}/functions/v1/get_user_location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatgpt_user_id,
        detected_language: detectedLanguage,
        geo_hint: geoHint,
      }),
    });

    const locationData = await locationResponse.json();

    console.log(`[GEOLOCATION] Location data:`, locationData);

    // Step 3: Check if location confirmation is needed
    if (locationData.needs_confirmation && !confirmed_country) {
      const confidence = calculateLocationConfidence(
        locationData.source,
        detectedLanguage === locationData.language
      );

      if (needsLocationConfirmation(confidence)) {
        // Generate confirmation prompt
        const alternatives = getAlternativeCountries(detectedLanguage, locationData.country, 1);
        const confirmationPrompt = generateLocationConfirmationPrompt(
          detectedLanguage,
          locationData.country || alternatives[0],
          alternatives
        );

        console.log(`[GEOLOCATION] Needs confirmation: ${confirmationPrompt}`);

        // Return early with confirmation prompt
        return createSuccessResponse({
          needs_location_confirmation: true,
          confirmation_prompt: confirmationPrompt,
          detected_language: detectedLanguage,
          suggested_country: locationData.country || alternatives[0],
          alternative_countries: alternatives,
        });
      }
    }

    // Step 4: If user provided confirmed_country, update profile
    if (confirmed_country) {
      console.log(`[GEOLOCATION] User confirmed country: ${confirmed_country}`);

      await fetch(`${supabaseUrl}/functions/v1/update_user_location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatgpt_user_id,
          language: detectedLanguage,
          confirmed_country,
        }),
      });

      locationData.country = confirmed_country;
      locationData.needs_confirmation = false;
    }

    const userCountry = locationData.country;

    console.log(`[GEOLOCATION] Using country: ${userCountry}`);

    // Step 5: Get affiliates for user's country (NEW - GEOLOCATION)
    const affiliatesResponse = await fetch(`${supabaseUrl}/functions/v1/get_affiliate_by_country`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: userCountry }),
    });

    const affiliatesData = await affiliatesResponse.json();

    console.log(`[GEOLOCATION] Found ${affiliatesData.count} affiliates for ${userCountry}`);

    if (!affiliatesData.affiliates || affiliatesData.affiliates.length === 0) {
      // No affiliates for this country
      const countryDisplay = formatCountryDisplay(userCountry);
      
      return createSuccessResponse({
        success: true,
        recommendations: [],
        user_country: userCountry,
        message: `We don't have delivery partners in ${countryDisplay} yet. We're working on expanding to your region!`,
        disclaimer: getAffiliateDisclosure(),
      });
    }

    // Step 6: Get full partner details from delivery_partners table
    const partnerIds = affiliatesData.affiliates.map((a: any) => a.partner_id);

    const { data: partners, error: partnersError } = await supabase
      .from("delivery_partners")
      .select("*")
      .in("id", partnerIds)
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

    console.log(`Found ${partners.length} active delivery partners for ${userCountry}`);

    // Step 7: Build match criteria
    const criteria: DeliveryMatchCriteria = {
      cuisine,
      diet,
      country: userCountry,
      calories,
    };

    // Step 8: Rank partners by match score
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
        user_country: userCountry,
        disclaimer: getAffiliateDisclosure(),
        message: `No ${cuisine} delivery options found. Try these alternatives: ${alternatives.join(", ")}`,
      });
    }

    // Step 9: Build affiliate links for each recommendation
    const recommendations = rankedPartners.map((partner) => {
      // Find affiliate ID for this partner in this country
      const affiliateMapping = affiliatesData.affiliates.find(
        (a: any) => a.partner_id === partner.id
      );

      const affiliateLinks = buildDeliveryAffiliateLinks(
        partner,
        cuisine || "food",
        affiliateMapping?.affiliate_id || "DEFAULT"
      );

      return {
        partner_id: partner.id,
        partner_name: partner.name,
        cuisine_tags: partner.cuisine_tags,
        diet_tags: partner.diet_tags,
        commission_rate: partner.commission_rate,
        match_score: partner.match_score,
        affiliate_url: affiliateLinks.primary_link,
        tracking_params: affiliateLinks.tracking_params,
      };
    });

    console.log(`Returning ${recommendations.length} delivery recommendations`);

    // Step 10: Log recommendation for analytics
    for (const rec of recommendations) {
      await supabase.from("delivery_recommendations").insert({
        chatgpt_user_id,
        cuisine,
        diet,
        country: userCountry,
        partner_id: rec.partner_id,
        affiliate_url: rec.affiliate_url,
        match_score: rec.match_score,
      });
    }

    // Step 11: Build response data
    const responseData: GetDeliveryRecommendationsResponse = {
      success: true,
      recommendations,
      user_country: userCountry,
      disclaimer: getAffiliateDisclosure(),
      total_count: recommendations.length,
    };

    // Step 12: Format response in user's language (NEW - MULTILINGUAL)
    const formattedMessage = await formatDeliveryRecommendations(responseData, userInput);

    console.log(`[MULTILINGUAL] Formatted response in ${detectedLanguage}`);

    // Return response with formatted message
    return createSuccessResponse({
      ...responseData,
      formatted_message: formattedMessage,
      language: detectedLanguage,
    });

  } catch (error) {
    console.error("Error fetching delivery recommendations:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
serve(withLogging(handler));

