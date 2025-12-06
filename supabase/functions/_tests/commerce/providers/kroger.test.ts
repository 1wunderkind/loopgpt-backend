/**
 * Kroger Provider Tests
 * Tests for Kroger API integration (mock and real modes)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { krogerProvider } from "../../../_shared/commerce/providers/krogerProvider.ts";
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

Deno.test("Kroger Provider - Mock Mode - Returns valid quote", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API', SAMPLE_ITEMS);
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // Assert valid structure
      assertValidProviderQuote(quote, 'KROGER_API', SAMPLE_ITEMS.length);

      // Assert reasonable pricing
      assertReasonablePricing(quote);

      // Assert all items found in mock mode
      const foundItems = quote.itemAvailability.filter(ia => ia.status === 'found');
      assertEquals(foundItems.length, SAMPLE_ITEMS.length, 'All items should be found in mock mode');
    }
  );
});

Deno.test("Kroger Provider - Mock Mode - Correct provider metadata", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API');
      const config = createSampleProviderConfig('KROGER_API', { priority: 60 });

      const quote = await krogerProvider.getQuote(request, config);

      assertEquals(quote.provider.id, 'KROGER_API');
      assertEquals(quote.provider.name, config.name);
      assertEquals(quote.provider.priority, 60);
    }
  );
});

Deno.test("Kroger Provider - Mock Mode - Free delivery over $35", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      // Create request with many items to exceed $35
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        name: `Product ${i}`,
        quantity: 1,
        unit: 'pcs',
      }));

      const request = createSampleQuoteRequest('KROGER_API', manyItems);
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // With 10 items at $10.99 each = $109.90, should have free delivery
      assertEquals(quote.quote.feesCents, 0, 'Should have free delivery over $35');
    }
  );
});

Deno.test("Kroger Provider - Mock Mode - Delivery fee under $35", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      // Create request with only 1 item ($10.99)
      const oneItem = [{
        id: 'item-1',
        name: 'Single Product',
        quantity: 1,
        unit: 'pcs',
      }];

      const request = createSampleQuoteRequest('KROGER_API', oneItem);
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // Should have $9.95 delivery fee
      assertEquals(quote.quote.feesCents, 995, 'Should have $9.95 delivery fee under $35');
    }
  );
});

Deno.test("Kroger Provider - Mock Mode - Affiliate URL present", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API');
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      assertExists(quote.affiliateUrl, 'Affiliate URL should be present');
      assertEquals(
        quote.affiliateUrl?.includes('kroger.com'),
        true,
        'Affiliate URL should be Kroger domain'
      );
      assertEquals(
        quote.affiliateUrl?.includes('LOOPGPT'),
        true,
        'Affiliate URL should include LOOPGPT ID'
      );
    }
  );
});

Deno.test("Kroger Provider - Mock Mode - Raw metadata", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API');
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      assertExists(quote.raw, 'Raw metadata should be present');
      assertEquals((quote.raw as any).provider, 'kroger');
      assertEquals((quote.raw as any).mode, 'mock');
      assertExists((quote.raw as any).timestamp);
    }
  );
});

// ============================================================================
// Real API Tests (skip if no keys)
// ============================================================================

Deno.test("Kroger Provider - Real API - Returns valid quote", async () => {
  skipIfNoKeys('KROGER_API');

  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'false',
      KROGER_ENV: 'sandbox',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API', SAMPLE_ITEMS);
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // Assert valid structure
      assertValidProviderQuote(quote, 'KROGER_API', SAMPLE_ITEMS.length);

      // Assert reasonable pricing
      assertReasonablePricing(quote);

      // Assert raw mode is 'real'
      assertEquals((quote.raw as any).mode, 'real');
    }
  );
});

Deno.test("Kroger Provider - Real API - Store information", async () => {
  skipIfNoKeys('KROGER_API');

  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'false',
      KROGER_ENV: 'sandbox',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API');
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // Should have store information
      assertExists(quote.store, 'Store information should be present');
      assertExists(quote.store?.id, 'Store ID should be present');
      assertExists(quote.store?.name, 'Store name should be present');
      assertExists(quote.store?.address, 'Store address should be present');
    }
  );
});

// ============================================================================
// Fallback Tests
// ============================================================================

Deno.test("Kroger Provider - Fallback to mock on API failure", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'false',
      LOOPGPT_KROGER_ALLOW_MOCK_FALLBACK: 'true',
      // Invalid credentials to force failure
      KROGER_CLIENT_ID: 'invalid',
      KROGER_CLIENT_SECRET: 'invalid',
    },
    async () => {
      const request = createSampleQuoteRequest('KROGER_API');
      const config = createSampleProviderConfig('KROGER_API');

      const quote = await krogerProvider.getQuote(request, config);

      // Should fallback to mock
      assertEquals((quote.raw as any).mode, 'mock');
      assertValidProviderQuote(quote, 'KROGER_API', SAMPLE_ITEMS.length);
    }
  );
});

// ============================================================================
// Health Check Tests
// ============================================================================

Deno.test("Kroger Provider - Health check in mock mode", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
    },
    async () => {
      const config = createSampleProviderConfig('KROGER_API', { enabled: true });
      const healthy = await krogerProvider.healthCheck(config);

      assertEquals(healthy, true, 'Should be healthy in mock mode');
    }
  );
});

Deno.test("Kroger Provider - Health check fails without credentials", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'false',
      KROGER_CLIENT_ID: '',
      KROGER_CLIENT_SECRET: '',
    },
    async () => {
      const config = createSampleProviderConfig('KROGER_API');
      const healthy = await krogerProvider.healthCheck(config);

      assertEquals(healthy, false, 'Should be unhealthy without credentials');
    }
  );
});
