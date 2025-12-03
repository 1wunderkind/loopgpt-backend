/**
 * Health Check Endpoint
 * System health and status monitoring
 */

import { createEdgeFunction } from '../_shared/monitoring/middleware.ts';
import { Logger } from '../_shared/monitoring/Logger.ts';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
    external_apis: HealthCheckResult;
    memory: HealthCheckResult;
  };
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration_ms?: number;
}

const startTime = Date.now();

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Simple database check - in production, use actual Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      return {
        status: 'fail',
        message: 'Database configuration missing',
        duration_ms: Date.now() - start,
      };
    }

    return {
      status: 'pass',
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database check failed',
      duration_ms: Date.now() - start,
    };
  }
}

async function checkExternalAPIs(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Check if external API keys are configured
    const hasInstacart = !!Deno.env.get('INSTACART_API_KEY');
    const hasMealMe = !!Deno.env.get('MEALME_API_KEY');

    if (!hasInstacart && !hasMealMe) {
      return {
        status: 'warn',
        message: 'No external API keys configured',
        duration_ms: Date.now() - start,
      };
    }

    return {
      status: 'pass',
      message: `${hasInstacart ? 'Instacart' : ''}${hasInstacart && hasMealMe ? ', ' : ''}${hasMealMe ? 'MealMe' : ''} configured`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'API check failed',
      duration_ms: Date.now() - start,
    };
  }
}

function checkMemory(): HealthCheckResult {
  const start = Date.now();

  try {
    // Deno memory usage
    const memoryUsage = Deno.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 90) {
      return {
        status: 'fail',
        message: `High memory usage: ${usagePercent.toFixed(1)}%`,
        duration_ms: Date.now() - start,
      };
    }

    if (usagePercent > 75) {
      return {
        status: 'warn',
        message: `Elevated memory usage: ${usagePercent.toFixed(1)}%`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      status: 'pass',
      message: `Memory usage: ${usagePercent.toFixed(1)}%`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Memory check failed',
      duration_ms: Date.now() - start,
    };
  }
}

async function handler(req: Request, logger: Logger): Promise<Response> {
  logger.info('Health check requested');

  // Run all health checks
  const [database, external_apis, memory] = await Promise.all([
    checkDatabase(),
    checkExternalAPIs(),
    checkMemory(),
  ]);

  // Determine overall status
  const checks = { database, external_apis, memory };
  const hasFailure = Object.values(checks).some((c) => c.status === 'fail');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warn');

  const status: HealthStatus = {
    status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: Deno.env.get('APP_VERSION') || '1.0.0',
    checks,
  };

  const statusCode = status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503;

  return new Response(JSON.stringify(status, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// Export with monitoring middleware
Deno.serve(
  createEdgeFunction(handler, {
    functionName: 'health',
    enableCORS: true,
  })
);
