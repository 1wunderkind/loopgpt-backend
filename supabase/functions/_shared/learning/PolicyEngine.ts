/**
 * Policy Engine
 * Handles reward calculation and provider scoring.
 */

import { RoutingFeaturesV1 } from "./LearningLoop.ts";

export interface PolicyWeights {
  successRate: number;
  latency: number; // Negative weight usually
  gmv: number;
  commission: number;
  bias: number;
}

export interface ScoredProvider {
  provider: string;
  score: number;
  explanation: {
    features: RoutingFeaturesV1;
    weights: PolicyWeights;
    terms: Record<string, number>;
  };
}

export class PolicyEngine {
  private static DEFAULT_WEIGHTS: PolicyWeights = {
    successRate: 10.0,
    latency: -0.001, // -1 point per 1000ms
    gmv: 0.1,
    commission: 0.5,
    bias: 0
  };

  static calculateReward(
    outcome: { success: boolean; latencyMs: number; gmvUsd?: number; commissionUsd?: number }
  ): number {
    const successReward = outcome.success ? 1.0 : -5.0; // Heavy penalty for failure
    const latencyPenalty = outcome.latencyMs * 0.0001; // Small penalty for slowness
    const gmvReward = (outcome.gmvUsd || 0) * 0.01;
    const commissionReward = (outcome.commissionUsd || 0) * 0.1;

    return successReward - latencyPenalty + gmvReward + commissionReward;
  }

  static scoreProvider(
    provider: string,
    features: RoutingFeaturesV1,
    weights: PolicyWeights = this.DEFAULT_WEIGHTS
  ): ScoredProvider {
    const terms = {
      success: features.providerSuccessRate * weights.successRate,
      latency: features.providerLatencyP50 * weights.latency,
      gmv: features.providerGMVPerRoute * weights.gmv,
      commission: features.providerCommissionRate * weights.commission
    };

    const score = terms.success + terms.latency + terms.gmv + terms.commission + weights.bias;

    return {
      provider,
      score,
      explanation: {
        features,
        weights,
        terms
      }
    };
  }
}
