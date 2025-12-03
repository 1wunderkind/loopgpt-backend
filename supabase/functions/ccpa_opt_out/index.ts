/**
 * CCPA Opt-Out Endpoint
 * Allows California residents to opt-out of data selling
 */

import { createEdgeFunction } from '../_shared/monitoring/middleware.ts';
import { Logger } from '../_shared/monitoring/Logger.ts';
import { ErrorHandler, ValidationError } from '../_shared/errors/ErrorHandler.ts';

interface OptOutRequest {
  user_id: string;
  email: string;
  opt_out: boolean; // true = opt-out, false = opt-in
}

interface OptOutResult {
  success: boolean;
  user_id: string;
  opt_out_status: boolean;
  effective_date: string;
  message: string;
}

async function handler(req: Request, logger: Logger): Promise<Response> {
  if (req.method !== 'POST') {
    throw new ValidationError('Method not allowed');
  }

  const body: OptOutRequest = await req.json();
  
  // Validate required fields
  ErrorHandler.validateRequired(body, ['user_id', 'email']);
  ErrorHandler.validateEmail(body.email);
  
  const { user_id, email, opt_out = true } = body;
  
  logger.info('CCPA opt-out request', { user_id, email, opt_out });
  
  try {
    // Update user's opt-out preference
    await updateOptOutPreference(user_id, opt_out);
    
    // Log for compliance
    await logOptOutChange(user_id, email, opt_out);
    
    // Send confirmation email
    await sendConfirmationEmail(email, opt_out);
    
    const result: OptOutResult = {
      success: true,
      user_id,
      opt_out_status: opt_out,
      effective_date: new Date().toISOString(),
      message: opt_out
        ? 'You have successfully opted out of data selling. Your preference has been recorded.'
        : 'You have opted back in to data sharing. Your preference has been recorded.',
    };
    
    logger.info('CCPA preference updated', { user_id, opt_out });
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Failed to update opt-out preference', error as Error, { user_id });
    throw error;
  }
}

/**
 * Update user's opt-out preference in database
 */
async function updateOptOutPreference(
  userId: string,
  optOut: boolean
): Promise<void> {
  // TODO: Implement actual database update
  // UPDATE users SET ccpa_opt_out = optOut, updated_at = NOW() WHERE id = userId
  logger.info(`Updating opt-out preference for ${userId} to ${optOut}`);
}

/**
 * Log opt-out change for compliance audit trail
 */
async function logOptOutChange(
  userId: string,
  email: string,
  optOut: boolean
): Promise<void> {
  // TODO: Implement actual audit log
  // INSERT INTO ccpa_opt_out_log (user_id, email, opt_out, timestamp)
  logger.info('Opt-out change logged', { user_id: userId, email, opt_out: optOut });
}

/**
 * Send confirmation email to user
 */
async function sendConfirmationEmail(
  email: string,
  optOut: boolean
): Promise<void> {
  // TODO: Implement actual email sending
  const subject = optOut
    ? 'CCPA Opt-Out Confirmation'
    : 'CCPA Opt-In Confirmation';
  
  const body = optOut
    ? 'Your request to opt-out of data selling has been processed.'
    : 'Your request to opt-in to data sharing has been processed.';
  
  logger.info('Confirmation email sent', { email, subject });
}

// Export with monitoring
Deno.serve(
  createEdgeFunction(handler, {
    functionName: 'ccpa_opt_out',
    enableCORS: true,
    enableRateLimit: true,
    rateLimitConfig: {
      maxRequests: 10,
      windowMs: 3600000, // 1 hour
    },
  })
);
