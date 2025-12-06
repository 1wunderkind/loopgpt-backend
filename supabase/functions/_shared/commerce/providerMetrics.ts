/**
 * Provider Metrics Helper Module
 * 
 * Provides functions to query and use provider performance metrics
 * for dynamic scoring in the commerce router.
 * 
 * Part of: Step 3 - Provider Arbitrage Hardening & Failover
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  totalGmv: number;
  totalCommission: number;
  successRate: number | null;    // 0-100 percentage
  avgMarginRate: number | null;  // 0-100 percentage
  lastOrderAt: string | null;
}

/**
 * Get provider metrics from analytics.provider_metrics table
 * 
 * @param db - Supabase client
 * @param providerId - Provider ID (e.g., 'instacart', 'walmart')
 * @returns Provider metrics or null if not found
 */
export async function getProviderMetrics(
  db: SupabaseClient,
  providerId: string
): Promise<ProviderMetrics | null> {
  try {
    const { data, error } = await db
      .from('provider_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      providerId: data.provider_id,
      providerName: data.provider_name,
      totalOrders: data.total_orders || 0,
      successfulOrders: data.successful_orders || 0,
      failedOrders: data.failed_orders || 0,
      cancelledOrders: data.cancelled_orders || 0,
      totalGmv: parseFloat(data.total_gmv || '0'),
      totalCommission: parseFloat(data.total_commission || '0'),
      successRate: data.success_rate ? parseFloat(data.success_rate) : null,
      avgMarginRate: data.avg_margin_rate ? parseFloat(data.avg_margin_rate) : null,
      lastOrderAt: data.last_order_at,
    };
  } catch (error) {
    console.error(`[ProviderMetrics] Error fetching metrics for ${providerId}:`, error);
    return null;
  }
}

/**
 * Calculate reliability score from provider metrics
 * 
 * Maps success_rate (0-100%) to a reliability score (0-100)
 * with thresholds for better differentiation:
 * - 95%+ success rate → 90-100 score (excellent)
 * - 85-95% success rate → 70-90 score (good)
 * - 70-85% success rate → 50-70 score (acceptable)
 * - <70% success rate → 0-50 score (poor)
 * 
 * @param metrics - Provider metrics (can be null)
 * @returns Reliability score 0-100 (defaults to 50 if no data)
 */
export function calculateReliabilityScore(metrics: ProviderMetrics | null): number {
  // No data = neutral score
  if (!metrics || metrics.successRate === null || metrics.totalOrders === 0) {
    return 50;
  }

  const successRate = metrics.successRate;

  // Apply thresholds for better differentiation
  if (successRate >= 95) {
    // Excellent: 95-100% → 90-100 score
    return Math.round(90 + (successRate - 95) * 2);
  } else if (successRate >= 85) {
    // Good: 85-95% → 70-90 score
    return Math.round(70 + (successRate - 85) * 2);
  } else if (successRate >= 70) {
    // Acceptable: 70-85% → 50-70 score
    return Math.round(50 + (successRate - 70) * (20 / 15));
  } else {
    // Poor: 0-70% → 0-50 score
    return Math.round(successRate * (50 / 70));
  }
}

/**
 * Calculate margin score from provider metrics relative to other providers
 * 
 * Normalizes each provider's avg_margin_rate into a 0-100 range
 * based on the min/max margin rates among all providers in this routing decision.
 * 
 * @param metrics - Provider metrics (can be null)
 * @param allMetrics - Metrics for all providers in this routing decision
 * @returns Margin score 0-100 (defaults to 50 if no data)
 */
export function calculateMarginScore(
  metrics: ProviderMetrics | null,
  allMetrics: (ProviderMetrics | null)[]
): number {
  // No data = neutral score
  if (!metrics || metrics.avgMarginRate === null) {
    return 50;
  }

  // Extract all valid margin rates
  const validMarginRates = allMetrics
    .filter((m): m is ProviderMetrics => m !== null && m.avgMarginRate !== null)
    .map(m => m.avgMarginRate!);

  // If only one provider has data, return neutral
  if (validMarginRates.length <= 1) {
    return 50;
  }

  const minMargin = Math.min(...validMarginRates);
  const maxMargin = Math.max(...validMarginRates);

  // All same margin
  if (maxMargin === minMargin) {
    return 100;
  }

  // Higher margin = higher score
  const normalized = (metrics.avgMarginRate - minMargin) / (maxMargin - minMargin);
  return Math.round(normalized * 100);
}

/**
 * Get metrics for multiple providers in parallel
 * 
 * @param db - Supabase client
 * @param providerIds - Array of provider IDs
 * @returns Map of providerId -> metrics (null if not found)
 */
export async function getMultipleProviderMetrics(
  db: SupabaseClient,
  providerIds: string[]
): Promise<Map<string, ProviderMetrics | null>> {
  const results = new Map<string, ProviderMetrics | null>();

  try {
    const { data, error } = await db
      .from('provider_metrics')
      .select('*')
      .in('provider_id', providerIds);

    if (error) {
      console.error('[ProviderMetrics] Error fetching multiple metrics:', error);
      // Return null for all providers
      providerIds.forEach(id => results.set(id, null));
      return results;
    }

    // Build map from results
    const metricsMap = new Map<string, any>();
    (data || []).forEach(row => {
      metricsMap.set(row.provider_id, row);
    });

    // Convert to ProviderMetrics objects
    providerIds.forEach(providerId => {
      const row = metricsMap.get(providerId);
      if (row) {
        results.set(providerId, {
          providerId: row.provider_id,
          providerName: row.provider_name,
          totalOrders: row.total_orders || 0,
          successfulOrders: row.successful_orders || 0,
          failedOrders: row.failed_orders || 0,
          cancelledOrders: row.cancelled_orders || 0,
          totalGmv: parseFloat(row.total_gmv || '0'),
          totalCommission: parseFloat(row.total_commission || '0'),
          successRate: row.success_rate ? parseFloat(row.success_rate) : null,
          avgMarginRate: row.avg_margin_rate ? parseFloat(row.avg_margin_rate) : null,
          lastOrderAt: row.last_order_at,
        });
      } else {
        results.set(providerId, null);
      }
    });

    return results;
  } catch (error) {
    console.error('[ProviderMetrics] Error in getMultipleProviderMetrics:', error);
    // Return null for all providers on error
    providerIds.forEach(id => results.set(id, null));
    return results;
  }
}

/**
 * Log provider metrics for debugging
 */
export function logProviderMetrics(
  providerId: string,
  metrics: ProviderMetrics | null,
  reliabilityScore: number,
  marginScore: number
): void {
  if (metrics) {
    console.log(`[ProviderMetrics] ${providerId}:`, {
      totalOrders: metrics.totalOrders,
      successRate: metrics.successRate?.toFixed(2) + '%',
      avgMarginRate: metrics.avgMarginRate?.toFixed(2) + '%',
      reliabilityScore,
      marginScore,
    });
  } else {
    console.log(`[ProviderMetrics] ${providerId}: No metrics data, using defaults (reliability=50, margin=50)`);
  }
}
