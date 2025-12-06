/**
 * Walmart Provider Implementation
 * Dual-mode: Mock for testing, Real API for production
 * 
 * Environment Variables:
 * - WALMART_API_KEY: Walmart API key
 * - WALMART_PARTNER_ID: Walmart partner/affiliate ID
 * - WALMART_ENV: 'sandbox' or 'production'
 * - LOOPGPT_WALMART_MOCK: 'true' to force mock mode
 * - LOOPGPT_WALMART_ALLOW_MOCK_FALLBACK: 'true' to fallback to mock on API failure
 */

import type {
  ProviderQuote,
  ProviderConfig,
  CartItem,
  ItemAvailability,
  ProviderMeta,
} from '../types/index.ts';
import { ProviderError } from '../types/index.ts';
import { BaseCommerceProvider, type QuoteRequest } from './ICommerceProvider.ts';
import { getWalmartClient, isWalmartConfigured } from './clients/walmartClient.ts';

/**
 * WalmartProvider - Direct integration with Walmart API
 * 
 * Features:
 * - Walmart store inventory and pricing
 * - Competitive pricing (often lowest)
 * - Walmart+ membership benefits
 * - 1-2 hour delivery windows
 * 
 * API Docs: https://developer.walmart.com/
 */
class WalmartProvider extends BaseCommerceProvider {
  readonly id = 'WALMART_API' as const;

  async getQuote(request: QuoteRequest, config: ProviderConfig): Promise<ProviderQuote> {
    // Check if we should use mock mode
    const forceMock = Deno.env.get('LOOPGPT_WALMART_MOCK') === 'true';
    const allowMockFallback = Deno.env.get('LOOPGPT_WALMART_ALLOW_MOCK_FALLBACK') === 'true';

    if (forceMock || !isWalmartConfigured()) {
      console.log('[WalmartProvider] Using mock mode');
      return this.getMockQuote(request, config);
    }

    // Try real API
    try {
      return await this.getRealQuote(request, config);
    } catch (error) {
      console.error('[WalmartProvider] Real API failed:', error);

      // Fallback to mock if allowed
      if (allowMockFallback) {
        console.log('[WalmartProvider] Falling back to mock mode');
        return this.getMockQuote(request, config);
      }

      throw error;
    }
  }

  /**
   * Get quote from real Walmart API
   */
  private async getRealQuote(request: QuoteRequest, config: ProviderConfig): Promise<ProviderQuote> {
    const client = await getWalmartClient();

    // 1. Find nearest store (optional - for store pickup)
    const stores = await client.findStores(request.shippingAddress.postalCode, {
      maxDistance: 25,
      maxResults: 1,
    });

    const store = stores.length > 0 ? stores[0] : undefined;

    // 2. Search for products and map to cart items
    const cartItems: CartItem[] = [];
    const itemAvailability: ItemAvailability[] = [];
    const itemIds: string[] = [];

    for (const item of request.items) {
      try {
        // Search for product
        const searchResult = await client.searchProducts(item.name, {
          numItems: 5,
        });

        if (searchResult.items.length === 0) {
          // Item not found
          itemAvailability.push({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'unavailable',
            inStock: false,
          });
          continue;
        }

        // Take first matching product that's available online
        const product = searchResult.items.find(p => p.availableOnline) || searchResult.items[0];

        if (!product || product.stock === 'Out of Stock') {
          itemAvailability.push({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'unavailable',
            inStock: false,
          });
          continue;
        }

        const priceCents = this.dollarsToCents(product.salePrice);

        cartItems.push({
          clientItemId: item.id,
          providerSku: product.itemId,
          name: product.name,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          priceCents,
        });

        itemIds.push(product.itemId);

        itemAvailability.push({
          clientItemId: item.id,
          requestedItem: item.name,
          status: 'found',
          inStock: product.stock === 'Available',
          providerSku: product.itemId,
          foundProduct: {
            id: product.itemId,
            name: product.name,
            priceCents,
          },
        });
      } catch (error) {
        console.error(`[WalmartProvider] Error finding product for "${item.name}":`, error);
        itemAvailability.push({
          clientItemId: item.id,
          requestedItem: item.name,
          status: 'unavailable',
          inStock: false,
        });
      }
    }

    // 3. Calculate pricing
    const subtotalCents = cartItems.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
    const feesCents = this.dollarsToCents(7.95); // Walmart delivery fee (or free with Walmart+)
    const taxCents = Math.round(subtotalCents * 0.07); // 7% tax (varies by state)
    const totalCents = subtotalCents + feesCents + taxCents;

    // 4. Build affiliate URL
    const affiliateUrl = client.buildAffiliateUrl(itemIds, 'LOOPGPT');

    // 5. Build quote
    const providerMeta: ProviderMeta = {
      id: this.id,
      name: config.name,
      priority: config.priority,
    };

    return {
      provider: providerMeta,
      config,
      store: store ? {
        id: store.storeId,
        name: store.name,
        address: `${store.streetAddress}, ${store.city}, ${store.stateProvCode} ${store.zip}`,
      } : undefined,
      cart: cartItems,
      quote: {
        subtotalCents,
        feesCents,
        taxCents,
        totalCents,
        currency: 'USD',
        estimatedDeliveryMinutes: 90, // 1-2 hour window (average 1.5 hours)
        // Legacy fields
        subtotal: this.centsToDollars(subtotalCents),
        deliveryFee: this.centsToDollars(feesCents),
        tax: this.centsToDollars(taxCents),
        total: this.centsToDollars(totalCents),
        estimatedDelivery: {
          min: 60,
          max: 120,
        },
      },
      itemAvailability,
      affiliateUrl,
      raw: {
        provider: 'walmart',
        mode: 'real',
        storeId: store?.storeId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get mock quote for testing/fallback
   */
  private getMockQuote(request: QuoteRequest, config: ProviderConfig): ProviderQuote {
    const providerMeta: ProviderMeta = {
      id: this.id,
      name: config.name,
      priority: config.priority,
    };

    // Mock cart items (Walmart typically has lowest prices)
    const cart: CartItem[] = request.items.map((item, idx) => ({
      clientItemId: item.id,
      providerSku: `WM-MOCK-${idx.toString().padStart(5, '0')}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      priceCents: this.dollarsToCents(9.99), // Walmart's competitive pricing
      substituted: false,
    }));

    // Mock pricing
    const subtotalCents = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
    const feesCents = this.dollarsToCents(7.95);
    const taxCents = Math.round(subtotalCents * 0.07);
    const totalCents = subtotalCents + feesCents + taxCents;

    // Mock availability
    const itemAvailability: ItemAvailability[] = request.items.map((item, idx) => ({
      clientItemId: item.id,
      requestedItem: item.name,
      status: 'found' as const,
      inStock: true,
      providerSku: cart[idx].providerSku,
      foundProduct: {
        id: cart[idx].providerSku!,
        name: item.name,
        priceCents: cart[idx].priceCents,
      },
    }));

    const affiliateUrl = `https://www.walmart.com/cart?cartId=mock-walmart-${Date.now()}&affId=LOOPGPT`;

    return {
      provider: providerMeta,
      config,
      cart,
      quote: {
        subtotalCents,
        feesCents,
        taxCents,
        totalCents,
        currency: 'USD',
        estimatedDeliveryMinutes: 90,
        // Legacy fields
        subtotal: this.centsToDollars(subtotalCents),
        deliveryFee: this.centsToDollars(feesCents),
        tax: this.centsToDollars(taxCents),
        total: this.centsToDollars(totalCents),
        estimatedDelivery: {
          min: 60,
          max: 120,
        },
      },
      itemAvailability,
      affiliateUrl,
      raw: {
        provider: 'walmart',
        mode: 'mock',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async healthCheck(config: ProviderConfig): Promise<boolean> {
    // Check if mock mode
    if (Deno.env.get('LOOPGPT_WALMART_MOCK') === 'true') {
      return config.enabled;
    }

    // Check if API is configured
    if (!isWalmartConfigured()) {
      console.warn('[WalmartProvider] API credentials not configured');
      return false;
    }

    // Try to get a client (validates credentials)
    try {
      await getWalmartClient();
      return true;
    } catch (error) {
      console.error('[WalmartProvider] Health check failed:', error);
      return false;
    }
  }

  getName(): string {
    return 'Walmart Direct';
  }
}

export const walmartProvider = new WalmartProvider();
