/**
 * Database Optimization Utilities
 * Query optimization, connection pooling, and performance monitoring
 */

import { Logger } from '../monitoring/Logger.ts';

const logger = new Logger('DatabaseOptimizer');

export interface QueryPerformance {
  query: string;
  duration: number;
  rows: number;
  cached: boolean;
  timestamp: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Database query optimizer
 */
export class DatabaseOptimizer {
  private queryStats: Map<string, QueryPerformance[]> = new Map();
  private slowQueryThreshold: number = 1000; // ms

  /**
   * Measure query performance
   */
  async measureQuery<T>(
    queryName: string,
    query: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await query();
      const duration = Date.now() - startTime;

      // Record performance
      this.recordQueryPerformance(queryName, duration, 0, false);

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: queryName,
          duration,
          threshold: this.slowQueryThreshold,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', error as Error, {
        query: queryName,
        duration,
      });
      throw error;
    }
  }

  /**
   * Record query performance
   */
  private recordQueryPerformance(
    query: string,
    duration: number,
    rows: number,
    cached: boolean
  ): void {
    const perf: QueryPerformance = {
      query,
      duration,
      rows,
      cached,
      timestamp: Date.now(),
    };

    if (!this.queryStats.has(query)) {
      this.queryStats.set(query, []);
    }

    this.queryStats.get(query)!.push(perf);

    // Keep only last 100 entries per query
    const stats = this.queryStats.get(query)!;
    if (stats.length > 100) {
      stats.shift();
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(query?: string): QueryPerformance[] {
    if (query) {
      return this.queryStats.get(query) || [];
    }

    // Return all stats
    const allStats: QueryPerformance[] = [];
    for (const stats of this.queryStats.values()) {
      allStats.push(...stats);
    }
    return allStats;
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold?: number): QueryPerformance[] {
    const actualThreshold = threshold || this.slowQueryThreshold;
    const allStats = this.getQueryStats();
    return allStats.filter(stat => stat.duration > actualThreshold);
  }

  /**
   * Get average query duration
   */
  getAverageQueryDuration(query: string): number {
    const stats = this.queryStats.get(query);
    if (!stats || stats.length === 0) {
      return 0;
    }

    const total = stats.reduce((sum, stat) => sum + stat.duration, 0);
    return total / stats.length;
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.queryStats.clear();
  }
}

/**
 * Query builder with optimization hints
 */
export class OptimizedQueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private useIndex?: string;

  /**
   * Start SELECT query
   */
  select(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query = `SELECT ${cols}`;
    return this;
  }

  /**
   * FROM clause
   */
  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  /**
   * WHERE clause
   */
  where(condition: string, ...params: any[]): this {
    this.query += ` WHERE ${condition}`;
    this.params.push(...params);
    return this;
  }

  /**
   * AND clause
   */
  and(condition: string, ...params: any[]): this {
    this.query += ` AND ${condition}`;
    this.params.push(...params);
    return this;
  }

  /**
   * ORDER BY clause
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  /**
   * LIMIT clause
   */
  limit(count: number): this {
    this.query += ` LIMIT ${count}`;
    return this;
  }

  /**
   * OFFSET clause
   */
  offset(count: number): this {
    this.query += ` OFFSET ${count}`;
    return this;
  }

  /**
   * Use specific index (PostgreSQL)
   */
  withIndex(indexName: string): this {
    this.useIndex = indexName;
    return this;
  }

  /**
   * Build query
   */
  build(): { query: string; params: any[] } {
    let finalQuery = this.query;

    // Add index hint if specified
    if (this.useIndex) {
      // PostgreSQL doesn't have direct index hints like MySQL
      // But we can add a comment for query analysis
      finalQuery = `/* INDEX: ${this.useIndex} */ ${finalQuery}`;
    }

    return {
      query: finalQuery,
      params: this.params,
    };
  }
}

/**
 * Database index recommendations
 */
export const IndexRecommendations = {
  /**
   * Food search indexes
   */
  foodSearch: [
    'CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING gin(name gin_trgm_ops);',
    'CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);',
    'CREATE INDEX IF NOT EXISTS idx_foods_brand ON foods(brand);',
  ],

  /**
   * Weight tracking indexes
   */
  weightTracking: [
    'CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date DESC);',
  ],

  /**
   * Meal logging indexes
   */
  mealLogging: [
    'CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date DESC);',
  ],

  /**
   * Order indexes
   */
  orders: [
    'CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
    'CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider);',
  ],

  /**
   * User indexes
   */
  users: [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);',
  ],
};

/**
 * Apply all recommended indexes
 */
export async function applyRecommendedIndexes(
  executeQuery: (query: string) => Promise<void>
): Promise<void> {
  logger.info('Applying recommended database indexes...');

  const allIndexes = [
    ...IndexRecommendations.foodSearch,
    ...IndexRecommendations.weightTracking,
    ...IndexRecommendations.mealLogging,
    ...IndexRecommendations.orders,
    ...IndexRecommendations.users,
  ];

  for (const indexQuery of allIndexes) {
    try {
      await executeQuery(indexQuery);
      logger.info('Index created', { query: indexQuery });
    } catch (error) {
      logger.error('Failed to create index', error as Error, { query: indexQuery });
    }
  }

  logger.info('Finished applying indexes');
}

/**
 * Query optimization tips
 */
export const QueryOptimizationTips = {
  /**
   * Use EXPLAIN ANALYZE to understand query performance
   */
  explainAnalyze: (query: string) => `EXPLAIN ANALYZE ${query}`,

  /**
   * Avoid SELECT * - specify columns
   */
  selectSpecificColumns: true,

  /**
   * Use indexes for WHERE, ORDER BY, JOIN columns
   */
  useIndexes: true,

  /**
   * Limit result sets
   */
  useLimits: true,

  /**
   * Use prepared statements for repeated queries
   */
  usePreparedStatements: true,

  /**
   * Batch operations when possible
   */
  batchOperations: true,

  /**
   * Use connection pooling
   */
  useConnectionPooling: true,

  /**
   * Cache frequently accessed data
   */
  cacheData: true,
};

/**
 * Global optimizer instance
 */
export const dbOptimizer = new DatabaseOptimizer();
