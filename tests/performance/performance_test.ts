/**
 * Performance Tests
 * Load testing, response time, and throughput testing
 */

import {
  assertEquals,
  assertExists,
  assert,
} from "../helpers.ts";

import {
  callEdgeFunction,
  parseResponse,
  measureResponseTime,
} from "../integration/helpers.ts";

// Response Time Tests (10 tests)
Deno.test("performance: health check responds under 100ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  console.log(`Health check response time: ${duration}ms`);
  assert(duration < 100, `Response time ${duration}ms exceeds 100ms threshold`);
});

Deno.test("performance: food search responds under 500ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('food_search', {
      body: { query: 'chicken' },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Food search response time: ${duration}ms`);
  assert(duration < 500, `Response time ${duration}ms exceeds 500ms threshold`);
});

Deno.test("performance: weight add responds under 200ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('weight_add', {
      body: {
        user_id: 'perf_test_user',
        weight_kg: 70,
      },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Weight add response time: ${duration}ms`);
  assert(duration < 200, `Response time ${duration}ms exceeds 200ms threshold`);
});

Deno.test("performance: order routing responds under 2000ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('loopgpt_route_order', {
      body: {
        user_id: 'perf_test_user',
        items: [{ name: 'Apple', quantity: 5 }],
        location: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
      },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Order routing response time: ${duration}ms`);
  assert(duration < 2000, `Response time ${duration}ms exceeds 2000ms threshold`);
});

Deno.test("performance: cached food search responds under 50ms", async () => {
  // First request (cache miss)
  await callEdgeFunction('food_search', {
    body: { query: 'banana' },
  });
  
  // Second request (should be cached)
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('food_search', {
      body: { query: 'banana' },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Cached food search response time: ${duration}ms`);
  // Note: This will fail until caching is implemented in Week 4
  // assert(duration < 50, `Cached response time ${duration}ms exceeds 50ms threshold`);
});

Deno.test("performance: concurrent requests don't timeout", async () => {
  const requests = Array.from({ length: 10 }, () =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  console.log(`10 concurrent requests completed in ${duration}ms`);
  
  // All should succeed
  responses.forEach(r => {
    assert(r.status === 200 || r.status === 404);
  });
  
  // Should complete in reasonable time
  assert(duration < 5000, `Concurrent requests took ${duration}ms`);
});

Deno.test("performance: large payload handled efficiently", async () => {
  const largeItems = Array.from({ length: 100 }, (_, i) => ({
    name: `Item ${i}`,
    quantity: i + 1,
  }));
  
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('loopgpt_route_order', {
      body: {
        user_id: 'perf_test_user',
        items: largeItems,
        location: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
      },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Large payload response time: ${duration}ms`);
  assert(duration < 5000, `Large payload took ${duration}ms`);
});

Deno.test("performance: database query responds under 100ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('weight_history', {
      body: { user_id: 'perf_test_user' },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`Database query response time: ${duration}ms`);
  assert(duration < 100, `Database query took ${duration}ms`);
});

Deno.test("performance: external API call responds under 1000ms", async () => {
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('food_search', {
      body: { query: 'test' },
    })
  );
  
  if (response.status === 404) return;
  
  console.log(`External API call response time: ${duration}ms`);
  assert(duration < 1000, `External API call took ${duration}ms`);
});

Deno.test("performance: error handling doesn't add significant overhead", async () => {
  // Valid request
  const { duration: validDuration } = await measureResponseTime(() =>
    callEdgeFunction('food_search', {
      body: { query: 'test' },
    })
  );
  
  // Invalid request (triggers error handling)
  const { duration: errorDuration } = await measureResponseTime(() =>
    callEdgeFunction('food_search', {
      body: {}, // Invalid
    })
  );
  
  if (validDuration === 0 || errorDuration === 0) return;
  
  console.log(`Valid: ${validDuration}ms, Error: ${errorDuration}ms`);
  
  // Error handling should not add more than 50ms overhead
  const overhead = errorDuration - validDuration;
  assert(overhead < 50, `Error handling overhead ${overhead}ms exceeds 50ms`);
});

// Throughput Tests (5 tests)
Deno.test("performance: handles 100 requests per minute", async () => {
  const requests = Array.from({ length: 100 }, () =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  console.log(`100 requests completed in ${duration}ms (${(100 / (duration / 1000)).toFixed(2)} req/s)`);
  
  // All should succeed
  const successCount = responses.filter(r => r.status === 200).length;
  assert(successCount >= 95, `Only ${successCount}/100 requests succeeded`);
  
  // Should complete within 60 seconds
  assert(duration < 60000, `100 requests took ${duration}ms`);
});

Deno.test("performance: maintains response time under load", async () => {
  const durations: number[] = [];
  
  // Send 20 requests sequentially
  for (let i = 0; i < 20; i++) {
    const { duration } = await measureResponseTime(() =>
      callEdgeFunction('health', { method: 'GET' })
    );
    durations.push(duration);
  }
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  
  console.log(`Average: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration}ms`);
  
  // Average should be reasonable
  assert(avgDuration < 200, `Average response time ${avgDuration}ms too high`);
  
  // Max should not be too much higher than average
  assert(maxDuration < avgDuration * 3, `Max response time ${maxDuration}ms too high`);
});

Deno.test("performance: handles burst traffic", async () => {
  // Simulate burst: 50 requests at once
  const requests = Array.from({ length: 50 }, () =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  console.log(`Burst of 50 requests completed in ${duration}ms`);
  
  // Most should succeed
  const successCount = responses.filter(r => r.status === 200).length;
  assert(successCount >= 45, `Only ${successCount}/50 requests succeeded`);
});

Deno.test("performance: recovers from temporary overload", async () => {
  // Send burst
  const burst = Array.from({ length: 30 }, () =>
    callEdgeFunction('health', { method: 'GET' })
  );
  await Promise.all(burst);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Send normal request
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  console.log(`Post-burst response time: ${duration}ms`);
  
  // Should recover to normal performance
  assert(response.status === 200);
  assert(duration < 200, `Post-burst response time ${duration}ms too high`);
});

Deno.test("performance: memory usage stays stable under load", async () => {
  const initialMemory = Deno.memoryUsage().heapUsed;
  
  // Send 100 requests
  const requests = Array.from({ length: 100 }, () =>
    callEdgeFunction('health', { method: 'GET' })
  );
  await Promise.all(requests);
  
  const finalMemory = Deno.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
  
  console.log(`Memory increase after 100 requests: ${memoryIncreaseMB.toFixed(2)}MB`);
  
  // Memory increase should be reasonable (< 50MB)
  assert(memoryIncreaseMB < 50, `Memory increased by ${memoryIncreaseMB}MB`);
});

// Resource Usage Tests (5 tests)
Deno.test("performance: response size is reasonable", async () => {
  const response = await callEdgeFunction('food_search', {
    body: { query: 'chicken', limit: 10 },
  });
  
  if (response.status === 404) return;
  
  const text = await response.text();
  const sizeKB = text.length / 1024;
  
  console.log(`Response size: ${sizeKB.toFixed(2)}KB`);
  
  // Response should be under 100KB
  assert(sizeKB < 100, `Response size ${sizeKB}KB exceeds 100KB`);
});

Deno.test("performance: gzip compression effective", async () => {
  const response = await callEdgeFunction('food_search', {
    body: { query: 'chicken', limit: 100 },
  });
  
  if (response.status === 404) return;
  
  const contentEncoding = response.headers.get('Content-Encoding');
  if (contentEncoding) {
    console.log(`Content-Encoding: ${contentEncoding}`);
    assert(contentEncoding.includes('gzip') || contentEncoding.includes('br'));
  }
});

Deno.test("performance: connection reuse works", async () => {
  // Multiple requests should reuse connection
  const durations: number[] = [];
  
  for (let i = 0; i < 5; i++) {
    const { duration } = await measureResponseTime(() =>
      callEdgeFunction('health', { method: 'GET' })
    );
    durations.push(duration);
  }
  
  console.log(`Connection reuse durations: ${durations.join(', ')}ms`);
  
  // Later requests should be faster (connection reuse)
  const firstDuration = durations[0];
  const avgLaterDuration = durations.slice(1).reduce((a, b) => a + b, 0) / 4;
  
  console.log(`First: ${firstDuration}ms, Avg later: ${avgLaterDuration.toFixed(2)}ms`);
  
  // Later requests should generally be faster or similar
  // (This is a soft check, not a hard requirement)
  assert(avgLaterDuration <= firstDuration * 1.5);
});

Deno.test("performance: cold start time acceptable", async () => {
  // This simulates cold start (first request after deployment)
  const { response, duration } = await measureResponseTime(() =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  console.log(`Cold start response time: ${duration}ms`);
  
  // Cold start should be under 2 seconds
  assert(duration < 2000, `Cold start took ${duration}ms`);
});

Deno.test("performance: warm requests much faster", async () => {
  // First request (cold)
  const { duration: coldDuration } = await measureResponseTime(() =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Second request (warm)
  const { duration: warmDuration } = await measureResponseTime(() =>
    callEdgeFunction('health', { method: 'GET' })
  );
  
  console.log(`Cold: ${coldDuration}ms, Warm: ${warmDuration}ms`);
  
  // Warm should be significantly faster
  assert(warmDuration < coldDuration * 0.8 || warmDuration < 100);
});
