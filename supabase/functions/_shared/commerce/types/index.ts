/**
 * LoopGPT Commerce Router - Type Definitions
 * Production-grade multi-provider commerce layer
 */

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderId = 'MEALME' | 'INSTACART' | 'KROGER_API' | 'WALMART_API';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  priority: number; // base priority before scoring
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  enabled: boolean;
  priority: number;          // config bias
  commissionRate: number;    // % as decimal
  regions: string[];         // e.g. ['US', 'US-CA', 'DE'] for future
  timeout?: number;          // ms, optional per-provider timeout
  retries?: number;          // optional retry count
}

// ============================================================================
// Cart and Item Types
// ============================================================================

export interface CartItem {
  clientItemId: string;      // LoopGPT-side ID
  providerSku?: string;      // Provider's product ID
  name: string;
  quantity: number;
  unit?: string;             // 'pcs', 'kg', 'lb', etc.
  priceCents: number;        // price in cents
  substituted?: boolean;
  substitutionReason?: string;
}

export interface RequestedItem {
  id: string;                // Client-side ID
  name: string;
  quantity: number;
  unit?: string;
  preferences?: Record<string, any>;
}

// ============================================================================
// Quote Types
// ============================================================================

export interface Quote {
  subtotalCents: number;
  feesCents: number;
  taxCents: number;
  totalCents: number;
  currency: 'USD' | 'EUR' | string;
  estimatedDeliveryMinutes?: number;
  // Legacy fields for backward compatibility
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;
  estimatedDelivery?: {
    min: number;
    max: number;
  };
}

export interface ItemAvailability {
  clientItemId: string;
  requestedItem: string;
  status: 'found' | 'substituted' | 'unavailable';
  inStock?: boolean;         // Simplified flag
  providerSku?: string;
  foundProduct?: {
    id: string;
    name: string;
    priceCents: number;
  };
  substitutedProduct?: {
    id: string;
    name: string;
    priceCents: number;
    reason: string;
  };
}

// ============================================================================
// Provider Quote Types
// ============================================================================

export interface ProviderQuote {
  provider: ProviderMeta;
  config: ProviderConfig;
  store?: Store;
  cart: CartItem[];
  quote: Quote;
  itemAvailability: ItemAvailability[];
  affiliateUrl?: string;
  raw?: unknown;             // raw provider payload for debugging/logging
}

export interface ScoredQuote extends ProviderQuote {
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

// ============================================================================
// Scoring Types
// ============================================================================

export interface ScoringWeights {
  price: number;
  speed: number;
  availability: number;
  margin: number;
  reliability: number;
}

export interface ScoreBreakdown {
  priceScore: number;
  speedScore: number;
  availabilityScore: number;
  marginScore: number;
  reliabilityScore: number;
  weightedTotal: number;
  explanation: string;
}

// ============================================================================
// Learning System Types
// ============================================================================

export interface OrderOutcome {
  orderId: string;
  providerId: ProviderId;
  providerName?: string;        // Human-readable provider name
  wasSuccessful: boolean;
  wasCancelled?: boolean;       // Whether the order was cancelled
  actualDeliveryTime?: number;  // minutes
  itemsDelivered?: number;
  itemsOrdered: number;
  totalValue?: number;          // Total order value in dollars
  commissionRate?: number;      // Commission rate as decimal (e.g., 0.05 for 5%)
  userRating?: number;          // 1-5
  issues?: OrderIssue[];
}

export type OrderIssue = 
  | 'missing_items'
  | 'late_delivery'
  | 'wrong_items'
  | 'poor_quality'
  | 'damaged_items'
  | 'driver_issues'
  | 'other';

export interface ProviderMetrics {
  providerId: ProviderId;
  metricDate: string;
  totalOrders: number;
  successfulOrders: number;
  avgDeliveryTimeMinutes: number;
  totalGMV: number;
  ourRevenue: number;
  fallbackRate?: number;
  splitOrderRate?: number;
  avgSplitCount?: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface RouteOrderRequest {
  userId: string;
  items: RequestedItem[];
  location: DeliveryLocation;
  preferences?: OrderPreferences;
}

export interface DeliveryLocation {
  street?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface OrderPreferences {
  optimizeFor?: 'price' | 'speed' | 'margin' | 'balanced';
  maxDeliveryTimeMinutes?: number;
  maxDeliveryFee?: number;
  preferredProviders?: ProviderId[];
  allowSplitOrders?: boolean;
  splitStrategy?: 'cost' | 'speed' | 'providers';
}

export interface RouteOrderResponse {
  success: boolean;
  provider: string;
  providerId: ProviderId;
  store?: Store;
  cart: CartItem[];
  quote: Quote;
  itemAvailability: ItemAvailability[];
  scoreBreakdown: ScoreBreakdown;
  alternatives: AlternativeProvider[];
  confirmationToken: string;
  affiliateUrl?: string;
  message?: string;
}

export interface AlternativeProvider {
  provider: string;
  providerId: ProviderId;
  totalCents: number;
  score: number;
  estimatedDeliveryMinutes: number;
  // Legacy fields
  total?: number;
  estimatedDelivery?: number;
}

// ============================================================================
// Database Types
// ============================================================================

export interface ScoreCalculation {
  id: string;
  routeId: string;
  providerId: ProviderId;
  priceScore: number;
  speedScore: number;
  availabilityScore: number;
  marginScore: number;
  reliabilityScore: number;
  weightedTotal: number;
  weightsUsed: ScoringWeights;
  wasSelected: boolean;
  createdAt: string;
}

export interface WeightAdjustment {
  id: string;
  adjustmentReason: string;
  oldWeights: ScoringWeights;
  newWeights: ScoringWeights;
  performanceDelta: Record<string, number>;
  appliedAt: string;
}

// ============================================================================
// Preset Weight Configurations
// ============================================================================

export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 0.30,
  speed: 0.15,
  availability: 0.25,
  margin: 0.20,
  reliability: 0.10,
};

export const PRICE_OPTIMIZED_WEIGHTS: ScoringWeights = {
  price: 0.50,
  speed: 0.10,
  availability: 0.20,
  margin: 0.10,
  reliability: 0.10,
};

export const SPEED_OPTIMIZED_WEIGHTS: ScoringWeights = {
  price: 0.15,
  speed: 0.45,
  availability: 0.20,
  margin: 0.10,
  reliability: 0.10,
};

export const MARGIN_OPTIMIZED_WEIGHTS: ScoringWeights = {
  price: 0.20,
  speed: 0.10,
  availability: 0.20,
  margin: 0.40,
  reliability: 0.10,
};

export const AVAILABILITY_OPTIMIZED_WEIGHTS: ScoringWeights = {
  price: 0.15,
  speed: 0.15,
  availability: 0.45,
  margin: 0.15,
  reliability: 0.10,
};

export function getWeightsForPreference(
  preference: 'price' | 'speed' | 'margin' | 'balanced' = 'balanced'
): ScoringWeights {
  switch (preference) {
    case 'price':
      return PRICE_OPTIMIZED_WEIGHTS;
    case 'speed':
      return SPEED_OPTIMIZED_WEIGHTS;
    case 'margin':
      return MARGIN_OPTIMIZED_WEIGHTS;
    case 'balanced':
    default:
      return DEFAULT_WEIGHTS;
  }
}

// ============================================================================
// Provider Error Types
// ============================================================================

export class ProviderError extends Error {
  constructor(
    public providerId: ProviderId,
    message: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerId: ProviderId, timeoutMs: number) {
    super(providerId, `Provider ${providerId} timed out after ${timeoutMs}ms`, 'TIMEOUT', true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(providerId: ProviderId, reason?: string) {
    super(providerId, `Provider ${providerId} is unavailable${reason ? `: ${reason}` : ''}`, 'UNAVAILABLE', true);
    this.name = 'ProviderUnavailableError';
  }
}
