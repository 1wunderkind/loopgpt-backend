/**
 * Metrics Tracking for TheLoopGPT MCP Tools
 * Placeholder for future Prometheus/DataDog integration
 */

interface ToolMetrics {
  toolName: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  userId?: string;
  errorType?: string;
}

// In-memory metrics buffer (will be replaced with real metrics sink)
const metricsBuffer: ToolMetrics[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Record a tool call metric
 */
export function recordToolCall(
  toolName: string,
  success: boolean,
  durationMs: number,
  meta?: {
    userId?: string;
    errorType?: string;
  }
) {
  const metric: ToolMetrics = {
    toolName,
    success,
    durationMs,
    timestamp: new Date().toISOString(),
    userId: meta?.userId,
    errorType: meta?.errorType,
  };

  metricsBuffer.push(metric);

  // Prevent memory leak
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }

  // TODO: Send to metrics backend (Prometheus, DataDog, etc.)
}

/**
 * Get current metrics summary (for debugging)
 */
export function getMetricsSummary() {
  const total = metricsBuffer.length;
  const successful = metricsBuffer.filter(m => m.success).length;
  const failed = total - successful;

  const avgDuration = total > 0
    ? metricsBuffer.reduce((sum, m) => sum + m.durationMs, 0) / total
    : 0;

  const byTool = metricsBuffer.reduce((acc, m) => {
    if (!acc[m.toolName]) {
      acc[m.toolName] = { total: 0, success: 0, failed: 0 };
    }
    acc[m.toolName].total++;
    if (m.success) {
      acc[m.toolName].success++;
    } else {
      acc[m.toolName].failed++;
    }
    return acc;
  }, {} as Record<string, { total: number; success: number; failed: number }>);

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    avgDurationMs: Math.round(avgDuration),
    byTool,
  };
}

/**
 * Clear metrics buffer (for testing)
 */
export function clearMetrics() {
  metricsBuffer.length = 0;
}
