/**
 * Walmart Provider Tests
 * Tests for Walmart API integration (mock and real modes)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { walmartProvider } from "../../../_shared/commerce/providers/walmartProvider.ts";
import {
  createSampleQuoteRequest,
  createSampleProviderConfig,
  assertValidProviderQuote,
  assertReasonablePricing,
  withTestEnv,
  skipIfNoKeys,
  SAMPLE_ITEMS,
} from "../testUtils.ts";

// ============================================================================
// Mock Mode Tests
// ============================================================================

Deno.test("Walmart Provider - Mock Mode - Returns valid quote", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API', SAMPLE_ITEMS);
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      // Assert valid structure
      assertValidProviderQuote(quote, 'WALMART_API', SAMPLE_ITEMS.length);

      // Assert reasonable pricing
      assertReasonablePricing(quote);

      // Assert all items found in mock mode
      const foundItems = quote.itemAvailability.filter(ia => ia.status === 'found');
      assertEquals(foundItems.length, SAMPLE_ITEMS.length, 'All items should be found in mock mode');
    }
  );
});

Deno.test("Walmart Provider - Mock Mode - Lowest pricing", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API', SAMPLE_ITEMS);
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      // Walmart mock should have $9.99 per item (lowest)
      const firstCartItem = quote.cart[0];
      assertEquals(firstCartItem.priceCents, 999, 'Walmart should have $9.99 pricing');
    }
  );
});

Deno.test("Walmart Provider - Mock Mode - Fast delivery", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API');
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      // Walmart should have 1-2 hour delivery (90 min average)
      assertEquals(quote.quote.estimatedDeliveryMinutes, 90);
    }
  );
});

Deno.test("Walmart Provider - Mock Mode - Affiliate URL present", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API');
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      assertExists(quote.affiliateUrl, 'Affiliate URL should be present');
      assertEquals(
        quote.affiliateUrl?.includes('walmart.com'),
        true,
        'Affiliate URL should be Walmart domain'
      );
      assertEquals(
        quote.affiliateUrl?.includes('LOOPGPT'),
        true,
        'Affiliate URL should include LOOPGPT ID'
      );
    }
  );
});

// ============================================================================
// Real API Tests (skip if no keys)
// ============================================================================

Deno.test("Walmart Provider - Real API - Returns valid quote", async () => {
  skipIfNoKeys('WALMART_API');

  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'false',
      WALMART_ENV: 'sandbox',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API', SAMPLE_ITEMS);
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      // Assert valid structure
      assertValidProviderQuote(quote, 'WALMART_API', SAMPLE_ITEMS.length);

      // Assert reasonable pricing
      assertReasonablePricing(quote);

      // Assert raw mode is 'real'
      assertEquals((quote.raw as any).mode, 'real');
    }
  );
});

// ============================================================================
// Fallback Tests
// ============================================================================

Deno.test("Walmart Provider - Fallback to mock on API failure", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'false',
      LOOPGPT_WALMART_ALLOW_MOCK_FALLBACK: 'true',
      // Invalid credentials to force failure
      WALMART_API_KEY: 'invalid',
      WALMART_PARTNER_ID: 'invalid',
    },
    async () => {
      const request = createSampleQuoteRequest('WALMART_API');
      const config = createSampleProviderConfig('WALMART_API');

      const quote = await walmartProvider.getQuote(request, config);

      // Should fallback to mock
      assertEquals((quote.raw as any).mode, 'mock');
      assertValidProviderQuote(quote, 'WALMART_API', SAMPLE_ITEMS.length);
    }
  );
});

// ============================================================================
// Health Check Tests
// ============================================================================

Deno.test("Walmart Provider - Health check in mock mode", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const config = createSampleProviderConfig('WALMART_API', { enabled: true });
      const healthy = await walmartProvider.healthCheck(config);

      assertEquals(healthy, true, 'Should be healthy in mock mode');
    }
  );
});

Deno.test("Walmart Provider - Health check fails without credentials", async () => {
  await withTestEnv(
    {
      LOOPGPT_WALMART_MOCK: 'false',
      WALMART_API_KEY: '',
      WALMART_PARTNER_ID: '',
    },
    async () => {
      const config = createSampleProviderConfig('WALMART_API');
      const healthy = await walmartProvider.healthCheck(config);

      assertEquals(healthy, false, 'Should be unhealthy without credentials');
    }
  );
});
