/**
 * Commerce Analytics & Flywheel
 * Handles recording of provider outcomes and the central data flywheel events.
 */

import { Logger } from "../monitoring/Logger.ts";
import { AgenticAction } from "./AgenticContract.ts";
import { ErrorCategory } from "../errors/ErrorHandler.ts";

export interface ProviderOutcome {
  provider: string;
  success: boolean;
  latencyMs: number;
  gmvUsd?: number;
  commissionUsd?: number;
  errorCategory?: ErrorCategory;
  timestamp: string;
}

export interface LoopGPTEvent {
  schemaVersion: "1.0";
  tenantId: string;
  requestId: string;
  agentAction: AgenticAction;
  toolName: string;
  provider?: string;
  inputHash?: string;
  outputHash?: string;
  success: boolean;
  errorCategory?: ErrorCategory;
  gmvUsd?: number;
  commissionUsd?: number;
  latencyMs: number;
  timestamp: string;
}

export class CommerceAnalytics {
  static async recordProviderOutcome(
    outcome: Omit<ProviderOutcome, "timestamp">,
    logger: Logger,
  ): Promise<void> {
    const event: ProviderOutcome = {
      ...outcome,
      timestamp: new Date().toISOString(),
    };

    logger.info("Provider Outcome", {
      type: "PROVIDER_OUTCOME",
      ...event,
    });

    // In real impl: await supabase.from('provider_outcomes').insert(event)
  }

  static async emitFlywheelEvent(
    event: Omit<LoopGPTEvent, "timestamp" | "schemaVersion">,
    logger: Logger,
  ): Promise<void> {
    const fullEvent: LoopGPTEvent = {
      ...event,
      schemaVersion: "1.0",
      timestamp: new Date().toISOString(),
    };

    logger.info("LoopGPT Flywheel Event", {
      type: "LOOPGPT_FLYWHEEL",
      ...fullEvent,
    });

    // In real impl: await supabase.from('loopgpt_events').insert(fullEvent)
  }
}
