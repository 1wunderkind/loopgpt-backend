/**
 * Metrics Collection
 * Performance and business metrics for Grafana dashboards
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

/**
 * Metrics collector for edge functions
 */
export class MetricsCollector {
  private metrics: Map<string, Metric>;
  private histograms: Map<string, number[]>;

  constructor() {
    this.metrics = new Map();
    this.histograms = new Map();
  }

  /**
   * Increment counter
   */
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, tags);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'counter') {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        value,
        timestamp: Date.now(),
        tags,
        type: 'counter',
      });
    }
  }

  /**
   * Set gauge value
   */
  setGauge(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, tags);
    this.metrics.set(key, {
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge',
    });
  }

  /**
   * Record histogram value
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    // Also store as metric
    this.metrics.set(key, {
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram',
    });
  }

  /**
   * Record timing (convenience method for histogram)
   */
  recordTiming(
    name: string,
    durationMs: number,
    tags?: Record<string, string>
  ): void {
    this.recordHistogram(name, durationMs, tags);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.recordTiming(name, duration, {
        ...tags,
        status: 'success',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordTiming(name, duration, {
        ...tags,
        status: 'error',
      });

      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags?: Record<string, string>): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    return {
      count,
      sum,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.histograms.clear();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      const labels = metric.tags
        ? Object.entries(metric.tags)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';

      const metricName = `loopgpt_${metric.name}`;
      lines.push(
        `${metricName}${labels ? `{${labels}}` : ''} ${metric.value} ${metric.timestamp}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Send metrics to external service
   */
  async flush(): Promise<void> {
    const metrics = this.getMetrics();

    if (metrics.length === 0) {
      return;
    }

    try {
      const grafanaUrl = Deno.env.get('GRAFANA_PUSH_URL');
      const grafanaToken = Deno.env.get('GRAFANA_TOKEN');

      if (!grafanaUrl || !grafanaToken) {
        return; // No configuration, skip
      }

      // Send to Grafana Cloud
      await fetch(grafanaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${grafanaToken}`,
        },
        body: JSON.stringify({
          streams: [
            {
              stream: {
                job: 'loopgpt-edge-functions',
                environment: Deno.env.get('ENVIRONMENT') || 'development',
              },
              values: metrics.map((m) => [
                String(m.timestamp * 1000000), // nanoseconds
                JSON.stringify(m),
              ]),
            },
          ],
        }),
      });

      // Clear after successful flush
      this.clear();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * Get metric key
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) {
      return name;
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    return `${name}{${tagString}}`;
  }
}

/**
 * Global metrics collector
 */
export const metrics = new MetricsCollector();

/**
 * Common metrics helpers
 */
export class CommonMetrics {
  /**
   * Record HTTP request
   */
  static recordRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    metrics.incrementCounter('http_requests_total', 1, {
      method,
      path,
      status: String(statusCode),
    });

    metrics.recordTiming('http_request_duration_ms', durationMs, {
      method,
      path,
      status: String(statusCode),
    });
  }

  /**
   * Record database query
   */
  static recordDatabaseQuery(
    operation: string,
    table: string,
    durationMs: number,
    success: boolean
  ): void {
    metrics.incrementCounter('db_queries_total', 1, {
      operation,
      table,
      status: success ? 'success' : 'error',
    });

    metrics.recordTiming('db_query_duration_ms', durationMs, {
      operation,
      table,
    });
  }

  /**
   * Record external API call
   */
  static recordExternalApiCall(
    service: string,
    endpoint: string,
    durationMs: number,
    success: boolean
  ): void {
    metrics.incrementCounter('external_api_calls_total', 1, {
      service,
      endpoint,
      status: success ? 'success' : 'error',
    });

    metrics.recordTiming('external_api_duration_ms', durationMs, {
      service,
      endpoint,
    });
  }

  /**
   * Record cache hit/miss
   */
  static recordCacheAccess(key: string, hit: boolean): void {
    metrics.incrementCounter('cache_accesses_total', 1, {
      key,
      result: hit ? 'hit' : 'miss',
    });
  }

  /**
   * Record order placement
   */
  static recordOrder(
    provider: string,
    totalAmount: number,
    itemCount: number
  ): void {
    metrics.incrementCounter('orders_total', 1, {
      provider,
    });

    metrics.setGauge('order_amount', totalAmount, {
      provider,
    });

    metrics.setGauge('order_items', itemCount, {
      provider,
    });
  }

  /**
   * Record user action
   */
  static recordUserAction(action: string, userId?: string): void {
    metrics.incrementCounter('user_actions_total', 1, {
      action,
      user_id: userId || 'anonymous',
    });
  }
}

/**
 * Middleware to add metrics to edge functions
 */
export function withMetrics(
  handler: (req: Request) => Promise<Response>,
  functionName: string
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(req.url);

    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;

      CommonMetrics.recordRequest(
        req.method,
        url.pathname,
        response.status,
        duration
      );

      // Flush metrics periodically
      if (Math.random() < 0.1) {
        // 10% chance
        await metrics.flush();
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      CommonMetrics.recordRequest(
        req.method,
        url.pathname,
        500,
        duration
      );

      throw error;
    }
  };
}
