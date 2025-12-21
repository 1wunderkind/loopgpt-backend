import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BillingManager } from "../supabase/functions/_shared/governance/BillingManager.ts";
import { Analytics } from "../supabase/functions/_shared/analytics/Analytics.ts";
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

Deno.test("Tenancy: Quota Enforcement (Free Plan)", async () => {
  BillingManager._reset();
  const tenantId = "user-free";
  const logger = new MockLogger({ requestId: "req-1" });

  // Default is free plan (50 reqs)
  // Simulate 50 requests
  for (let i = 0; i < 50; i++) {
    await BillingManager.checkQuota(tenantId, "free", logger);
    await BillingManager.recordUsage(tenantId);
  }

  // 51st should fail
  await assertRejects(
    () => BillingManager.checkQuota(tenantId, "free", logger),
    Error,
    "Daily request limit reached",
  );
});

Deno.test("Tenancy: Pro Plan Higher Limits", async () => {
  BillingManager._reset();
  const tenantId = "user-pro";
  const logger = new MockLogger({ requestId: "req-2" });

  BillingManager._setPlan(tenantId, "pro");
  const plan = await BillingManager.getPlan(tenantId);
  assertEquals(plan, "pro");

  // Should allow > 50 requests
  for (let i = 0; i < 60; i++) {
    await BillingManager.checkQuota(tenantId, "pro", logger);
    await BillingManager.recordUsage(tenantId);
  }
  // No error thrown
});

Deno.test("Tenancy: Analytics Emission", async () => {
  const logger = new MockLogger({ requestId: "req-3" });

  await Analytics.emit({
    tenantId: "user-123",
    userId: "user-123",
    toolName: "test-tool",
    action: "test",
    durationMs: 100,
    outcome: "success",
  }, logger);

  const logEntry = logger.logs.find((l) => l.msg === "Analytics Event");
  assertEquals(logEntry?.ctx.type, "ANALYTICS");
  assertEquals(logEntry?.ctx.tenantId, "user-123");
});
