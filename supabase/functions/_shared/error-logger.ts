// ============================================================================
// Error Logger Utility
// Purpose: Centralized error logging for all Edge Functions
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Logs an error to the error_logs table
 */
export async function logError(
  toolName: string,
  error: Error | string,
  context?: any
): Promise<void> {
  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'string' ? null : error.stack;
    
    await supabase.from('error_logs').insert({
      tool_name: toolName,
      error_message: errorMessage,
      stack_trace: stackTrace,
      context: context || {},
      timestamp: new Date().toISOString()
    });
    
    // Also log to console for immediate visibility
    console.error(`[ERROR] ${toolName}:`, errorMessage);
    if (stackTrace) {
      console.error('Stack trace:', stackTrace);
    }
    if (context) {
      console.error('Context:', JSON.stringify(context, null, 2));
    }
  } catch (loggingError) {
    // If logging fails, at least log to console
    console.error('[ERROR] Failed to log error to database:', loggingError);
    console.error('[ERROR] Original error:', error);
  }
}

/**
 * Logs a tool call to the tool_calls table
 */
export async function logToolCall(
  userId: string | null,
  toolName: string,
  parameters: any,
  success: boolean,
  errorMessage?: string,
  durationMs?: number
): Promise<void> {
  try {
    await supabase.from('tool_calls').insert({
      user_id: userId,
      tool_name: toolName,
      parameters: parameters || {},
      success,
      error_message: errorMessage || null,
      duration_ms: durationMs || null,
      called_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] Failed to log tool call:', error);
  }
}

/**
 * Logs a user event to the user_events table
 */
export async function logUserEvent(
  userId: string,
  eventName: string,
  eventData?: any
): Promise<void> {
  try {
    await supabase.from('user_events').insert({
      user_id: userId,
      event_name: eventName,
      event_data: eventData || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] Failed to log user event:', error);
  }
}

/**
 * Logs an affiliate click to the affiliate_performance table
 */
export async function logAffiliateClick(
  userId: string,
  countryCode: string,
  partnerName: string,
  category: string,
  journeyName?: string
): Promise<void> {
  try {
    await supabase.from('affiliate_performance').insert({
      user_id: userId,
      country_code: countryCode,
      partner_name: partnerName,
      category,
      journey_name: journeyName || null,
      link_clicked: true,
      clicked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] Failed to log affiliate click:', error);
  }
}

/**
 * Wraps a function with error logging
 */
export function withErrorLogging<T>(
  toolName: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error) => {
    logError(toolName, error);
    throw error;
  });
}
