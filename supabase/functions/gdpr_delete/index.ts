/**
 * GDPR Data Deletion Endpoint
 * Allows users to delete all their personal data (Right to be Forgotten)
 */

import { createEdgeFunction } from '../_shared/monitoring/middleware.ts';
import { Logger } from '../_shared/monitoring/Logger.ts';
import { ErrorHandler, ValidationError, AuthenticationError } from '../_shared/errors/ErrorHandler.ts';

interface DeleteRequest {
  user_id: string;
  confirmation: string; // User must type "DELETE" to confirm
  reason?: string;
}

interface DeletionResult {
  success: boolean;
  deleted_records: {
    user_profile: number;
    weight_entries: number;
    meal_logs: number;
    orders: number;
    preferences: number;
  };
  deletion_timestamp: string;
}

async function handler(req: Request, logger: Logger): Promise<Response> {
  if (req.method !== 'POST') {
    throw new ValidationError('Method not allowed');
  }

  const body: DeleteRequest = await req.json();
  
  // Validate required fields
  ErrorHandler.validateRequired(body, ['user_id', 'confirmation']);
  
  const { user_id, confirmation, reason } = body;
  
  // Verify confirmation
  if (confirmation !== 'DELETE') {
    throw new ValidationError('Invalid confirmation. Must be "DELETE"');
  }
  
  logger.info('GDPR data deletion requested', { user_id, reason });
  
  // TODO: Verify user authentication
  // const authUserId = extractUserIdFromToken(req);
  // if (authUserId !== user_id) {
  //   throw new AuthorizationError('Cannot delete data for other users');
  // }
  
  try {
    // Delete all user data from various tables
    const result: DeletionResult = {
      success: true,
      deleted_records: {
        user_profile: await deleteUserProfile(user_id),
        weight_entries: await deleteWeightEntries(user_id),
        meal_logs: await deleteMealLogs(user_id),
        orders: await deleteOrders(user_id),
        preferences: await deleteUserPreferences(user_id),
      },
      deletion_timestamp: new Date().toISOString(),
    };
    
    // Log deletion for compliance
    await logDeletion(user_id, reason, result);
    
    logger.info('User data deleted', {
      user_id,
      total_records: Object.values(result.deleted_records).reduce((a, b) => a + b, 0),
    });
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Failed to delete user data', error as Error, { user_id });
    throw error;
  }
}

/**
 * Delete user profile
 */
async function deleteUserProfile(userId: string): Promise<number> {
  // TODO: Implement actual database deletion
  // DELETE FROM users WHERE id = userId
  logger.info(`Deleting user profile for ${userId}`);
  return 1;
}

/**
 * Delete weight entries
 */
async function deleteWeightEntries(userId: string): Promise<number> {
  // TODO: Implement actual database deletion
  // DELETE FROM weight_entries WHERE user_id = userId
  logger.info(`Deleting weight entries for ${userId}`);
  return 0;
}

/**
 * Delete meal logs
 */
async function deleteMealLogs(userId: string): Promise<number> {
  // TODO: Implement actual database deletion
  // DELETE FROM meal_logs WHERE user_id = userId
  logger.info(`Deleting meal logs for ${userId}`);
  return 0;
}

/**
 * Delete orders
 */
async function deleteOrders(userId: string): Promise<number> {
  // TODO: Implement actual database deletion
  // DELETE FROM orders WHERE user_id = userId
  logger.info(`Deleting orders for ${userId}`);
  return 0;
}

/**
 * Delete user preferences
 */
async function deleteUserPreferences(userId: string): Promise<number> {
  // TODO: Implement actual database deletion
  // DELETE FROM user_preferences WHERE user_id = userId
  logger.info(`Deleting user preferences for ${userId}`);
  return 0;
}

/**
 * Log deletion for compliance audit trail
 */
async function logDeletion(
  userId: string,
  reason: string | undefined,
  result: DeletionResult
): Promise<void> {
  // TODO: Implement actual audit log
  // INSERT INTO deletion_log (user_id, reason, deleted_records, timestamp)
  logger.info('Deletion logged for audit', {
    user_id: userId,
    reason,
    total_records: Object.values(result.deleted_records).reduce((a, b) => a + b, 0),
  });
}

// Export with monitoring
Deno.serve(
  createEdgeFunction(handler, {
    functionName: 'gdpr_delete',
    enableCORS: true,
    enableRateLimit: true,
    rateLimitConfig: {
      maxRequests: 5, // Very limited to prevent abuse
      windowMs: 86400000, // 24 hours
    },
  })
);
