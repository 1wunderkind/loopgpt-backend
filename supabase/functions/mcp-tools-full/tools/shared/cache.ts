/**
 * Cache Layer for TheLoopGPT MCP Tools
 * Uses Supabase Postgres for persistent caching
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CacheError } from "./errors.ts";
import { logWarn, logDebug } from "./logging.ts";
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts";

let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new CacheError("Supabase credentials not configured");
    }
    
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

// Note: Cache table should be created manually in Supabase:
// CREATE TABLE IF NOT EXISTS tool_cache (
//   key TEXT PRIMARY KEY,
//   value JSONB NOT NULL,
//   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   expires_at TIMESTAMPTZ NOT NULL,
//   tool_name TEXT,
//   hit_count INTEGER DEFAULT 0
// );
// CREATE INDEX IF NOT EXISTS idx_tool_cache_expires_at ON tool_cache(expires_at);

/**
 * Generate deterministic cache key from input
 */
export function generateCacheKey(toolName: string, input: any): string {
  const inputStr = JSON.stringify(input, Object.keys(input).sort());
  const hash = createHash("md5");
  hash.update(inputStr);
  const hashHex = Array.from(hash.digest())
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${toolName}:${hashHex}`;
}

/**
 * Get value from cache
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("tool_cache")
      .select("value, expires_at")
      .eq("key", key)
      .single();

    if (error) {
      // Table might not exist yet - fail gracefully
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        logDebug("Cache table not found", { key });
        return null;
      }
      logWarn("Cache get error", { key, error: error.message });
      return null;
    }

    if (!data) {
      return null;
    }

    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      // Expired - delete it
      await getSupabaseClient().from("tool_cache").delete().eq("key", key);
      return null;
    }

    // Increment hit count (fire and forget)
    getSupabaseClient()
      .from("tool_cache")
      .update({ hit_count: supabase.rpc("increment", { x: 1 }) })
      .eq("key", key)
      .then(() => {});

    logDebug("Cache hit", { key });
    return data.value as T;
  } catch (err) {
    logWarn("Cache get error", { key, error: (err as Error).message });
    return null; // Fail gracefully
  }
}

/**
 * Set value in cache
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300,
  toolName?: string
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const { error } = await supabase
      .from("tool_cache")
      .upsert({
        key,
        value,
        expires_at: expiresAt.toISOString(),
        tool_name: toolName,
        hit_count: 0,
      });

    if (error) {
      throw new CacheError(`Failed to set cache: ${error.message}`);
    }

    logDebug("Cache set", { key, ttlSeconds, toolName });
  } catch (err) {
    logWarn("Cache set error", { key, error: (err as Error).message });
    // Don't throw - caching failures shouldn't break tools
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await getSupabaseClient().from("tool_cache").delete().eq("key", key);
    logDebug("Cache delete", { key });
  } catch (err) {
    logWarn("Cache delete error", { key, error: (err as Error).message });
  }
}

/**
 * Clear all cache entries for a tool
 */
export async function cacheClearTool(toolName: string): Promise<number> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("tool_cache")
      .delete()
      .eq("tool_name", toolName)
      .select("key");

    if (error) {
      throw new CacheError(`Failed to clear tool cache: ${error.message}`);
    }

    const count = data?.length || 0;
    logDebug("Cache cleared for tool", { toolName, count });
    return count;
  } catch (err) {
    logWarn("Cache clear error", { toolName, error: (err as Error).message });
    return 0;
  }
}

/**
 * Cleanup expired cache entries
 */
export async function cacheCleanup(): Promise<number> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("tool_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("key");

    if (error) {
      throw new CacheError(`Failed to cleanup cache: ${error.message}`);
    }

    const count = data?.length || 0;
    logDebug("Cache cleanup completed", { deletedCount: count });
    return count;
  } catch (err) {
    logWarn("Cache cleanup error", { error: (err as Error).message });
    return 0;
  }
}
