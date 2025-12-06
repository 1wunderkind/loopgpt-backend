/**
 * Kroger API Client
 * OAuth2 authentication and API wrapper for Kroger's public grocery API
 * 
 * API Docs: https://developer.kroger.com/
 */

import { ProviderError } from '../../types/index.ts';

// ============================================================================
// Types
// ============================================================================

export interface KrogerConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

export interface KrogerAuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  expiresAt: number; // Unix timestamp
}

export interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  categories: string[];
  items: Array<{
    itemId: string;
    price: {
      regular: number;
      promo?: number;
    };
    size: string;
  }>;
}

export interface KrogerStore {
  locationId: string;
  name: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  geolocation: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// Kroger Client
// ============================================================================

export class KrogerClient {
  private config: KrogerConfig;
  private baseUrl: string;
  private tokenCache: KrogerAuthToken | null = null;

  constructor(config: KrogerConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.kroger.com/v1'
      : 'https://api-ce.kroger.com/v1';
  }

  /**
   * Get valid access token (cached or new)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.access_token;
    }

    // Get new token
    const authUrl = this.config.environment === 'production'
      ? 'https://api.kroger.com/v1/connect/oauth2/token'
      : 'https://api-ce.kroger.com/v1/connect/oauth2/token';

    const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });

    if (!response.ok) {
      throw new ProviderError(
        'KROGER_API',
        `Kroger auth failed: ${response.status} ${response.statusText}`,
        'AUTH_FAILED',
        false
      );
    }

    const data = await response.json();

    // Cache token
    this.tokenCache = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // 1 min buffer
    };

    return this.tokenCache.access_token;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        'KROGER_API',
        `Kroger API error: ${response.status} ${errorText}`,
        `HTTP_${response.status}`,
        response.status >= 500 // Retryable if 5xx
      );
    }

    return response.json();
  }

  /**
   * Search for products by term
   */
  async searchProducts(
    term: string,
    locationId: string,
    limit: number = 10
  ): Promise<KrogerProduct[]> {
    const params = new URLSearchParams({
      'filter.term': term,
      'filter.locationId': locationId,
      'filter.limit': limit.toString(),
    });

    const response = await this.request<{ data: KrogerProduct[] }>(
      `/products?${params.toString()}`
    );

    return response.data || [];
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, locationId: string): Promise<KrogerProduct | null> {
    try {
      const params = new URLSearchParams({
        'filter.locationId': locationId,
      });

      const response = await this.request<{ data: KrogerProduct }>(
        `/products/${productId}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find stores near location
   */
  async findStores(
    zipCode: string,
    radiusMiles: number = 10,
    limit: number = 5
  ): Promise<KrogerStore[]> {
    const params = new URLSearchParams({
      'filter.zipCode.near': zipCode,
      'filter.radiusInMiles': radiusMiles.toString(),
      'filter.limit': limit.toString(),
    });

    const response = await this.request<{ data: KrogerStore[] }>(
      `/locations?${params.toString()}`
    );

    return response.data || [];
  }

  /**
   * Get store by ID
   */
  async getStore(locationId: string): Promise<KrogerStore | null> {
    try {
      const response = await this.request<{ data: KrogerStore }>(
        `/locations/${locationId}`
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }
}

// ============================================================================
// Client Factory
// ============================================================================

let clientInstance: KrogerClient | null = null;

/**
 * Get or create Kroger client instance
 */
export async function getKrogerClient(): Promise<KrogerClient> {
  if (clientInstance) {
    return clientInstance;
  }

  const clientId = Deno.env.get('KROGER_CLIENT_ID');
  const clientSecret = Deno.env.get('KROGER_CLIENT_SECRET');
  const environment = (Deno.env.get('KROGER_ENV') || 'sandbox') as 'sandbox' | 'production';

  if (!clientId || !clientSecret) {
    throw new ProviderError(
      'KROGER_API',
      'Kroger API credentials not configured. Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET',
      'MISSING_CREDENTIALS',
      false
    );
  }

  clientInstance = new KrogerClient({
    clientId,
    clientSecret,
    environment,
  });

  return clientInstance;
}

/**
 * Check if Kroger API is configured
 */
export function isKrogerConfigured(): boolean {
  return !!(Deno.env.get('KROGER_CLIENT_ID') && Deno.env.get('KROGER_CLIENT_SECRET'));
}
