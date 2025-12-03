/**
 * Utility Tools for TheLoopGPT MCP
 * Health checks and usage statistics
 */

import { HealthCheckSchema, UsageStatsSchema, type HealthCheck, type UsageStats } from "./shared/schemas.ts";
import { getOpenAIClient } from "../config/openai.ts";
import { ENV, validateEnv } from "../config/env.ts";
import { getUserUsage } from "./shared/rateLimit.ts";
import { getMetricsSummary } from "./shared/metrics.ts";
import { logInfo } from "./shared/logging.ts";

/**
 * Health check - verify all services are available
 */
export async function healthCheck(): Promise<HealthCheck> {
  const services: Record<string, { available: boolean; latencyMs?: number; error?: string }> = {};
  
  // Check environment variables
  const envCheck = validateEnv();
  services.environment = {
    available: envCheck.valid,
    error: envCheck.valid ? undefined : `Missing: ${envCheck.missing.join(', ')}`
  };
  
  // Check OpenAI
  try {
    const start = Date.now();
    const client = getOpenAIClient();
    await client.models.list(); // Simple API call to verify connectivity
    services.openai = {
      available: true,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    services.openai = {
      available: false,
      error: (err as Error).message
    };
  }
  
  // Check Supabase (via cache test)
  try {
    const start = Date.now();
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(ENV.SUPABASE_URL, ENV.SERVICE_ROLE_KEY);
    await supabase.from("tool_cache").select("key").limit(1);
    services.supabase = {
      available: true,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    services.supabase = {
      available: false,
      error: (err as Error).message
    };
  }
  
  // Determine overall status
  const allAvailable = Object.values(services).every(s => s.available);
  const someAvailable = Object.values(services).some(s => s.available);
  
  const status: "healthy" | "degraded" | "unhealthy" = 
    allAvailable ? "healthy" :
    someAvailable ? "degraded" :
    "unhealthy";
  
  const healthCheck: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    services
  };
  
  logInfo("Health check completed", { status, services });
  
  return healthCheck;
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(params: { userId: string; period?: "hour" | "day" | "week" | "month" }): Promise<UsageStats> {
  const { userId, period = "hour" } = params;
  
  // Get rate limit info
  const usage = await getUserUsage(userId);
  
  if (!usage) {
    // No usage data - return defaults
    return {
      userId,
      period,
      requestCount: 0,
      remainingQuota: ENV.RATE_LIMIT_MAX_REQUESTS,
      resetAt: new Date(Date.now() + ENV.RATE_LIMIT_WINDOW_MS).toISOString()
    };
  }
  
  const stats: UsageStats = {
    userId,
    period,
    requestCount: usage.requestCount,
    remainingQuota: usage.remainingQuota,
    resetAt: usage.resetAt
  };
  
  logInfo("Usage stats retrieved", { userId, stats });
  
  return stats;
}

/**
 * Get system-wide metrics (for admin/debugging)
 */
export function getSystemMetrics() {
  return getMetricsSummary();
}
