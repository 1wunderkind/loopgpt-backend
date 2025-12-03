/**
 * LoopGPT Commerce Router - Provider Scorer
 * Phase 3: Intelligent scoring with explanation generation
 * 
 * Scores providers based on 5 factors:
 * 1. Price - Total cost to user
 * 2. Speed - Estimated delivery time
 * 3. Availability - % of items fulfilled
 * 4. Margin - Our commission revenue
 * 5. Reliability - Historical performance
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  ProviderQuote,
  ScoredQuote,
  ScoringWeights,
  ScoreBreakdown,
  Quote,
  ItemAvailability,
  ProviderConfig,
} from "./types/index.ts";
import { getWeightsForPreference } from "./types/index.ts";

export class ProviderScorer {
  private db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
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

    // Get weights based on preference
    const weights = getWeightsForPreference(preference);

    // Pre-fetch reliability scores for all providers
    const reliabilityScores = new Map<string, number>();
    for (const quote of quotes) {
      const score = await this.calculateReliabilityScore(quote.provider.id);
      reliabilityScores.set(quote.provider.id, score);
    }

    // Score each provider
    const scoredQuotes: ScoredQuote[] = quotes.map((quote) => {
      const breakdown = this.calculateScoreBreakdown(
        quote,
        quotes,
        totalItemsRequested,
        reliabilityScores.get(quote.provider.id) || 50,
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
   * Calculate complete score breakdown for a provider
   */
  private calculateScoreBreakdown(
    quote: ProviderQuote,
    allQuotes: ProviderQuote[],
    totalItemsRequested: number,
    reliabilityScore: number,
    weights: ScoringWeights
  ): ScoreBreakdown {
    // Calculate individual component scores
    const priceScore = this.calculatePriceScore(
      quote.quote,
      allQuotes.map(q => q.quote)
    );
    
    const speedScore = this.calculateSpeedScore(
      quote.quote,
      allQuotes.map(q => q.quote)
    );
    
    const availabilityScore = this.calculateAvailabilityScore(
      quote.itemAvailability,
      totalItemsRequested
    );
    
    const marginScore = this.calculateMarginScore(
      quote.quote,
      quote.config,
      allQuotes
    );

    // Calculate weighted total
    const weightedTotal =
      (weights.price * priceScore) +
      (weights.speed * speedScore) +
      (weights.availability * availabilityScore) +
      (weights.margin * marginScore) +
      (weights.reliability * reliabilityScore);

    // Generate human-readable explanation
    const explanation = this.generateExplanation(
      quote.provider.name,
      { priceScore, speedScore, availabilityScore, marginScore, reliabilityScore },
      weights
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
  private calculatePriceScore(quote: Quote, allQuotes: Quote[]): number {
    const prices = allQuotes.map(q => q.total);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // All same price
    if (maxPrice === minPrice) return 100;

    // Inverse scale: lowest price = 100, highest = 0
    const normalized = 1 - (quote.total - minPrice) / (maxPrice - minPrice);
    return Math.round(normalized * 100);
  }

  /**
   * Calculate speed score (faster delivery = higher score)
   * Normalized to 0-100 scale
   */
  private calculateSpeedScore(quote: Quote, allQuotes: Quote[]): number {
    const times = allQuotes.map(q => q.estimatedDelivery.max);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // All same delivery time
    if (maxTime === minTime) return 100;

    // Inverse scale: fastest = 100
    const normalized = 1 - (quote.estimatedDelivery.max - minTime) / (maxTime - minTime);
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
   * Calculate margin score (higher commission = higher score)
   * Normalized to 0-100 scale
   */
  private calculateMarginScore(
    quote: Quote,
    config: ProviderConfig,
    allQuotes: ProviderQuote[]
  ): number {
    // Our revenue from this order
    const ourRevenue = quote.total * config.commissionRate;

    const allRevenues = allQuotes.map(q => q.quote.total * q.config.commissionRate);
    const minRevenue = Math.min(...allRevenues);
    const maxRevenue = Math.max(...allRevenues);

    // All same revenue
    if (maxRevenue === minRevenue) return 100;

    // Higher revenue = higher score
    const normalized = (ourRevenue - minRevenue) / (maxRevenue - minRevenue);
    return Math.round(normalized * 100);
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
      // Most recent day has weight 1.0, oldest day has weight ~0.5
      let weightedSuccesses = 0;
      let totalWeight = 0;

      metrics.forEach((metric, index) => {
        const dayAge = index; // 0 = most recent
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
    weights: ScoringWeights
  ): string {
    const factors: string[] = [];

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
    if (scores.reliabilityScore > 80) {
      factors.push('highly reliable');
    }

    // If no strong factors, mention the highest weighted component
    if (factors.length === 0) {
      const weightedScores = {
        price: scores.priceScore * weights.price,
        speed: scores.speedScore * weights.speed,
        availability: scores.availabilityScore * weights.availability,
        margin: scores.marginScore * weights.margin,
        reliability: scores.reliabilityScore * weights.reliability,
      };

      const maxFactor = Object.entries(weightedScores).reduce((max, [key, value]) =>
        value > max.value ? { key, value } : max,
        { key: 'price', value: 0 }
      );

      const factorNames: Record<string, string> = {
        price: 'reasonable pricing',
        speed: 'acceptable delivery time',
        availability: 'good item availability',
        margin: 'favorable terms',
        reliability: 'consistent performance',
      };

      factors.push(factorNames[maxFactor.key]);
    }

    // Build explanation
    if (factors.length === 1) {
      return `${providerName} was selected due to ${factors[0]}.`;
    } else if (factors.length === 2) {
      return `${providerName} was selected due to ${factors[0]} and ${factors[1]}.`;
    } else {
      const lastFactor = factors.pop();
      return `${providerName} was selected due to ${factors.join(', ')}, and ${lastFactor}.`;
    }
  }

  /**
   * Log score calculation to database for analytics
   */
  async logScoreCalculation(
    routeId: string,
    scoredQuotes: ScoredQuote[],
    selectedProviderId: string
  ): Promise<void> {
    try {
      const calculations = scoredQuotes.map(sq => ({
        route_id: routeId,
        provider_id: sq.provider.id,
        price_score: sq.scoreBreakdown.priceScore,
        speed_score: sq.scoreBreakdown.speedScore,
        availability_score: sq.scoreBreakdown.availabilityScore,
        margin_score: sq.scoreBreakdown.marginScore,
        reliability_score: sq.scoreBreakdown.reliabilityScore,
        weighted_total: sq.scoreBreakdown.weightedTotal,
        weights_used: {
          // Extract weights from the calculation
          // This would be passed in from the scoring call
        },
        was_selected: sq.provider.id === selectedProviderId,
      }));

      await this.db
        .from('score_calculations')
        .insert(calculations);
    } catch (error) {
      console.error('Error logging score calculations:', error);
      // Don't throw - logging failure shouldn't break the order flow
    }
  }
}
