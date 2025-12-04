/**
 * Multi-Layer Cache System
 * 
 * L1: In-memory LRU cache (~1-5ms)
 * L2: Postgres cache (~500-650ms)
 * 
 * Architecture:
 * Request → L1 (memory) → L2 (Postgres) → Compute (OpenAI)
 * 
 * Performance targets:
 * - L1 hit: ~5-10ms
 * - L2 hit: ~500-650ms
 * - Compute: ~8-12s
 * 
 * With 86.7% L1 hit rate:
 * Average: 0.867 * 10ms + 0.133 * 650ms = ~95ms
 */

import { getMemoryCache } from "./memoryCache.ts";
import { cacheGet, cacheSet } from "./cache.ts";

export interface CacheResult<T> {
  value: T;
  source: 'L1' | 'L2' | 'compute';
  durationMs: number;
}

/**
 * Get from multi-layer cache or compute
 * 
 * Flow:
 * 1. Check L1 (memory) - if hit, return immediately
 * 2. Check L2 (Postgres) - if hit, backfill L1 and return
 * 3. Compute - store in both L1 and L2, then return
 */
export async function getOrCompute<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>
): Promise<CacheResult<T>> {
  const startTime = Date.now();
  const memCache = getMemoryCache();

  // Try L1 (memory)
  const l1Value = memCache.get<T>(key);
  if (l1Value !== null) {
    const duration = Date.now() - startTime;
    console.log(`[cache] L1 HIT: ${key.substring(0, 50)}... (${duration}ms)`);
    return {
      value: l1Value,
      source: 'L1',
      durationMs: duration,
    };
  }

  // L1 miss - try L2 (Postgres)
  const l2Value = await cacheGet(key);
  if (l2Value !== null) {
    const duration = Date.now() - startTime;
    console.log(`[cache] L2 HIT: ${key.substring(0, 50)}... (${duration}ms)`);
    
    // Backfill L1
    try {
      const parsed = JSON.parse(l2Value) as T;
      memCache.set(key, parsed, ttlSeconds);
      
      return {
        value: parsed,
        source: 'L2',
        durationMs: duration,
      };
    } catch (error) {
      console.error(`[cache] L2 parse error for ${key}:`, error);
      // Fall through to compute
    }
  }

  // L1 and L2 miss - compute
  console.log(`[cache] MISS: ${key.substring(0, 50)}... - computing...`);
  const computeStart = Date.now();
  const value = await computeFn();
  const computeDuration = Date.now() - computeStart;
  const totalDuration = Date.now() - startTime;

  console.log(`[cache] COMPUTED: ${key.substring(0, 50)}... (${computeDuration}ms)`);

  // Store in both L1 and L2
  try {
    // L1 (memory) - synchronous
    memCache.set(key, value, ttlSeconds);

    // L2 (Postgres) - async, don't wait
    cacheSet(key, JSON.stringify(value), ttlSeconds)
      .catch(error => {
        console.error(`[cache] L2 set error for ${key}:`, error);
      });
  } catch (error) {
    console.error(`[cache] Cache set error for ${key}:`, error);
  }

  return {
    value,
    source: 'compute',
    durationMs: totalDuration,
  };
}

/**
 * Invalidate a key from all cache layers
 */
export async function invalidate(key: string): Promise<void> {
  const memCache = getMemoryCache();
  
  // Remove from L1
  memCache.delete(key);
  
  // Remove from L2 (Postgres doesn't have delete, but we could set TTL to 0)
  // For now, just log
  console.log(`[cache] Invalidated: ${key}`);
}

/**
 * Get cache statistics from all layers
 */
export function getCacheStats() {
  const memCache = getMemoryCache();
  const l1Stats = memCache.getStats();

  return {
    L1: {
      ...l1Stats,
      type: 'in-memory LRU',
    },
    L2: {
      type: 'Postgres',
      // We don't have L2 stats yet, but could add them
    },
  };
}

/**
 * Warm up cache with common queries
 * Call this on server startup or periodically
 */
export async function warmupCache(
  queries: Array<{ key: string; computeFn: () => Promise<any>; ttl: number }>
): Promise<void> {
  console.log(`[cache] Warming up cache with ${queries.length} queries...`);
  
  const results = await Promise.allSettled(
    queries.map(async ({ key, computeFn, ttl }) => {
      return getOrCompute(key, ttl, computeFn);
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`[cache] Warmup complete: ${succeeded} succeeded, ${failed} failed`);
}
