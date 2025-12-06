/**
 * Logging & Telemetry Utilities
 * Structured logging for commerce operations with observability
 * 
 * Log Levels:
 * - INFO: Normal operations (provider success, router decisions)
 * - WARN: Recoverable issues (provider fallback, partial availability)
 * - ERROR: Failures (provider errors, router failures)
 * 
 * All logs are JSON-structured for easy parsing by log aggregators
 * (Supabase logs, Logtail, Datadog, etc.)
 */

import type { ProviderId, ProviderQuote, ScoredQuote } from '../types/index.ts';

// ============================================================================
// Log Event Types
// ============================================================================

export interface BaseLogEvent {
  event: string;
  timestamp: string;
  requestId?: string;
}

export interface ProviderQuoteStartEvent extends BaseLogEvent {
  event: 'provider_quote_start';
  providerId: ProviderId;
  itemCount: number;
}

export interface ProviderQuoteSuccessEvent extends BaseLogEvent {
  event: 'provider_quote_success';
  providerId: ProviderId;
  latencyMs: number;
  totalCents: number;
  estimatedDeliveryMinutes?: number;
  itemsFound: number;
  itemsRequested: number;
}

export interface ProviderQuoteErrorEvent extends BaseLogEvent {
  event: 'provider_quote_error';
  providerId: ProviderId;
  latencyMs: number;
  error: string;
  errorCode?: string;
  retryable: boolean;
}

export interface ProviderFallbackEvent extends BaseLogEvent {
  event: 'provider_fallback';
  providerId: ProviderId;
  reason: string;
  fallbackMode: 'mock' | 'alternative';
}

export interface RouterDecisionEvent extends BaseLogEvent {
  event: 'router_decision';
  selectedProviderId: ProviderId;
  totalQuotes: number;
  score: number;
  priceScore: number;
  speedScore: number;
  availabilityScore: number;
  marginScore: number;
  reliabilityScore: number;
  totalCents: number;
  estimatedDeliveryMinutes?: number;
}

export interface RouterFailureEvent extends BaseLogEvent {
  event: 'router_failure';
  attemptedProviders: ProviderId[];
  errors: Array<{ providerId: ProviderId; error: string }>;
}

export interface RouterLatencyEvent extends BaseLogEvent {
  event: 'router_latency';
  totalLatencyMs: number;
  providerLatencies: Record<ProviderId, number>;
  slowestProvider?: ProviderId;
  fastestProvider?: ProviderId;
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log provider quote start
 */
export function logProviderQuoteStart(
  providerId: ProviderId,
  itemCount: number,
  requestId?: string
): void {
  const event: ProviderQuoteStartEvent = {
    event: 'provider_quote_start',
    providerId,
    itemCount,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.log(JSON.stringify(event));
}

/**
 * Log provider quote success
 */
export function logProviderQuoteSuccess(
  providerId: ProviderId,
  quote: ProviderQuote,
  latencyMs: number,
  requestId?: string
): void {
  const itemsFound = quote.itemAvailability.filter(ia => ia.status === 'found').length;
  const itemsRequested = quote.itemAvailability.length;

  const event: ProviderQuoteSuccessEvent = {
    event: 'provider_quote_success',
    providerId,
    latencyMs,
    totalCents: quote.quote.totalCents,
    estimatedDeliveryMinutes: quote.quote.estimatedDeliveryMinutes,
    itemsFound,
    itemsRequested,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.log(JSON.stringify(event));
}

/**
 * Log provider quote error
 */
export function logProviderQuoteError(
  providerId: ProviderId,
  error: unknown,
  latencyMs: number,
  requestId?: string
): void {
  const event: ProviderQuoteErrorEvent = {
    event: 'provider_quote_error',
    providerId,
    latencyMs,
    error: error instanceof Error ? error.message : String(error),
    errorCode: (error as any)?.code,
    retryable: (error as any)?.retryable ?? false,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.error(JSON.stringify(event));
}

/**
 * Log provider fallback (mock mode or alternative provider)
 */
export function logProviderFallback(
  providerId: ProviderId,
  reason: string,
  fallbackMode: 'mock' | 'alternative',
  requestId?: string
): void {
  const event: ProviderFallbackEvent = {
    event: 'provider_fallback',
    providerId,
    reason,
    fallbackMode,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.warn(JSON.stringify(event));
}

/**
 * Log router decision (final provider selection)
 */
export function logRouterDecision(
  selectedQuote: ScoredQuote,
  totalQuotes: number,
  requestId?: string
): void {
  const event: RouterDecisionEvent = {
    event: 'router_decision',
    selectedProviderId: selectedQuote.provider.id,
    totalQuotes,
    score: selectedQuote.score,
    priceScore: selectedQuote.scoreBreakdown.priceScore,
    speedScore: selectedQuote.scoreBreakdown.speedScore,
    availabilityScore: selectedQuote.scoreBreakdown.availabilityScore,
    marginScore: selectedQuote.scoreBreakdown.marginScore,
    reliabilityScore: selectedQuote.scoreBreakdown.reliabilityScore,
    totalCents: selectedQuote.quote.totalCents,
    estimatedDeliveryMinutes: selectedQuote.quote.estimatedDeliveryMinutes,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.log(JSON.stringify(event));
}

/**
 * Log router failure (no valid quotes)
 */
export function logRouterFailure(
  attemptedProviders: ProviderId[],
  errors: Array<{ providerId: ProviderId; error: string }>,
  requestId?: string
): void {
  const event: RouterFailureEvent = {
    event: 'router_failure',
    attemptedProviders,
    errors,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.error(JSON.stringify(event));
}

/**
 * Log router latency metrics
 */
export function logRouterLatency(
  totalLatencyMs: number,
  providerLatencies: Record<ProviderId, number>,
  requestId?: string
): void {
  const latencies = Object.entries(providerLatencies);
  const slowest = latencies.reduce((max, [id, ms]) => ms > max[1] ? [id, ms] : max, ['', 0]);
  const fastest = latencies.reduce((min, [id, ms]) => ms < min[1] ? [id, ms] : min, ['', Infinity]);

  const event: RouterLatencyEvent = {
    event: 'router_latency',
    totalLatencyMs,
    providerLatencies,
    slowestProvider: slowest[0] as ProviderId || undefined,
    fastestProvider: fastest[0] as ProviderId || undefined,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.log(JSON.stringify(event));
}

/**
 * Generate request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// Legacy Functions (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use logProviderQuoteError instead
 */
export function logProviderError(
  providerId: ProviderId,
  error: unknown,
  requestId?: string
): void {
  logProviderQuoteError(providerId, error, 0, requestId);
}

/**
 * @deprecated Use logProviderQuoteSuccess instead
 */
export function logProviderSuccess(
  quote: ProviderQuote,
  requestId?: string
): void {
  logProviderQuoteSuccess(quote.provider.id, quote, 0, requestId);
}

// ============================================================================
// Metrics Aggregation (for future use)
// ============================================================================

/**
 * Aggregate metrics for a routing session
 * Can be sent to metrics SaaS (Datadog, New Relic, etc.)
 */
export interface RoutingMetrics {
  requestId: string;
  totalLatencyMs: number;
  providersQueried: number;
  providersSucceeded: number;
  providersFailed: number;
  selectedProvider: ProviderId;
  totalCents: number;
  estimatedDeliveryMinutes?: number;
  score: number;
  timestamp: string;
}

/**
 * Create metrics summary for a routing session
 */
export function createRoutingMetrics(
  requestId: string,
  totalLatencyMs: number,
  allProviders: ProviderId[],
  successfulQuotes: ProviderQuote[],
  selectedQuote: ScoredQuote
): RoutingMetrics {
  return {
    requestId,
    totalLatencyMs,
    providersQueried: allProviders.length,
    providersSucceeded: successfulQuotes.length,
    providersFailed: allProviders.length - successfulQuotes.length,
    selectedProvider: selectedQuote.provider.id,
    totalCents: selectedQuote.quote.totalCents,
    estimatedDeliveryMinutes: selectedQuote.quote.estimatedDeliveryMinutes,
    score: selectedQuote.score,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send metrics to external service (placeholder)
 * TODO: Implement actual metrics service integration
 */
export async function sendMetrics(metrics: RoutingMetrics): Promise<void> {
  // Placeholder for future metrics service integration
  // Examples:
  // - Datadog: await datadogClient.sendMetrics(metrics)
  // - New Relic: await newRelicClient.recordCustomEvent('routing', metrics)
  // - Supabase: await supabase.from('routing_metrics').insert(metrics)
  
  console.log('[Metrics]', JSON.stringify(metrics));
}
