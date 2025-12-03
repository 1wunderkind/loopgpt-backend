/**
 * Error Taxonomy for TheLoopGPT MCP Tools
 * Clear error types with user-safe messages
 */

export class ValidationError extends Error {
  readonly type = "ValidationError";
  readonly userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "ValidationError";
    this.userMessage = userMessage || "Invalid input provided. Please check your request.";
  }
}

export class ExternalApiError extends Error {
  readonly type = "ExternalApiError";
  readonly service: string;
  readonly statusCode?: number;
  readonly userMessage: string;

  constructor(
    message: string,
    service: string,
    statusCode?: number,
    userMessage?: string
  ) {
    super(message);
    this.name = "ExternalApiError";
    this.service = service;
    this.statusCode = statusCode;
    this.userMessage = userMessage || `External service (${service}) is temporarily unavailable. Using fallback data.`;
  }
}

export class OpenAiError extends Error {
  readonly type = "OpenAiError";
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(message: string, retryable = true, userMessage?: string) {
    super(message);
    this.name = "OpenAiError";
    this.retryable = retryable;
    this.userMessage = userMessage || "AI service is temporarily unavailable. Please try again.";
  }
}

export class RateLimitError extends Error {
  readonly type = "RateLimitError";
  readonly resetAt: Date;
  readonly userMessage: string;

  constructor(message: string, resetAt: Date) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
    this.userMessage = `Rate limit exceeded. Please try again after ${resetAt.toISOString()}.`;
  }
}

export class CacheError extends Error {
  readonly type = "CacheError";

  constructor(message: string) {
    super(message);
    this.name = "CacheError";
  }
}

export class UnexpectedError extends Error {
  readonly type = "UnexpectedError";
  readonly userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "UnexpectedError";
    this.userMessage = userMessage || "An unexpected error occurred. Our team has been notified.";
  }
}

/**
 * Convert any error to a user-safe response
 */
export function toUserSafeError(error: unknown): {
  type: string;
  message: string;
  retryable: boolean;
  resetAt?: string;
} {
  if (error instanceof ValidationError) {
    return {
      type: error.type,
      message: error.userMessage,
      retryable: false,
    };
  }

  if (error instanceof RateLimitError) {
    return {
      type: error.type,
      message: error.userMessage,
      retryable: true,
      resetAt: error.resetAt.toISOString(),
    };
  }

  if (error instanceof OpenAiError) {
    return {
      type: error.type,
      message: error.userMessage,
      retryable: error.retryable,
    };
  }

  if (error instanceof ExternalApiError) {
    return {
      type: error.type,
      message: error.userMessage,
      retryable: true,
    };
  }

  if (error instanceof UnexpectedError) {
    return {
      type: error.type,
      message: error.userMessage,
      retryable: false,
    };
  }

  // Unknown error - don't leak details
  return {
    type: "UnexpectedError",
    message: "An unexpected error occurred. Please try again later.",
    retryable: false,
  };
}
