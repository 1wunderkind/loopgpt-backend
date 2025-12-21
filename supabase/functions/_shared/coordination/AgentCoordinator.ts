/**
 * Multi-Agent Coordination Protocol
 * Defines roles and signals for inter-agent cooperation.
 */

import { Logger } from "../monitoring/Logger.ts";

export type AgentRole =
  | "COMMERCE_ROUTER"
  | "NUTRITION_ANALYST"
  | "MEAL_PLANNER"
  | "RETENTION_AGENT"
  | "COST_GUARD";

export interface AgentSignal {
  from: AgentRole;
  to: AgentRole;
  signal: "BLOCK" | "PREFER" | "SUGGEST" | "WARN";
  reason: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export class AgentCoordinator {
  private signals: AgentSignal[] = [];

  constructor(private logger: Logger) {}

  emit(signal: AgentSignal) {
    this.signals.push(signal);
    this.logger.info("Agent Signal", { ...signal, type: "AGENT_SIGNAL" });
  }

  getSignals(): AgentSignal[] {
    return [...this.signals];
  }

  /**
   * Resolves conflicts and returns a final decision modifier.
   * E.g., returns a list of blocked providers.
   */
  resolveConstraints(): {
    blockedProviders: string[];
    preferredProviders: string[];
  } {
    const blocked = new Set<string>();
    const preferred = new Set<string>();

    for (const s of this.signals) {
      if (s.signal === "BLOCK" && s.metadata?.provider) {
        blocked.add(s.metadata.provider as string);
      }
      if (s.signal === "PREFER" && s.metadata?.provider) {
        preferred.add(s.metadata.provider as string);
      }
    }

    // BLOCK overrides PREFER
    for (const b of blocked) {
      preferred.delete(b);
    }

    return {
      blockedProviders: Array.from(blocked),
      preferredProviders: Array.from(preferred),
    };
  }
}
