-- MCP Tools Caching and Rate Limiting Tables

-- Cache table for storing OpenAI responses
CREATE TABLE IF NOT EXISTS mcp_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mcp_cache_expires ON mcp_cache(expires_at);

-- Rate limit table for tracking user requests
CREATE TABLE IF NOT EXISTS mcp_rate_limits (
  user_id TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_rate_limits_window ON mcp_rate_limits(window_start);

-- Function to clean up expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mcp_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mcp_rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
