import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PolicyEngine } from "../supabase/functions/_shared/learning/PolicyEngine.ts";
import {
  ExplorationManager,
  LearningMode,
} from "../supabase/functions/_shared/learning/ExplorationManager.ts";
import { RoutingFeaturesV1 } from "../supabase/functions/_shared/learning/LearningLoop.ts";

Deno.test("Learning: Reward Calculation", () => {
  // Success case
  const r1 = PolicyEngine.calculateReward({
    success: true,
    latencyMs: 500,
    gmvUsd: 100,
    commissionUsd: 5,
  });
  // 1.0 - 0.05 + 1.0 + 0.5 = 2.45
  assertEquals(r1, 2.45);

  // Failure case
  const r2 = PolicyEngine.calculateReward({
    success: false,
    latencyMs: 1000,
  });
  // -5.0 - 0.1 = -5.1
  assertEquals(r2, -5.1);
});

Deno.test("Learning: Provider Scoring", () => {
  const features: RoutingFeaturesV1 = {
    providerLatencyP50: 500,
    providerLatencyP95: 800,
    providerSuccessRate: 0.99,
    providerGMVPerRoute: 50,
    providerCommissionRate: 0.05,
    userLocationScore: 1,
    basketComplexityScore: 1,
    timeOfDayScore: 1,
  };

  const scored = PolicyEngine.scoreProvider("ProviderA", features);

  // 0.99*10 + 500*-0.001 + 50*0.1 + 0.05*0.5
  // 9.9 - 0.5 + 5.0 + 0.025 = 14.425
  assertEquals(scored.score, 14.425);
  assertEquals(scored.provider, "ProviderA");
});

Deno.test("Learning: Exploration Logic", () => {
  const p1 = { provider: "Best", score: 10, explanation: {} as any };
  const p2 = { provider: "Worst", score: 5, explanation: {} as any };

  // Default (OFF) -> Exploit
  const s1 = ExplorationManager.selectProvider([p1, p2]);
  assertEquals(s1.selected.provider, "Best");
  assertEquals(s1.exploration, false);

  // Enable Learning + Exploration
  Deno.env.set("LEARNING_MODE", "learn");
  Deno.env.set("EXPLORATION_ENABLED", "true");

  // Force exploration (mock random if needed, but here we just check logic flow)
  // Since random is non-deterministic, we just verify it returns *a* provider
  const s2 = ExplorationManager.selectProvider([p1, p2], 0.0); // 0% exploration
  assertEquals(s2.selected.provider, "Best");

  // Cleanup
  Deno.env.delete("LEARNING_MODE");
  Deno.env.delete("EXPLORATION_ENABLED");
});
