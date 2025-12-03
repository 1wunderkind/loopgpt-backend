/**
 * Test Helpers and Utilities
 * Shared testing utilities for all test suites
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";

// Re-export assertions for convenience
export { assertEquals, assertExists, assertRejects, assert, assertThrows } from "@std/assert";

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({ data: null, error: null }),
          limit: (n: number) => Promise.resolve({ data: [], error: null }),
        }),
        limit: (n: number) => Promise.resolve({ data: [], error: null }),
        order: (column: string, options?: any) => ({
          limit: (n: number) => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
      }),
    }),
    rpc: (fn: string, params?: any) => Promise.resolve({ data: null, error: null }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: (credentials: any) => Promise.resolve({ data: null, error: null }),
    },
  };
}

/**
 * Create a mock Request object for testing edge functions
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Request {
  const {
    method = 'POST',
    url = 'https://example.com/test',
    headers = {},
    body = null,
  } = options;

  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : null,
  });
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(options: {
  userId?: string;
  method?: string;
  body?: any;
} = {}): Request {
  const {
    userId = 'test-user-123',
    method = 'POST',
    body = null,
  } = options;

  return createMockRequest({
    method,
    headers: {
      'Authorization': `Bearer mock-jwt-token-${userId}`,
    },
    body,
  });
}

/**
 * Parse JSON response from edge function
 */
export async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Assert response is successful (2xx status)
 */
export function assertSuccessResponse(response: Response) {
  assertEquals(
    response.status >= 200 && response.status < 300,
    true,
    `Expected success status, got ${response.status}`
  );
}

/**
 * Assert response is error (4xx or 5xx status)
 */
export function assertErrorResponse(response: Response, expectedStatus?: number) {
  if (expectedStatus) {
    assertEquals(response.status, expectedStatus);
  } else {
    assertEquals(
      response.status >= 400,
      true,
      `Expected error status, got ${response.status}`
    );
  }
}

/**
 * Create test data generators
 */
export const testData = {
  /**
   * Generate a random user ID
   */
  userId: () => `test-user-${Math.random().toString(36).substring(7)}`,

  /**
   * Generate a random email
   */
  email: () => `test-${Math.random().toString(36).substring(7)}@example.com`,

  /**
   * Generate a test food item
   */
  food: (overrides: any = {}) => ({
    id: Math.floor(Math.random() * 1000000),
    description: 'Test Food Item',
    brand_name: 'Test Brand',
    calories: 100,
    protein: 10,
    carbs: 15,
    fat: 5,
    serving_size: 100,
    serving_unit: 'g',
    data_source: 'test',
    ...overrides,
  }),

  /**
   * Generate a test weight entry
   */
  weightEntry: (overrides: any = {}) => ({
    id: crypto.randomUUID(),
    user_id: testData.userId(),
    weight_kg: 70,
    recorded_at: new Date().toISOString(),
    notes: 'Test entry',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test order
   */
  order: (overrides: any = {}) => ({
    id: `order-${Math.random().toString(36).substring(7)}`,
    user_id: testData.userId(),
    provider: 'instacart',
    status: 'pending',
    total: 45.99,
    items: [
      { name: 'Test Item', quantity: 2, price: 22.99 },
    ],
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate a test location
   */
  location: (overrides: any = {}) => ({
    street: '123 Test St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    ...overrides,
  }),
};

/**
 * Sleep utility for testing delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Assert execution time is within bounds
 */
export async function assertPerformance<T>(
  fn: () => Promise<T>,
  maxDuration: number,
  message?: string
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  assertEquals(
    duration <= maxDuration,
    true,
    message || `Expected execution time <= ${maxDuration}ms, got ${duration}ms`
  );
  return result;
}

/**
 * Mock environment variables for testing
 */
export function mockEnv(vars: Record<string, string>) {
  const original: Record<string, string | undefined> = {};
  
  for (const [key, value] of Object.entries(vars)) {
    original[key] = Deno.env.get(key);
    Deno.env.set(key, value);
  }
  
  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };
}

/**
 * Test suite wrapper with setup/teardown
 */
export function testSuite(
  name: string,
  tests: (context: { setup: () => void; teardown: () => void }) => void
) {
  const setupFns: Array<() => void | Promise<void>> = [];
  const teardownFns: Array<() => void | Promise<void>> = [];

  const context = {
    setup: (fn: () => void | Promise<void>) => setupFns.push(fn),
    teardown: (fn: () => void | Promise<void>) => teardownFns.push(fn),
  };

  Deno.test({
    name,
    async fn() {
      // Run setup
      for (const fn of setupFns) {
        await fn();
      }

      try {
        // Run tests
        await tests(context);
      } finally {
        // Run teardown
        for (const fn of teardownFns) {
          await fn();
        }
      }
    },
  });
}
