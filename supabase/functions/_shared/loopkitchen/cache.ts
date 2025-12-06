/**
 * Simple in-memory cache for LoopKitchen responses
 * 
 * Caches OpenAI responses to reduce API calls and improve performance.
 * Uses LRU eviction when cache size exceeds limit.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 3600000) { // 1 hour default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from tool name and parameters
   */
  generateKey(toolName: string, params: any): string {
    // Simple hash function for parameters
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    return `${toolName}:${this.simpleHash(paramsStr)}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const maxAge = ttl || this.defaultTTL;

    // Check if expired
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prefer entries with fewer hits and older timestamps
      const score = entry.timestamp - (entry.hits * 60000); // 1 hit = 1 minute bonus
      
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; entries: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: this.cache.size,
    };
  }
}

// Global cache instance
const globalCache = new SimpleCache(1000, 3600000); // 1000 entries, 1 hour TTL

/**
 * Get or compute cached value
 * 
 * @param toolName - Name of the tool (for cache key)
 * @param params - Parameters (for cache key)
 * @param compute - Function to compute value if not cached
 * @param ttl - Time to live in milliseconds (optional)
 * @returns Cached or computed value
 */
export async function getCached<T>(
  toolName: string,
  params: any,
  compute: () => Promise<T>,
  ttl?: number
): Promise<{ value: T; cached: boolean }> {
  const key = globalCache.generateKey(toolName, params);
  
  // Try to get from cache
  const cached = globalCache.get<T>(key, ttl);
  
  if (cached !== null) {
    console.log(`[cache] HIT: ${toolName}`);
    return { value: cached, cached: true };
  }

  // Compute value
  console.log(`[cache] MISS: ${toolName}`);
  const value = await compute();
  
  // Store in cache
  globalCache.set(key, value);
  
  return { value, cached: false };
}

/**
 * Clear cache (for testing or manual invalidation)
 */
export function clearCache(): void {
  globalCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return globalCache.getStats();
}
