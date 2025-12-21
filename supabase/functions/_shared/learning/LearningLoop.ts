/**
 * Learning Loop Architecture
 * Defines the schema for learning events and feature vectors.
 */

import { AgenticAction } from "../commerce/AgenticContract.ts";
import { ErrorCategory } from "../errors/ErrorHandler.ts";
import { Logger } from "../monitoring/Logger.ts";

export interface RoutingFeaturesV1 {
  providerLatencyP50: number;
  providerLatencyP95: number;
  providerSuccessRate: number;
  providerGMVPerRoute: number;
  providerCommissionRate: number;
  userLocationScore: number;
  basketComplexityScore: number;
  timeOfDayScore: number;
}

export interface LearningEvent {
  requestId: string;
  tenantId: string;
  agentAction: AgenticAction;
  provider?: string;
  features: RoutingFeaturesV1;
  outcome: {
    success: boolean;
    latencyMs: number;
    gmvUsd?: number;
    commissionUsd?: number;
    errorCategory?: ErrorCategory;
  };
  reward: number;
  policyVersion: string;
  exploration: boolean;
  timestamp: string;
}

export class LearningLoop {
  static async emitLearningEvent(
    event: Omit<LearningEvent, "timestamp">,
    logger: Logger,
  ): Promise<void> {
    const fullEvent: LearningEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    logger.info("Learning Event", {
      type: "LEARNING_EVENT",
      ...fullEvent,
    });

    // In real impl: await supabase.from('learning_events').insert(fullEvent)
  }
}
