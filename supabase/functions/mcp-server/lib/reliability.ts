/**
 * MCP Tool Reliability & Error Handling Layer
 * 
 * Provides robust error handling, timeouts, and retries for all MCP tools.
 * Ensures graceful degradation and standardized error responses.
 * 
 * @module reliability
 */

import { logDebug, logInfo, logWarn, logError } from "./logger.ts";

// ============================================================================
// TYPES
// ============================================================================

/**
 * High-level success/failure wrapper for tool results
 */
export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ToolErrorResponse };

/**
 * Standardized error codes for tool failures
 */
export type ToolErrorCode =
  | "TIMEOUT"           // Request exceeded time limit
  | "NETWORK_ERROR"     // DNS, connection, or network failure
  | "UPSTREAM_4XX"      // Client error from external API (400-499)
  | "UPSTREAM_5XX"      // Server error from external API (500-599)
  | "VALIDATION_ERROR"  // Input validation failed
  | "UNKNOWN";          // Unexpected error

/**
 * Standardized error response structure
 * Returned to ChatGPT for user-friendly error messages
 */
export interface ToolErrorResponse {
  code: ToolErrorCode;
  message: string;              // User-facing, safe message
  technicalMessage?: string;    // Internal debug string (not shown to user)
  toolName: string;
  retryable: boolean;           // Whether ChatGPT should suggest retrying
  details?: Record<string, any>; // Additional context (statusCode, provider, etc.)
}

/**
 * Configuration options for withToolReliability wrapper
 */
export interface WithToolReliabilityOptions {
  toolName: string;
  timeoutMs?: number;           // Default: 8000ms (8 seconds)
  maxRetries?: number;          // Default: 0 (no retries)
  retryDelayMs?: number;        // Default: 300ms
  retryOnCodes?: ToolErrorCode[]; // Which error codes should trigger retry
}

// ============================================================================
// DEFAULT USER-FACING MESSAGES
// ============================================================================

/**
 * Default user-friendly messages for each error code
 * Used when no specific message is provided
 */
const DEFAULT_USER_MESSAGES: Record<ToolErrorCode, string> = {
  TIMEOUT: "The service is taking too long to respond. Please try again in a moment.",
  NETWORK_ERROR: "I couldn't reach that service due to a network issue. Please try again.",
  UPSTREAM_4XX: "There was a problem with the request for this service.",
  UPSTREAM_5XX: "The partner service is having an issue right now. Please try again later.",
  VALIDATION_ERROR: "The input data for this tool was invalid.",
  UNKNOWN: "Something unexpected went wrong while running this tool.",
};

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Classifies an error into a standardized ToolErrorCode
 * Maps various error types to appropriate codes
 */
function classifyError(error: unknown): {
  code: ToolErrorCode;
  retryable: boolean;
  statusCode?: number;
} {
  // Handle timeout errors
  if (error instanceof Error && error.name === "TimeoutError") {
    return { code: "TIMEOUT", retryable: true };
  }

  // Handle AbortError (from AbortController)
  if (error instanceof Error && error.name === "AbortError") {
    return { code: "TIMEOUT", retryable: true };
  }

  // Handle network errors (DNS, connection failures)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return { code: "NETWORK_ERROR", retryable: true };
  }

  // Handle HTTP response errors
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as any).status;
    
    if (status >= 400 && status < 500) {
      return { code: "UPSTREAM_4XX", retryable: false, statusCode: status };
    }
    
    if (status >= 500) {
      return { code: "UPSTREAM_5XX", retryable: true, statusCode: status };
    }
  }

  // Handle validation errors
  if (error instanceof Error && error.message.includes("validation")) {
    return { code: "VALIDATION_ERROR", retryable: false };
  }

  // Default: unknown error (not retryable to be safe)
  return { code: "UNKNOWN", retryable: false };
}

/**
 * Creates a standardized ToolErrorResponse from an error
 */
function createErrorResponse(
  error: unknown,
  toolName: string,
  customMessage?: string
): ToolErrorResponse {
  const classification = classifyError(error);
  
  const technicalMessage = error instanceof Error 
    ? error.message 
    : String(error);

  const details: Record<string, any> = {};
  
  if (classification.statusCode) {
    details.statusCode = classification.statusCode;
  }

  // Add stack trace for unknown errors (for debugging)
  if (classification.code === "UNKNOWN" && error instanceof Error && error.stack) {
    details.stackTrace = error.stack.split('\n').slice(0, 5).join('\n'); // First 5 lines only
  }

  return {
    code: classification.code,
    message: customMessage || DEFAULT_USER_MESSAGES[classification.code],
    technicalMessage,
    toolName,
    retryable: classification.retryable,
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

// ============================================================================
// TIMEOUT HELPER
// ============================================================================

/**
 * Wraps a promise with a timeout
 * Rejects with TimeoutError if promise doesn't resolve within timeoutMs
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  abortController?: AbortController
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }
      const error = new Error(`Operation timed out after ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// ============================================================================
// RETRY HELPER
// ============================================================================

/**
 * Implements exponential backoff retry logic
 * Only retries on specified error codes
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    retryDelayMs: number;
    retryOnCodes: ToolErrorCode[];
    toolName: string;
  }
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const classification = classifyError(error);
      
      // Don't retry if this error code is not in retryOnCodes
      if (!options.retryOnCodes.includes(classification.code)) {
        logDebug("Skipping retry - error code not retryable", {
          source: "mcp-reliability",
          toolName: options.toolName,
          errorCode: classification.code,
          attemptNumber: attempt + 1,
        });
        throw error;
      }

      // Don't retry if this is the last attempt
      if (attempt === options.maxRetries) {
        logWarn("Max retries exhausted", {
          source: "mcp-reliability",
          toolName: options.toolName,
          errorCode: classification.code,
          attemptNumber: attempt + 1,
          maxRetries: options.maxRetries,
        });
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = options.retryDelayMs * Math.pow(2, attempt);
      
      logInfo("Retrying after error", {
        source: "mcp-reliability",
        toolName: options.toolName,
        errorCode: classification.code,
        attemptNumber: attempt + 1,
        maxRetries: options.maxRetries,
        delayMs: delay,
        retryable: true,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

// ============================================================================
// MAIN RELIABILITY WRAPPER
// ============================================================================

/**
 * Wraps a tool function with reliability features:
 * - Timeout enforcement
 * - Automatic retries (for idempotent operations)
 * - Error classification and standardization
 * - Structured logging
 * 
 * @param fn - The tool function to wrap
 * @param opts - Configuration options
 * @returns ToolResult with either success data or standardized error
 * 
 * @example
 * ```typescript
 * const result = await withToolReliability(
 *   () => searchRestaurants(input),
 *   {
 *     toolName: "search_restaurants",
 *     timeoutMs: 8000,
 *     maxRetries: 2,
 *     retryDelayMs: 400,
 *     retryOnCodes: ["NETWORK_ERROR", "UPSTREAM_5XX"],
 *   }
 * );
 * 
 * if (result.ok) {
 *   return result.data;
 * } else {
 *   return result.error; // Standardized error response
 * }
 * ```
 */
export async function withToolReliability<T>(
  fn: () => Promise<T>,
  opts: WithToolReliabilityOptions
): Promise<ToolResult<T>> {
  const {
    toolName,
    timeoutMs = 8000,
    maxRetries = 0,
    retryDelayMs = 300,
    retryOnCodes = [],
  } = opts;

  const startTime = Date.now();

  try {
    // Create AbortController for fetch-based operations
    const abortController = new AbortController();

    // Wrap the function with retry logic (if maxRetries > 0)
    const fnWithRetry = maxRetries > 0
      ? () => withRetry(fn, { maxRetries, retryDelayMs, retryOnCodes, toolName })
      : fn;

    // Execute with timeout
    const data = await withTimeout(fnWithRetry(), timeoutMs, abortController);

    const duration = Date.now() - startTime;
    
    // Log success
    logDebug("Tool execution succeeded", {
      source: "mcp-reliability",
      toolName,
      durationMs: duration,
    });

    return { ok: true, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Create standardized error response
    const errorResponse = createErrorResponse(error, toolName);

    // Log error
    logToolError(errorResponse, duration);

    return { ok: false, error: errorResponse };
  }
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

/**
 * Logs tool errors in structured JSON format
 * Can be piped to external log sinks (Datadog, Sentry, etc.)
 */
export function logToolError(error: ToolErrorResponse, durationMs?: number): void {
  logError(error.technicalMessage ?? error.message, {
    source: "mcp-reliability",
    toolName: error.toolName,
    errorCode: error.code,
    retryable: error.retryable,
    durationMs,
    details: error.details ?? {},
  });
  
  // Keep the old JSON.stringify for backward compatibility (can be removed later)
  console.error(
    JSON.stringify({
      source: "mcp-tool",
      level: "error",
      tool: error.toolName,
      code: error.code,
      retryable: error.retryable,
      duration_ms: durationMs,
      details: error.details ?? null,
      message: error.technicalMessage ?? error.message,
      timestamp: new Date().toISOString(),
    })
  );
}

// ============================================================================
// FETCH WITH TIMEOUT HELPER
// ============================================================================

/**
 * Convenience wrapper for fetch() with timeout and AbortController
 * Use this for external API calls instead of raw fetch()
 * 
 * @example
 * ```typescript
 * const response = await fetchWithTimeout(
 *   "https://api.example.com/data",
 *   {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ query: "test" }),
 *   },
 *   5000 // 5 second timeout
 * );
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const abortController = new AbortController();
  
  const fetchPromise = fetch(url, {
    ...options,
    signal: abortController.signal,
  });

  return withTimeout(fetchPromise, timeoutMs, abortController);
}

// ============================================================================
// UTILITY: CREATE SUCCESS RESULT
// ============================================================================

/**
 * Helper to create a successful ToolResult
 * Useful for consistency when not using withToolReliability
 */
export function createSuccessResult<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

/**
 * Helper to create a failed ToolResult
 * Useful for manual error creation
 */
export function createErrorResult(
  toolName: string,
  code: ToolErrorCode,
  message?: string,
  details?: Record<string, any>
): ToolResult<never> {
  return {
    ok: false,
    error: {
      code,
      message: message || DEFAULT_USER_MESSAGES[code],
      toolName,
      retryable: code === "TIMEOUT" || code === "NETWORK_ERROR" || code === "UPSTREAM_5XX",
      details,
    },
  };
}
