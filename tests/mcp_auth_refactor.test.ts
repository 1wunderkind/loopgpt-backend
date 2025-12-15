import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { createToolErrorResponse } from "../supabase/functions/mcp-server/lib/error-responses.ts";

Deno.test("createToolErrorResponse returns HTTP 200 with correct envelope", async () => {
  const response = createToolErrorResponse(
    "test_tool",
    "UNAUTHORIZED",
    "Please sign in",
    false,
    { reason: "missing_token" }
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  
  assertEquals(body.success, false);
  assertEquals(body.tool, "test_tool");
  assertEquals(body.error.code, "UNAUTHORIZED");
  assertEquals(body.error.message, "Please sign in");
  assertEquals(body.error.retryable, false);
  assertEquals(body.error.details.reason, "missing_token");
});

// Note: We cannot easily test the full integration of index.ts here without mocking Supabase and Request objects extensively.
// However, since we replaced the direct Response creation with this helper function, verifying the helper function gives us high confidence.
