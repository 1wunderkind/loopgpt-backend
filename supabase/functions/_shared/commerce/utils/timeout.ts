/**
 * Timeout Utilities
 * Helper functions for adding timeouts to async operations
 */

import { ProviderTimeoutError } from '../types/index.ts';
import type { ProviderId } from '../types/index.ts';

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param providerId - Provider ID for error reporting (optional)
 * @returns The promise result or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  providerId?: ProviderId
): Promise<T> {
  let timeoutHandle: number;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      if (providerId) {
        reject(new ProviderTimeoutError(providerId, timeoutMs));
      } else {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Wrap multiple promises with individual timeouts
 * Returns settled results (both fulfilled and rejected)
 */
export async function withTimeouts<T>(
  promises: Array<{ promise: Promise<T>; timeoutMs: number; id?: string }>,
): Promise<PromiseSettledResult<T>[]> {
  const wrappedPromises = promises.map(({ promise, timeoutMs, id }) =>
    withTimeout(promise, timeoutMs, id as ProviderId)
  );

  return Promise.allSettled(wrappedPromises);
}
