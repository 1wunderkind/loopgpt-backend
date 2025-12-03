/**
 * Simple in-memory caching (no Supabase dependency)
 */

const cache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}
