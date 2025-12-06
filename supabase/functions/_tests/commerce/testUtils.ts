/**
 * Test Utilities and Fixtures
 * Shared helpers for commerce layer tests
 */

import type {
  QuoteRequest,
  ProviderQuote,
  ProviderConfig,
  CartItem,
  RequestedItem,
} from '../../_shared/commerce/types/index.ts';
import type { ProviderId } from '../../_shared/commerce/types/index.ts';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Sample requested items for testing
 */
export const SAMPLE_ITEMS: RequestedItem[] = [
  {
    id: 'item-1',
    name: 'Chicken Breast',
    quantity: 2,
    unit: 'lbs',
  },
  {
    id: 'item-2',
    name: 'Brown Rice',
    quantity: 1,
    unit: 'bag',
  },
  {
    id: 'item-3',
    name: 'Broccoli',
    quantity: 3,
    unit: 'lbs',
  },
];

/**
 * Sample shipping address
 */
export const SAMPLE_ADDRESS = {
  street: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  country: 'US',
};

/**
 * Create a sample QuoteRequest
 */
export function createSampleQuoteRequest(
  providerId: ProviderId,
  items: RequestedItem[] = SAMPLE_ITEMS
): QuoteRequest {
  return {
    providerId,
    items,
    shippingAddress: SAMPLE_ADDRESS,
    userContext: {},
  };
}

/**
 * Create a sample ProviderConfig
 */
export function createSampleProviderConfig(
  providerId: ProviderId,
  overrides?: Partial<ProviderConfig>
): ProviderConfig {
  return {
    id: providerId,
    name: `${providerId} Provider`,
    enabled: true,
    priority: 50,
    commissionRate: 0.03,
    regions: ['US'],
    timeout: 10000,
    retries: 2,
    ...overrides,
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a ProviderQuote is valid
 */
export function assertValidProviderQuote(
  quote: ProviderQuote,
  expectedProviderId: ProviderId,
  expectedItemCount: number
): void {
  // Provider metadata
  if (quote.provider.id !== expectedProviderId) {
    throw new Error(`Expected provider.id to be ${expectedProviderId}, got ${quote.provider.id}`);
  }
  if (!quote.provider.name) {
    throw new Error('Expected provider.name to be non-empty');
  }
  if (typeof quote.provider.priority !== 'number') {
    throw new Error('Expected provider.priority to be a number');
  }

  // Config
  if (quote.config.id !== expectedProviderId) {
    throw new Error(`Expected config.id to be ${expectedProviderId}, got ${quote.config.id}`);
  }

  // Cart
  if (!Array.isArray(quote.cart)) {
    throw new Error('Expected cart to be an array');
  }

  // Quote
  if (quote.quote.totalCents <= 0) {
    throw new Error(`Expected quote.totalCents to be positive, got ${quote.quote.totalCents}`);
  }
  if (quote.quote.subtotalCents <= 0) {
    throw new Error(`Expected quote.subtotalCents to be positive, got ${quote.quote.subtotalCents}`);
  }
  if (quote.quote.currency !== 'USD') {
    throw new Error(`Expected quote.currency to be USD, got ${quote.quote.currency}`);
  }

  // Item availability
  if (!Array.isArray(quote.itemAvailability)) {
    throw new Error('Expected itemAvailability to be an array');
  }
  if (quote.itemAvailability.length !== expectedItemCount) {
    throw new Error(
      `Expected itemAvailability.length to be ${expectedItemCount}, got ${quote.itemAvailability.length}`
    );
  }

  // Each item availability should have required fields
  for (const item of quote.itemAvailability) {
    if (!item.clientItemId) {
      throw new Error('Expected itemAvailability item to have clientItemId');
    }
    if (!item.requestedItem) {
      throw new Error('Expected itemAvailability item to have requestedItem');
    }
    if (!item.status) {
      throw new Error('Expected itemAvailability item to have status');
    }
    if (typeof item.inStock !== 'boolean') {
      throw new Error('Expected itemAvailability item to have boolean inStock');
    }
  }

  // Affiliate URL (optional but should be string if present)
  if (quote.affiliateUrl && typeof quote.affiliateUrl !== 'string') {
    throw new Error('Expected affiliateUrl to be a string');
  }
}

/**
 * Assert that cart items match requested items
 */
export function assertCartMatchesRequest(
  cart: CartItem[],
  requestedItems: RequestedItem[]
): void {
  const requestedIds = new Set(requestedItems.map(item => item.id));
  const cartIds = new Set(cart.map(item => item.clientItemId));

  for (const id of cartIds) {
    if (!requestedIds.has(id)) {
      throw new Error(`Cart contains unexpected item ID: ${id}`);
    }
  }
}

/**
 * Assert that a provider quote has reasonable pricing
 */
export function assertReasonablePricing(quote: ProviderQuote): void {
  const { subtotalCents, feesCents, taxCents, totalCents } = quote.quote;

  // Total should be sum of components (allow small rounding errors)
  const expectedTotal = subtotalCents + feesCents + taxCents;
  const diff = Math.abs(totalCents - expectedTotal);
  
  if (diff > 10) { // Allow 10 cents rounding error
    throw new Error(
      `Total (${totalCents}) doesn't match sum of components (${expectedTotal}). Diff: ${diff} cents`
    );
  }

  // Fees should be non-negative
  if (feesCents < 0) {
    throw new Error(`Fees should be non-negative, got ${feesCents}`);
  }

  // Tax should be non-negative
  if (taxCents < 0) {
    throw new Error(`Tax should be non-negative, got ${taxCents}`);
  }

  // Subtotal should be positive
  if (subtotalCents <= 0) {
    throw new Error(`Subtotal should be positive, got ${subtotalCents}`);
  }
}

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Set environment variable for test
 */
export function setTestEnv(key: string, value: string): void {
  Deno.env.set(key, value);
}

/**
 * Delete environment variable after test
 */
export function deleteTestEnv(key: string): void {
  Deno.env.delete(key);
}

/**
 * Run test with temporary environment variables
 */
export async function withTestEnv<T>(
  envVars: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const originalValues: Record<string, string | undefined> = {};

  // Save original values and set test values
  for (const [key, value] of Object.entries(envVars)) {
    originalValues[key] = Deno.env.get(key);
    Deno.env.set(key, value);
  }

  try {
    return await fn();
  } finally {
    // Restore original values
    for (const [key, originalValue] of Object.entries(originalValues)) {
      if (originalValue === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originalValue);
      }
    }
  }
}

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return Deno.env.get('CI') === 'true';
}

/**
 * Check if API keys are configured for a provider
 */
export function hasProviderKeys(providerId: ProviderId): boolean {
  switch (providerId) {
    case 'KROGER_API':
      return !!(Deno.env.get('KROGER_CLIENT_ID') && Deno.env.get('KROGER_CLIENT_SECRET'));
    case 'WALMART_API':
      return !!(Deno.env.get('WALMART_API_KEY') && Deno.env.get('WALMART_PARTNER_ID'));
    case 'MEALME':
      return !!Deno.env.get('MEALME_API_KEY');
    case 'INSTACART':
      return !!Deno.env.get('INSTACART_API_KEY');
    default:
      return false;
  }
}

/**
 * Skip test if provider keys are not configured
 */
export function skipIfNoKeys(providerId: ProviderId): void {
  if (!hasProviderKeys(providerId)) {
    console.log(`⏭️  Skipping ${providerId} real API test (no keys configured)`);
    Deno.exit(0);
  }
}
