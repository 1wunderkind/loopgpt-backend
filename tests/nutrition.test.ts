import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { TestConfig } from "./test-config.ts";

Deno.test("Nutrition Tool - Uses Configured CDN", () => {
  const cdnUrl = TestConfig.FOOD_CDN_URL;
  assertEquals(cdnUrl.includes("supabase.co"), true);
});
