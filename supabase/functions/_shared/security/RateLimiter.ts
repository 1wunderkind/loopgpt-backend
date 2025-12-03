/**
 * Rate Limiting System
 * Prevent abuse and DDoS attacks
 */

import { Logger } from '../monitoring/Logger.ts';

const logger = new Logger('RateLimiter');

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: (req: Request) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), config.windowMs);
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      time => now - time < this.config.windowMs
    );

    // Check if limit exceeded
    const allowed = validRequests.length < this.config.maxRequests;

    if (allowed) {
      // Add new request
      validRequests.push(now);
      this.requests.set(identifier, validRequests);
    }

    const remaining = Math.max(0, this.config.maxRequests - validRequests.length);
    const oldestRequest = validRequests[0] || now;
    const resetTime = oldestRequest + this.config.windowMs;

    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        identifier,
        requests: validRequests.length,
        limit: this.config.maxRequests,
      });
    }

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        time => now - time < this.config.windowMs
      );

      if (validRequests.length === 0) {
        this.requests.delete(identifier);
        cleaned++;
      } else {
        this.requests.set(identifier, validRequests);
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { cleaned });
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current request count
   */
  getCount(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    return requests.filter(
      time => now - time < this.config.windowMs
    ).length;
  }
}

/**
 * Rate limit middleware
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    // Get identifier (IP address, user ID, etc.)
    const identifier = config.identifier
      ? config.identifier(req)
      : req.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    const result = limiter.check(identifier);

    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      // Rate limit exceeded
      headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.resetTime,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      );
    }

    // Continue to next middleware
    const response = await next();

    // Add rate limit headers to response
    for (const [key, value] of headers) {
      response.headers.set(key, value);
    }

    return response;
  };
}

/**
 * Predefined rate limit configs
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },

  /**
   * Standard rate limit for API endpoints
   * 100 requests per minute
   */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },

  /**
   * Generous rate limit for read-only endpoints
   * 300 requests per minute
   */
  readOnly: {
    maxRequests: 300,
    windowMs: 60 * 1000,
  },

  /**
   * Strict rate limit for expensive operations
   * 10 requests per minute
   */
  expensive: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
};

/**
 * Global rate limiters
 */
export const authLimiter = new RateLimiter(RateLimitPresets.auth);
export const apiLimiter = new RateLimiter(RateLimitPresets.api);
export const readOnlyLimiter = new RateLimiter(RateLimitPresets.readOnly);
export const expensiveLimiter = new RateLimiter(RateLimitPresets.expensive);
