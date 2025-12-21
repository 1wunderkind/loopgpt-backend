import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CommerceAnalytics } from "../supabase/functions/_shared/commerce/CommerceAnalytics.ts";
import {
  createAgentDecision,
  createGMVEvent,
} from "../supabase/functions/_shared/commerce/AgenticContract.ts";
import { Logger } from "../supabase/functions/_shared/monitoring/Logger.ts";

// Mock Logger
class MockLogger extends Logger {
  logs: any[] = [];
  override info(msg: string, ctx?: any) {
    this.logs.push({ level: "INFO", msg, ctx });
  }
}

Deno.test("Commerce: Agent Decision Envelope Creation", () => {
  const decision = createAgentDecision({
    requestId: "req-1",
    tenantId: "user-1",
    action: "QUOTE",
    toolName: "mealme_get_quotes",
    provider: "MealMe",
  });

  assertEquals(decision.action, "QUOTE");
  assertEquals(typeof decision.timestamp, "string");
});

Deno.test("Commerce: GMV Event Creation", () => {
  const event = createGMVEvent({
    tenantId: "user-1",
    requestId: "req-1",
    provider: "MealMe",
    estimatedValueUsd: 50.00,
    status: "ESTIMATED",
  });

  assertEquals(event.estimatedValueUsd, 50.00);
  assertEquals(event.status, "ESTIMATED");
  assertEquals(typeof event.eventId, "string");
});

Deno.test("Commerce: Flywheel Event Emission", async () => {
  const logger = new MockLogger({ requestId: "req-1" });

  await CommerceAnalytics.emitFlywheelEvent({
    tenantId: "user-1",
    requestId: "req-1",
    agentAction: "HANDOFF_CHECKOUT",
    toolName: "delivery_place_order",
    success: true,
    gmvUsd: 100.00,
    latencyMs: 500,
  }, logger);

  const logEntry = logger.logs.find((l) => l.msg === "LoopGPT Flywheel Event");
  assertEquals(logEntry?.ctx.type, "LOOPGPT_FLYWHEEL");
  assertEquals(logEntry?.ctx.agentAction, "HANDOFF_CHECKOUT");
  assertEquals(logEntry?.ctx.gmvUsd, 100.00);
});

Deno.test("Commerce: Provider Outcome Recording", async () => {
  const logger = new MockLogger({ requestId: "req-1" });

  await CommerceAnalytics.recordProviderOutcome({
    provider: "MealMe",
    success: false,
    latencyMs: 1200,
    errorCategory: "NETWORK" as any,
  }, logger);

  const logEntry = logger.logs.find((l) => l.msg === "Provider Outcome");
  assertEquals(logEntry?.ctx.type, "PROVIDER_OUTCOME");
  assertEquals(logEntry?.ctx.success, false);
  assertEquals(logEntry?.ctx.errorCategory, "NETWORK");
});
