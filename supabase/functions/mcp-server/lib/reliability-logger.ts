/**
 * Structured Logging for Reliability Layer
 * 
 * Logs reliability events (timeouts, retries, errors) in JSON format
 * for observability and debugging.
 */

import type { ToolErrorResponse, ToolErrorCode } from "./reliability.ts";

export interface ReliabilityLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: "timeout" | "retry" | "error" | "success" | "retry_exhausted";
  toolName: string;
  durationMs?: number;
  attemptNumber?: number;
  maxRetries?: number;
  errorCode?: ToolErrorCode;
  errorMessage?: string;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Logs a structured reliability event
 */
export function logReliabilityEvent(entry: ReliabilityLogEntry): void {
  const logLine = JSON.stringify({
    ...entry,
    service: "mcp-reliability",
    version: "1.0.0",
  });
  
  // Log to console (Supabase Edge Functions capture stdout)
  console.log(logLine);
}

/**
 * Logs a timeout event
 */
export function logTimeout(
  toolName: string,
  timeoutMs: number,
  attemptNumber: number = 1
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "warn",
    event: "timeout",
    toolName,
    attemptNumber,
    metadata: {
      timeoutMs,
    },
  });
}

/**
 * Logs a retry attempt
 */
export function logRetry(
  toolName: string,
  attemptNumber: number,
  maxRetries: number,
  errorCode: ToolErrorCode,
  delayMs: number
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "retry",
    toolName,
    attemptNumber,
    maxRetries,
    errorCode,
    metadata: {
      delayMs,
      retriesRemaining: maxRetries - attemptNumber + 1,
    },
  });
}

/**
 * Logs when retries are exhausted
 */
export function logRetryExhausted(
  toolName: string,
  attemptNumber: number,
  errorCode: ToolErrorCode,
  errorMessage: string
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "retry_exhausted",
    toolName,
    attemptNumber,
    errorCode,
    errorMessage,
  });
}

/**
 * Logs a tool error
 */
export function logToolError(
  error: ToolErrorResponse,
  durationMs: number
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "error",
    toolName: error.toolName,
    durationMs,
    errorCode: error.code,
    errorMessage: error.message,
    retryable: error.retryable,
    metadata: {
      technicalMessage: error.technicalMessage,
      details: error.details,
    },
  });
}

/**
 * Logs a successful tool execution
 */
export function logToolSuccess(
  toolName: string,
  durationMs: number,
  attemptNumber: number = 1,
  hadRetries: boolean = false
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "success",
    toolName,
    durationMs,
    attemptNumber,
    metadata: {
      hadRetries,
    },
  });
}

/**
 * Logs a network error
 */
export function logNetworkError(
  toolName: string,
  url: string,
  errorMessage: string,
  attemptNumber: number = 1
): void {
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "error",
    toolName,
    attemptNumber,
    errorCode: "NETWORK_ERROR",
    errorMessage,
    metadata: {
      url,
    },
  });
}

/**
 * Logs an upstream API error
 */
export function logUpstreamError(
  toolName: string,
  url: string,
  statusCode: number,
  errorMessage: string,
  attemptNumber: number = 1
): void {
  const errorCode: ToolErrorCode = statusCode >= 500 ? "UPSTREAM_5XX" : "UPSTREAM_4XX";
  
  logReliabilityEvent({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "error",
    toolName,
    attemptNumber,
    errorCode,
    errorMessage,
    metadata: {
      url,
      statusCode,
    },
  });
}

/**
 * Creates a child logger with tool context
 */
export class ReliabilityLogger {
  constructor(private toolName: string) {}

  timeout(timeoutMs: number, attemptNumber: number = 1): void {
    logTimeout(this.toolName, timeoutMs, attemptNumber);
  }

  retry(
    attemptNumber: number,
    maxRetries: number,
    errorCode: ToolErrorCode,
    delayMs: number
  ): void {
    logRetry(this.toolName, attemptNumber, maxRetries, errorCode, delayMs);
  }

  retryExhausted(
    attemptNumber: number,
    errorCode: ToolErrorCode,
    errorMessage: string
  ): void {
    logRetryExhausted(this.toolName, attemptNumber, errorCode, errorMessage);
  }

  error(error: ToolErrorResponse, durationMs: number): void {
    logToolError(error, durationMs);
  }

  success(durationMs: number, attemptNumber: number = 1, hadRetries: boolean = false): void {
    logToolSuccess(this.toolName, durationMs, attemptNumber, hadRetries);
  }

  networkError(url: string, errorMessage: string, attemptNumber: number = 1): void {
    logNetworkError(this.toolName, url, errorMessage, attemptNumber);
  }

  upstreamError(
    url: string,
    statusCode: number,
    errorMessage: string,
    attemptNumber: number = 1
  ): void {
    logUpstreamError(this.toolName, url, statusCode, errorMessage, attemptNumber);
  }
}
