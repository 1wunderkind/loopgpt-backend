/**
 * Structured Logger for MCP Server
 * 
 * Provides JSON-formatted logging with levels and context for observability.
 * Designed to be compatible with:
 * - Supabase Edge Function logs
 * - Grafana / Loki
 * - Datadog
 * - CloudWatch
 * - Any JSON log aggregation tool
 * 
 * Usage:
 *   import { logInfo, logError } from "./lib/logger";
 *   logInfo("Tool executed successfully", { toolName: "foo", durationMs: 123 });
 *   logError("Tool failed", { toolName: "bar", errorCode: "TIMEOUT" });
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  source?: string;       // e.g. "mcp-tool", "mcp-server", "tool-metrics"
  toolName?: string;     // MCP tool name
  userId?: string;       // User identifier (if available)
  sessionId?: string;    // Session identifier (if available)
  gptName?: string;      // GPT name (LeftoverGPT, MealPlannerGPT, etc.)
  errorCode?: string;    // Error code from ToolErrorCode
  durationMs?: number;   // Execution duration
  retryable?: boolean;   // Whether error is retryable
  attemptNumber?: number; // Retry attempt number
  [key: string]: any;    // Additional context fields
}

export interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  source?: string;
  toolName?: string;
  userId?: string;
  sessionId?: string;
  gptName?: string;
  errorCode?: string;
  durationMs?: number;
  retryable?: boolean;
  attemptNumber?: number;
  context?: Record<string, any>; // Additional fields not explicitly typed
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Log a message with structured context
 * 
 * @param level - Log level (debug, info, warn, error)
 * @param message - Human-readable log message
 * @param context - Additional context fields
 */
export function log(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): void {
  // Extract known fields for top-level placement
  const {
    source,
    toolName,
    userId,
    sessionId,
    gptName,
    errorCode,
    durationMs,
    retryable,
    attemptNumber,
    ...additionalContext
  } = context;

  // Build structured log payload
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(source && { source }),
    ...(toolName && { toolName }),
    ...(userId && { userId }),
    ...(sessionId && { sessionId }),
    ...(gptName && { gptName }),
    ...(errorCode && { errorCode }),
    ...(durationMs !== undefined && { durationMs }),
    ...(retryable !== undefined && { retryable }),
    ...(attemptNumber !== undefined && { attemptNumber }),
    ...(Object.keys(additionalContext).length > 0 && { context: additionalContext }),
  };

  // Route to appropriate console method based on level
  // Supabase Edge Functions capture console output as structured logs
  if (level === "error" || level === "warn") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

// ============================================================================
// Convenience Functions for Each Log Level
// ============================================================================

/**
 * Log a debug message (verbose, development-only)
 * 
 * @param message - Debug message
 * @param context - Additional context
 */
export const logDebug = (message: string, context?: LogContext): void =>
  log("debug", message, context);

/**
 * Log an info message (normal operational events)
 * 
 * @param message - Info message
 * @param context - Additional context
 */
export const logInfo = (message: string, context?: LogContext): void =>
  log("info", message, context);

/**
 * Log a warning message (potential issues, degraded performance)
 * 
 * @param message - Warning message
 * @param context - Additional context
 */
export const logWarn = (message: string, context?: LogContext): void =>
  log("warn", message, context);

/**
 * Log an error message (failures, exceptions)
 * 
 * @param message - Error message
 * @param context - Additional context
 */
export const logError = (message: string, context?: LogContext): void =>
  log("error", message, context);

// ============================================================================
// Scoped Logger Class (Optional)
// ============================================================================

/**
 * Scoped logger that automatically includes common context
 * 
 * Useful for logging within a specific tool execution where you want
 * to avoid repeating toolName, userId, etc. in every log call.
 * 
 * Example:
 *   const logger = new ScopedLogger({ toolName: "foo", userId: "123" });
 *   logger.info("Starting execution");
 *   logger.error("Failed", { errorCode: "TIMEOUT" });
 */
export class ScopedLogger {
  private baseContext: LogContext;

  constructor(baseContext: LogContext) {
    this.baseContext = baseContext;
  }

  /**
   * Log with debug level
   */
  debug(message: string, additionalContext?: LogContext): void {
    log("debug", message, { ...this.baseContext, ...additionalContext });
  }

  /**
   * Log with info level
   */
  info(message: string, additionalContext?: LogContext): void {
    log("info", message, { ...this.baseContext, ...additionalContext });
  }

  /**
   * Log with warn level
   */
  warn(message: string, additionalContext?: LogContext): void {
    log("warn", message, { ...this.baseContext, ...additionalContext });
  }

  /**
   * Log with error level
   */
  error(message: string, additionalContext?: LogContext): void {
    log("error", message, { ...this.baseContext, ...additionalContext });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize sensitive data from log context
 * 
 * Removes or redacts fields that should not be logged (API keys, passwords, etc.)
 * 
 * @param context - Log context to sanitize
 * @returns Sanitized context
 */
export function sanitizeLogContext(context: LogContext): LogContext {
  const sanitized = { ...context };

  // List of sensitive field names to redact
  const sensitiveFields = [
    "password",
    "apiKey",
    "api_key",
    "token",
    "secret",
    "authorization",
    "cookie",
    "session_token",
  ];

  // Redact sensitive fields
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Redact nested objects (one level deep)
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogContext(value as LogContext);
    }
  }

  return sanitized;
}

/**
 * Format duration for human-readable logs
 * 
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    return `${(durationMs / 60000).toFixed(2)}m`;
  }
}
