import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PolicyResolver } from "../supabase/functions/_shared/personalization/PolicyResolver.ts";
import { AgentCoordinator } from "../supabase/functions/_shared/coordination/AgentCoordinator.ts";
import { Logger } from "../supabase/functions/_shared/monitoring/Logger.ts";

// Mock Logger
class MockLogger extends Logger {
  logs: any[] = [];
  override info(msg: string, ctx?: any) {
    this.logs.push({ level: "INFO", msg, ctx });
  }
}

Deno.test("Dominance: Personalized Policy Resolution", async () => {
  const logger = new MockLogger({ requestId: "req-1" });

  // 1. Default Global
  const p1 = await PolicyResolver.resolve("tenant-1", "user-1", logger);
  assertEquals(p1.scope, "global");

  // 2. Tenant Override
  PolicyResolver._setTenantPolicy("tenant-1", { successRate: 20.0 });
  const p2 = await PolicyResolver.resolve("tenant-1", "user-1", logger);
  assertEquals(p2.scope, "tenant");
  assertEquals(p2.weights.successRate, 20.0);

  // 3. User Preference Sensitivity
  PolicyResolver._setUserPrefs("user-1", { priceSensitivity: 0.9 });
  const p3 = await PolicyResolver.resolve("tenant-1", "user-1", logger);
  // High price sensitivity should halve the GMV weight
  // Default GMV weight is 0.1, so expected is 0.05
  assertEquals(p3.weights.gmv, 0.05);
});

Deno.test("Dominance: Multi-Agent Coordination", () => {
  const logger = new MockLogger({ requestId: "req-2" });
  const coordinator = new AgentCoordinator(logger);

  // Nutrition Agent blocks "FastFoodInc"
  coordinator.emit({
    from: "NUTRITION_ANALYST",
    to: "COMMERCE_ROUTER",
    signal: "BLOCK",
    reason: "High sodium",
    confidence: 0.9,
    metadata: { provider: "FastFoodInc" },
  });

  // Retention Agent prefers "FastFoodInc" (Conflict!)
  coordinator.emit({
    from: "RETENTION_AGENT",
    to: "COMMERCE_ROUTER",
    signal: "PREFER",
    reason: "User loves it",
    confidence: 0.8,
    metadata: { provider: "FastFoodInc" },
  });

  // Resolution: BLOCK should override PREFER
  const constraints = coordinator.resolveConstraints();
  assertEquals(constraints.blockedProviders.includes("FastFoodInc"), true);
  assertEquals(constraints.preferredProviders.includes("FastFoodInc"), false);
});
