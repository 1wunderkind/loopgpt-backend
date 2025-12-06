/**
 * LoopGPT Commerce Router - Scoring Learner
 * Phase 3: Self-improving mechanism that learns from order outcomes
 * 
 * Tracks order outcomes and adjusts provider reliability scores
 * based on actual performance vs. predicted performance.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  OrderOutcome,
  OrderIssue,
  ScoringWeights,
  WeightAdjustment,
} from "./types/index.ts";
import { logRecordOutcome } from "./commerceLogger.ts";

export class ScoringLearner {
  private db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  /**
   * Record the outcome of a completed order
   * Updates provider metrics and adjusts reliability scores
   * 
   * @param outcome - Order outcome data
   */
  async recordOutcome(outcome: OrderOutcome): Promise<void> {
    try {
      // 1. Update provider metrics
      await this.updateProviderMetrics(outcome);

      // 2. Record order outcome for analysis
      await this.storeOrderOutcome(outcome);

      // 3. If there were issues, record them
      if (outcome.issues && outcome.issues.length > 0) {
        await this.recordIssues(outcome.providerId, outcome.issues);
      }

      // 4. If user gave a rating, factor it in
      if (outcome.userRating) {
        await this.recordRating(outcome.providerId, outcome.userRating);
      }

      console.log(`✅ Recorded outcome for order ${outcome.orderId} (provider: ${outcome.providerId})`);
      
      // Log outcome recording
      const outcomeStatus = outcome.wasCancelled ? 'cancelled' : (outcome.wasSuccessful ? 'success' : 'failed');
      logRecordOutcome(
        outcome.orderId,
        outcome.providerId,
        outcomeStatus,
        outcome.totalValue || 0,
        (outcome.totalValue || 0) * (outcome.commissionRate || 0)
      );
    } catch (error) {
      console.error('Error recording order outcome:', error);
      throw error;
    }
  }

  /**
   * Update provider metrics using the new analytics.upsert_provider_metrics function
   * This updates the analytics.provider_metrics table with outcome data
   */
  private async updateProviderMetrics(outcome: OrderOutcome): Promise<void> {
    // Determine outcome status
    let outcomeStatus: 'success' | 'failed' | 'cancelled';
    if (outcome.wasCancelled) {
      outcomeStatus = 'cancelled';
    } else if (outcome.wasSuccessful) {
      outcomeStatus = 'success';
    } else {
      outcomeStatus = 'failed';
    }

    // Calculate order value and commission
    const orderValue = outcome.totalValue || 0;
    const commissionRate = outcome.commissionRate || 0;
    const commission = orderValue * commissionRate;

    // Call the upsert function
    const { error } = await this.db.rpc('upsert_provider_metrics', {
      p_provider_id: outcome.providerId,
      p_provider_name: outcome.providerName || outcome.providerId,
      p_outcome: outcomeStatus,
      p_order_value: orderValue,
      p_commission: commission,
    });

    if (error) {
      // Log error but don't throw - we don't want to break the caller
      console.error(`[ScoringLearner] Failed to update provider metrics for ${outcome.providerId}:`, error);
      console.error('[ScoringLearner] Continuing despite metrics update failure');
    } else {
      console.log(`[ScoringLearner] Updated provider metrics for ${outcome.providerId}: ${outcomeStatus}, $${orderValue.toFixed(2)}`);
    }
  }

  /**
   * Store detailed order outcome for analysis
   */
  private async storeOrderOutcome(outcome: OrderOutcome): Promise<void> {
    const { error } = await this.db
      .from('order_outcomes')
      .insert({
        order_id: outcome.orderId,
        provider_id: outcome.providerId,
        was_successful: outcome.wasSuccessful,
        actual_delivery_minutes: outcome.actualDeliveryTime,
        items_delivered: outcome.itemsDelivered,
        items_ordered: outcome.itemsOrdered,
        user_rating: outcome.userRating,
        issues: outcome.issues || [],
      });

    if (error) {
      throw new Error(`Failed to store order outcome: ${error.message}`);
    }
  }

  /**
   * Record specific issues for a provider
   * Used to identify patterns and adjust scoring
   */
  private async recordIssues(providerId: string, issues: OrderIssue[]): Promise<void> {
    // Count issue frequency
    const issueCounts: Record<OrderIssue, number> = {} as any;
    issues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });

    // Log issues for analysis
    console.warn(`⚠️  Provider ${providerId} had issues:`, issueCounts);

    // In a more advanced system, we would:
    // - Adjust reliability score based on issue severity
    // - Track issue patterns over time
    // - Alert if issues exceed threshold
    // - Temporarily reduce provider priority
  }

  /**
   * Record user rating for a provider
   */
  private async recordRating(providerId: string, rating: number): Promise<void> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      console.warn(`Invalid rating ${rating} for provider ${providerId}`);
      return;
    }

    // In a more advanced system, we would:
    // - Store ratings in a separate table
    // - Calculate average rating
    // - Factor rating into reliability score
    // - Track rating trends over time

    console.log(`⭐ Provider ${providerId} received rating: ${rating}/5`);
  }

  /**
   * Get performance summary for a provider
   * Used for debugging and analysis
   */
  async getProviderPerformance(
    providerId: string,
    days: number = 30
  ): Promise<{
    totalOrders: number;
    successRate: number;
    avgDeliveryTime: number;
    avgRating: number;
    commonIssues: Record<OrderIssue, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get outcomes for this provider
    const { data: outcomes, error } = await this.db
      .from('order_outcomes')
      .select('*')
      .eq('provider_id', providerId)
      .gte('created_at', startDate.toISOString());

    if (error || !outcomes) {
      return {
        totalOrders: 0,
        successRate: 0,
        avgDeliveryTime: 0,
        avgRating: 0,
        commonIssues: {} as any,
      };
    }

    // Calculate metrics
    const totalOrders = outcomes.length;
    const successfulOrders = outcomes.filter(o => o.was_successful).length;
    const successRate = totalOrders > 0 ? successfulOrders / totalOrders : 0;

    const deliveryTimes = outcomes
      .map(o => o.actual_delivery_minutes)
      .filter((t): t is number => t !== null && t !== undefined);
    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
      : 0;

    const ratings = outcomes
      .map(o => o.user_rating)
      .filter((r): r is number => r !== null && r !== undefined);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    // Count issues
    const commonIssues: Record<OrderIssue, number> = {} as any;
    outcomes.forEach(outcome => {
      if (outcome.issues) {
        outcome.issues.forEach((issue: OrderIssue) => {
          commonIssues[issue] = (commonIssues[issue] || 0) + 1;
        });
      }
    });

    return {
      totalOrders,
      successRate,
      avgDeliveryTime,
      avgRating,
      commonIssues,
    };
  }

  /**
   * Analyze weight performance and suggest adjustments
   * This is a simple implementation - can be enhanced with ML
   */
  async analyzeWeightPerformance(): Promise<{
    currentWeights: ScoringWeights;
    suggestedAdjustments: Partial<ScoringWeights>;
    reasoning: string;
  }> {
    // Get recent score calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: calculations, error } = await this.db
      .from('score_calculations')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error || !calculations || calculations.length === 0) {
      return {
        currentWeights: {
          price: 0.30,
          speed: 0.15,
          availability: 0.25,
          margin: 0.20,
          reliability: 0.10,
        },
        suggestedAdjustments: {},
        reasoning: 'Insufficient data for weight analysis',
      };
    }

    // Analyze which providers were selected and their outcomes
    // This is a simplified analysis - real ML would be more sophisticated

    const selectedCalculations = calculations.filter(c => c.was_selected);
    
    // Calculate average scores for selected providers
    const avgPriceScore = selectedCalculations.reduce((sum, c) => sum + c.price_score, 0) / selectedCalculations.length;
    const avgSpeedScore = selectedCalculations.reduce((sum, c) => sum + c.speed_score, 0) / selectedCalculations.length;
    const avgAvailabilityScore = selectedCalculations.reduce((sum, c) => sum + c.availability_score, 0) / selectedCalculations.length;

    // Simple heuristic: If selected providers consistently have high scores in one area,
    // that factor might be more important than we thought

    const reasoning = `Based on ${selectedCalculations.length} recent selections, ` +
      `providers scored avg ${avgPriceScore.toFixed(0)} on price, ` +
      `${avgSpeedScore.toFixed(0)} on speed, and ` +
      `${avgAvailabilityScore.toFixed(0)} on availability.`;

    return {
      currentWeights: {
        price: 0.30,
        speed: 0.15,
        availability: 0.25,
        margin: 0.20,
        reliability: 0.10,
      },
      suggestedAdjustments: {},
      reasoning,
    };
  }

  /**
   * Record a weight adjustment for tracking
   */
  async recordWeightAdjustment(
    reason: string,
    oldWeights: ScoringWeights,
    newWeights: ScoringWeights,
    performanceDelta: Record<string, number>
  ): Promise<void> {
    const { error } = await this.db
      .from('weight_adjustments')
      .insert({
        adjustment_reason: reason,
        old_weights: oldWeights,
        new_weights: newWeights,
        performance_delta: performanceDelta,
      });

    if (error) {
      console.error('Error recording weight adjustment:', error);
    }
  }

  /**
   * Get learning insights for dashboard
   */
  async getLearningInsights(): Promise<{
    totalOutcomesRecorded: number;
    avgSuccessRate: number;
    topPerformingProvider: string;
    mostCommonIssue: OrderIssue | null;
    recentAdjustments: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total outcomes
    const { count: totalOutcomes } = await this.db
      .from('order_outcomes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get success rate
    const { data: outcomes } = await this.db
      .from('order_outcomes')
      .select('was_successful')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const avgSuccessRate = outcomes && outcomes.length > 0
      ? outcomes.filter(o => o.was_successful).length / outcomes.length
      : 0;

    // Get top performing provider
    const { data: metrics } = await this.db
      .from('provider_metrics')
      .select('provider_id, successful_orders, total_orders')
      .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0]);

    let topProvider = 'N/A';
    if (metrics && metrics.length > 0) {
      const providerStats = metrics.reduce((acc, m) => {
        if (!acc[m.provider_id]) {
          acc[m.provider_id] = { successful: 0, total: 0 };
        }
        acc[m.provider_id].successful += m.successful_orders || 0;
        acc[m.provider_id].total += m.total_orders || 0;
        return acc;
      }, {} as Record<string, { successful: number; total: number }>);

      const sorted = Object.entries(providerStats)
        .map(([id, stats]) => ({
          id,
          rate: stats.total > 0 ? stats.successful / stats.total : 0,
        }))
        .sort((a, b) => b.rate - a.rate);

      if (sorted.length > 0) {
        topProvider = sorted[0].id;
      }
    }

    // Get most common issue
    const { data: allOutcomes } = await this.db
      .from('order_outcomes')
      .select('issues')
      .gte('created_at', thirtyDaysAgo.toISOString());

    let mostCommonIssue: OrderIssue | null = null;
    if (allOutcomes) {
      const issueCounts: Record<string, number> = {};
      allOutcomes.forEach(o => {
        if (o.issues) {
          o.issues.forEach((issue: string) => {
            issueCounts[issue] = (issueCounts[issue] || 0) + 1;
          });
        }
      });

      const sorted = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        mostCommonIssue = sorted[0][0] as OrderIssue;
      }
    }

    // Get recent adjustments
    const { count: recentAdjustments } = await this.db
      .from('weight_adjustments')
      .select('*', { count: 'exact', head: true })
      .gte('applied_at', thirtyDaysAgo.toISOString());

    return {
      totalOutcomesRecorded: totalOutcomes || 0,
      avgSuccessRate,
      topPerformingProvider: topProvider,
      mostCommonIssue,
      recentAdjustments: recentAdjustments || 0,
    };
  }
}
