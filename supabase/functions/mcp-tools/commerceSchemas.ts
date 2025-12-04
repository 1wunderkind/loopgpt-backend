/**
 * Commerce Schemas
 * 
 * Types and schemas for pantry management, cart preparation,
 * and integration with the LoopGPT Commerce Router.
 */

// ============================================================================
// PANTRY SCHEMAS
// ============================================================================

/**
 * Item in user's pantry
 */
export interface PantryItem {
  name: string;
  quantity?: string;
  expiresAt?: string; // ISO date string
  addedAt?: string; // ISO date string
}

/**
 * User's pantry (list of items they already have)
 */
export type Pantry = PantryItem[];

/**
 * Validate pantry input
 */
export function validatePantry(pantry: any): Pantry {
  if (!Array.isArray(pantry)) {
    throw new Error("Pantry must be an array");
  }
  
  return pantry.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Pantry item at index ${index} must be an object`);
    }
    
    if (!item.name || typeof item.name !== "string") {
      throw new Error(`Pantry item at index ${index} must have a name (string)`);
    }
    
    return {
      name: item.name.trim(),
      quantity: item.quantity ? String(item.quantity) : undefined,
      expiresAt: item.expiresAt ? String(item.expiresAt) : undefined,
      addedAt: item.addedAt ? String(item.addedAt) : undefined,
    };
  });
}

// ============================================================================
// CART SCHEMAS
// ============================================================================

/**
 * Item in shopping cart (standardized format for commerce router)
 */
export interface CartItem {
  name: string;
  quantity?: string;
  category?: string;
}

/**
 * Cart payload for commerce router
 * This is sent to loopgpt_route_order
 */
export interface CartPayload {
  provider?: "instacart" | "walmart" | "mealme" | "amazon_fresh" | "mock";
  items: CartItem[];
  metadata?: {
    mealPlanId?: string;
    recipeIds?: string[];
    totalItems: number;
    missingItemsCount?: number;
  };
}

/**
 * User location for delivery
 */
export interface UserLocation {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

/**
 * User preferences for order routing
 */
export interface OrderPreferences {
  optimizeFor?: "balanced" | "price" | "speed" | "margin" | "availability";
  maxDeliveryTime?: number; // minutes
  maxPrice?: number; // dollars
  preferredProviders?: string[];
  avoidProviders?: string[];
}

/**
 * Complete order routing request
 * This is what we send to loopgpt_route_order
 */
export interface OrderRoutingRequest {
  userId: string;
  items: CartItem[];
  location: UserLocation;
  preferences?: OrderPreferences;
}

/**
 * Provider quote from commerce router
 */
export interface ProviderQuote {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  estimatedDelivery: {
    min: number; // minutes
    max: number; // minutes
  };
}

/**
 * Score breakdown from commerce router
 */
export interface ScoreBreakdown {
  priceScore: number;
  speedScore: number;
  availabilityScore: number;
  marginScore: number;
  reliabilityScore: number;
  weightedTotal: number;
  explanation: string;
}

/**
 * Alternative provider option
 */
export interface AlternativeProvider {
  provider: string;
  total: number;
  score: number;
}

/**
 * Order routing response from commerce router
 */
export interface OrderRoutingResponse {
  success: boolean;
  provider: string;
  quote: ProviderQuote;
  scoreBreakdown: ScoreBreakdown;
  alternatives: AlternativeProvider[];
  confirmationToken: string;
}

/**
 * Order confirmation request
 */
export interface OrderConfirmationRequest {
  confirmationToken: string;
  paymentMethod: {
    type: "card" | "paypal" | "apple_pay" | "google_pay";
    token: string;
  };
}

/**
 * Order confirmation response
 */
export interface OrderConfirmationResponse {
  success: boolean;
  orderId: string;
  provider: string;
  trackingUrl?: string;
  estimatedDelivery: {
    min: number;
    max: number;
  };
}

// ============================================================================
// GROCERY TO CART TRANSFORMATION
// ============================================================================

/**
 * Transform grocery list items to cart items
 */
export function groceryToCartItems(groceryItems: any[]): CartItem[] {
  return groceryItems.map((item) => ({
    name: item.name,
    quantity: item.quantity || "1",
    category: item.category,
  }));
}

/**
 * Build cart payload from grocery list
 */
export function buildCartPayload(
  groceryItems: any[],
  metadata?: {
    mealPlanId?: string;
    recipeIds?: string[];
    missingItemsCount?: number;
  }
): CartPayload {
  const items = groceryToCartItems(groceryItems);
  
  return {
    items,
    metadata: {
      totalItems: items.length,
      ...metadata,
    },
  };
}

/**
 * Build order routing request
 */
export function buildOrderRoutingRequest(
  userId: string,
  cartPayload: CartPayload,
  location: UserLocation,
  preferences?: OrderPreferences
): OrderRoutingRequest {
  return {
    userId,
    items: cartPayload.items,
    location,
    preferences: preferences || {
      optimizeFor: "balanced",
    },
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate user location
 */
export function validateLocation(location: any): UserLocation {
  if (!location || typeof location !== "object") {
    throw new Error("Location must be an object");
  }
  
  const required = ["street", "city", "state", "zip"];
  for (const field of required) {
    if (!location[field] || typeof location[field] !== "string") {
      throw new Error(`Location.${field} is required (string)`);
    }
  }
  
  return {
    street: location.street.trim(),
    city: location.city.trim(),
    state: location.state.trim(),
    zip: location.zip.trim(),
    country: location.country ? location.country.trim() : "US",
  };
}

/**
 * Validate order preferences
 */
export function validatePreferences(preferences: any): OrderPreferences {
  if (!preferences) {
    return { optimizeFor: "balanced" };
  }
  
  if (typeof preferences !== "object") {
    throw new Error("Preferences must be an object");
  }
  
  const validOptimizations = ["balanced", "price", "speed", "margin", "availability"];
  if (preferences.optimizeFor && !validOptimizations.includes(preferences.optimizeFor)) {
    throw new Error(`Invalid optimizeFor value. Must be one of: ${validOptimizations.join(", ")}`);
  }
  
  return {
    optimizeFor: preferences.optimizeFor || "balanced",
    maxDeliveryTime: preferences.maxDeliveryTime ? Number(preferences.maxDeliveryTime) : undefined,
    maxPrice: preferences.maxPrice ? Number(preferences.maxPrice) : undefined,
    preferredProviders: Array.isArray(preferences.preferredProviders) ? preferences.preferredProviders : undefined,
    avoidProviders: Array.isArray(preferences.avoidProviders) ? preferences.avoidProviders : undefined,
  };
}
