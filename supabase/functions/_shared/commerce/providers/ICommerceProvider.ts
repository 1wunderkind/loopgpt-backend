/**
 * LoopGPT Commerce Provider Interface
 * Production-grade abstraction for multi-provider commerce routing
 */

import type {
  ProviderId,
  ProviderQuote,
  ProviderConfig,
  RequestedItem,
} from '../types/index.ts';

// ============================================================================
// Request Types
// ============================================================================

export interface ShippingAddress {
  street?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface UserContext {
  // For authenticated provider APIs later
  krogerCustomerId?: string;
  walmartCustomerId?: string;
  instacartUserId?: string;
  loyaltyIds?: string[];
  // For MealMe
  mealmeUserId?: string;
}

export interface QuoteRequest {
  providerId: ProviderId;
  items: RequestedItem[];
  shippingAddress: ShippingAddress;
  userContext?: UserContext;
  // Optional: for future features
  deliveryWindow?: {
    earliest?: string;  // ISO timestamp
    latest?: string;    // ISO timestamp
  };
  specialInstructions?: string;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * ICommerceProvider - Interface that all commerce providers must implement
 * 
 * Implementations:
 * - MealMeProvider (restaurant delivery + grocery)
 * - InstacartProvider (grocery delivery)
 * - KrogerProvider (direct Kroger API)
 * - WalmartProvider (Walmart affiliate API)
 */
export interface ICommerceProvider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /**
   * Main entry point: given a cart + location, return a quote
   * 
   * @param request - Quote request with items and delivery details
   * @param config - Provider configuration (API keys, timeouts, etc.)
   * @returns ProviderQuote with cart, pricing, and availability
   * @throws ProviderError if the provider cannot fulfill the request
   * @throws ProviderTimeoutError if the request times out
   * @throws ProviderUnavailableError if the provider is down
   */
  getQuote(request: QuoteRequest, config: ProviderConfig): Promise<ProviderQuote>;

  /**
   * Optional: called during startup to validate config / env variables
   * 
   * @param config - Provider configuration to validate
   * @returns true if provider is healthy and ready
   */
  healthCheck?(config: ProviderConfig): Promise<boolean>;

  /**
   * Optional: return human-readable name for logging
   */
  getName?(): string;
}

// ============================================================================
// Helper Types for Provider Implementations
// ============================================================================

/**
 * Base class for provider implementations
 * Provides common utilities and error handling
 */
export abstract class BaseCommerceProvider implements ICommerceProvider {
  abstract readonly id: ProviderId;

  abstract getQuote(
    request: QuoteRequest,
    config: ProviderConfig
  ): Promise<ProviderQuote>;

  async healthCheck(config: ProviderConfig): Promise<boolean> {
    // Default implementation: check if provider is enabled
    return config.enabled;
  }

  getName(): string {
    return this.id;
  }

  /**
   * Utility: Convert dollars to cents
   */
  protected dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
  }

  /**
   * Utility: Convert cents to dollars
   */
  protected centsToDollars(cents: number): number {
    return cents / 100;
  }

  /**
   * Utility: Generate mock SKU for testing
   */
  protected generateMockSku(providerId: ProviderId, itemName: string, index: number): string {
    const prefix = providerId.toLowerCase().replace('_', '-');
    const slug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${prefix}-${slug}-${index}`;
  }
}
