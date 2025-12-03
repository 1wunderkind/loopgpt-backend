/**
 * Security Middleware
 * Security headers, request validation, and protection
 */

import { Logger } from '../monitoring/Logger.ts';

const logger = new Logger('SecurityMiddleware');

/**
 * Security headers
 */
export const SecurityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
  ].join('; '),

  // HTTPS only (31536000 = 1 year)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(SecurityHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    return addSecurityHeaders(response);
  };
}

/**
 * Request size limit middleware
 */
export function requestSizeLimitMiddleware(maxSizeBytes: number = 10 * 1024 * 1024) {
  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    const contentLength = parseInt(req.headers.get('content-length') || '0');

    if (contentLength > maxSizeBytes) {
      logger.warn('Request too large', {
        contentLength,
        maxSize: maxSizeBytes,
        url: req.url,
      });

      return new Response(
        JSON.stringify({
          error: 'Request too large',
          message: `Request body must be less than ${maxSizeBytes / 1024 / 1024}MB`,
          maxSize: maxSizeBytes,
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return next();
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware(options?: {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options || {};

  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(origin) ? origin.join(', ') : origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': allowedHeaders.join(', '),
          'Access-Control-Expose-Headers': exposedHeaders.join(', '),
          'Access-Control-Allow-Credentials': credentials.toString(),
          'Access-Control-Max-Age': maxAge.toString(),
        },
      });
    }

    // Add CORS headers to response
    const response = await next();
    const headers = new Headers(response.headers);

    headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin);
    headers.set('Access-Control-Allow-Methods', methods.join(', '));
    headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    headers.set('Access-Control-Allow-Credentials', credentials.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Input sanitization
 */
export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate phone number (US format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?1?\d{10}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';

  const maskedLocal = local.length > 2
    ? local[0] + '***' + local[local.length - 1]
    : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone for logging
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';

  return '***-***-' + digits.slice(-4);
}

/**
 * Mask credit card for logging
 */
export function maskCreditCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (digits.length < 4) return '***';

  return '****-****-****-' + digits.slice(-4);
}

/**
 * IP-based rate limiting identifier
 */
export function getIpAddress(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * User-based rate limiting identifier
 */
export function getUserIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${getIpAddress(req)}`;
}

/**
 * Complete security middleware stack
 */
export function securityMiddlewareStack(options?: {
  maxRequestSize?: number;
  corsOrigin?: string | string[];
}) {
  return [
    securityHeadersMiddleware(),
    requestSizeLimitMiddleware(options?.maxRequestSize),
    corsMiddleware({ origin: options?.corsOrigin }),
  ];
}
