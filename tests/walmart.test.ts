import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { TestConfig } from "./test-config.ts";

// Mock fetch for tests
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();

  if (url.includes("walmart-search")) {
    return new Response(
      JSON.stringify({
        items: [
          { id: "1", name: "Apple", price: 1.00 },
          { id: "2", name: "Banana", price: 0.50 },
        ],
      }),
      { status: 200 },
    );
  }

  return new Response("Not Found", { status: 404 });
};

Deno.test("Walmart Search - Uses Configured URL", async () => {
  const searchUrl = `${TestConfig.MCP_TOOLS_URL}/walmart-search?query=apple`;

  const response = await fetch(searchUrl);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.items.length, 2);
  assertEquals(data.items[0].name, "Apple");
});
