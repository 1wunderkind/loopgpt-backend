/**
 * Cost Guard Module
 * Tracks and enforces cost limits for AI and Provider usage.
 */

import { Logger } from "../monitoring/Logger.ts";
import { AppError } from "../errors/ErrorHandler.ts";

export interface CostEvent {
  requestId: string;
  userId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
}

// Simple static pricing table (per 1k tokens)
const PRICING_TABLE: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  // Fallback
  "default": { prompt: 0.005, completion: 0.015 }
};

export class CostGuard {
  private static DAILY_LIMIT_USD = 5.0; // Hard daily cap per user (simulated)
  
  static calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING_TABLE[model] || PRICING_TABLE["default"];
    return (promptTokens / 1000 * pricing.prompt) + (completionTokens / 1000 * pricing.completion);
  }

  static async trackAndEnforce(
    logger: Logger,
    event: Omit<CostEvent, "estimatedUsd">
  ): Promise<void> {
    const cost = this.calculateCost(event.model, event.promptTokens, event.completionTokens);
    
    // Log the cost event
    logger.info("Cost Event", {
      ...event,
      estimatedUsd: cost,
      type: "COST_TRACKING"
    });

    // In a real system, we would check a DB or Redis for accumulated daily usage.
    // Here we simulate a check.
    if (cost > 1.0) { // Safety valve for single expensive request
       logger.warn("Expensive request detected", { cost });
    }
  }
}
