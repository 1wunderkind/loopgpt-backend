-- Migration: MCP Tools Infrastructure
-- Creates tables for caching and rate limiting

-- ============================================================================
-- Tool Cache Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tool_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  tool_name TEXT,
  hit_count INTEGER DEFAULT 0
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_tool_cache_expires_at ON tool_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tool_cache_tool_name ON tool_cache(tool_name);

-- ============================================================================
-- Rate Limit Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  max_requests INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, window_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window ON rate_limits(user_id, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);

-- ============================================================================
-- Cleanup Functions
-- ============================================================================

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tool_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired rate limit windows
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits WHERE window_end < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get cache entry
CREATE OR REPLACE FUNCTION get_cache(cache_key TEXT)
RETURNS JSONB AS $$
DECLARE
  cached_value JSONB;
BEGIN
  SELECT value INTO cached_value
  FROM tool_cache
  WHERE key = cache_key
    AND expires_at > NOW();
  
  -- Increment hit count
  IF cached_value IS NOT NULL THEN
    UPDATE tool_cache
    SET hit_count = hit_count + 1
    WHERE key = cache_key;
  END IF;
  
  RETURN cached_value;
END;
$$ LANGUAGE plpgsql;

-- Function to set cache entry
CREATE OR REPLACE FUNCTION set_cache(
  cache_key TEXT,
  cache_value JSONB,
  ttl_seconds INTEGER DEFAULT 300,
  tool TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO tool_cache (key, value, expires_at, tool_name)
  VALUES (
    cache_key,
    cache_value,
    NOW() + (ttl_seconds || ' seconds')::INTERVAL,
    tool
  )
  ON CONFLICT (key) DO UPDATE
  SET
    value = cache_value,
    expires_at = NOW() + (ttl_seconds || ' seconds')::INTERVAL,
    tool_name = tool,
    hit_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE tool_cache IS 'Cache for MCP tool responses to reduce latency and costs';
COMMENT ON TABLE rate_limits IS 'Rate limiting for MCP tool calls per user';
COMMENT ON FUNCTION cleanup_expired_cache() IS 'Remove expired cache entries';
COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Remove expired rate limit windows';
COMMENT ON FUNCTION get_cache(TEXT) IS 'Get cached value if not expired';
COMMENT ON FUNCTION set_cache(TEXT, JSONB, INTEGER, TEXT) IS 'Set cache value with TTL';
