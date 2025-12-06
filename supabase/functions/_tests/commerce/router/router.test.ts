/**
 * Router Integration Tests
 * Tests for multi-provider routing logic
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ProviderScorer } from "../../../_shared/commerce/ProviderScorer.ts";
import { getEnabledProvidersSorted } from "../../../_shared/commerce/providers/providerConfigs.ts";
import {
  createSampleQuoteRequest,
  withTestEnv,
  SAMPLE_ITEMS,
  SAMPLE_ADDRESS,
} from "../testUtils.ts";
import type { RouteOrderRequest } from "../../../_shared/commerce/types/index.ts";

// Mock Supabase client for testing
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Provider Selection Tests
// ============================================================================

Deno.test("Router - Returns at least one quote with all providers enabled", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
    },
    async () => {
      const providers = getEnabledProvidersSorted();

      // Should have at least MealMe, Instacart, Kroger, Walmart
      assertEquals(providers.length >= 4, true, 'Should have at least 4 providers enabled');
    }
  );
});

Deno.test("Router - Only MealMe and Instacart when direct APIs disabled", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'false',
      LOOPGPT_ENABLE_WALMART: 'false',
    },
    async () => {
      const providers = getEnabledProvidersSorted();

      // Should only have MealMe and Instacart
      const providerIds = providers.map(p => p.id);
      assertEquals(providerIds.includes('MEALME'), true);
      assertEquals(providerIds.includes('INSTACART'), true);
      assertEquals(providerIds.includes('KROGER_API'), false);
      assertEquals(providerIds.includes('WALMART_API'), false);
    }
  );
});

Deno.test("Router - Direct APIs included when enabled", async () => {
  await withTestEnv(
    {
      LOOPGPT_ENABLE_KROGER: 'true',
      LOOPGPT_ENABLE_WALMART: 'true',
    },
    async () => {
      const providers = getEnabledProvidersSorted();

      const providerIds = providers.map(p => p.id);
      assertEquals(providerIds.includes('KROGER_API'), true);
      assertEquals(providerIds.includes('WALMART_API'), true);
    }
  );
});

// ============================================================================
// Scoring Tests
// ============================================================================

Deno.test("Scorer - Selects cheapest provider with price optimization", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const scorer = new ProviderScorer(supabase);

      // Create mock quotes with different prices
      const quotes = [
        {
          provider: { id: 'MEALME' as const, name: 'MealMe', priority: 50 },
          config: {
            id: 'MEALME' as const,
            name: 'MealMe',
            enabled: true,
            priority: 50,
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 5000,
            feesCents: 500,
            taxCents: 400,
            totalCents: 5900, // Most expensive
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 45,
            subtotal: 50,
            deliveryFee: 5,
            tax: 4,
            total: 59,
            estimatedDelivery: { min: 30, max: 60 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
        {
          provider: { id: 'WALMART_API' as const, name: 'Walmart', priority: 50 },
          config: {
            id: 'WALMART_API' as const,
            name: 'Walmart',
            enabled: true,
            priority: 50,
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 3000,
            feesCents: 795,
            taxCents: 265,
            totalCents: 4060, // Cheapest
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 90,
            subtotal: 30,
            deliveryFee: 7.95,
            tax: 2.65,
            total: 40.60,
            estimatedDelivery: { min: 60, max: 120 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
      ];

      const scored = await scorer.scoreProviders(quotes, SAMPLE_ITEMS.length, 'price');

      // Walmart should be selected (cheapest)
      assertEquals(scored[0].provider.id, 'WALMART_API', 'Should select cheapest provider');
    }
  );
});

Deno.test("Scorer - Selects fastest provider with speed optimization", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const scorer = new ProviderScorer(supabase);

      // Create mock quotes with different delivery times
      const quotes = [
        {
          provider: { id: 'MEALME' as const, name: 'MealMe', priority: 50 },
          config: {
            id: 'MEALME' as const,
            name: 'MealMe',
            enabled: true,
            priority: 50,
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 4500,
            feesCents: 500,
            taxCents: 350,
            totalCents: 5350,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 40, // Fastest
            subtotal: 45,
            deliveryFee: 5,
            tax: 3.5,
            total: 53.5,
            estimatedDelivery: { min: 30, max: 50 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
        {
          provider: { id: 'KROGER_API' as const, name: 'Kroger', priority: 50 },
          config: {
            id: 'KROGER_API' as const,
            name: 'Kroger',
            enabled: true,
            priority: 50,
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 4000,
            feesCents: 995,
            taxCents: 300,
            totalCents: 5295,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 150, // Slowest
            subtotal: 40,
            deliveryFee: 9.95,
            tax: 3,
            total: 52.95,
            estimatedDelivery: { min: 120, max: 180 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
      ];

      const scored = await scorer.scoreProviders(quotes, SAMPLE_ITEMS.length, 'speed');

      // MealMe should be selected (fastest)
      assertEquals(scored[0].provider.id, 'MEALME', 'Should select fastest provider');
    }
  );
});

Deno.test("Scorer - Prefers higher commission with margin optimization", async () => {
  await withTestEnv(
    {
      LOOPGPT_KROGER_MOCK: 'true',
      LOOPGPT_WALMART_MOCK: 'true',
    },
    async () => {
      const scorer = new ProviderScorer(supabase);

      // Create mock quotes with different commission rates
      const quotes = [
        {
          provider: { id: 'INSTACART' as const, name: 'Instacart', priority: 50 },
          config: {
            id: 'INSTACART' as const,
            name: 'Instacart',
            enabled: true,
            priority: 50,
            commissionRate: 0.02, // Lower commission
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 5000,
            feesCents: 500,
            taxCents: 400,
            totalCents: 5900,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 60,
            subtotal: 50,
            deliveryFee: 5,
            tax: 4,
            total: 59,
            estimatedDelivery: { min: 45, max: 75 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
        {
          provider: { id: 'MEALME' as const, name: 'MealMe', priority: 50 },
          config: {
            id: 'MEALME' as const,
            name: 'MealMe',
            enabled: true,
            priority: 50,
            commissionRate: 0.05, // Higher commission
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 5000,
            feesCents: 500,
            taxCents: 400,
            totalCents: 5900,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 60,
            subtotal: 50,
            deliveryFee: 5,
            tax: 4,
            total: 59,
            estimatedDelivery: { min: 45, max: 75 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
      ];

      const scored = await scorer.scoreProviders(quotes, SAMPLE_ITEMS.length, 'margin');

      // MealMe should be selected (higher commission)
      assertEquals(scored[0].provider.id, 'MEALME', 'Should select provider with higher commission');
    }
  );
});

// ============================================================================
// Priority Boost Tests
// ============================================================================

Deno.test("Scorer - Priority boost affects selection", async () => {
  await withTestEnv(
    {
      LOOPGPT_PREFER_DIRECT_KROGER: 'true', // +20 priority
    },
    async () => {
      const scorer = new ProviderScorer(supabase);

      // Create mock quotes with similar prices
      const quotes = [
        {
          provider: { id: 'MEALME' as const, name: 'MealMe', priority: 50 },
          config: {
            id: 'MEALME' as const,
            name: 'MealMe',
            enabled: true,
            priority: 50, // Normal priority
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 4500,
            feesCents: 500,
            taxCents: 350,
            totalCents: 5350,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 45,
            subtotal: 45,
            deliveryFee: 5,
            tax: 3.5,
            total: 53.5,
            estimatedDelivery: { min: 30, max: 60 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
        {
          provider: { id: 'KROGER_API' as const, name: 'Kroger', priority: 80 }, // Boosted
          config: {
            id: 'KROGER_API' as const,
            name: 'Kroger',
            enabled: true,
            priority: 80, // Boosted priority
            commissionRate: 0.03,
            regions: ['US'],
            timeout: 10000,
            retries: 2,
          },
          cart: [],
          quote: {
            subtotalCents: 4600, // Slightly more expensive
            feesCents: 995,
            taxCents: 350,
            totalCents: 5945,
            currency: 'USD' as const,
            estimatedDeliveryMinutes: 150,
            subtotal: 46,
            deliveryFee: 9.95,
            tax: 3.5,
            total: 59.45,
            estimatedDelivery: { min: 120, max: 180 },
          },
          itemAvailability: SAMPLE_ITEMS.map(item => ({
            clientItemId: item.id,
            requestedItem: item.name,
            status: 'found' as const,
            inStock: true,
          })),
        },
      ];

      const scored = await scorer.scoreProviders(quotes, SAMPLE_ITEMS.length, 'balanced');

      // Kroger should be selected due to priority boost
      assertEquals(scored[0].provider.id, 'KROGER_API', 'Should select provider with priority boost');
    }
  );
});
