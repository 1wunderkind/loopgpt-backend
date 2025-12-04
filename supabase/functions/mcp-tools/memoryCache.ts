/**
 * In-Memory LRU Cache (L1 Cache Layer)
 * 
 * Fast in-memory cache with LRU eviction and TTL support.
 * Used as L1 cache layer before hitting Postgres (L2).
 * 
 * Performance:
 * - L1 hit: ~1-5ms (memory access)
 * - L2 hit: ~500-650ms (Postgres query)
 * - Miss: ~8-12s (OpenAI API)
 * 
 * Target: 86.7% L1 hit rate → average ~50ms cache access
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  size: number; // Approximate size in bytes
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private accessOrder: string[]; // For LRU tracking
  private maxEntries: number;
  private maxSizeBytes: number;
  private currentSizeBytes: number;
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    expired: 0,
  };

  constructor(options: {
    maxEntries?: number;
    maxSizeBytes?: number;
  } = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxEntries = options.maxEntries || 1000; // Default: 1000 entries
    this.maxSizeBytes = options.maxSizeBytes || 50 * 1024 * 1024; // Default: 50MB
    this.currentSizeBytes = 0;
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.expired++;
      this.stats.misses++;
      return null;
    }

    // Update LRU order (move to end)
    this.updateAccessOrder(key);
    this.stats.hits++;
    
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Calculate approximate size
    const size = this.estimateSize(value);
    
    // Check if we need to evict
    while (
      (this.cache.size >= this.maxEntries || 
       this.currentSizeBytes + size > this.maxSizeBytes) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSizeBytes -= oldEntry.size;
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      size,
    };

    this.cache.set(key, entry);
    this.currentSizeBytes += size;
    this.updateAccessOrder(key);
    this.stats.sets++;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSizeBytes -= entry.size;
    
    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSizeBytes = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(1) + '%',
      size: this.cache.size,
      sizeBytes: this.currentSizeBytes,
      sizeMB: (this.currentSizeBytes / 1024 / 1024).toFixed(2) + 'MB',
    };
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder[0]; // First = least recently used
    this.delete(keyToEvict);
    this.stats.evictions++;
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateSize(value: any): number {
    try {
      // Rough estimate: JSON string length
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16 uses 2 bytes per char
    } catch {
      // Fallback: assume 1KB
      return 1024;
    }
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Global singleton instance
let globalCache: MemoryCache | null = null;

/**
 * Get the global memory cache instance
 */
export function getMemoryCache(): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache({
      maxEntries: 1000,
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
    });

    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      const cleaned = globalCache!.cleanupExpired();
      if (cleaned > 0) {
        console.log(`[memoryCache] Cleaned up ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000);
  }

  return globalCache;
}

/**
 * Helper: Get from cache or compute
 */
export async function getCachedOrCompute<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>
): Promise<{ value: T; fromCache: boolean; source: 'L1' | 'L2' | 'compute' }> {
  const cache = getMemoryCache();
  
  // Try L1 (memory)
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return { value: cached, fromCache: true, source: 'L1' };
  }

  // L1 miss - compute
  const startTime = Date.now();
  const value = await computeFn();
  const duration = Date.now() - startTime;

  // Store in L1
  cache.set(key, value, ttlSeconds);

  console.log(`[memoryCache] Computed and cached: ${key.substring(0, 50)}... (${duration}ms)`);

  return { value, fromCache: false, source: 'compute' };
}
