/**
 * Delivery Affiliate Link Builder
 * Generates affiliate URLs for food delivery partners
 */

import { config } from "../config/index.ts";
import type { DeliveryPartner, DeliveryAffiliateLink } from "./types.ts";

/**
 * Build affiliate link for a delivery partner
 * @param partner - Delivery partner information
 * @param cuisine - Cuisine type for the recommendation
 * @param location - Optional location for geo-targeting
 * @returns Affiliate URL with UTM tracking
 */
export function buildDeliveryAffiliateLink(
  partner: DeliveryPartner,
  cuisine: string,
  location?: string
): string {
  const baseUrl = partner.base_url;
  const affiliateId = partner.affiliate_id;
  
  // Build UTM parameters for tracking
  const utmParams = new URLSearchParams({
    utm_source: "mealplanner",
    utm_medium: "affiliate",
    utm_campaign: affiliateId,
    utm_content: cuisine.toLowerCase(),
  });

  // Add location if provided
  if (location) {
    utmParams.append("location", location);
  }

  // Add cuisine search parameter (partner-specific)
  const searchParam = getSearchParam(partner.name, cuisine);
  
  return `${baseUrl}?${utmParams.toString()}${searchParam}`;
}

/**
 * Build multiple affiliate links for a list of partners
 */
export function buildDeliveryAffiliateLinks(
  partners: DeliveryPartner[],
  cuisine: string,
  location?: string
): DeliveryAffiliateLink[] {
  return partners.map((partner) => ({
    partner_id: partner.id,
    partner_name: partner.name,
    affiliate_url: buildDeliveryAffiliateLink(partner, cuisine, location),
    cuisine,
    commission_rate: partner.commission_rate,
    metadata: {
      diet_tags: partner.diet_tags,
      supported_countries: partner.supported_countries,
    },
  }));
}

/**
 * Get partner-specific search parameter
 * Different partners use different URL structures
 */
function getSearchParam(partnerName: string, cuisine: string): string {
  const encodedCuisine = encodeURIComponent(cuisine);
  
  switch (partnerName.toLowerCase()) {
    case "uber eats":
      return `&q=${encodedCuisine}`;
    case "doordash":
      return `&search=${encodedCuisine}`;
    case "grubhub":
      return `&searchTerm=${encodedCuisine}`;
    case "deliveroo":
      return `&query=${encodedCuisine}`;
    case "just eat":
      return `&cuisine=${encodedCuisine}`;
    default:
      return `&search=${encodedCuisine}`;
  }
}

/**
 * Build a cart URL with multiple items (future enhancement)
 * Some partners support pre-filled carts via deep links
 */
export function buildDeliveryCartUrl(
  partner: DeliveryPartner,
  items: string[],
  location?: string
): string {
  // This is a placeholder for future deep linking functionality
  // Most delivery partners don't support cart pre-filling via URLs
  // But we can prepare the structure for when they do
  
  const baseUrl = partner.base_url;
  const affiliateId = partner.affiliate_id;
  
  const utmParams = new URLSearchParams({
    utm_source: "mealplanner",
    utm_medium: "affiliate",
    utm_campaign: affiliateId,
    utm_content: "cart",
  });

  return `${baseUrl}?${utmParams.toString()}`;
}

/**
 * Track affiliate click (to be called when user clicks link)
 */
export interface TrackClickParams {
  recommendation_id: string;
  chatgpt_user_id: string;
  partner_id: string;
  affiliate_url: string;
}

/**
 * Generate tracking pixel URL for conversion tracking
 * Some affiliate networks provide pixel tracking
 */
export function generateTrackingPixel(
  partner: DeliveryPartner,
  orderId: string
): string | null {
  // This would integrate with partner-specific tracking pixels
  // For now, return null - to be implemented when we have real affiliate accounts
  return null;
}

/**
 * Validate affiliate link format
 */
export function validateAffiliateLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Check for required UTM parameters
    const hasUtmSource = parsed.searchParams.has("utm_source");
    const hasUtmMedium = parsed.searchParams.has("utm_medium");
    const hasUtmCampaign = parsed.searchParams.has("utm_campaign");
    
    return hasUtmSource && hasUtmMedium && hasUtmCampaign;
  } catch {
    return false;
  }
}

/**
 * Extract cuisine from affiliate URL
 */
export function extractCuisineFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("utm_content");
  } catch {
    return null;
  }
}

/**
 * Build affiliate disclosure text
 */
export function getAffiliateDisclosure(): string {
  return "As a delivery affiliate partner, we earn from qualifying orders. This helps us keep MealPlanner free for everyone.";
}

