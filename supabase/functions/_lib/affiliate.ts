/**
 * Affiliate Link Builder
 * Generates affiliate URLs for ingredients
 */

import { config } from "../config/index.ts";
import type { AffiliateLinks } from "./types.ts";

/**
 * Normalize ingredient name for consistent matching
 */
export function normalizeIngredient(ingredient: string): string {
  return ingredient.toLowerCase().trim();
}

/**
 * Build affiliate links for a single ingredient
 */
export function buildAffiliateLinksForIngredient(ingredient: string): AffiliateLinks {
  const normalized = normalizeIngredient(ingredient);
  const encoded = encodeURIComponent(ingredient);

  const links: AffiliateLinks = {};

  // Amazon Fresh link
  if (config.affiliate.amazonTag) {
    links.amazon_fresh = `https://www.amazon.com/s?k=${encoded}&tag=${config.affiliate.amazonTag}`;
  }

  // Instacart link
  if (config.affiliate.instacartId) {
    links.instacart = `https://www.instacart.com/store/search?q=${encoded}&utm_source=affiliate&utm_medium=mealplanner&utm_campaign=${config.affiliate.instacartId}`;
  }

  // Walmart link (future)
  // links.walmart = `https://www.walmart.com/search?q=${encoded}`;

  return links;
}

/**
 * Build affiliate links for multiple ingredients
 */
export function buildAffiliateLinks(ingredients: string[]): Record<string, AffiliateLinks> {
  const result: Record<string, AffiliateLinks> = {};

  for (const ingredient of ingredients) {
    const normalized = normalizeIngredient(ingredient);
    result[normalized] = buildAffiliateLinksForIngredient(ingredient);
  }

  return result;
}

/**
 * Build a shopping cart URL with multiple ingredients
 * Note: This is a simplified version - real implementation would need
 * platform-specific cart APIs
 */
export function buildCartUrl(
  ingredients: string[],
  platform: "amazon_fresh" | "instacart"
): string {
  const query = ingredients.map((i) => encodeURIComponent(i)).join(",");

  switch (platform) {
    case "amazon_fresh":
      return `https://www.amazon.com/s?k=${query}&tag=${config.affiliate.amazonTag}`;
    case "instacart":
      return `https://www.instacart.com/store/search?q=${query}&utm_source=affiliate&utm_medium=mealplanner`;
    default:
      return "";
  }
}

/**
 * Generate affiliate summary for a meal plan
 */
export interface AffiliateSummary {
  total_ingredients: number;
  unique_ingredients: number;
  platforms: string[];
  cart_urls: {
    amazon_fresh?: string;
    instacart?: string;
  };
  estimated_cost?: number;
}

export function generateAffiliateSummary(ingredients: string[]): AffiliateSummary {
  const uniqueIngredients = [...new Set(ingredients.map(normalizeIngredient))];

  return {
    total_ingredients: ingredients.length,
    unique_ingredients: uniqueIngredients.length,
    platforms: ["amazon_fresh", "instacart"],
    cart_urls: {
      amazon_fresh: buildCartUrl(uniqueIngredients, "amazon_fresh"),
      instacart: buildCartUrl(uniqueIngredients, "instacart"),
    },
  };
}

