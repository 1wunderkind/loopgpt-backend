/**
 * Example: Cached Food Search Implementation
 * Demonstrates how to use Redis caching for food search
 */

import { cache, CacheKeys, CacheTTL } from '../RedisCache.ts';
import { dbOptimizer } from '../DatabaseOptimizer.ts';
import { Logger } from '../../monitoring/Logger.ts';

const logger = new Logger('CachedFoodSearch');

export interface FoodSearchParams {
  query: string;
  limit?: number;
  category?: string;
  brand?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Search for foods with caching
 * 
 * Performance:
 * - Without cache: ~300-500ms (database query)
 * - With cache: ~5-10ms (Redis lookup)
 * - Improvement: 30-100x faster
 */
export async function searchFoods(
  params: FoodSearchParams
): Promise<FoodItem[]> {
  const { query, limit = 20, category, brand } = params;

  // Generate cache key
  const cacheKey = CacheKeys.foodSearch(query, limit);

  // Try cache first
  const cached = await cache.get<FoodItem[]>(cacheKey);
  if (cached !== null) {
    logger.info('Food search cache HIT', { query, limit });
    return cached;
  }

  logger.info('Food search cache MISS', { query, limit });

  // Cache miss - query database
  const results = await dbOptimizer.measureQuery(
    'food_search',
    async () => {
      // TODO: Implement actual database query
      // This is a placeholder implementation
      return mockDatabaseQuery(query, limit, category, brand);
    }
  );

  // Store in cache
  await cache.set(cacheKey, results, CacheTTL.FOOD_SEARCH);

  return results;
}

/**
 * Get food details with caching
 * 
 * Performance:
 * - Without cache: ~50-100ms (database query)
 * - With cache: ~5-10ms (Redis lookup)
 * - Improvement: 5-20x faster
 */
export async function getFoodDetails(
  foodId: string
): Promise<FoodItem | null> {
  // Generate cache key
  const cacheKey = CacheKeys.foodDetails(foodId);

  // Use getOrSet pattern (cache-aside)
  const food = await cache.getOrSet(
    cacheKey,
    async () => {
      logger.info('Food details cache MISS', { foodId });

      // Query database
      return await dbOptimizer.measureQuery(
        'food_details',
        async () => {
          // TODO: Implement actual database query
          return mockGetFoodById(foodId);
        }
      );
    },
    CacheTTL.FOOD_DETAILS
  );

  if (food) {
    logger.info('Food details retrieved', { foodId, cached: true });
  }

  return food;
}

/**
 * Batch get food details with caching
 * 
 * Performance:
 * - Without cache: ~200-500ms (multiple database queries)
 * - With cache: ~10-30ms (multiple Redis lookups)
 * - Improvement: 10-50x faster
 */
export async function batchGetFoodDetails(
  foodIds: string[]
): Promise<Map<string, FoodItem>> {
  const results = new Map<string, FoodItem>();

  // Try to get all from cache first
  const cachePromises = foodIds.map(async (id) => {
    const cacheKey = CacheKeys.foodDetails(id);
    const cached = await cache.get<FoodItem>(cacheKey);
    return { id, food: cached };
  });

  const cacheResults = await Promise.all(cachePromises);

  // Separate hits and misses
  const hits: string[] = [];
  const misses: string[] = [];

  for (const { id, food } of cacheResults) {
    if (food) {
      results.set(id, food);
      hits.push(id);
    } else {
      misses.push(id);
    }
  }

  logger.info('Batch food details cache results', {
    total: foodIds.length,
    hits: hits.length,
    misses: misses.length,
    hitRate: hits.length / foodIds.length,
  });

  // Query database for misses
  if (misses.length > 0) {
    const dbResults = await dbOptimizer.measureQuery(
      'batch_food_details',
      async () => {
        // TODO: Implement actual batch database query
        return mockBatchGetFoodsByIds(misses);
      }
    );

    // Store misses in cache and add to results
    for (const food of dbResults) {
      results.set(food.id, food);

      const cacheKey = CacheKeys.foodDetails(food.id);
      await cache.set(cacheKey, food, CacheTTL.FOOD_DETAILS);
    }
  }

  return results;
}

/**
 * Invalidate food search cache
 * Call this when food data is updated
 */
export async function invalidateFoodCache(foodId?: string): Promise<void> {
  if (foodId) {
    // Invalidate specific food
    const cacheKey = CacheKeys.foodDetails(foodId);
    await cache.delete(cacheKey);
    logger.info('Food cache invalidated', { foodId });
  } else {
    // Invalidate all food searches
    const count = await cache.invalidatePattern('food:*');
    logger.info('All food cache invalidated', { count });
  }
}

// ============================================================================
// MOCK DATABASE FUNCTIONS (replace with actual implementations)
// ============================================================================

async function mockDatabaseQuery(
  query: string,
  limit: number,
  category?: string,
  brand?: string
): Promise<FoodItem[]> {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Mock results
  return [
    {
      id: '1',
      name: `${query} - Result 1`,
      brand: brand || 'Generic',
      category: category || 'Food',
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
    },
    {
      id: '2',
      name: `${query} - Result 2`,
      brand: brand || 'Generic',
      category: category || 'Food',
      calories: 150,
      protein: 15,
      carbs: 25,
      fat: 7,
    },
  ].slice(0, limit);
}

async function mockGetFoodById(foodId: string): Promise<FoodItem | null> {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 50));

  return {
    id: foodId,
    name: `Food ${foodId}`,
    brand: 'Generic',
    category: 'Food',
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
  };
}

async function mockBatchGetFoodsByIds(foodIds: string[]): Promise<FoodItem[]> {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 200));

  return foodIds.map(id => ({
    id,
    name: `Food ${id}`,
    brand: 'Generic',
    category: 'Food',
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
  }));
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Simple food search with caching
 */
export async function exampleSimpleSearch() {
  // First call - cache miss, queries database (~300ms)
  const results1 = await searchFoods({ query: 'chicken', limit: 10 });
  console.log('First call:', results1.length, 'results');

  // Second call - cache hit, returns from Redis (~5ms)
  const results2 = await searchFoods({ query: 'chicken', limit: 10 });
  console.log('Second call:', results2.length, 'results');

  // Result: 60x faster on second call!
}

/**
 * Example 2: Batch food details with caching
 */
export async function exampleBatchDetails() {
  const foodIds = ['1', '2', '3', '4', '5'];

  // First call - all cache misses (~200ms)
  const results1 = await batchGetFoodDetails(foodIds);
  console.log('First call:', results1.size, 'foods');

  // Second call - all cache hits (~10ms)
  const results2 = await batchGetFoodDetails(foodIds);
  console.log('Second call:', results2.size, 'foods');

  // Result: 20x faster on second call!
}

/**
 * Example 3: Cache invalidation
 */
export async function exampleCacheInvalidation() {
  // Search and cache results
  await searchFoods({ query: 'apple' });

  // Update food data in database
  // ... (database update code)

  // Invalidate cache
  await invalidateFoodCache();

  // Next search will be cache miss and get fresh data
  await searchFoods({ query: 'apple' });
}

/**
 * Example 4: Get cache statistics
 */
export async function exampleCacheStats() {
  // Perform some searches
  await searchFoods({ query: 'banana' });
  await searchFoods({ query: 'banana' }); // cache hit
  await searchFoods({ query: 'apple' });
  await searchFoods({ query: 'apple' }); // cache hit

  // Get statistics
  const stats = cache.getStats();
  console.log('Cache statistics:', {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    totalRequests: stats.totalRequests,
  });

  // Expected output:
  // hits: 2, misses: 2, hitRate: 50%, totalRequests: 4
}
