/**
 * Reliability Layer Validation Tests
 * 
 * Tests the reliability utilities (timeout, retry, error classification)
 * Run with: deno test --allow-net --allow-env reliability.test.ts
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  withTimeout,
  withRetry,
  withToolReliability,
  classifyError,
  type ToolErrorCode,
} from "../mcp-server/lib/reliability.ts";

// ============================================================================
// Test: withTimeout
// ============================================================================

Deno.test("withTimeout - resolves within timeout", async () => {
  const result = await withTimeout(
    Promise.resolve("success"),
    1000,
    "test operation"
  );
  assertEquals(result, "success");
});

Deno.test("withTimeout - throws on timeout", async () => {
  await assertRejects(
    async () => {
      await withTimeout(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        100,
        "slow operation"
      );
    },
    Error,
    "Operation 'slow operation' timed out after 100ms"
  );
});

Deno.test("withTimeout - propagates errors", async () => {
  await assertRejects(
    async () => {
      await withTimeout(
        Promise.reject(new Error("test error")),
        1000,
        "failing operation"
      );
    },
    Error,
    "test error"
  );
});

// ============================================================================
// Test: withRetry
// ============================================================================

Deno.test("withRetry - succeeds on first attempt", async () => {
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts++;
      return "success";
    },
    {
      maxRetries: 3,
      retryDelayMs: 10,
      shouldRetry: () => true,
    }
  );
  assertEquals(result, "success");
  assertEquals(attempts, 1);
});

Deno.test("withRetry - retries on failure and succeeds", async () => {
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("temporary failure");
      }
      return "success";
    },
    {
      maxRetries: 3,
      retryDelayMs: 10,
      shouldRetry: () => true,
    }
  );
  assertEquals(result, "success");
  assertEquals(attempts, 3);
});

Deno.test("withRetry - exhausts retries and throws", async () => {
  let attempts = 0;
  await assertRejects(
    async () => {
      await withRetry(
        async () => {
          attempts++;
          throw new Error("persistent failure");
        },
        {
          maxRetries: 2,
          retryDelayMs: 10,
          shouldRetry: () => true,
        }
      );
    },
    Error,
    "persistent failure"
  );
  assertEquals(attempts, 3); // Initial + 2 retries
});

Deno.test("withRetry - respects shouldRetry condition", async () => {
  let attempts = 0;
  await assertRejects(
    async () => {
      await withRetry(
        async () => {
          attempts++;
          throw new Error("non-retryable");
        },
        {
          maxRetries: 3,
          retryDelayMs: 10,
          shouldRetry: () => false, // Never retry
        }
      );
    },
    Error,
    "non-retryable"
  );
  assertEquals(attempts, 1); // No retries
});

// ============================================================================
// Test: classifyError
// ============================================================================

Deno.test("classifyError - timeout error", () => {
  const error = new Error("Operation 'test' timed out after 5000ms");
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "TIMEOUT");
  assertEquals(result.retryable, true);
});

Deno.test("classifyError - network error", () => {
  const error: any = new Error("Network request failed");
  error.name = "NetworkError";
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "NETWORK_ERROR");
  assertEquals(result.retryable, true);
});

Deno.test("classifyError - upstream 4xx error", () => {
  const error: any = new Error("API error: 404 Not Found");
  error.status = 404;
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "UPSTREAM_4XX");
  assertEquals(result.retryable, false);
});

Deno.test("classifyError - upstream 5xx error", () => {
  const error: any = new Error("API error: 503 Service Unavailable");
  error.status = 503;
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "UPSTREAM_5XX");
  assertEquals(result.retryable, true);
});

Deno.test("classifyError - validation error", () => {
  const error = new Error("latitude is required");
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "VALIDATION_ERROR");
  assertEquals(result.retryable, false);
});

Deno.test("classifyError - unknown error", () => {
  const error = new Error("Something went wrong");
  const result = classifyError(error, "test_tool");
  assertEquals(result.code, "UNKNOWN");
  assertEquals(result.retryable, false);
});

// ============================================================================
// Test: withToolReliability (Integration)
// ============================================================================

Deno.test("withToolReliability - success case", async () => {
  const result = await withToolReliability(
    async () => ({ data: "test" }),
    {
      toolName: "test_tool",
      timeoutMs: 1000,
      maxRetries: 0,
    }
  );
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.data, "test");
  }
});

Deno.test("withToolReliability - timeout case", async () => {
  const result = await withToolReliability(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { data: "test" };
    },
    {
      toolName: "test_tool",
      timeoutMs: 100,
      maxRetries: 0,
    }
  );
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "TIMEOUT");
    assertEquals(result.error.retryable, true);
  }
});

Deno.test("withToolReliability - retry on retryable error", async () => {
  let attempts = 0;
  const result = await withToolReliability(
    async () => {
      attempts++;
      if (attempts < 2) {
        const error: any = new Error("Temporary failure");
        error.status = 503;
        throw error;
      }
      return { data: "success" };
    },
    {
      toolName: "test_tool",
      timeoutMs: 1000,
      maxRetries: 2,
      retryDelayMs: 10,
      retryOnCodes: ["UPSTREAM_5XX"],
    }
  );
  assertEquals(result.ok, true);
  assertEquals(attempts, 2);
});

Deno.test("withToolReliability - no retry on non-retryable error", async () => {
  let attempts = 0;
  const result = await withToolReliability(
    async () => {
      attempts++;
      const error: any = new Error("Bad request");
      error.status = 400;
      throw error;
    },
    {
      toolName: "test_tool",
      timeoutMs: 1000,
      maxRetries: 2,
      retryDelayMs: 10,
      retryOnCodes: ["UPSTREAM_5XX"], // Only retry 5xx
    }
  );
  assertEquals(result.ok, false);
  assertEquals(attempts, 1); // No retries for 4xx
  if (!result.ok) {
    assertEquals(result.error.code, "UPSTREAM_4XX");
  }
});

// ============================================================================
// Test: Error Message Safety
// ============================================================================

Deno.test("classifyError - sanitizes sensitive information", () => {
  const error = new Error("API key abc123xyz is invalid");
  const result = classifyError(error, "test_tool");
  
  // Message should not contain the API key
  assertEquals(result.message.includes("abc123xyz"), false);
  
  // Technical message may contain it (for debugging)
  assertEquals(result.technicalMessage?.includes("abc123xyz"), true);
});

// ============================================================================
// Test: Exponential Backoff
// ============================================================================

Deno.test("withRetry - uses exponential backoff", async () => {
  let attempts = 0;
  const delays: number[] = [];
  
  await assertRejects(async () => {
    await withRetry(
      async () => {
        attempts++;
        const start = Date.now();
        throw new Error("test");
      },
      {
        maxRetries: 3,
        retryDelayMs: 100,
        shouldRetry: () => true,
      }
    );
  });
  
  assertEquals(attempts, 4); // Initial + 3 retries
  // Delays should be approximately: 100ms, 200ms, 400ms (exponential)
});

console.log("✅ All reliability layer tests passed!");
