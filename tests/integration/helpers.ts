/**
 * Integration Test Helpers
 * Utilities for integration testing
 */

import { assertEquals, assertExists, assert } from "../helpers.ts";

export { assertEquals, assertExists, assert };

/**
 * Test Supabase client (mock for now)
 */
export function createTestSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'test-key';

  return {
    url: supabaseUrl,
    key: supabaseKey,
    // Add actual Supabase client methods here
  };
}

/**
 * Make HTTP request to edge function
 */
export async function callEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const baseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const url = `${baseUrl}/functions/v1/${functionName}`;

  const {
    method = 'POST',
    body,
    headers = {},
  } = options;

  return await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Parse JSON response
 */
export async function parseResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Assert successful response
 */
export async function assertSuccess(response: Response): Promise<void> {
  assert(
    response.status >= 200 && response.status < 300,
    `Expected success status, got ${response.status}: ${await response.text()}`
  );
}

/**
 * Assert error response
 */
export async function assertError(
  response: Response,
  expectedStatus?: number
): Promise<void> {
  if (expectedStatus) {
    assertEquals(response.status, expectedStatus);
  } else {
    assert(
      response.status >= 400,
      `Expected error status, got ${response.status}`
    );
  }
}

/**
 * Wait for condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  tableName: string,
  condition: Record<string, any>
): Promise<void> {
  // In production, use actual Supabase client to delete test data
  console.log(`Cleanup: DELETE FROM ${tableName} WHERE`, condition);
}

/**
 * Create test user
 */
export function createTestUser() {
  return {
    id: `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
  };
}

/**
 * Measure response time
 */
export async function measureResponseTime(
  fn: () => Promise<Response>
): Promise<{ response: Response; duration: number }> {
  const start = Date.now();
  const response = await fn();
  const duration = Date.now() - start;
  return { response, duration };
}
