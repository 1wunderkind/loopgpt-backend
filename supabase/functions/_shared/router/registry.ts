/**
 * Provider Registry
 * Defines supported fulfillment providers, their coverage, and URL construction logic.
 */

export interface ProviderDef {
  id: string;
  name: string;
  supported_countries: string[]; // ISO-2 codes
  capabilities: ("grocery" | "restaurant")[];
  handoff_type: "address_first" | "search";
  buildUrl: (context: { basket: { name: string; quantity: string }[] }) => string;
  weight: number; // For competitive selection (0-100)
}

export const PROVIDERS: Record<string, ProviderDef> = {
  mealme: {
    id: "mealme",
    name: "MealMe",
    supported_countries: ["US", "CA"], // MealMe covers US & CA
    capabilities: ["grocery", "restaurant"],
    handoff_type: "address_first",
    weight: 60, // Slightly higher weight to promote new integration
    buildUrl: ({ basket }) => {
      // MealMe Address-First Flow
      // We pass products, but the landing page MUST ask for address first.
      // Using the standard checkout entrypoint.
      const products = basket.map(i => ({
        name: i.name,
        quantity: parseInt(i.quantity) || 1,
        price: 0
      }));
      const params = new URLSearchParams();
      params.append("products", JSON.stringify(products));
      return `https://checkout.mealme.ai/cart?${params.toString()}`;
    }
  },
  instacart: {
    id: "instacart",
    name: "Instacart",
    supported_countries: ["US", "CA"],
    capabilities: ["grocery"],
    handoff_type: "search",
    weight: 40,
    buildUrl: ({ basket }) => {
      // Instacart Search Fallback
      const query = basket.map(i => i.name).join(" ");
      return `https://www.instacart.com/store/search_v3/${encodeURIComponent(query)}`;
    }
  }
};

export const FALLBACK_PROVIDER: ProviderDef = {
  id: "unavailable",
  name: "Service Unavailable",
  supported_countries: [],
  capabilities: [],
  handoff_type: "search",
  weight: 0,
  buildUrl: () => "https://loopkitchen-ui.vercel.app/unavailable" // Hosted info page
};
