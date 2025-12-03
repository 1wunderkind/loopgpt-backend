/**
 * Unified Middleware Application Utility
 * Applies rate limiting, request size limits, and security headers to edge functions
 */

import { RateLimiter, RateLimitPresets } from './RateLimiter.ts';
import {
  addSecurityHeaders,
  getUserIdentifier as getSecurityUserIdentifier,
} from './SecurityMiddleware.ts';

/**
 * Get user identifier for rate limiting
 */
function getUserIdentifier(req: Request): string {
  return getSecurityUserIdentifier(req);
}

export type FunctionCategory =
  | 'api-standard'
  | 'api-search'
  | 'api-order'
  | 'heavy'
  | 'webhook'
  | 'system'
  | 'compliance';

export interface MiddlewareConfig {
  category: FunctionCategory;
  maxRequestSize?: number; // in bytes, default 10MB
  skipRateLimit?: boolean;
  skipSizeLimit?: boolean;
  skipSecurityHeaders?: boolean;
}

/**
 * Get rate limiter for category
 */
function getRateLimiterForCategory(category: FunctionCategory): RateLimiter | null {
  switch (category) {
    case 'api-standard':
      return new RateLimiter(RateLimitPresets.api);
    case 'api-search':
      return new RateLimiter({ maxRequests: 30, windowMs: 60 * 1000 });
    case 'api-order':
      return new RateLimiter(RateLimitPresets.expensive);
    case 'heavy':
      return new RateLimiter({ maxRequests: 20, windowMs: 60 * 1000 });
    case 'compliance':
      return new RateLimiter({ maxRequests: 5, windowMs: 60 * 60 * 1000 }); // 5 per hour
    case 'system':
      return new RateLimiter(RateLimitPresets.readOnly);
    case 'webhook':
      return null; // No rate limiting for webhooks
    default:
      return new RateLimiter(RateLimitPresets.api);
  }
}

/**
 * Check request size
 */
function checkRequestSize(req: Request, maxSize: number): Response | null {
  const contentLength = parseInt(req.headers.get('content-length') || '0');

  if (contentLength > maxSize) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request body must be less than ${maxSize / 1024 / 1024}MB`,
          maxSize,
        },
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}

/**
 * Apply all middleware to a handler function
 */
export function withMiddleware(
  handler: (req: Request) => Promise<Response>,
  config: MiddlewareConfig
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      // 1. Check request size
      if (!config.skipSizeLimit) {
        const maxSize = config.maxRequestSize || 10 * 1024 * 1024; // 10MB default
        const sizeError = checkRequestSize(req, maxSize);
        if (sizeError) {
          return addSecurityHeaders(sizeError);
        }
      }

      // 2. Check rate limit
      if (!config.skipRateLimit) {
        const rateLimiter = getRateLimiterForCategory(config.category);

        if (rateLimiter) {
          const identifier = getUserIdentifier(req);
          const result = rateLimiter.check(identifier);

          if (!result.allowed) {
            const response = new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests. Please try again later.',
                  retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                },
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Limit': rateLimiter.config.maxRequests.toString(),
                  'X-RateLimit-Remaining': result.remaining.toString(),
                  'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
                  'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
                },
              }
            );

            return addSecurityHeaders(response);
          }

          // Add rate limit headers to successful response later
        }
      }

      // 3. Execute handler
      const response = await handler(req);

      // 4. Add security headers
      if (!config.skipSecurityHeaders) {
        return addSecurityHeaders(response);
      }

      return response;
    } catch (error) {
      // Error handling
      console.error('Middleware error:', error);

      const errorResponse = new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return addSecurityHeaders(errorResponse);
    }
  };
}

/**
 * Convenience wrappers for common categories
 */

export function withStandardAPI(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'api-standard' });
}

export function withSearchAPI(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'api-search' });
}

export function withOrderAPI(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'api-order' });
}

export function withHeavyOperation(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'heavy' });
}

export function withWebhook(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, {
    category: 'webhook',
    skipRateLimit: true, // Webhooks don't need rate limiting
  });
}

export function withSystemAPI(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'system' });
}

export function withComplianceAPI(handler: (req: Request) => Promise<Response>) {
  return withMiddleware(handler, { category: 'compliance' });
}
