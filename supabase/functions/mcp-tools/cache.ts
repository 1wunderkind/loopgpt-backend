/**
 * Postgres-backed caching layer for MCP Tools
 * Provides persistent, fast caching across Edge Function invocations
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn("[cache] Supabase not configured, caching disabled");
      return null;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseClient;
}

/**
 * Get value from cache
 * Returns null if not found or expired
 */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from("mcp_cache")
      .select("value, expires_at, hit_count")
      .eq("key", key)
      .single();
    
    if (error) {
      // Table might not exist yet or no data found
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error("[cache] Get error:", error.message);
      return null;
    }
    
    if (!data) return null;
    
    // Check expiration
    if (new Date(data.expires_at) < new Date()) {
      // Expired, delete it (fire and forget)
      client.from("mcp_cache").delete().eq("key", key).then(() => {});
      return null;
    }
    
    // Increment hit count (fire and forget)
    client
      .from("mcp_cache")
      .update({ 
        hit_count: (data.hit_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("key", key)
      .then(() => {});
    
    console.log("[cache] Hit", { key, hitCount: data.hit_count + 1 });
    return data.value;
  } catch (error: any) {
    console.error("[cache] Get error:", error.message);
    return null; // Fail gracefully
  }
}

/**
 * Set value in cache with TTL
 * @param key - Cache key
 * @param value - Value to cache (string)
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function cacheSet(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    const { error } = await client
      .from("mcp_cache")
      .upsert({
        key,
        value,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        hit_count: 0
      }, {
        onConflict: 'key'
      });
    
    if (error) {
      console.error("[cache] Set error:", error.message);
      // Don't throw - caching failures shouldn't break the app
      return;
    }
    
    console.log("[cache] Set", { key, ttlSeconds });
  } catch (error: any) {
    console.error("[cache] Set error:", error.message);
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    
    await client.from("mcp_cache").delete().eq("key", key);
    console.log("[cache] Delete", { key });
  } catch (error: any) {
    console.error("[cache] Delete error:", error.message);
  }
}

/**
 * Get cache statistics
 */
export async function cacheStats(): Promise<{totalEntries: number, totalHits: number} | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from("mcp_cache")
      .select("hit_count");
    
    if (error) return null;
    
    const totalEntries = data?.length || 0;
    const totalHits = data?.reduce((sum: number, row: any) => sum + (row.hit_count || 0), 0) || 0;
    
    return { totalEntries, totalHits };
  } catch (error: any) {
    console.error("[cache] Stats error:", error.message);
    return null;
  }
}
