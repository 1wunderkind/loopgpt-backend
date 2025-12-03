/**
 * Business Metrics and Analytics
 * Track KPIs, business metrics, and generate analytics
 */

import { Logger } from '../monitoring/Logger.ts';
import { eventTracker, Events } from '../observability/EventTracker.ts';

const logger = new Logger('BusinessMetrics');

export interface MetricValue {
  value: number;
  timestamp: number;
  dimensions?: Record<string, string>;
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface BusinessKPIs {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnRate: number;

  // Order metrics
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  orderSuccessRate: number;
  avgOrderValue: number;

  // Revenue metrics
  totalRevenue: number;
  avgRevenuePerUser: number;
  avgRevenuePerOrder: number;

  // Performance metrics
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;

  // Provider metrics
  providerDistribution: Record<string, number>;
  providerSuccessRates: Record<string, number>;
}

/**
 * Business metrics tracker
 */
export class BusinessMetrics {
  private metrics: Map<string, MetricValue[]> = new Map();
  private maxMetricsPerName: number = 10000;

  /**
   * Record a metric
   */
  record(
    name: string,
    value: number,
    dimensions?: Record<string, string>
  ): void {
    const metric: MetricValue = {
      value,
      timestamp: Date.now(),
      dimensions,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only last N metrics
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }

    logger.debug('Metric recorded', { name, value, dimensions });
  }

  /**
   * Get metrics
   */
  getMetrics(
    name: string,
    startTime?: number,
    endTime?: number
  ): MetricValue[] {
    const metrics = this.metrics.get(name) || [];

    if (!startTime && !endTime) {
      return metrics;
    }

    return metrics.filter(m => {
      if (startTime && m.timestamp < startTime) return false;
      if (endTime && m.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * Aggregate metrics
   */
  aggregate(name: string, startTime?: number, endTime?: number): AggregatedMetric {
    const metrics = this.getMetrics(name, startTime, endTime);

    if (metrics.length === 0) {
      return {
        name,
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      name,
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 0.50),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get business KPIs
   */
  async getKPIs(startTime?: number, endTime?: number): Promise<BusinessKPIs> {
    // TODO: Implement actual database queries
    // This is a placeholder implementation

    const orderMetrics = this.aggregate('order.completed', startTime, endTime);
    const revenueMetrics = this.aggregate('revenue.generated', startTime, endTime);
    const responseTimeMetrics = this.aggregate('api.response_time', startTime, endTime);

    return {
      // User metrics
      totalUsers: 1000,
      activeUsers: 500,
      newUsers: 50,
      churnRate: 0.05,

      // Order metrics
      totalOrders: orderMetrics.count,
      successfulOrders: Math.floor(orderMetrics.count * 0.95),
      failedOrders: Math.floor(orderMetrics.count * 0.05),
      orderSuccessRate: 0.95,
      avgOrderValue: orderMetrics.avg,

      // Revenue metrics
      totalRevenue: revenueMetrics.sum,
      avgRevenuePerUser: revenueMetrics.sum / 500,
      avgRevenuePerOrder: revenueMetrics.avg,

      // Performance metrics
      avgResponseTime: responseTimeMetrics.avg,
      cacheHitRate: 0.80,
      errorRate: 0.02,

      // Provider metrics
      providerDistribution: {
        'Instacart': 0.35,
        'Shipt': 0.25,
        'DoorDash': 0.20,
        'UberEats': 0.15,
        'MealMe': 0.05,
      },
      providerSuccessRates: {
        'Instacart': 0.96,
        'Shipt': 0.94,
        'DoorDash': 0.97,
        'UberEats': 0.95,
        'MealMe': 0.93,
      },
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Global business metrics instance
 */
export const businessMetrics = new BusinessMetrics();

/**
 * Metric recording helpers
 */
export const recordOrderMetric = (orderId: string, value: number, success: boolean) => {
  businessMetrics.record('order.value', value, {
    orderId,
    success: success.toString(),
  });

  if (success) {
    businessMetrics.record('order.completed', value);
    eventTracker.trackBusiness(Events.ORDER_COMPLETED, { orderId, value });
  } else {
    businessMetrics.record('order.failed', value);
    eventTracker.trackBusiness(Events.ORDER_FAILED, { orderId, value });
  }
};

export const recordRevenueMetric = (amount: number, source: string) => {
  businessMetrics.record('revenue.generated', amount, { source });
  eventTracker.trackBusiness(Events.REVENUE_GENERATED, { amount, source });
};

export const recordResponseTimeMetric = (endpoint: string, duration: number) => {
  businessMetrics.record('api.response_time', duration, { endpoint });
  businessMetrics.record(`api.response_time.${endpoint}`, duration);
};

export const recordProviderMetric = (provider: string, success: boolean, duration: number) => {
  businessMetrics.record('provider.request', duration, {
    provider,
    success: success.toString(),
  });

  businessMetrics.record(`provider.${provider}.request`, duration);

  if (success) {
    businessMetrics.record(`provider.${provider}.success`, 1);
  } else {
    businessMetrics.record(`provider.${provider}.failure`, 1);
  }
};

/**
 * Analytics query helpers
 */
export const getOrderAnalytics = async (days: number = 30) => {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return {
    completed: businessMetrics.aggregate('order.completed', startTime),
    failed: businessMetrics.aggregate('order.failed', startTime),
    value: businessMetrics.aggregate('order.value', startTime),
  };
};

export const getRevenueAnalytics = async (days: number = 30) => {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return businessMetrics.aggregate('revenue.generated', startTime);
};

export const getPerformanceAnalytics = async (days: number = 7) => {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return {
    responseTime: businessMetrics.aggregate('api.response_time', startTime),
    cacheHit: businessMetrics.aggregate('cache.hit', startTime),
    cacheMiss: businessMetrics.aggregate('cache.miss', startTime),
  };
};

export const getProviderAnalytics = async (provider: string, days: number = 30) => {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return {
    requests: businessMetrics.aggregate(`provider.${provider}.request`, startTime),
    successes: businessMetrics.aggregate(`provider.${provider}.success`, startTime),
    failures: businessMetrics.aggregate(`provider.${provider}.failure`, startTime),
  };
};
