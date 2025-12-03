/**
 * GDPR Data Export Endpoint
 * Allows users to export all their personal data
 */

import { createEdgeFunction } from '../_shared/monitoring/middleware.ts';
import { Logger } from '../_shared/monitoring/Logger.ts';
import { ErrorHandler, ValidationError, AuthenticationError } from '../_shared/errors/ErrorHandler.ts';

interface ExportRequest {
  user_id: string;
  format?: 'json' | 'csv';
}

interface UserData {
  user_profile: any;
  weight_entries: any[];
  meal_logs: any[];
  orders: any[];
  preferences: any;
  created_at: string;
  updated_at: string;
}

async function handler(req: Request, logger: Logger): Promise<Response> {
  if (req.method !== 'POST') {
    throw new ValidationError('Method not allowed');
  }

  const body: ExportRequest = await req.json();
  
  // Validate required fields
  ErrorHandler.validateRequired(body, ['user_id']);
  
  const { user_id, format = 'json' } = body;
  
  logger.info('GDPR data export requested', { user_id, format });
  
  // TODO: Verify user authentication
  // const authUserId = extractUserIdFromToken(req);
  // if (authUserId !== user_id) {
  //   throw new AuthorizationError('Cannot export data for other users');
  // }
  
  try {
    // Collect all user data from various tables
    const userData: UserData = {
      user_profile: await getUserProfile(user_id),
      weight_entries: await getWeightEntries(user_id),
      meal_logs: await getMealLogs(user_id),
      orders: await getOrders(user_id),
      preferences: await getUserPreferences(user_id),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    logger.info('User data collected', {
      user_id,
      weight_entries: userData.weight_entries.length,
      meal_logs: userData.meal_logs.length,
      orders: userData.orders.length,
    });
    
    // Format data based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(userData);
      
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user_data_${user_id}_${Date.now()}.csv"`,
        },
      });
    } else {
      // JSON format
      return new Response(JSON.stringify(userData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user_data_${user_id}_${Date.now()}.json"`,
        },
      });
    }
  } catch (error) {
    logger.error('Failed to export user data', error as Error, { user_id });
    throw error;
  }
}

/**
 * Get user profile data
 */
async function getUserProfile(userId: string): Promise<any> {
  // TODO: Implement actual database query
  return {
    id: userId,
    email: 'user@example.com',
    name: 'User Name',
    created_at: '2024-01-01T00:00:00Z',
  };
}

/**
 * Get weight entries
 */
async function getWeightEntries(userId: string): Promise<any[]> {
  // TODO: Implement actual database query
  return [];
}

/**
 * Get meal logs
 */
async function getMealLogs(userId: string): Promise<any[]> {
  // TODO: Implement actual database query
  return [];
}

/**
 * Get orders
 */
async function getOrders(userId: string): Promise<any[]> {
  // TODO: Implement actual database query
  return [];
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId: string): Promise<any> {
  // TODO: Implement actual database query
  return {};
}

/**
 * Convert user data to CSV format
 */
function convertToCSV(userData: UserData): string {
  const lines: string[] = [];
  
  // User profile
  lines.push('=== USER PROFILE ===');
  lines.push('Field,Value');
  Object.entries(userData.user_profile).forEach(([key, value]) => {
    lines.push(`${key},"${value}"`);
  });
  lines.push('');
  
  // Weight entries
  lines.push('=== WEIGHT ENTRIES ===');
  if (userData.weight_entries.length > 0) {
    const headers = Object.keys(userData.weight_entries[0]);
    lines.push(headers.join(','));
    userData.weight_entries.forEach(entry => {
      lines.push(headers.map(h => `"${entry[h]}"`).join(','));
    });
  }
  lines.push('');
  
  // Meal logs
  lines.push('=== MEAL LOGS ===');
  if (userData.meal_logs.length > 0) {
    const headers = Object.keys(userData.meal_logs[0]);
    lines.push(headers.join(','));
    userData.meal_logs.forEach(entry => {
      lines.push(headers.map(h => `"${entry[h]}"`).join(','));
    });
  }
  lines.push('');
  
  // Orders
  lines.push('=== ORDERS ===');
  if (userData.orders.length > 0) {
    const headers = Object.keys(userData.orders[0]);
    lines.push(headers.join(','));
    userData.orders.forEach(entry => {
      lines.push(headers.map(h => `"${entry[h]}"`).join(','));
    });
  }
  
  return lines.join('\n');
}

// Export with monitoring
Deno.serve(
  createEdgeFunction(handler, {
    functionName: 'gdpr_export',
    enableCORS: true,
    enableRateLimit: true,
    rateLimitConfig: {
      maxRequests: 10, // Limited to prevent abuse
      windowMs: 3600000, // 1 hour
    },
  })
);
