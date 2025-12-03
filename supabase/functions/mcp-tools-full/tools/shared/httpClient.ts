/**
 * Resilient HTTP Client for TheLoopGPT MCP Tools
 * Automatic retries with exponential backoff
 */

import { ExternalApiError } from "./errors.ts";
import { logWarn, logError } from "./logging.ts";

interface FetchOptions extends RequestInit {
  retries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
}

/**
 * Fetch with automatic retries and timeout
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 2,
    timeoutMs = 30000,
    retryDelayMs = 200,
    ...fetchOptions
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalApiError(
          `HTTP ${response.status} from ${url}`,
          new URL(url).hostname,
          response.status
        );
      }

      return response;
    } catch (err: any) {
      lastError = err;

      // Don't retry on 4xx errors (client errors)
      if (err instanceof ExternalApiError && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
        throw err;
      }

      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt); // Exponential backoff
        logWarn(`HTTP request failed, retrying in ${delay}ms`, {
          url,
          attempt: attempt + 1,
          maxRetries: retries,
          error: err.message,
        });
        await sleep(delay);
      }
    }
  }

  logError("HTTP request failed after all retries", {
    url,
    retries,
    error: lastError?.message,
  });

  throw lastError;
}

/**
 * Fetch JSON with automatic parsing
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await safeFetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return await response.json() as T;
}

/**
 * POST JSON with automatic retries
 */
export async function safePostJson<T = any>(
  url: string,
  body: any,
  options: FetchOptions = {}
): Promise<T> {
  return await safeFetchJson<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
