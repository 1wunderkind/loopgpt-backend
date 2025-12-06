/**
 * LoopGPT Commerce Router - Provider Scorer
 * Production-grade scoring with configurable weights
 * 
 * Scores providers based on:
 * 1. Base Priority - Static config bias
 * 2. Price - Total cost to user (totalCents)
 * 3. Speed - Estimated delivery time (estimatedDeliveryMinutes)
 * 4. Commission - Our revenue (commissionRate)
 * 5. Availability - % of items fulfilled
 * 6. Reliability - Historical performance
 * 
 * Configurable via environment variables:
 * - LOOPGPT_SCORE_PRIORITY_WEIGHT (default: 1.0)
 * - LOOPGPT_SCORE_PRICE_WEIGHT (default: 0.30)
 * - LOOPGPT_SCORE_SPEED_WEIGHT (default: 0.15)
 * - LOOPGPT_SCORE_COMMISSION_WEIGHT (default: 0.20)
 * - LOOPGPT_SCORE_AVAILABILITY_WEIGHT (default: 0.25)
 * - LOOPGPT_SCORE_RELIABILITY_WEIGHT (default: 0.10)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  ProviderQuote,
  ScoredQuote,
  ScoringWeights,
  ScoreBreakdown,
  ItemAvailability,
} from "./types/index.ts";
import {
  getMultipleProviderMetrics,
  calculateReliabilityScore,
  calculateMarginScore,
  logProviderMetrics,
  type ProviderMetrics,
} from "./providerMetrics.ts";

// ============================================================================
// Scoring Configuration
// ============================================================================

interface ScoringConfig {
  priorityWeight: number;
  priceWeight: number;
  speedWeight: number;
  commissionWeight: number;
  availabilityWeight: number;
  reliabilityWeight: number;
  defaultEtaMinutes: number;
}

function getScoringConfig(): ScoringConfig {
  return {
    priorityWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_PRIORITY_WEIGHT') || '1.0'),
    priceWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_PRICE_WEIGHT') || '0.30'),
    speedWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_SPEED_WEIGHT') || '0.15'),
    commissionWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_COMMISSION_WEIGHT') || '0.20'),
    availabilityWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_AVAILABILITY_WEIGHT') || '0.25'),
    reliabilityWeight: parseFloat(Deno.env.get('LOOPGPT_SCORE_RELIABILITY_WEIGHT') || '0.10'),
    defaultEtaMinutes: 60, // Default ETA if not provided
  };
}

// ============================================================================
// Provider Scorer
// ============================================================================

export class ProviderScorer {
  private db: SupabaseClient;
  private config: ScoringConfig;

  constructor(db: SupabaseClient) {
    this.db = db;
    this.config = getScoringConfig();
  }

  /**
   * Score and rank all provider quotes
   * 
   * @param quotes - Array of provider quotes to score
   * @param totalItemsRequested - Total number of items in the order
   * @param preference - Optimization preference (price, speed, margin, balanced)
   * @returns Sorted array of scored quotes (highest score first)
   */
  async scoreProviders(
    quotes: ProviderQuote[],
    totalItemsRequested: number,
    preference: 'price' | 'speed' | 'margin' | 'balanced' = 'balanced'
  ): Promise<ScoredQuote[]> {
    if (quotes.length === 0) {
      return [];
    }

    // Adjust weights based on preference
    const weights = this.getWeightsForPreference(preference);

    // Pre-fetch provider metrics for all providers in parallel
    const providerIds = quotes.map(q => q.provider.id);
    const metricsMap = await getMultipleProviderMetrics(this.db, providerIds);

    // Calculate reliability and margin scores from metrics
    const reliabilityScores = new Map<string, number>();
    const marginScores = new Map<string, number>();
    const allMetrics = Array.from(metricsMap.values());

    for (const quote of quotes) {
      const metrics = metricsMap.get(quote.provider.id) || null;
      const reliabilityScore = calculateReliabilityScore(metrics);
      const marginScore = calculateMarginScore(metrics, allMetrics);
      
      reliabilityScores.set(quote.provider.id, reliabilityScore);
      marginScores.set(quote.provider.id, marginScore);
      
      // Log metrics for debugging
      logProviderMetrics(quote.provider.id, metrics, reliabilityScore, marginScore);
    }

    // Score each provider
    const scoredQuotes: ScoredQuote[] = quotes.map((quote) => {
      const breakdown = this.calculateScoreBreakdown(
        quote,
        quotes,
        totalItemsRequested,
        reliabilityScores.get(quote.provider.id) || 50,
        marginScores.get(quote.provider.id) || 50,
        weights
      );

      return {
        ...quote,
        score: breakdown.weightedTotal,
        scoreBreakdown: breakdown,
      };
    });

    // Sort by score (highest first)
    return scoredQuotes.sort((a, b) => b.score - a.score);
  }

  /**
   * Get weights adjusted for user preference
   */
  private getWeightsForPreference(
    preference: 'price' | 'speed' | 'margin' | 'balanced'
  ): ScoringWeights {
    const base = this.config;

    switch (preference) {
      case 'price':
        return {
          price: base.priceWeight * 2.0,
          speed: base.speedWeight * 0.5,
          availability: base.availabilityWeight,
          margin: base.commissionWeight * 0.5,
          reliability: base.reliabilityWeight,
        };
      
      case 'speed':
        return {
          price: base.priceWeight * 0.5,
          speed: base.speedWeight * 2.5,
          availability: base.availabilityWeight,
          margin: base.commissionWeight * 0.5,
          reliability: base.reliabilityWeight,
        };
      
      case 'margin':
        return {
          price: base.priceWeight * 0.7,
          speed: base.speedWeight * 0.7,
          availability: base.availabilityWeight,
          margin: base.commissionWeight * 2.0,
          reliability: base.reliabilityWeight,
        };
      
      case 'balanced':
      default:
        return {
          price: base.priceWeight,
          speed: base.speedWeight,
          availability: base.availabilityWeight,
          margin: base.commissionWeight,
          reliability: base.reliabilityWeight,
        };
    }
  }

  /**
   * Calculate complete score breakdown for a provider
   * 
   * Formula:
   * score = 
   *   priorityWeight * config.priority
   *   - priceWeight * (totalCents / 100)  // Normalize cents to dollars
   *   - speedWeight * estimatedDeliveryMinutes
   *   + commissionWeight * (totalCents * commissionRate / 100)
   *   + availabilityWeight * availabilityScore
   *   + reliabilityWeight * reliabilityScore
   */
  private calculateScoreBreakdown(
    quote: ProviderQuote,
    allQuotes: ProviderQuote[],
    totalItemsRequested: number,
    reliabilityScore: number,
    marginScore: number,
    weights: ScoringWeights
  ): ScoreBreakdown {
    // 1. Base Priority Score (static config bias)
    const priorityScore = quote.config.priority;

    // 2. Price Score (lower price = higher score)
    const priceScore = this.calculatePriceScore(
      quote.quote.totalCents,
      allQuotes.map(q => q.quote.totalCents)
    );

    // 3. Speed Score (faster delivery = higher score)
    const speedScore = this.calculateSpeedScore(
      quote.quote.estimatedDeliveryMinutes || this.config.defaultEtaMinutes,
      allQuotes.map(q => q.quote.estimatedDeliveryMinutes || this.config.defaultEtaMinutes)
    );

    // 4. Margin Score (from provider metrics)
    // Note: marginScore is now passed in from provider metrics calculation
    // We keep the old calculateCommissionScore for backward compatibility
    // but prefer the metrics-based score when available

    // 5. Availability Score (more items found = higher score)
    const availabilityScore = this.calculateAvailabilityScore(
      quote.itemAvailability,
      totalItemsRequested
    );

    // 6. Calculate weighted total
    const weightedTotal =
      (this.config.priorityWeight * priorityScore) +
      (weights.price * priceScore) +
      (weights.speed * speedScore) +
      (weights.margin * marginScore) +
      (weights.availability * availabilityScore) +
      (weights.reliability * reliabilityScore);

    // 7. Generate human-readable explanation
    const explanation = this.generateExplanation(
      quote.provider.name,
      {
        priceScore,
        speedScore,
        availabilityScore,
        marginScore,
        reliabilityScore,
      },
      weights,
      quote.config.priority
    );

    return {
      priceScore,
      speedScore,
      availabilityScore,
      marginScore,
      reliabilityScore,
      weightedTotal,
      explanation,
    };
  }

  /**
   * Calculate price score (lower price = higher score)
   * Normalized to 0-100 scale
   */
  private calculatePriceScore(totalCents: number, allTotalCents: number[]): number {
    const minPrice = Math.min(...allTotalCents);
    const maxPrice = Math.max(...allTotalCents);

    // All same price
    if (maxPrice === minPrice) return 100;

    // Inverse scale: lowest price = 100, highest = 0
    const normalized = 1 - (totalCents - minPrice) / (maxPrice - minPrice);
    return Math.round(normalized * 100);
  }

  /**
   * Calculate speed score (faster delivery = higher score)
   * Normalized to 0-100 scale
   */
  private calculateSpeedScore(etaMinutes: number, allEtaMinutes: number[]): number {
    const minTime = Math.min(...allEtaMinutes);
    const maxTime = Math.max(...allEtaMinutes);

    // All same delivery time
    if (maxTime === minTime) return 100;

    // Inverse scale: fastest = 100
    const normalized = 1 - (etaMinutes - minTime) / (maxTime - minTime);
    return Math.round(normalized * 100);
  }

  /**
   * Calculate commission score (higher commission = higher score)
   * Normalized to 0-100 scale
   */
  private calculateCommissionScore(
    totalCents: number,
    commissionRate: number,
    allQuotes: ProviderQuote[]
  ): number {
    // Our revenue from this order (in cents)
    const ourRevenueCents = totalCents * commissionRate;

    const allRevenues = allQuotes.map(q => q.quote.totalCents * q.config.commissionRate);
    const minRevenue = Math.min(...allRevenues);
    const maxRevenue = Math.max(...allRevenues);

    // All same revenue
    if (maxRevenue === minRevenue) return 100;

    // Higher revenue = higher score
    const normalized = (ourRevenueCents - minRevenue) / (maxRevenue - minRevenue);
    return Math.round(normalized * 100);
  }

  /**
   * Calculate availability score (more items found = higher score)
   * Substituted items count for 80% of a found item
   */
  private calculateAvailabilityScore(
    itemAvailability: ItemAvailability[],
    totalRequested: number
  ): number {
    if (totalRequested === 0) return 100;

    const found = itemAvailability.filter(ia => ia.status === 'found').length;
    const substituted = itemAvailability.filter(ia => ia.status === 'substituted').length;

    // Substituted items count for 80% of a found item
    const effectiveFulfillment = found + (substituted * 0.8);

    return Math.round((effectiveFulfillment / totalRequested) * 100);
  }

  /**
   * Calculate reliability score based on historical performance
   * Uses last 30 days of data with exponential decay
   */
  private async calculateReliabilityScore(providerId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get last 30 days of performance
      const { data: metrics, error } = await this.db
        .from('provider_metrics')
        .select('*')
        .eq('provider_id', providerId)
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (error || !metrics || metrics.length === 0) {
        // No data = neutral score
        return 50;
      }

      // Calculate success rate
      const totalOrders = metrics.reduce((sum, m) => sum + (m.total_orders || 0), 0);
      const successfulOrders = metrics.reduce((sum, m) => sum + (m.successful_orders || 0), 0);

      if (totalOrders === 0) return 50;

      // Basic success rate
      const successRate = successfulOrders / totalOrders;

      // Weight recent performance more heavily (exponential decay)
      let weightedSuccesses = 0;
      let totalWeight = 0;

      metrics.forEach((metric, index) => {
        const dayAge = index;
        const weight = Math.exp(-dayAge / 15); // Decay factor
        
        const daySuccessRate = metric.total_orders > 0
          ? (metric.successful_orders || 0) / metric.total_orders
          : 0.5;

        weightedSuccesses += daySuccessRate * weight * metric.total_orders;
        totalWeight += weight * metric.total_orders;
      });

      const weightedSuccessRate = totalWeight > 0
        ? weightedSuccesses / totalWeight
        : successRate;

      return Math.round(weightedSuccessRate * 100);
    } catch (error) {
      console.error(`Error calculating reliability score for ${providerId}:`, error);
      return 50; // Default to neutral on error
    }
  }

  /**
   * Generate human-readable explanation for why a provider was selected
   */
  private generateExplanation(
    providerName: string,
    scores: {
      priceScore: number;
      speedScore: number;
      availabilityScore: number;
      marginScore: number;
      reliabilityScore: number;
    },
    weights: ScoringWeights,
    priority: number
  ): string {
    const factors: string[] = [];

    // Priority bias
    if (priority >= 60) {
      factors.push('preferred provider');
    }

    // Identify strong factors (score > 80)
    if (scores.priceScore > 80) {
      factors.push('competitive pricing');
    }
    if (scores.speedScore > 80) {
      factors.push('fast delivery');
    }
    if (scores.availabilityScore === 100) {
      factors.push('all items in stock');
    } else if (scores.availabilityScore > 80) {
      factors.push('most items available');
    }
    if (scores.marginScore > 80) {
      factors.push('good commission');
    }
    if (scores.reliabilityScore > 80) {
      factors.push('reliable service');
    }

    // Build explanation
    if (factors.length === 0) {
      return `${providerName} selected as best available option.`;
    } else if (factors.length === 1) {
      return `${providerName} selected for ${factors[0]}.`;
    } else if (factors.length === 2) {
      return `${providerName} selected for ${factors[0]} and ${factors[1]}.`;
    } else {
      const lastFactor = factors.pop();
      return `${providerName} selected for ${factors.join(', ')}, and ${lastFactor}.`;
    }
  }
}
