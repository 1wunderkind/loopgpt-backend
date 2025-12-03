/**
 * LoopGPT Commerce Router - Type Definitions
 * Phase 3: Provider Comparison Scoring Algorithm
 */

// ============================================================================
// Core Types
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

export interface ProviderQuote {
  provider: {
    id: string;
    name: string;
    priority: number;
  };
  config: ProviderConfig;
  store?: Store;
  cart: CartItem[];
  quote: Quote;
  itemAvailability: ItemAvailability[];
}

export interface ScoredQuote extends ProviderQuote {
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  commissionRate: number;
  regions: string[];
}

export interface Store {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  substituted?: boolean;
  substitutionReason?: string;
}

export interface Quote {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  estimatedDelivery: {
    min: number;  // minutes
    max: number;  // minutes
  };
}

export interface ItemAvailability {
  requestedItem: string;
  status: 'found' | 'substituted' | 'unavailable';
  foundProduct?: {
    id: string;
    name: string;
    price: number;
  };
  substitutedProduct?: {
    id: string;
    name: string;
    price: number;
    reason: string;
  };
}

// ============================================================================
// Learning System Types
// ============================================================================

export interface OrderOutcome {
  orderId: string;
  providerId: string;
  wasSuccessful: boolean;
  actualDeliveryTime?: number;  // minutes
  itemsDelivered?: number;
  itemsOrdered: number;
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
  providerId: string;
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

export interface RequestedItem {
  name: string;
  quantity: number;
  preferences?: Record<string, any>;
}

export interface DeliveryLocation {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface OrderPreferences {
  optimizeFor?: 'price' | 'speed' | 'margin' | 'balanced';
  maxDeliveryTimeMinutes?: number;
  maxDeliveryFee?: number;
  preferredProviders?: string[];
  allowSplitOrders?: boolean;
  splitStrategy?: 'cost' | 'speed' | 'providers';
}

export interface RouteOrderResponse {
  success: boolean;
  provider: string;
  store?: Store;
  cart: CartItem[];
  quote: Quote;
  itemAvailability: ItemAvailability[];
  scoreBreakdown: ScoreBreakdown;
  alternatives: AlternativeProvider[];
  confirmationToken: string;
  message?: string;
}

export interface AlternativeProvider {
  provider: string;
  total: number;
  score: number;
  estimatedDelivery: number;
}

// ============================================================================
// Database Types
// ============================================================================

export interface ScoreCalculation {
  id: string;
  routeId: string;
  providerId: string;
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
