/**
 * Error Types for MCP Tools
 *
 * Categorizes errors for better logging, monitoring, and handling.
 */

export enum ErrorType {
  VALIDATION_ERROR = "ValidationError",
  OPENAI_ERROR = "OpenAiError",
  EXTERNAL_API_ERROR = "ExternalApiError",
  CACHE_ERROR = "CacheError",
  UNEXPECTED_ERROR = "UnexpectedError",
}

export interface StructuredError {
  type: ErrorType;
  message: string;
  toolName: string;
  originalError?: unknown;
  fallbackUsed: boolean;
  durationMs: number;
  timestamp: string;
}

/**
 * Base error class for MCP tools
 */
export class McpError extends Error {
  public readonly type: ErrorType;
  public readonly toolName: string;
  public readonly originalError?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    toolName: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = "McpError";
    this.type = type;
    this.toolName = toolName;
    this.originalError = originalError;
  }
}

/**
 * Validation error - invalid input or output
 */
export class ValidationError extends McpError {
  constructor(message: string, toolName: string, originalError?: unknown) {
    super(ErrorType.VALIDATION_ERROR, message, toolName, originalError);
    this.name = "ValidationError";
  }
}

/**
 * OpenAI API error - model failures, rate limits, etc.
 */
export class OpenAiError extends McpError {
  constructor(message: string, toolName: string, originalError?: unknown) {
    super(ErrorType.OPENAI_ERROR, message, toolName, originalError);
    this.name = "OpenAiError";
  }
}

/**
 * External API error - third-party service failures
 */
export class ExternalApiError extends McpError {
  constructor(message: string, toolName: string, originalError?: unknown) {
    super(ErrorType.EXTERNAL_API_ERROR, message, toolName, originalError);
    this.name = "ExternalApiError";
  }
}

/**
 * Cache error - cache read/write failures
 */
export class CacheError extends McpError {
  constructor(message: string, toolName: string, originalError?: unknown) {
    super(ErrorType.CACHE_ERROR, message, toolName, originalError);
    this.name = "CacheError";
  }
}

/**
 * Unexpected error - catch-all for unknown failures
 */
export class UnexpectedError extends McpError {
  constructor(message: string, toolName: string, originalError?: unknown) {
    super(ErrorType.UNEXPECTED_ERROR, message, toolName, originalError);
    this.name = "UnexpectedError";
  }
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown, toolName: string): McpError {
  const err = error as Record<string, unknown>;
  const message = typeof err?.message === "string" ? err.message : "";
  const status = typeof err?.status === "number" ? err.status : 0;

  // OpenAI errors
  if (
    message.includes("OpenAI") ||
    message.includes("rate limit") ||
    message.includes("model") ||
    status === 429 ||
    status === 503
  ) {
    return new OpenAiError(message || "OpenAI API error", toolName, error);
  }

  // Validation errors
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("schema")
  ) {
    return new ValidationError(message || "Validation error", toolName, error);
  }

  // Cache errors
  if (
    message.includes("cache") ||
    message.includes("Postgres") ||
    message.includes("database")
  ) {
    return new CacheError(message || "Cache error", toolName, error);
  }

  // External API errors
  if (
    message.includes("API") ||
    message.includes("fetch") ||
    message.includes("network")
  ) {
    return new ExternalApiError(
      message || "External API error",
      toolName,
      error,
    );
  }

  // Default: unexpected error
  return new UnexpectedError(message || "Unexpected error", toolName, error);
}

/**
 * Log a structured error
 */
export function logStructuredError(
  error: McpError,
  fallbackUsed: boolean,
  durationMs: number,
): void {
  const originalErrorMsg = error.originalError instanceof Error
    ? error.originalError.message
    : String(error.originalError);

  const structuredError: StructuredError = {
    type: error.type,
    message: error.message,
    toolName: error.toolName,
    originalError: originalErrorMsg,
    fallbackUsed,
    durationMs,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify({
    level: "error",
    ...structuredError,
  }));
}

/**
 * Log a successful operation with metrics
 */
export function logSuccess(
  toolName: string,
  durationMs: number,
  metadata: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({
    level: "info",
    toolName,
    durationMs,
    timestamp: new Date().toISOString(),
    ...metadata,
  }));
}

/**
 * Log CTA click event
 */
export function logCtaClick(
  ctaId: string,
  sourceType: string, // recipes, mealplan, grocery, nutrition
  toolInvoked: string,
  metadata?: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "cta.clicked",
      ctaId,
      sourceType,
      toolInvoked,
      timestamp: new Date().toISOString(),
      ...metadata,
    }),
  );
}

/**
 * Log CTA impression (when CTAs are shown to user)
 */
export function logCtaImpression(
  sourceType: string,
  ctaIds: string[],
  metadata?: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "cta.impression",
      sourceType,
      ctaIds,
      ctaCount: ctaIds.length,
      timestamp: new Date().toISOString(),
      ...metadata,
    }),
  );
}
