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
  originalError?: any;
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
  public readonly originalError?: any;

  constructor(
    type: ErrorType,
    message: string,
    toolName: string,
    originalError?: any
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
  constructor(message: string, toolName: string, originalError?: any) {
    super(ErrorType.VALIDATION_ERROR, message, toolName, originalError);
    this.name = "ValidationError";
  }
}

/**
 * OpenAI API error - model failures, rate limits, etc.
 */
export class OpenAiError extends McpError {
  constructor(message: string, toolName: string, originalError?: any) {
    super(ErrorType.OPENAI_ERROR, message, toolName, originalError);
    this.name = "OpenAiError";
  }
}

/**
 * External API error - third-party service failures
 */
export class ExternalApiError extends McpError {
  constructor(message: string, toolName: string, originalError?: any) {
    super(ErrorType.EXTERNAL_API_ERROR, message, toolName, originalError);
    this.name = "ExternalApiError";
  }
}

/**
 * Cache error - cache read/write failures
 */
export class CacheError extends McpError {
  constructor(message: string, toolName: string, originalError?: any) {
    super(ErrorType.CACHE_ERROR, message, toolName, originalError);
    this.name = "CacheError";
  }
}

/**
 * Unexpected error - catch-all for unknown failures
 */
export class UnexpectedError extends McpError {
  constructor(message: string, toolName: string, originalError?: any) {
    super(ErrorType.UNEXPECTED_ERROR, message, toolName, originalError);
    this.name = "UnexpectedError";
  }
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: any, toolName: string): McpError {
  // OpenAI errors
  if (error.message?.includes("OpenAI") || 
      error.message?.includes("rate limit") ||
      error.message?.includes("model") ||
      error.status === 429 ||
      error.status === 503) {
    return new OpenAiError(error.message || "OpenAI API error", toolName, error);
  }

  // Validation errors
  if (error.message?.includes("validation") ||
      error.message?.includes("invalid") ||
      error.message?.includes("required") ||
      error.message?.includes("schema")) {
    return new ValidationError(error.message || "Validation error", toolName, error);
  }

  // Cache errors
  if (error.message?.includes("cache") ||
      error.message?.includes("Postgres") ||
      error.message?.includes("database")) {
    return new CacheError(error.message || "Cache error", toolName, error);
  }

  // External API errors
  if (error.message?.includes("API") ||
      error.message?.includes("fetch") ||
      error.message?.includes("network")) {
    return new ExternalApiError(error.message || "External API error", toolName, error);
  }

  // Default: unexpected error
  return new UnexpectedError(error.message || "Unexpected error", toolName, error);
}

/**
 * Log a structured error
 */
export function logStructuredError(
  error: McpError,
  fallbackUsed: boolean,
  durationMs: number
): void {
  const structuredError: StructuredError = {
    type: error.type,
    message: error.message,
    toolName: error.toolName,
    originalError: error.originalError?.message || error.originalError,
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
  metadata: Record<string, any> = {}
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
  metadata?: Record<string, any>
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
    })
  );
}

/**
 * Log CTA impression (when CTAs are shown to user)
 */
export function logCtaImpression(
  sourceType: string,
  ctaIds: string[],
  metadata?: Record<string, any>
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
    })
  );
}
