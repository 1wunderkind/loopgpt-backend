/**
 * End-to-End Integration Tests
 * Tests for complete routing flow with different provider configurations
 * 
 * ⚠️ These tests should only run in staging environment
 * Set LOOPGPT_ENV=staging to enable
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withTestEnv, SAMPLE_ITEMS, SAMPLE_ADDRESS } from "../testUtils.ts";
import type { RouteOrderRequest, RouteOrderResponse } from "../../../_shared/commerce/types/index.ts";

// Check if running in staging
const isStaging = Deno.env.get('LOOPGPT_ENV') === 'staging';

if (!isStaging) {
  console.log('⏭️  Skipping E2E tests (not in staging environment)');
  console.log('   Set LOOPGPT_ENV=staging to run these tests');
  Deno.exit(0);
}

// Supabase client for staging
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper to call loopgpt_route_order function
 */
async function routeOrder(request: RouteOrderRequest): Promise<RouteOrderResponse> {
  const { data, error } = await supabase.functions.invoke('loopgpt_route_order', {
    body: request,
  });

  if (error) {
    throw new Error(`Router failed: ${error.message}`);
  }

  return data;
}

/**
 * Create sample route order request
 */
function createRouteOrderRequest(overrides?: Partial<RouteOrderRequest>): RouteOrderRequest {
  return {
    items: SAMPLE_ITEMS,
    shippingAddress: SAMPLE_ADDRESS,
    preferences: {
      optimizeFor: 'balanced',
    },
    ...overrides,
  };
}

/**
 * Assert valid route order response
 */
function assertValidRouteOrderResponse(response: RouteOrderResponse): void {
  // Basic structure
  assertExists(response.selectedProvider, 'Should have selectedProvider');
  assertExists(response.quote, 'Should have quote');
  assertExists(response.confirmationToken, 'Should have confirmationToken');
  assertExists(response.requestId, 'Should have requestId');

  // Selected provider
  assertExists(response.selectedProvider.id, 'Provider should have ID');
  assertExists(response.selectedProvider.name, 'Provider should have name');
  assertEquals(typeof response.selectedProvider.priority, 'number', 'Priority should be number');

  // Quote
  assertEquals(typeof response.quote.totalCents, 'number', 'Total should be number');
  assertEquals(response.quote.totalCents > 0, true, 'Total should be positive');
  assertEquals(response.quote.currency, 'USD', 'Currency should be USD');

  // Item availability
  assertExists(response.itemAvailability, 'Should have itemAvailability');
  assertEquals(
    Array.isArray(response.itemAvailability),
    true,
    'Item availability should be array'
  );

  // Score breakdown
  if (response.scoreBreakdown) {
    assertEquals(typeof response.scoreBreakdown.weightedTotal, 'number', 'Score should be number');
    assertEquals(typeof response.scoreBreakdown.priceScore, 'number', 'Price score should be number');
    assertEquals(typeof response.scoreBreakdown.speedScore, 'number', 'Speed score should be number');
  }

  // Alternative quotes (optional)
  if (response.alternativeQuotes) {
    assertEquals(
      Array.isArray(response.alternativeQuotes),
      true,
      'Alternative quotes should be array'
    );
  }
}

// ============================================================================
// E2E Test: MealMe Only
// ============================================================================

Deno.test("E2E - MealMe Only - Returns valid response", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'false',
      LOOPGPT_ENABLE_WALMART: 'false',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Should select MealMe or Instacart (only aggregators enabled)
      const selectedId = response.selectedProvider.id;
      assertEquals(
        selectedId === 'MEALME' || selectedId === 'INSTACART',
        true,
        `Should select aggregator, got ${selectedId}`
      );
    }
  );
});

Deno.test("E2E - MealMe Only - Price optimization", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'false',
      LOOPGPT_ENABLE_WALMART: 'false',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'price' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Should have high price score
      if (response.scoreBreakdown) {
        assertEquals(
          response.scoreBreakdown.priceScore >= 50,
          true,
          'Price score should be at least 50 with price optimization'
        );
      }
    }
  );
});

// ============================================================================
// E2E Test: Direct APIs Only
// ============================================================================

Deno.test("E2E - Direct APIs Only - Returns valid response", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
      // Disable aggregators by setting very low priority
      LOOPGPT_MEALME_PRIORITY: '10',
      LOOPGPT_INSTACART_PRIORITY: '10',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Should select Kroger or Walmart (direct APIs)
      const selectedId = response.selectedProvider.id;
      assertEquals(
        selectedId === 'KROGER_API' || selectedId === 'WALMART_API',
        true,
        `Should select direct API, got ${selectedId}`
      );
    }
  );
});

Deno.test("E2E - Direct APIs Only - Walmart cheapest", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
      LOOPGPT_MEALME_PRIORITY: '10',
      LOOPGPT_INSTACART_PRIORITY: '10',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'price' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Walmart should be selected (cheapest in mock mode: $9.99/item)
      assertEquals(
        response.selectedProvider.id,
        'WALMART_API',
        'Walmart should be cheapest'
      );
    }
  );
});

Deno.test("E2E - Direct APIs Only - Kroger with priority boost", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_PREFER_DIRECT_KROGER: 'true', // +20 priority
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'balanced' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Kroger should be selected due to priority boost
      assertEquals(
        response.selectedProvider.id,
        'KROGER_API',
        'Kroger should be selected with priority boost'
      );
    }
  );
});

// ============================================================================
// E2E Test: Mixed (All Providers)
// ============================================================================

Deno.test("E2E - Mixed - All providers enabled", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Should have alternative quotes from other providers
      assertExists(response.alternativeQuotes, 'Should have alternative quotes');
      assertEquals(
        response.alternativeQuotes!.length >= 2,
        true,
        'Should have at least 2 alternative quotes'
      );
    }
  );
});

Deno.test("E2E - Mixed - Price optimization selects cheapest", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'price' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // Walmart should be selected (cheapest: $9.99/item)
      assertEquals(
        response.selectedProvider.id,
        'WALMART_API',
        'Should select cheapest provider (Walmart)'
      );

      // Should have high price score
      if (response.scoreBreakdown) {
        assertEquals(
          response.scoreBreakdown.priceScore >= 80,
          true,
          'Price score should be high for cheapest provider'
        );
      }
    }
  );
});

Deno.test("E2E - Mixed - Speed optimization selects fastest", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'speed' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // MealMe or Instacart should be selected (fastest: 30-60 min)
      const selectedId = response.selectedProvider.id;
      assertEquals(
        selectedId === 'MEALME' || selectedId === 'INSTACART',
        true,
        `Should select fastest provider (aggregator), got ${selectedId}`
      );

      // Should have high speed score
      if (response.scoreBreakdown) {
        assertEquals(
          response.scoreBreakdown.speedScore >= 80,
          true,
          'Speed score should be high for fastest provider'
        );
      }
    }
  );
});

Deno.test("E2E - Mixed - Margin optimization selects highest commission", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
      // Set MealMe to higher commission
      LOOPGPT_MEALME_COMMISSION: '0.05',
    },
    async () => {
      const request = createRouteOrderRequest({
        preferences: { optimizeFor: 'margin' },
      });
      const response = await routeOrder(request);

      assertValidRouteOrderResponse(response);

      // MealMe should be selected (highest commission: 5%)
      assertEquals(
        response.selectedProvider.id,
        'MEALME',
        'Should select provider with highest commission'
      );

      // Should have high margin score
      if (response.scoreBreakdown) {
        assertEquals(
          response.scoreBreakdown.marginScore >= 80,
          true,
          'Margin score should be high for highest commission provider'
        );
      }
    }
  );
});

// ============================================================================
// E2E Test: Response Schema Validation
// ============================================================================

Deno.test("E2E - Response Schema - All required fields present", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      // Required fields
      assertExists(response.selectedProvider);
      assertExists(response.selectedProvider.id);
      assertExists(response.selectedProvider.name);
      assertExists(response.selectedProvider.priority);

      assertExists(response.quote);
      assertExists(response.quote.subtotalCents);
      assertExists(response.quote.feesCents);
      assertExists(response.quote.taxCents);
      assertExists(response.quote.totalCents);
      assertExists(response.quote.currency);

      assertExists(response.itemAvailability);
      assertExists(response.confirmationToken);
      assertExists(response.requestId);

      // Optional fields (should exist in full response)
      assertExists(response.scoreBreakdown);
      assertExists(response.alternativeQuotes);
      assertExists(response.affiliateUrl);
    }
  );
});

Deno.test("E2E - Response Schema - Item availability matches request", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      // Item availability should match request items
      assertEquals(
        response.itemAvailability.length,
        request.items.length,
        'Item availability count should match request'
      );

      // Each item should have required fields
      for (const item of response.itemAvailability) {
        assertExists(item.clientItemId);
        assertExists(item.requestedItem);
        assertExists(item.status);
        assertEquals(typeof item.inStock, 'boolean');
      }
    }
  );
});

Deno.test("E2E - Response Schema - Alternative quotes structure", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const request = createRouteOrderRequest();
      const response = await routeOrder(request);

      assertExists(response.alternativeQuotes);

      // Each alternative should have same structure as selected
      for (const alt of response.alternativeQuotes!) {
        assertExists(alt.provider);
        assertExists(alt.provider.id);
        assertExists(alt.quote);
        assertExists(alt.quote.totalCents);
        assertExists(alt.score);
      }
    }
  );
});

// ============================================================================
// E2E Test: Fixed Scoring Weights
// ============================================================================

Deno.test("E2E - Fixed Weights - Consistent selection", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
      // Fix scoring weights
      LOOPGPT_SCORE_PRIORITY_WEIGHT: '1.0',
      LOOPGPT_SCORE_PRICE_WEIGHT: '0.30',
      LOOPGPT_SCORE_SPEED_WEIGHT: '0.15',
      LOOPGPT_SCORE_COMMISSION_WEIGHT: '0.20',
      LOOPGPT_SCORE_AVAILABILITY_WEIGHT: '0.25',
      LOOPGPT_SCORE_RELIABILITY_WEIGHT: '0.10',
    },
    async () => {
      const request = createRouteOrderRequest();
      
      // Run same request multiple times
      const responses = await Promise.all([
        routeOrder(request),
        routeOrder(request),
        routeOrder(request),
      ]);

      // All should select same provider (deterministic)
      const selectedProviders = responses.map(r => r.selectedProvider.id);
      const firstProvider = selectedProviders[0];
      
      for (const providerId of selectedProviders) {
        assertEquals(
          providerId,
          firstProvider,
          'Should consistently select same provider with fixed weights'
        );
      }
    }
  );
});
