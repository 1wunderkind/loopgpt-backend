/**
 * Kroger Provider Implementation
 * Dual-mode: Mock for testing, Real API for production
 * 
 * Environment Variables:
 * - KROGER_CLIENT_ID: Kroger API client ID
 * - KROGER_CLIENT_SECRET: Kroger API client secret
 * - KROGER_ENV: 'sandbox' or 'production'
 * - LOOPGPT_KROGER_MOCK: 'true' to force mock mode
 * - LOOPGPT_KROGER_ALLOW_MOCK_FALLBACK: 'true' to fallback to mock on API failure
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
import { getKrogerClient, isKrogerConfigured, type KrogerProduct } from './clients/krogerClient.ts';

/**
 * KrogerProvider - Direct integration with Kroger API
 * 
 * Features:
 * - Direct Kroger store inventory
 * - Competitive pricing (no middleman)
 * - Kroger loyalty program integration
 * - 2-4 hour delivery windows
 * 
 * API Docs: https://developer.kroger.com/
 */
class KrogerProvider extends BaseCommerceProvider {
  readonly id = 'KROGER_API' as const;

  async getQuote(request: QuoteRequest, config: ProviderConfig): Promise<ProviderQuote> {
    // Check if we should use mock mode
    const forceMock = Deno.env.get('LOOPGPT_KROGER_MOCK') === 'true';
    const allowMockFallback = Deno.env.get('LOOPGPT_KROGER_ALLOW_MOCK_FALLBACK') === 'true';

    if (forceMock || !isKrogerConfigured()) {
      console.log('[KrogerProvider] Using mock mode');
      return this.getMockQuote(request, config);
    }

    // Try real API
    try {
      return await this.getRealQuote(request, config);
    } catch (error) {
      console.error('[KrogerProvider] Real API failed:', error);

      // Fallback to mock if allowed
      if (allowMockFallback) {
        console.log('[KrogerProvider] Falling back to mock mode');
        return this.getMockQuote(request, config);
      }

      throw error;
    }
  }

  /**
   * Get quote from real Kroger API
   */
  private async getRealQuote(request: QuoteRequest, config: ProviderConfig): Promise<ProviderQuote> {
    const client = await getKrogerClient();

    // 1. Find nearest store
    const stores = await client.findStores(request.shippingAddress.postalCode, 10, 1);
    if (stores.length === 0) {
      throw new ProviderError(
        this.id,
        'No Kroger stores found near delivery address',
        'NO_STORES',
        false
      );
    }

    const store = stores[0];
    const storeId = store.locationId;

    // 2. Search for products and map to cart items
    const cartItems: CartItem[] = [];
    const itemAvailability: ItemAvailability[] = [];

    for (const item of request.items) {
      try {
        // Search for product
        const products = await client.searchProducts(item.name, storeId, 5);

        if (products.length === 0) {
          // Item not found
          itemAvailability.push({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'unavailable',
            inStock: false,
          });
          continue;
        }

        // Take first matching product
        const product = products[0];
        const productItem = product.items[0]; // First variant

        if (!productItem) {
          itemAvailability.push({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'unavailable',
            inStock: false,
          });
          continue;
        }

        const priceCents = this.dollarsToCents(productItem.price.promo || productItem.price.regular);

        cartItems.push({
          clientItemId: item.id,
          providerSku: productItem.itemId,
          name: product.description,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          priceCents,
        });

        itemAvailability.push({
          clientItemId: item.id,
          requestedItem: item.name,
          status: 'found',
          inStock: true,
          providerSku: productItem.itemId,
          foundProduct: {
            id: productItem.itemId,
            name: product.description,
            priceCents,
          },
        });
      } catch (error) {
        console.error(`[KrogerProvider] Error finding product for "${item.name}":`, error);
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
    const feesCents = subtotalCents < 3500 ? this.dollarsToCents(9.95) : 0; // $9.95 fee if under $35
    const taxCents = Math.round(subtotalCents * 0.075); // 7.5% tax (varies by state)
    const totalCents = subtotalCents + feesCents + taxCents;

    // 4. Build quote
    const providerMeta: ProviderMeta = {
      id: this.id,
      name: config.name,
      priority: config.priority,
    };

    const affiliateUrl = `https://www.kroger.com/checkout?storeId=${storeId}&affId=LOOPGPT`;

    return {
      provider: providerMeta,
      config,
      store: {
        id: store.locationId,
        name: store.name,
        address: `${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`,
      },
      cart: cartItems,
      quote: {
        subtotalCents,
        feesCents,
        taxCents,
        totalCents,
        currency: 'USD',
        estimatedDeliveryMinutes: 150, // 2-4 hour window (average 2.5 hours)
        // Legacy fields
        subtotal: this.centsToDollars(subtotalCents),
        deliveryFee: this.centsToDollars(feesCents),
        tax: this.centsToDollars(taxCents),
        total: this.centsToDollars(totalCents),
        estimatedDelivery: {
          min: 120,
          max: 240,
        },
      },
      itemAvailability,
      affiliateUrl,
      raw: {
        provider: 'kroger',
        mode: 'real',
        storeId,
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

    // Mock cart items
    const cart: CartItem[] = request.items.map((item, idx) => ({
      clientItemId: item.id,
      providerSku: this.generateMockSku(this.id, item.name, idx),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      priceCents: this.dollarsToCents(10.99),
      substituted: false,
    }));

    // Mock pricing
    const subtotalCents = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
    const feesCents = subtotalCents < 3500 ? this.dollarsToCents(9.95) : 0;
    const taxCents = Math.round(subtotalCents * 0.075);
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

    const affiliateUrl = `https://www.kroger.com/checkout?cartId=mock-kroger-${Date.now()}&affId=LOOPGPT`;

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
        estimatedDeliveryMinutes: 150,
        // Legacy fields
        subtotal: this.centsToDollars(subtotalCents),
        deliveryFee: this.centsToDollars(feesCents),
        tax: this.centsToDollars(taxCents),
        total: this.centsToDollars(totalCents),
        estimatedDelivery: {
          min: 120,
          max: 240,
        },
      },
      itemAvailability,
      affiliateUrl,
      raw: {
        provider: 'kroger',
        mode: 'mock',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async healthCheck(config: ProviderConfig): Promise<boolean> {
    // Check if mock mode
    if (Deno.env.get('LOOPGPT_KROGER_MOCK') === 'true') {
      return config.enabled;
    }

    // Check if API is configured
    if (!isKrogerConfigured()) {
      console.warn('[KrogerProvider] API credentials not configured');
      return false;
    }

    // Try to get a client (validates credentials)
    try {
      await getKrogerClient();
      return true;
    } catch (error) {
      console.error('[KrogerProvider] Health check failed:', error);
      return false;
    }
  }

  getName(): string {
    return 'Kroger Direct';
  }
}

export const krogerProvider = new KrogerProvider();
