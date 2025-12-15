/**
 * Agentic Commerce Contract
 * Defines the canonical actions and decision envelopes for LoopGPT commerce.
 */

export type AgenticAction =
  | "DISCOVER"
  | "RECOMMEND"
  | "QUOTE"
  | "ROUTE_PROVIDER"
  | "HANDOFF_CHECKOUT"
  | "ORDER_CONFIRMED"
  | "ORDER_FAILED"
  | "FALLBACK_TRIGGERED";

export interface AgentDecision {
  requestId: string;
  tenantId: string;
  userId?: string;
  action: AgenticAction;
  toolName: string;
  provider?: string;
  confidence?: number;
  rationale?: string;
  timestamp: string;
}

export interface GMVEvent {
  eventId: string;
  tenantId: string;
  requestId: string;
  provider: string;
  orderId?: string;
  estimatedValueUsd?: number;
  confirmedValueUsd?: number;
  affiliateNetwork?: "MealMe" | "Instacart" | "Walmart" | "Kroger";
  commissionRate?: number;
  commissionUsd?: number;
  status: "ESTIMATED" | "CONFIRMED" | "FAILED";
  timestamp: string;
}

// Helper to create a decision envelope
export function createAgentDecision(
  params: Omit<AgentDecision, "timestamp">
): AgentDecision {
  return {
    ...params,
    timestamp: new Date().toISOString()
  };
}

// Helper to create a GMV event
export function createGMVEvent(
  params: Omit<GMVEvent, "timestamp" | "eventId">
): GMVEvent {
  return {
    ...params,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
}
