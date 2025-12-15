/**
 * Billing & Quota Manager
 * Handles plan resolution, quota enforcement, and usage recording.
 */

import { Logger } from "../monitoring/Logger.ts";
import { AppError } from "../errors/ErrorHandler.ts";

export type PlanType = "free" | "pro" | "enterprise";

export interface PlanLimits {
  maxRequestsPerDay: number;
  maxTokensPerDay: number;
  orderingEnabled: boolean;
}

const PLAN_CONFIGS: Record<PlanType, PlanLimits> = {
  "free": {
    maxRequestsPerDay: 50,
    maxTokensPerDay: 10000,
    orderingEnabled: false
  },
  "pro": {
    maxRequestsPerDay: 500,
    maxTokensPerDay: 100000,
    orderingEnabled: true
  },
  "enterprise": {
    maxRequestsPerDay: 10000,
    maxTokensPerDay: 1000000,
    orderingEnabled: true
  }
};

// Mock DB interface for simulation
interface UsageRecord {
  requests: number;
  tokens: number;
}
const MOCK_USAGE_DB = new Map<string, UsageRecord>();
const MOCK_PLAN_DB = new Map<string, PlanType>();

export class BillingManager {
  
  static async getPlan(tenantId: string): Promise<PlanType> {
    // In real impl: SELECT plan_id FROM user_plans WHERE user_id = tenantId
    return MOCK_PLAN_DB.get(tenantId) || "free";
  }

  static async checkQuota(tenantId: string, plan: PlanType, logger: Logger): Promise<void> {
    const limits = PLAN_CONFIGS[plan];
    const usage = MOCK_USAGE_DB.get(tenantId) || { requests: 0, tokens: 0 };

    if (usage.requests >= limits.maxRequestsPerDay) {
      logger.warn("Daily request quota exceeded", { tenantId, plan, usage: usage.requests, limit: limits.maxRequestsPerDay });
      throw new AppError(
        "Daily request limit reached. Please upgrade your plan.",
        "QUOTA_EXCEEDED",
        429,
        "AUTH" // Or RATE_LIMIT
      );
    }
  }

  static async recordUsage(tenantId: string, tokens: number = 0): Promise<void> {
    const current = MOCK_USAGE_DB.get(tenantId) || { requests: 0, tokens: 0 };
    MOCK_USAGE_DB.set(tenantId, {
      requests: current.requests + 1,
      tokens: current.tokens + tokens
    });
  }

  // Helper for tests
  static _reset() {
    MOCK_USAGE_DB.clear();
    MOCK_PLAN_DB.clear();
  }
  
  static _setPlan(tenantId: string, plan: PlanType) {
    MOCK_PLAN_DB.set(tenantId, plan);
  }
}
