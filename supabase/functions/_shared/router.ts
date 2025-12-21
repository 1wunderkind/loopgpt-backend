/**
 * Competitive ZIP-Free Merchant Router
 * 
 * Selects the best fulfillment provider based on:
 * 1. Region (Country)
 * 2. Capability (Grocery)
 * 3. Competitive Weighting (Deterministic Random)
 * 
 * NEVER accepts or processes ZIP codes.
 */

import { PROVIDERS, FALLBACK_PROVIDER, ProviderDef } from "./router/registry.ts";

export interface RouterInput {
  intent: "order_missing_ingredients";
  basket: { name: string; quantity: string }[];
  coarse_location: {
    country: string; // ISO-2
    locale?: string;
  };
  channel: "chatgpt";
  token_hash: string; // Used as seed for deterministic selection
}

export interface RouterOutput {
  provider: string;
  handoff_url: string;
  requires_address: true;
}

// Simple deterministic RNG based on hash string
function getDeterministicScore(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return (Math.abs(hash) % 100) / 100; // 0.0 to 1.0
}

export function selectProvider(input: RouterInput): RouterOutput {
  const { basket, coarse_location, token_hash } = input;
  const country = coarse_location.country.toUpperCase();

  // 1. Filter Providers by Country & Capability
  const candidates = Object.values(PROVIDERS).filter(p => 
    p.supported_countries.includes(country) && 
    p.capabilities.includes("grocery")
  );

  let selected: ProviderDef;

  if (candidates.length === 0) {
    // No provider for this region
    selected = FALLBACK_PROVIDER;
  } else if (candidates.length === 1) {
    // Only one option
    selected = candidates[0];
  } else {
    // 2. Competitive Selection
    // Use deterministic score to pick based on weights
    const score = getDeterministicScore(token_hash); // 0.0 - 1.0
    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
    let cumulative = 0;
    
    // Default to first
    selected = candidates[0];

    for (const p of candidates) {
      cumulative += p.weight / totalWeight;
      if (score <= cumulative) {
        selected = p;
        break;
      }
    }
  }

  return {
    provider: selected.id,
    handoff_url: selected.buildUrl({ basket }),
    requires_address: true
  };
}
