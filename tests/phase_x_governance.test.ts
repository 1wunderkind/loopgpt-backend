import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RateLimiter } from "../supabase/functions/_shared/governance/RateLimiter.ts";
import { CostGuard } from "../supabase/functions/_shared/governance/CostGuard.ts";
import {
  DegradationManager,
  DegradationMode,
} from "../supabase/functions/_shared/governance/DegradationManager.ts";
import { Logger } from "../supabase/functions/_shared/monitoring/Logger.ts";

// Mock Logger
class MockLogger extends Logger {
  logs: any[] = [];
  override info(msg: string, ctx?: any) {
    this.logs.push({ level: "INFO", msg, ctx });
  }
  override warn(msg: string, ctx?: any) {
    this.logs.push({ level: "WARN", msg, ctx });
  }
}

Deno.test("Governance: Rate Limiter enforces limits", () => {
  const logger = new MockLogger({ requestId: "req-1" });
  const userId = "user-123";

  // First 3 requests should pass (limit is 3 for 'order')
  RateLimiter.checkLimit(userId, "order", logger);
  RateLimiter.checkLimit(userId, "order", logger);
  RateLimiter.checkLimit(userId, "order", logger);

  // 4th should fail
  assertThrows(
    () => RateLimiter.checkLimit(userId, "order", logger),
    Error,
    "Too many requests",
  );
});

Deno.test("Governance: Cost Guard calculates correctly", () => {
  const cost = CostGuard.calculateCost("gpt-4o", 1000, 1000);
  // 1k prompt ($0.005) + 1k completion ($0.015) = $0.02
  assertEquals(cost, 0.02);
});

Deno.test("Governance: Degradation Manager respects env", () => {
  // Default
  assertEquals(DegradationManager.getMode(), DegradationMode.NORMAL);
  assertEquals(DegradationManager.isOrderingEnabled(), true);

  // Simulate Safe Mode
  Deno.env.set("DEGRADATION_MODE", "safe");
  assertEquals(DegradationManager.getMode(), DegradationMode.SAFE);
  assertEquals(DegradationManager.isOrderingEnabled(), false);

  // Cleanup
  Deno.env.delete("DEGRADATION_MODE");
});
