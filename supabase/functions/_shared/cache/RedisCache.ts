/**
 * Redis Cache Client
 * High-performance caching with Upstash Redis
 */

export interface CacheConfig {
  url?: string;
  token?: string;
  defaultTTL?: number; // seconds
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

/**
 * Redis cache client for edge functions
 */
export class RedisCache {
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private enabled: boolean;

  constructor(config?: CacheConfig) {
    const url = config?.url || Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    const token = config?.token || Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';

    this.config = {
      url,
      token,
      defaultTTL: config?.defaultTTL || 3600, // 1 hour default
      keyPrefix: config?.keyPrefix || 'loopgpt:',
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };

    this.enabled = !!(url && token);

    if (!this.enabled) {
      console.warn('Redis cache not configured - caching disabled');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    this.stats.totalRequests++;

    try {
      const fullKey = this.getFullKey(key);
      const response = await this.executeCommand('GET', fullKey);

      if (response === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(response);

      // Check if expired
      const now = Date.now();
      if (entry.timestamp + entry.ttl * 1000 < now) {
        // Expired - delete and return null
        await this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const actualTTL = ttl || this.config.defaultTTL;

      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: actualTTL,
      };

      await this.executeCommand('SETEX', fullKey, actualTTL, JSON.stringify(entry));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      await this.executeCommand('DEL', fullKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.executeCommand('EXISTS', fullKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.enabled) {
      return 0;
    }

    try {
      const fullPattern = this.getFullKey(pattern);
      const keys = await this.executeCommand('KEYS', fullPattern);

      if (!keys || keys.length === 0) {
        return 0;
      }

      await this.executeCommand('DEL', ...keys);
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries with prefix
   */
  async clear(): Promise<boolean> {
    return (await this.invalidatePattern('*')) > 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };
  }

  /**
   * Execute Redis command via REST API
   */
  private async executeCommand(
    command: string,
    ...args: any[]
  ): Promise<any> {
    const { url, token } = this.config;

    const response = await fetch(`${url}/${command}/${args.join('/')}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Redis command failed: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Get full cache key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
    }
  }
}

/**
 * Global cache instance
 */
export const cache = new RedisCache();

/**
 * Cache key generators
 */
export class CacheKeys {
  /**
   * Food search cache key
   */
  static foodSearch(query: string, limit?: number): string {
    return `food:search:${query.toLowerCase()}:${limit || 20}`;
  }

  /**
   * Food details cache key
   */
  static foodDetails(foodId: string): string {
    return `food:details:${foodId}`;
  }

  /**
   * Provider quote cache key
   */
  static providerQuote(
    provider: string,
    items: string[],
    location: string
  ): string {
    const itemsHash = items.sort().join(',');
    return `provider:${provider}:${itemsHash}:${location}`;
  }

  /**
   * Menu cache key
   */
  static menu(storeId: string): string {
    return `menu:${storeId}`;
  }

  /**
   * User preferences cache key
   */
  static userPreferences(userId: string): string {
    return `user:${userId}:preferences`;
  }

  /**
   * Weight history cache key
   */
  static weightHistory(userId: string, days?: number): string {
    return `user:${userId}:weight:${days || 30}`;
  }

  /**
   * Meal plan cache key
   */
  static mealPlan(userId: string, date: string): string {
    return `user:${userId}:meal_plan:${date}`;
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  FOOD_SEARCH: 3600, // 1 hour
  FOOD_DETAILS: 86400, // 24 hours
  PROVIDER_QUOTE: 300, // 5 minutes
  MENU: 3600, // 1 hour
  USER_PREFERENCES: 1800, // 30 minutes
  WEIGHT_HISTORY: 300, // 5 minutes
  MEAL_PLAN: 3600, // 1 hour
};

/**
 * Middleware to add caching to functions
 */
export function withCache<T>(
  keyGenerator: (...args: any[]) => string,
  ttl: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const key = keyGenerator(...args);

      // Try cache first
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - call original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}
