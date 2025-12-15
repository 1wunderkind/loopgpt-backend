/**
 * Analytics Module
 * Emits canonical usage events to the data flywheel.
 */

import { Logger } from "../monitoring/Logger.ts";

export interface AnalyticsEvent {
  tenantId: string;
  userId: string;
  toolName: string;
  action: string;
  provider?: string;
  durationMs: number;
  errorCategory?: string;
  costUsd?: number;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
}

export class Analytics {
  static async emit(event: AnalyticsEvent, logger: Logger): Promise<void> {
    // 1. Log structured event (picked up by log drain)
    logger.info("Analytics Event", {
      ...event,
      type: "ANALYTICS",
      schemaVersion: 1
    });

    // 2. Persist to DB (Fire & Forget to avoid latency)
    // In real impl: await supabase.from('analytics_events').insert(...)
    // Here we just simulate/log
    
    // Note: We don't await this in the critical path if we want low latency,
    // but Edge Functions terminate when response is sent, so we must await 
    // OR use `EdgeRuntime.waitUntil` if available.
    // For safety in this environment, we assume we await or it's fast.
  }
}
