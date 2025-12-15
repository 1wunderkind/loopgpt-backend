import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { getCorsHeaders } from "../supabase/functions/_shared/cors.ts";

Deno.test("CORS: Should allow trusted origin (ChatGPT)", () => {
  const headers = getCorsHeaders("https://chat.openai.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://chat.openai.com");
});

Deno.test("CORS: Should allow trusted origin (LoopKitchen UI)", () => {
  const headers = getCorsHeaders("https://loopkitchen-ui.vercel.app");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://loopkitchen-ui.vercel.app");
});

Deno.test("CORS: Should REJECT untrusted origin (Malicious Site)", () => {
  const headers = getCorsHeaders("https://malicious-site.com");
  // Should default to the first allowed origin (effectively blocking the browser)
  assertEquals(headers["Access-Control-Allow-Origin"], "https://chat.openai.com");
});

Deno.test("CORS: Should REJECT null origin", () => {
  const headers = getCorsHeaders(null);
  assertEquals(headers["Access-Control-Allow-Origin"], "https://chat.openai.com");
});
