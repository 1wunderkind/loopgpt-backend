/**
 * Personalized Policy Resolver
 * Resolves routing policies by layering Global -> Tenant -> User preferences.
 */

import { PolicyWeights } from "../learning/PolicyEngine.ts";
import { Logger } from "../monitoring/Logger.ts";

export type PolicyScope = "global" | "tenant" | "user";

export interface ResolvedPolicy {
  weights: PolicyWeights;
  scope: PolicyScope;
  version: string;
  preferences: {
    preferredProviders: string[];
    avoidProviders: string[];
    priceSensitivity: number; // 0-1 (1 = very sensitive)
    speedSensitivity: number; // 0-1 (1 = very sensitive)
  };
}

// Mock DB for policies
const TENANT_POLICIES = new Map<string, Partial<PolicyWeights>>();
const USER_PREFERENCES = new Map<string, any>();

export class PolicyResolver {
  private static GLOBAL_WEIGHTS: PolicyWeights = {
    successRate: 10.0,
    latency: -0.001,
    gmv: 0.1,
    commission: 0.5,
    bias: 0
  };

  static async resolve(
    tenantId: string,
    userId: string,
    logger: Logger
  ): Promise<ResolvedPolicy> {
    // 1. Start with Global
    let weights = { ...this.GLOBAL_WEIGHTS };
    let scope: PolicyScope = "global";

    // 2. Apply Tenant Overrides (if any)
    const tenantOverride = TENANT_POLICIES.get(tenantId);
    if (tenantOverride) {
      weights = { ...weights, ...tenantOverride };
      scope = "tenant";
    }

    // 3. Load User Preferences
    const userPrefs = USER_PREFERENCES.get(userId) || {
      preferredProviders: [],
      avoidProviders: [],
      priceSensitivity: 0.5,
      speedSensitivity: 0.5
    };

    // 4. Adjust weights based on user sensitivity
    // High price sensitivity -> lower GMV weight (don't push expensive stuff)
    if (userPrefs.priceSensitivity > 0.8) {
      weights.gmv *= 0.5; 
    }
    // High speed sensitivity -> higher latency penalty
    if (userPrefs.speedSensitivity > 0.8) {
      weights.latency *= 1.5;
    }

    logger.info("Policy Resolved", {
      tenantId,
      userId,
      scope,
      weights
    });

    return {
      weights,
      scope,
      version: "v1.0",
      preferences: userPrefs
    };
  }

  // Helper for tests
  static _setTenantPolicy(tenantId: string, weights: Partial<PolicyWeights>) {
    TENANT_POLICIES.set(tenantId, weights);
  }
  
  static _setUserPrefs(userId: string, prefs: any) {
    USER_PREFERENCES.set(userId, prefs);
  }
}
