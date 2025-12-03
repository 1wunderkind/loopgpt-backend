/**
 * Monitoring Middleware
 * Comprehensive middleware combining logging, error handling, metrics, and Sentry
 */

import { Logger, withLogging } from './Logger.ts';
import { ErrorHandler } from '../errors/ErrorHandler.ts';
import { withSentry } from './Sentry.ts';
import { withMetrics } from './Metrics.ts';

/**
 * Complete monitoring middleware
 * Combines logging, error handling, metrics, and Sentry
 */
export function withMonitoring(
  handler: (req: Request, logger: Logger) => Promise<Response>,
  functionName: string
): (req: Request) => Promise<Response> {
  // Wrap with logging first (innermost)
  const withLog = withLogging(handler, functionName);

  // Then error handling
  const withErrors = async (req: Request): Promise<Response> => {
    try {
      return await withLog(req);
    } catch (error) {
      return ErrorHandler.handleError(error);
    }
  };

  // Then Sentry
  const withSentryTracking = withSentry(withErrors);

  // Finally metrics (outermost)
  const withMetricsTracking = withMetrics(withSentryTracking, functionName);

  return withMetricsTracking;
}

/**
 * Simplified monitoring for functions that don't need logger parameter
 */
export function withSimpleMonitoring(
  handler: (req: Request) => Promise<Response>,
  functionName: string
): (req: Request) => Promise<Response> {
  const wrappedHandler = async (req: Request, logger: Logger): Promise<Response> => {
    return await handler(req);
  };

  return withMonitoring(wrappedHandler, functionName);
}

/**
 * CORS middleware
 */
export function withCORS(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle actual request
    const response = await handler(req);

    // Add CORS headers
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  options: {
    maxRequests: number;
    windowMs: number;
  }
): (req: Request) => Promise<Response> {
  const requests = new Map<string, number[]>();

  return async (req: Request): Promise<Response> => {
    // Get client identifier (IP or user ID)
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    // Get request timestamps for this client
    const timestamps = requests.get(clientId) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(
      (ts) => now - ts < options.windowMs
    );

    // Check if rate limit exceeded
    if (validTimestamps.length >= options.maxRequests) {
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(options.windowMs / 1000)),
          },
        }
      );
    }

    // Add current timestamp
    validTimestamps.push(now);
    requests.set(clientId, validTimestamps);

    // Process request
    return await handler(req);
  };
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (req: Request, userId: string) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Missing authorization header',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user ID from token (simplified - in production, verify JWT)
    const userId = authHeader.split('_')[1] || 'unknown';

    return await handler(req, userId);
  };
}

/**
 * Request validation middleware
 */
export function withValidation<T>(
  handler: (req: Request, body: T) => Promise<Response>,
  validator: (body: any) => T
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const validated = validator(body);
      return await handler(req, validated);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Invalid request body',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(
  ...middlewares: Array<(handler: any) => any>
): (handler: any) => any {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Example: Complete edge function with all middleware
 */
export function createEdgeFunction(
  handler: (req: Request, logger: Logger) => Promise<Response>,
  options: {
    functionName: string;
    enableCORS?: boolean;
    enableRateLimit?: boolean;
    rateLimitConfig?: {
      maxRequests: number;
      windowMs: number;
    };
  }
): (req: Request) => Promise<Response> {
  let wrappedHandler = withMonitoring(handler, options.functionName);

  if (options.enableCORS) {
    wrappedHandler = withCORS(wrappedHandler);
  }

  if (options.enableRateLimit) {
    wrappedHandler = withRateLimit(wrappedHandler, options.rateLimitConfig || {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    });
  }

  return wrappedHandler;
}
