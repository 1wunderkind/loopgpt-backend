/**
 * Walmart API Client
 * API wrapper for Walmart's affiliate and product APIs
 * 
 * API Docs: https://developer.walmart.com/
 */

import { ProviderError } from '../../types/index.ts';

// ============================================================================
// Types
// ============================================================================

export interface WalmartConfig {
  apiKey: string;
  partnerId: string;
  environment: 'sandbox' | 'production';
}

export interface WalmartProduct {
  itemId: string;
  name: string;
  salePrice: number;
  msrp?: number;
  upc: string;
  categoryPath: string;
  shortDescription?: string;
  brandName?: string;
  stock: 'Available' | 'Limited' | 'Out of Stock';
  availableOnline: boolean;
  size?: string;
}

export interface WalmartStore {
  storeId: string;
  name: string;
  streetAddress: string;
  city: string;
  stateProvCode: string;
  zip: string;
  phoneNumber?: string;
}

export interface WalmartSearchResponse {
  items: WalmartProduct[];
  totalResults: number;
  start: number;
  numItems: number;
}

// ============================================================================
// Walmart Client
// ============================================================================

export class WalmartClient {
  private config: WalmartConfig;
  private baseUrl: string;

  constructor(config: WalmartConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://developer.api.walmart.com'
      : 'https://developer.api.walmart.com'; // Walmart doesn't have separate sandbox URL
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add authentication headers
    const headers: Record<string, string> = {
      'WM_SEC.ACCESS_TOKEN': this.config.apiKey,
      'WM_CONSUMER.ID': this.config.partnerId,
      'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        'WALMART_API',
        `Walmart API error: ${response.status} ${errorText}`,
        `HTTP_${response.status}`,
        response.status >= 500 // Retryable if 5xx
      );
    }

    return response.json();
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `LOOPGPT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Search for products by query
   */
  async searchProducts(
    query: string,
    options: {
      start?: number;
      numItems?: number;
      categoryId?: string;
    } = {}
  ): Promise<WalmartSearchResponse> {
    const params = new URLSearchParams({
      query,
      start: (options.start || 0).toString(),
      numItems: (options.numItems || 10).toString(),
    });

    if (options.categoryId) {
      params.set('categoryId', options.categoryId);
    }

    const response = await this.request<WalmartSearchResponse>(
      `/api/v1/items/search?${params.toString()}`
    );

    return response;
  }

  /**
   * Get product by item ID
   */
  async getProduct(itemId: string): Promise<WalmartProduct | null> {
    try {
      const response = await this.request<WalmartProduct>(
        `/api/v1/items/${itemId}`
      );

      return response;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get multiple products by item IDs
   */
  async getProducts(itemIds: string[]): Promise<WalmartProduct[]> {
    if (itemIds.length === 0) return [];

    const params = new URLSearchParams({
      ids: itemIds.join(','),
    });

    try {
      const response = await this.request<{ items: WalmartProduct[] }>(
        `/api/v1/items?${params.toString()}`
      );

      return response.items || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Find stores near location
   */
  async findStores(
    zipCode: string,
    options: {
      maxDistance?: number; // miles
      maxResults?: number;
    } = {}
  ): Promise<WalmartStore[]> {
    const params = new URLSearchParams({
      zip: zipCode,
    });

    if (options.maxDistance) {
      params.set('maxDistance', options.maxDistance.toString());
    }

    if (options.maxResults) {
      params.set('maxResults', options.maxResults.toString());
    }

    try {
      const response = await this.request<WalmartStore[]>(
        `/api/v1/stores?${params.toString()}`
      );

      return response || [];
    } catch (error) {
      console.error('[WalmartClient] Error finding stores:', error);
      return [];
    }
  }

  /**
   * Build affiliate URL for checkout
   */
  buildAffiliateUrl(itemIds: string[], affiliateId: string = 'LOOPGPT'): string {
    const itemsParam = itemIds.join(',');
    return `https://www.walmart.com/cart?items=${itemsParam}&affcamid=${affiliateId}`;
  }

  /**
   * Check product availability at store
   */
  async checkStoreAvailability(
    itemId: string,
    storeId: string
  ): Promise<{ available: boolean; quantity?: number }> {
    try {
      const params = new URLSearchParams({
        itemId,
        storeId,
      });

      const response = await this.request<{ available: boolean; quantity?: number }>(
        `/api/v1/stores/availability?${params.toString()}`
      );

      return response;
    } catch (error) {
      // Default to available if API fails
      return { available: true };
    }
  }
}

// ============================================================================
// Client Factory
// ============================================================================

let clientInstance: WalmartClient | null = null;

/**
 * Get or create Walmart client instance
 */
export async function getWalmartClient(): Promise<WalmartClient> {
  if (clientInstance) {
    return clientInstance;
  }

  const apiKey = Deno.env.get('WALMART_API_KEY');
  const partnerId = Deno.env.get('WALMART_PARTNER_ID');
  const environment = (Deno.env.get('WALMART_ENV') || 'production') as 'sandbox' | 'production';

  if (!apiKey || !partnerId) {
    throw new ProviderError(
      'WALMART_API',
      'Walmart API credentials not configured. Set WALMART_API_KEY and WALMART_PARTNER_ID',
      'MISSING_CREDENTIALS',
      false
    );
  }

  clientInstance = new WalmartClient({
    apiKey,
    partnerId,
    environment,
  });

  return clientInstance;
}

/**
 * Check if Walmart API is configured
 */
export function isWalmartConfigured(): boolean {
  return !!(Deno.env.get('WALMART_API_KEY') && Deno.env.get('WALMART_PARTNER_ID'));
}
