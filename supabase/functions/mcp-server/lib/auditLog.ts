/**
 * Security Audit Logging
 * 
 * Logs sensitive actions to analytics.security_audit_events table.
 * 
 * Events logged:
 * - Order confirmations/cancellations
 * - User goal updates
 * - Weight logging
 * - Profile updates
 * 
 * Features:
 * - Best-effort logging (never fails main operation)
 * - Automatic redaction of sensitive data
 * - Structured metadata
 * 
 * Part of: Step 5 - Security Hardening
 */

import { createClient } from "@supabase/supabase-js";
import { redact } from "./redact.ts";
import { logError, logDebug } from "./logger.ts";

// ============================================================================
// Types
// ============================================================================

export type SecurityEventType =
  | "ORDER_CONFIRMED"
  | "ORDER_CANCELLED"
  | "ORDER_FAILED"
  | "GOAL_UPDATED"
  | "GOAL_CREATED"
  | "WEIGHT_LOGGED"
  | "PROFILE_UPDATED"
  | "MEAL_LOGGED"
  | "AUTH_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED_ACCESS";

export interface AuditLogEntry {
  eventType: SecurityEventType;
  userId?: string;
  sessionId?: string;
  toolName?: string;
  clientIp?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log a security audit event
 * 
 * Best-effort: never throws, logs errors internally
 * 
 * @param entry - Audit log entry
 */
export async function logSecurityEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        db: { schema: "analytics" },
      }
    );
    
    // Redact sensitive data from metadata
    const redactedMetadata = entry.metadata ? redact(entry.metadata) : null;
    
    // Insert audit event
    const { error } = await supabase
      .from("security_audit_events")
      .insert({
        event_type: entry.eventType,
        user_id: entry.userId || null,
        session_id: entry.sessionId || null,
        tool_name: entry.toolName || null,
        client_ip: entry.clientIp || null,
        metadata: redactedMetadata,
      });
    
    if (error) {
      // Log error but don't throw (best-effort)
      logError("Failed to log security audit event", {
        source: "audit-log",
        eventType: entry.eventType,
        error: error.message,
      });
      return;
    }
    
    logDebug("Security audit event logged", {
      source: "audit-log",
      eventType: entry.eventType,
      userId: entry.userId,
      toolName: entry.toolName,
    });
  } catch (error) {
    // Catch all errors to prevent audit logging from breaking main flow
    logError("Unexpected error logging security audit event", {
      source: "audit-log",
      eventType: entry.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Log order confirmation event
 */
export async function logOrderConfirmed(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    orderId?: string;
    provider?: string;
    totalAmount?: number;
    restaurantName?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "ORDER_CONFIRMED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log order cancellation event
 */
export async function logOrderCancelled(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    orderId?: string;
    provider?: string;
    reason?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "ORDER_CANCELLED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log order failure event
 */
export async function logOrderFailed(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    orderId?: string;
    provider?: string;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "ORDER_FAILED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log user goal update event
 */
export async function logGoalUpdated(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    goalType?: string;
    previousValue?: any;
    newValue?: any;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "GOAL_UPDATED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log weight logging event
 */
export async function logWeightLogged(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    weight?: number;
    unit?: string;
    date?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "WEIGHT_LOGGED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log profile update event
 */
export async function logProfileUpdated(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    fieldsUpdated?: string[];
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "PROFILE_UPDATED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log meal logging event
 */
export async function logMealLogged(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    mealType?: string;
    calories?: number;
    timestamp?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "MEAL_LOGGED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log authentication failure event
 */
export async function logAuthFailed(
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    reason?: string;
    attemptedUserId?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "AUTH_FAILED",
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log rate limit exceeded event
 */
export async function logRateLimitExceeded(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    rule?: string;
    limit?: number;
    window?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "RATE_LIMIT_EXCEEDED",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

/**
 * Log unauthorized access attempt event
 */
export async function logUnauthorizedAccess(
  userId: string | undefined,
  toolName: string,
  clientIp: string | undefined,
  metadata: {
    reason?: string;
    requiredAccess?: string;
  }
): Promise<void> {
  await logSecurityEvent({
    eventType: "UNAUTHORIZED_ACCESS",
    userId,
    toolName,
    clientIp,
    metadata,
  });
}

// ============================================================================
// Tool-Specific Audit Helpers
// ============================================================================

/**
 * Check if a tool should trigger audit logging
 * 
 * @param toolName - Tool name
 * @returns true if tool requires audit logging
 */
export function shouldAuditTool(toolName: string): boolean {
  const AUDITED_TOOLS = [
    "confirm_order",
    "place_order",
    "cancel_order",
    "set_user_goals",
    "update_user_goals",
    "log_weight",
    "update_user_profile",
    "log_meal",
  ];
  
  return AUDITED_TOOLS.includes(toolName);
}

/**
 * Get audit event type for a tool
 * 
 * @param toolName - Tool name
 * @returns Event type or undefined
 */
export function getEventTypeForTool(toolName: string): SecurityEventType | undefined {
  const TOOL_TO_EVENT: Record<string, SecurityEventType> = {
    "confirm_order": "ORDER_CONFIRMED",
    "cancel_order": "ORDER_CANCELLED",
    "set_user_goals": "GOAL_UPDATED",
    "update_user_goals": "GOAL_UPDATED",
    "log_weight": "WEIGHT_LOGGED",
    "update_user_profile": "PROFILE_UPDATED",
    "log_meal": "MEAL_LOGGED",
  };
  
  return TOOL_TO_EVENT[toolName];
}

// ============================================================================
// Exports
// ============================================================================

export default {
  logSecurityEvent,
  logOrderConfirmed,
  logOrderCancelled,
  logOrderFailed,
  logGoalUpdated,
  logWeightLogged,
  logProfileUpdated,
  logMealLogged,
  logAuthFailed,
  logRateLimitExceeded,
  logUnauthorizedAccess,
  shouldAuditTool,
  getEventTypeForTool,
};
