/**
 * Exploration Manager
 * Controls exploration vs exploitation and safety switches.
 */

import { ScoredProvider } from "./PolicyEngine.ts";

export enum LearningMode {
  OFF = "off",
  OBSERVE = "observe",
  LEARN = "learn"
}

export class ExplorationManager {
  static getMode(): LearningMode {
    const env = Deno.env.get("LEARNING_MODE");
    switch (env) {
      case "learn": return LearningMode.LEARN;
      case "observe": return LearningMode.OBSERVE;
      default: return LearningMode.OFF;
    }
  }

  static isExplorationEnabled(): boolean {
    return Deno.env.get("EXPLORATION_ENABLED") === "true";
  }

  static selectProvider(
    candidates: ScoredProvider[],
    explorationRate: number = 0.05
  ): { selected: ScoredProvider; exploration: boolean } {
    // Sort by score descending
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const best = sorted[0];

    // Safety: If learning is OFF, always exploit
    if (this.getMode() === LearningMode.OFF || !this.isExplorationEnabled()) {
      return { selected: best, exploration: false };
    }

    // Epsilon-greedy exploration
    if (Math.random() < explorationRate && sorted.length > 1) {
      // Pick a random non-best provider
      const others = sorted.slice(1);
      const random = others[Math.floor(Math.random() * others.length)];
      return { selected: random, exploration: true };
    }

    return { selected: best, exploration: false };
  }
}
