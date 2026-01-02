/**
 * Recipe ID Cache Module
 * Maps stable recipe IDs to their original slugs and metadata
 */

interface CachedRecipe {
  recipeId: string;
  slug: string;
  title: string;
  ingredients: string[];
  timestamp: number;
}

// In-memory cache with TTL
const recipeCache = new Map<string, CachedRecipe>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Store recipe mapping in cache
 */
export function cacheRecipe(
  recipeId: string,
  slug: string,
  title: string,
  ingredients: string[]
): void {
  recipeCache.set(recipeId, {
    recipeId,
    slug,
    title,
    ingredients,
    timestamp: Date.now()
  });
  
  console.log(`[RecipeCache] Cached recipe: ${recipeId} -> ${slug}`);
}

/**
 * Retrieve recipe from cache
 */
export function getCachedRecipe(recipeId: string): CachedRecipe | null {
  const cached = recipeCache.get(recipeId);
  
  if (!cached) {
    console.log(`[RecipeCache] Cache miss: ${recipeId}`);
    return null;
  }
  
  // Check if expired
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    console.log(`[RecipeCache] Cache expired: ${recipeId} (age: ${age}ms)`);
    recipeCache.delete(recipeId);
    return null;
  }
  
  console.log(`[RecipeCache] Cache hit: ${recipeId} -> ${cached.slug}`);
  return cached;
}

/**
 * Clean up expired entries (called periodically)
 */
export function cleanupCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [recipeId, cached] of recipeCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL_MS) {
      recipeCache.delete(recipeId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RecipeCache] Cleaned up ${cleaned} expired entries`);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: recipeCache.size,
    entries: Array.from(recipeCache.keys())
  };
}
