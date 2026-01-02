/**
 * Recipe ID Cache Module
 * Maps stable recipe IDs to their original slugs and metadata
 */

interface CachedRecipe {
  recipeId: string;
  slug: string;
  title: string;
  ingredients: string[];
  fingerprint: string;
  timestamp: number;
}

interface CachedRecipeDetails {
  recipeId: string;
  fullDetails: any; // Full backend response
  timestamp: number;
}

// In-memory caches with TTL
const recipeCache = new Map<string, CachedRecipe>();
const recipeDetailsCache = new Map<string, CachedRecipeDetails>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Store recipe mapping in cache
 */
export function cacheRecipe(
  recipeId: string,
  slug: string,
  title: string,
  ingredients: string[],
  fingerprint: string
): void {
  recipeCache.set(recipeId, {
    recipeId,
    slug,
    title,
    ingredients,
    fingerprint,
    timestamp: Date.now()
  });
  
  console.log(`[RecipeCache] Cached recipe: ${recipeId} -> ${slug} (fp: ${fingerprint})`);
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
 * Cache full recipe details response
 */
export function cacheRecipeDetails(
  recipeId: string,
  fullDetails: any
): void {
  recipeDetailsCache.set(recipeId, {
    recipeId,
    fullDetails,
    timestamp: Date.now()
  });
  
  console.log(`[RecipeCache] Cached full details for: ${recipeId}`);
}

/**
 * Retrieve cached recipe details
 */
export function getCachedRecipeDetails(recipeId: string): any | null {
  const cached = recipeDetailsCache.get(recipeId);
  
  if (!cached) {
    console.log(`[RecipeCache] Details cache miss: ${recipeId}`);
    return null;
  }
  
  // Check if expired
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    console.log(`[RecipeCache] Details cache expired: ${recipeId} (age: ${age}ms)`);
    recipeDetailsCache.delete(recipeId);
    return null;
  }
  
  console.log(`[RecipeCache] Details cache hit: ${recipeId}`);
  return cached.fullDetails;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { 
  recipes: number; 
  details: number;
  recipeEntries: string[];
  detailEntries: string[];
} {
  return {
    recipes: recipeCache.size,
    details: recipeDetailsCache.size,
    recipeEntries: Array.from(recipeCache.keys()),
    detailEntries: Array.from(recipeDetailsCache.keys())
  };
}
