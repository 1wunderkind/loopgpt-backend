/**
 * Error Handler
 * Comprehensive error handling utilities for edge functions
 */

export type ErrorCategory =
  | "VALIDATION"
  | "PROVIDER"
  | "NETWORK"
  | "RATE_LIMIT"
  | "OPENAI"
  | "AUTH"
  | "INTERNAL";

/**
 * Custom error types for better error handling
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public category: ErrorCategory = "INTERNAL",
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, "VALIDATION", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ""} not found`,
      "NOT_FOUND",
      404,
      "VALIDATION",
    );
    this.name = "NotFoundError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401, "AUTH");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "AUTHORIZATION_ERROR", 403, "AUTH");
    this.name = "AuthorizationError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = "Rate limit exceeded",
    source: "INTERNAL" | "PROVIDER" | "OPENAI" = "INTERNAL",
  ) {
    super(message, "RATE_LIMIT_ERROR", 429, "RATE_LIMIT", { source });
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    originalError?: unknown,
    isNetworkError: boolean = false,
  ) {
    super(
      `External service error: ${service}`,
      "EXTERNAL_SERVICE_ERROR",
      502,
      isNetworkError ? "NETWORK" : "PROVIDER",
      originalError,
    );
    this.name = "ExternalServiceError";
  }
}

export class OpenAiError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(
      `OpenAI error: ${message}`,
      "OPENAI_ERROR",
      502,
      "OPENAI",
      originalError,
    );
    this.name = "OpenAiError";
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      "TIMEOUT_ERROR",
      504,
      "NETWORK",
    );
    this.name = "TimeoutError";
  }
}

/**
 * Error handler for edge functions
 */
export class ErrorHandler {
  /**
   * Handle error and return appropriate Response
   */
  static handleError(error: unknown): Response {
    console.error("Error occurred:", error);

    // Handle known AppError types
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify({
          error: error.code,
          message: error.message,
          category: error.category,
          details: error.details,
        }),
        {
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle standard Error
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: "INTERNAL_ERROR",
          message: error.message,
          category: "INTERNAL",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle unknown errors
    return new Response(
      JSON.stringify({
        error: "UNKNOWN_ERROR",
        message: "An unknown error occurred",
        category: "INTERNAL",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (context) {
        console.error(`Error in ${context}:`, error);
      }
      throw error;
    }
  }

  /**
   * Execute with timeout
   */
  static withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(operation, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Retry with exponential backoff
   * Only retries NETWORK, RATE_LIMIT, and explicitly idempotent PROVIDER errors
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
      backoffMultiplier?: number;
      retryableCategories?: ErrorCategory[];
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      retryableCategories = ["NETWORK", "RATE_LIMIT"],
    } = options;

    let lastError: unknown;
    let delayMs = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        let isRetryable = false;

        if (error instanceof AppError) {
          isRetryable = retryableCategories.includes(error.category);
        } else if (error instanceof Error) {
          // Assume standard errors might be transient network issues if they look like it
          // But safer to default to false unless we know
          isRetryable = false;
        }

        // Don't retry if not retryable or max retries reached
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Increase delay with exponential backoff
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  /**
   * Circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      monitoringPeriodMs?: number;
    } = {},
  ) {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      _monitoringPeriodMs = 10000,
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

    return async (): Promise<T> => {
      // Check if circuit should reset
      if (
        state === "OPEN" &&
        Date.now() - lastFailureTime > resetTimeoutMs
      ) {
        state = "HALF_OPEN";
        failures = 0;
      }

      // Reject if circuit is open
      if (state === "OPEN") {
        throw new AppError(
          "Circuit breaker is OPEN",
          "CIRCUIT_BREAKER_OPEN",
          503,
          "INTERNAL",
        );
      }

      try {
        const result = await fn();

        // Reset on success
        if (state === "HALF_OPEN") {
          state = "CLOSED";
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        // Open circuit if threshold reached
        if (failures >= failureThreshold) {
          state = "OPEN";
          console.error(
            `Circuit breaker opened after ${failures} failures`,
          );
        }

        throw error;
      }
    };
  }

  /**
   * Graceful degradation wrapper
   */
  static async withFallback<T>(
    fn: () => Promise<T>,
    fallback: T | (() => Promise<T>),
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.warn("Using fallback due to error:", error);
      return typeof fallback === "function"
        ? await (fallback as () => Promise<T>)()
        : fallback;
    }
  }

  /**
   * Validate request body
   */
  static validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[],
  ): void {
    const missingFields = requiredFields.filter(
      (field) =>
        !(field in data) || data[field] === null || data[field] === undefined,
    );

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(", ")}`,
        { missingFields },
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new ValidationError("Invalid URL format");
    }
  }

  /**
   * Validate number range
   */
  static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string,
  ): void {
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max}`,
      );
    }
  }
}

/**
 * Decorator for error handling (for use with class methods)
 */
export function handleErrors(
  _target: unknown,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      return ErrorHandler.handleError(error);
    }
  };

  return descriptor;
}
