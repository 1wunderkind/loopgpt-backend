/**
 * Rate Limiter Module
 * Enforces per-user/IP rate limits.
 */

import { Logger } from "../monitoring/Logger.ts";
import { AppError } from "../errors/ErrorHandler.ts";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  "quotes": { windowMs: 60000, maxRequests: 10 }, // 10 per min
  "order": { windowMs: 60000, maxRequests: 3 },   // 3 per min
  "ai_tool": { windowMs: 60000, maxRequests: 20 }, // 20 per min
  "default": { windowMs: 60000, maxRequests: 30 }
};

// In-memory store for simulation (Edge Functions are stateless, so real impl needs Redis/DB)
// This is a "best effort" local limit for the active instance.
const REQUEST_COUNTS: Map<string, { count: number; resetTime: number }> = new Map();

export class RateLimiter {
  static checkLimit(
    key: string, // userId or IP
    type: keyof typeof LIMITS,
    logger: Logger
  ): void {
    const config = LIMITS[type] || LIMITS["default"];
    const now = Date.now();
    const record = REQUEST_COUNTS.get(key);

    if (!record || now > record.resetTime) {
      REQUEST_COUNTS.set(key, { count: 1, resetTime: now + config.windowMs });
      return;
    }

    if (record.count >= config.maxRequests) {
      logger.warn("Rate limit exceeded", { key, type, limit: config.maxRequests });
      throw new AppError(
        "Too many requests. Please try again later.",
        "RATE_LIMIT_EXCEEDED",
        429,
        "RATE_LIMIT"
      );
    }

    record.count++;
  }
}
