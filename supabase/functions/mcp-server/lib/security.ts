/**
 * Security Middleware
 *
 * Central enforcement point for:
 * - Rate limiting
 * - Input validation
 * - Authentication/authorization
 * - Payload size limits
 *
 * Part of: Step 5 - Security Hardening
 */

import type { ToolErrorResponse } from "./reliability.ts";
import {
  checkRateLimits,
  extractClientIp,
  type RateLimitContext,
} from "./rateLimit.ts";
import { getRulesForTool } from "../config/rateLimits.ts";
import { validateAccess } from "../config/toolAccess.ts";
import {
  formatValidationErrors,
  isPayloadTooLarge,
  validateToolInput,
} from "./validation.ts";
import { redact } from "./redact.ts";
import { logError, logInfo, logWarn } from "./logger.ts";

// ============================================================================
// Types
// ============================================================================

export interface SecurityCheckContext {
  toolName: string;
  userId?: string;
  clientIp?: string;
  isServiceRole: boolean;
  requestBody: any;
}

export interface SecurityCheckResult {
  allowed: boolean;
  error?: ToolErrorResponse;
}

// ============================================================================
// Central Security Enforcement
// ============================================================================

/**
 * Perform all security checks before executing a tool
 *
 * Checks in order:
 * 1. Payload size limit
 * 2. Rate limiting
 * 3. Input validation
 * 4. Authentication/authorization
 *
 * Returns error on first failure, or success if all pass.
 *
 * @param ctx - Security check context
 * @returns Security check result
 */
export async function performSecurityChecks(
  ctx: SecurityCheckContext,
): Promise<SecurityCheckResult> {
  // ========================================================================
  // 1. Authentication/Authorization Check
  // ========================================================================

  const accessCheck = validateAccess(
    ctx.toolName,
    ctx.userId,
    ctx.isServiceRole,
  );

  if (!accessCheck.allowed) {
    logWarn("Tool access denied", {
      source: "security",
      toolName: ctx.toolName,
      userId: ctx.userId,
      reason: accessCheck.reason,
    });

    return {
      allowed: false,
      error: {
        code: "UNAUTHORIZED",
        message: accessCheck.reason || "Please sign in to use this feature.",
        toolName: ctx.toolName,
        retryable: false,
        details: {
          requiresAuth: true,
        },
      },
    };
  }

  // ========================================================================
  // 2. Rate Limiting Check
  // ========================================================================

  const rateLimitCtx: RateLimitContext = {
    toolName: ctx.toolName,
    userId: ctx.userId,
    clientIp: ctx.clientIp,
  };

  const rules = getRulesForTool(ctx.toolName, ctx.userId);
  const rateLimitDecision = await checkRateLimits(rateLimitCtx, rules);

  if (rateLimitDecision && !rateLimitDecision.allowed) {
    logWarn("Rate limit exceeded", {
      source: "security",
      toolName: ctx.toolName,
      userId: ctx.userId,
      clientIp: ctx.clientIp,
      rule: rateLimitDecision.rule.name,
      resetAt: rateLimitDecision.resetAt.toISOString(),
    });

    return {
      allowed: false,
      error: {
        code: "RATE_LIMITED",
        message: "You're doing that too often. Please try again in a bit.",
        toolName: ctx.toolName,
        retryable: true,
        details: {
          rule: rateLimitDecision.rule.name,
          resetAt: rateLimitDecision.resetAt.toISOString(),
          remaining: rateLimitDecision.remaining,
          limit: rateLimitDecision.rule.max,
          window: rateLimitDecision.rule.window,
        },
      },
    };
  }

  // ========================================================================
  // 3. Input Validation Check
  // ========================================================================

  const validationResult = validateToolInput(ctx.toolName, ctx.requestBody);

  if (validationResult && !validationResult.success) {
    const errorMessage = formatValidationErrors(validationResult.errors || []);

    logWarn("Input validation failed", {
      source: "security",
      toolName: ctx.toolName,
      errors: validationResult.errors,
    });

    return {
      allowed: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Invalid input: ${errorMessage}`,
        toolName: ctx.toolName,
        retryable: false,
        details: {
          validationErrors: validationResult.errors?.slice(0, 5), // Max 5 errors
        },
      },
    };
  }

  // ========================================================================
  // All checks passed
  // ========================================================================

  logInfo("Security checks passed", {
    source: "security",
    toolName: ctx.toolName,
    userId: ctx.userId,
    clientIp: ctx.clientIp,
  });

  return { allowed: true };
}

/**
 * Extract security context from HTTP request
 *
 * @param req - HTTP request
 * @param toolName - Tool name
 * @param userId - User ID (if authenticated)
 * @param isServiceRole - Whether caller has service role key
 * @returns Security check context
 */
export async function extractSecurityContext(
  req: Request,
  toolName: string,
  userId?: string,
  isServiceRole: boolean = false,
): Promise<SecurityCheckContext | { error: ToolErrorResponse }> {
  // Check payload size
  const tooLarge = await isPayloadTooLarge(req);

  if (tooLarge) {
    logWarn("Payload too large", {
      source: "security",
      toolName,
      contentLength: req.headers.get("content-length"),
    });

    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request too large. Maximum payload size is 256 KB.",
        toolName,
        retryable: false,
        details: {
          maxSize: "256 KB",
        },
      },
    };
  }

  // Extract client IP
  const clientIp = extractClientIp(req);

  // Parse request body
  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch (error) {
    logError("Failed to parse request body", {
      source: "security",
      toolName,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON in request body.",
        toolName,
        retryable: false,
      },
    };
  }

  return {
    toolName,
    userId,
    clientIp,
    isServiceRole,
    requestBody,
  };
}

/**
 * Create error response for security violations
 *
 * Ensures error response follows standard format and is safe to return
 *
 * @param error - Tool error response
 * @returns Redacted error response
 */
export function createSecurityErrorResponse(error: ToolErrorResponse): any {
  // Redact any sensitive data in error details
  const redactedDetails = error.details ? redact(error.details) : undefined;

  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      toolName: error.toolName,
      retryable: error.retryable,
      details: redactedDetails,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  performSecurityChecks,
  extractSecurityContext,
  createSecurityErrorResponse,
};
