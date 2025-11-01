/**
 * Delivery Partner Matcher
 * Matches food delivery partners based on cuisine, diet, and location
 */

import type { DeliveryPartner, DeliveryMatchCriteria } from "./types.ts";

/**
 * Normalize cuisine name for consistent matching
 */
export function normalizeCuisine(cuisine: string): string {
  return cuisine.toLowerCase().trim();
}

/**
 * Match delivery partners by cuisine
 * This would query the database in production
 * For now, we'll create a helper that can be used with Supabase
 */
export interface PartnerMatchResult {
  partner: DeliveryPartner;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Calculate match score for a partner based on criteria
 */
export function calculateMatchScore(
  partner: DeliveryPartner,
  criteria: DeliveryMatchCriteria
): PartnerMatchResult {
  let score = 0;
  const reasons: string[] = [];

  // Check cuisine match (highest weight)
  if (criteria.cuisine) {
    const normalizedCuisine = normalizeCuisine(criteria.cuisine);
    const cuisineMatch = partner.cuisine_tags.some(
      (tag) => normalizeCuisine(tag) === normalizedCuisine
    );
    
    if (cuisineMatch) {
      score += 50;
      reasons.push(`Serves ${criteria.cuisine}`);
    }
  }

  // Check diet compatibility
  if (criteria.diet && partner.diet_tags) {
    const normalizedDiet = normalizeCuisine(criteria.diet);
    const dietMatch = partner.diet_tags.some(
      (tag) => normalizeCuisine(tag) === normalizedDiet
    );
    
    if (dietMatch) {
      score += 30;
      reasons.push(`Offers ${criteria.diet} options`);
    }
  }

  // Check country support
  if (criteria.country && partner.supported_countries) {
    const countryMatch = partner.supported_countries.includes(
      criteria.country.toUpperCase()
    );
    
    if (countryMatch) {
      score += 20;
      reasons.push(`Available in ${criteria.country}`);
    } else {
      // Penalize if not available in user's country
      score -= 50;
      reasons.push(`Not available in ${criteria.country}`);
    }
  }

  // Bonus for active partners
  if (partner.active) {
    score += 10;
  } else {
    score -= 100; // Heavily penalize inactive partners
  }

  // Bonus for higher commission rates (better for us)
  if (partner.commission_rate) {
    score += Math.min(partner.commission_rate / 2, 10);
  }

  return {
    partner,
    matchScore: score,
    matchReasons: reasons,
  };
}

/**
 * Filter and rank partners by match criteria
 */
export function rankPartners(
  partners: DeliveryPartner[],
  criteria: DeliveryMatchCriteria,
  limit: number = 3
): PartnerMatchResult[] {
  // Calculate match scores
  const scored = partners.map((partner) =>
    calculateMatchScore(partner, criteria)
  );

  // Filter out negative scores (bad matches)
  const filtered = scored.filter((result) => result.matchScore > 0);

  // Sort by score descending
  filtered.sort((a, b) => b.matchScore - a.matchScore);

  // Return top N matches
  return filtered.slice(0, limit);
}

/**
 * Get cuisine categories for grouping
 */
export const CUISINE_CATEGORIES = {
  asian: ["thai", "chinese", "japanese", "korean", "vietnamese", "indian"],
  european: ["italian", "french", "spanish", "greek", "german"],
  american: ["american", "burgers", "bbq", "southern", "tex-mex"],
  latin: ["mexican", "brazilian", "peruvian", "cuban"],
  middle_eastern: ["mediterranean", "lebanese", "turkish", "moroccan"],
  other: ["pizza", "sushi", "sandwiches", "salads", "healthy"],
} as const;

/**
 * Get cuisine category for a cuisine type
 */
export function getCuisineCategory(
  cuisine: string
): keyof typeof CUISINE_CATEGORIES | null {
  const normalized = normalizeCuisine(cuisine);

  for (const [category, cuisines] of Object.entries(CUISINE_CATEGORIES)) {
    if (cuisines.includes(normalized as never)) {
      return category as keyof typeof CUISINE_CATEGORIES;
    }
  }

  return null;
}

/**
 * Expand cuisine search to include related cuisines
 */
export function expandCuisineSearch(cuisine: string): string[] {
  const category = getCuisineCategory(cuisine);
  
  if (!category) {
    return [cuisine];
  }

  return CUISINE_CATEGORIES[category];
}

/**
 * Check if a partner serves a specific diet
 */
export function partnerSupportsDiet(
  partner: DeliveryPartner,
  diet: string
): boolean {
  if (!partner.diet_tags || partner.diet_tags.length === 0) {
    return false;
  }

  const normalizedDiet = normalizeCuisine(diet);
  return partner.diet_tags.some(
    (tag) => normalizeCuisine(tag) === normalizedDiet
  );
}

/**
 * Get all unique cuisines from partners
 */
export function getAllCuisines(partners: DeliveryPartner[]): string[] {
  const cuisines = new Set<string>();

  for (const partner of partners) {
    for (const cuisine of partner.cuisine_tags) {
      cuisines.add(normalizeCuisine(cuisine));
    }
  }

  return Array.from(cuisines).sort();
}

/**
 * Get all unique diets from partners
 */
export function getAllDiets(partners: DeliveryPartner[]): string[] {
  const diets = new Set<string>();

  for (const partner of partners) {
    if (partner.diet_tags) {
      for (const diet of partner.diet_tags) {
        diets.add(normalizeCuisine(diet));
      }
    }
  }

  return Array.from(diets).sort();
}

/**
 * Suggest alternative cuisines if no matches found
 */
export function suggestAlternativeCuisines(
  requestedCuisine: string,
  availablePartners: DeliveryPartner[]
): string[] {
  const category = getCuisineCategory(requestedCuisine);
  
  if (!category) {
    // Return most popular cuisines as fallback
    return ["pizza", "burgers", "chinese", "italian", "mexican"];
  }

  // Get all cuisines in the same category that are available
  const relatedCuisines = CUISINE_CATEGORIES[category];
  const availableCuisines = getAllCuisines(availablePartners);

  return relatedCuisines.filter((cuisine) =>
    availableCuisines.includes(cuisine)
  );
}

