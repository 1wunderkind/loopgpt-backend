/**
 * Commerce Logger
 * 
 * Wrapper around the Step 2 structured logger for commerce-specific events.
 * Provides semantic logging for commerce router operations.
 * 
 * Part of: Step 3 - Provider Arbitrage Hardening & Failover
 */

import type { ProviderId } from "./types/index.ts";

// ============================================================================
// Type Definitions
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface CommerceLogContext {
  source?: string;
  providerId?: ProviderId;
  providerName?: string;
  userId?: string;
  orderId?: string;
  routeId?: string;
  durationMs?: number;
  errorCode?: string;
  retryable?: boolean;
  attemptNumber?: number;
  totalValue?: number;
  commission?: number;
  failoverFrom?: ProviderId;
  [key: string]: any;
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Log a commerce event with structured context
 */
export function logCommerce(
  level: LogLevel,
  message: string,
  context: CommerceLogContext = {}
): void {
  const {
    source = "commerce",
    providerId,
    providerName,
    userId,
    orderId,
    routeId,
    durationMs,
    errorCode,
    retryable,
    attemptNumber,
    totalValue,
    commission,
    failoverFrom,
    ...additionalContext
  } = context;

  const payload: Record<string, any> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    source,
  };

  // Add known fields if present
  if (providerId) payload.providerId = providerId;
  if (providerName) payload.providerName = providerName;
  if (userId) payload.userId = userId;
  if (orderId) payload.orderId = orderId;
  if (routeId) payload.routeId = routeId;
  if (durationMs !== undefined) payload.durationMs = durationMs;
  if (errorCode) payload.errorCode = errorCode;
  if (retryable !== undefined) payload.retryable = retryable;
  if (attemptNumber !== undefined) payload.attemptNumber = attemptNumber;
  if (totalValue !== undefined) payload.totalValue = totalValue;
  if (commission !== undefined) payload.commission = commission;
  if (failoverFrom) payload.failoverFrom = failoverFrom;

  // Add additional context
  if (Object.keys(additionalContext).length > 0) {
    payload.context = additionalContext;
  }

  // Output as JSON
  console.log(JSON.stringify(payload));
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function logCommerceInfo(message: string, context?: CommerceLogContext): void {
  logCommerce("info", message, context);
}

export function logCommerceWarn(message: string, context?: CommerceLogContext): void {
  logCommerce("warn", message, context);
}

export function logCommerceError(message: string, context?: CommerceLogContext): void {
  logCommerce("error", message, context);
}

export function logCommerceDebug(message: string, context?: CommerceLogContext): void {
  logCommerce("debug", message, context);
}

// ============================================================================
// Semantic Commerce Event Loggers
// ============================================================================

/**
 * Log a commerce.route_order event
 */
export function logRouteOrderStart(
  userId: string,
  itemCount: number,
  routeId: string
): void {
  logCommerceInfo("commerce.route_order.start", {
    userId,
    itemCount,
    routeId,
  });
}

export function logRouteOrderSuccess(
  routeId: string,
  providerId: ProviderId,
  durationMs: number,
  score: number
): void {
  logCommerceInfo("commerce.route_order.success", {
    routeId,
    providerId,
    durationMs,
    score,
  });
}

export function logRouteOrderFailure(
  routeId: string,
  errorCode: string,
  durationMs: number
): void {
  logCommerceError("commerce.route_order.failure", {
    routeId,
    errorCode,
    durationMs,
  });
}

/**
 * Log a commerce.confirm_order event
 */
export function logConfirmOrderStart(
  orderId: string,
  providerId: ProviderId,
  userId: string
): void {
  logCommerceInfo("commerce.confirm_order.start", {
    orderId,
    providerId,
    userId,
  });
}

export function logConfirmOrderSuccess(
  orderId: string,
  providerId: ProviderId,
  durationMs: number,
  totalValue?: number
): void {
  logCommerceInfo("commerce.confirm_order.success", {
    orderId,
    providerId,
    durationMs,
    totalValue,
  });
}

export function logConfirmOrderFailure(
  orderId: string,
  providerId: ProviderId,
  errorCode: string,
  durationMs: number,
  retryable: boolean
): void {
  logCommerceError("commerce.confirm_order.failure", {
    orderId,
    providerId,
    errorCode,
    durationMs,
    retryable,
  });
}

/**
 * Log a commerce.failover_attempt event
 */
export function logFailoverAttempt(
  orderId: string,
  failoverFrom: ProviderId,
  failoverTo: ProviderId,
  reason: string
): void {
  logCommerceWarn("commerce.failover_attempt", {
    orderId,
    failoverFrom,
    providerId: failoverTo,
    reason,
  });
}

export function logFailoverSuccess(
  orderId: string,
  failoverFrom: ProviderId,
  failoverTo: ProviderId,
  durationMs: number
): void {
  logCommerceInfo("commerce.failover_success", {
    orderId,
    failoverFrom,
    providerId: failoverTo,
    durationMs,
  });
}

export function logFailoverFailure(
  orderId: string,
  failoverFrom: ProviderId,
  failoverTo: ProviderId,
  errorCode: string
): void {
  logCommerceError("commerce.failover_failure", {
    orderId,
    failoverFrom,
    providerId: failoverTo,
    errorCode,
  });
}

/**
 * Log a commerce.record_outcome event
 */
export function logRecordOutcome(
  orderId: string,
  providerId: ProviderId,
  outcome: 'success' | 'failed' | 'cancelled',
  totalValue: number,
  commission: number
): void {
  logCommerceInfo("commerce.record_outcome", {
    orderId,
    providerId,
    outcome,
    totalValue,
    commission,
  });
}

/**
 * Log a commerce.provider_metrics_update event
 */
export function logProviderMetricsUpdate(
  providerId: ProviderId,
  successRate: number | null,
  avgMarginRate: number | null,
  totalOrders: number
): void {
  logCommerceDebug("commerce.provider_metrics_update", {
    providerId,
    successRate,
    avgMarginRate,
    totalOrders,
  });
}

/**
 * Log a commerce.scoring event
 */
export function logScoringDecision(
  routeId: string,
  providerId: ProviderId,
  score: number,
  priceScore: number,
  speedScore: number,
  availabilityScore: number,
  marginScore: number,
  reliabilityScore: number
): void {
  logCommerceDebug("commerce.scoring_decision", {
    routeId,
    providerId,
    score,
    priceScore,
    speedScore,
    availabilityScore,
    marginScore,
    reliabilityScore,
  });
}
