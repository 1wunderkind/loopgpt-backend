-- ============================================================================
-- Step 5: Security Hardening - Rate Limiting & Audit Logging
-- ============================================================================
-- Creates tables for:
-- 1. Multi-scope rate limiting (IP, user, tool, global)
-- 2. Security audit events for sensitive actions
--
-- Part of: Step 5 - Rate Limiting & Security Hardening
-- ============================================================================

-- ============================================================================
-- 1. Rate Limiting System
-- ============================================================================

-- Create analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS analytics;

-- Rate limit counters table with TTL-based tracking
CREATE TABLE IF NOT EXISTS analytics.rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Composite key for fast lookups
  key TEXT NOT NULL,          -- e.g. "ip:1.2.3.4:tool:search_restaurants:minute"
  
  -- Scope information
  scope TEXT NOT NULL,        -- "ip" | "user" | "tool" | "global"
  subject TEXT NOT NULL,      -- The IP or userId or tool name
  window TEXT NOT NULL,       -- "minute" | "hour" | "day"
  window_start TIMESTAMPTZ NOT NULL,
  
  -- Counter
  count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_scope CHECK (scope IN ('ip', 'user', 'tool', 'global')),
  CONSTRAINT valid_window CHECK (window IN ('minute', 'hour', 'day')),
  CONSTRAINT positive_count CHECK (count >= 0)
);

-- Unique index on key for atomic upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_key
  ON analytics.rate_limit_counters(key);

-- Index for cleanup queries (delete old records)
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start
  ON analytics.rate_limit_counters(window_start);

-- Index for scope-based queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_scope_subject
  ON analytics.rate_limit_counters(scope, subject, window_start DESC);

-- Comments
COMMENT ON TABLE analytics.rate_limit_counters IS 
  'Tracks rate limit counters per IP/user/tool with TTL-based windows';
COMMENT ON COLUMN analytics.rate_limit_counters.key IS 
  'Composite key: {scope}:{subject}:{window} for atomic upserts';
COMMENT ON COLUMN analytics.rate_limit_counters.scope IS 
  'Rate limit scope: ip, user, tool, or global';
COMMENT ON COLUMN analytics.rate_limit_counters.subject IS 
  'The entity being rate limited (IP address, user ID, tool name)';
COMMENT ON COLUMN analytics.rate_limit_counters.window IS 
  'Time window: minute, hour, or day';
COMMENT ON COLUMN analytics.rate_limit_counters.window_start IS 
  'Start of the current time window (deterministic bucketing)';

-- ============================================================================
-- 2. Security Audit Events
-- ============================================================================

-- Security audit log for sensitive actions
CREATE TABLE IF NOT EXISTS analytics.security_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event information
  event_type TEXT NOT NULL,     -- e.g. "ORDER_CONFIRMED", "GOAL_UPDATED", "WEIGHT_LOGGED"
  
  -- User context
  user_id TEXT,                 -- User ID (if authenticated)
  session_id TEXT,              -- Session ID (if available)
  
  -- Request context
  tool_name TEXT,               -- MCP tool that triggered the event
  client_ip TEXT,               -- Client IP address
  
  -- Event data (redacted)
  metadata JSONB,               -- Additional context (must be redacted)
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_audit_events_created_at
  ON analytics.security_audit_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_event_type
  ON analytics.security_audit_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_user_id
  ON analytics.security_audit_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_audit_events_tool_name
  ON analytics.security_audit_events(tool_name, created_at DESC)
  WHERE tool_name IS NOT NULL;

-- Comments
COMMENT ON TABLE analytics.security_audit_events IS 
  'Audit log for sensitive actions (orders, goals, weight, profile updates)';
COMMENT ON COLUMN analytics.security_audit_events.event_type IS 
  'Type of security event (ORDER_CONFIRMED, GOAL_UPDATED, etc.)';
COMMENT ON COLUMN analytics.security_audit_events.metadata IS 
  'Additional event context (MUST be redacted before storage)';

-- ============================================================================
-- 3. Cleanup Functions
-- ============================================================================

-- Cleanup old rate limit counters (run daily via cron)
CREATE OR REPLACE FUNCTION analytics.cleanup_old_rate_limit_counters()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 7 days
  DELETE FROM analytics.rate_limit_counters
  WHERE window_start < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION analytics.cleanup_old_rate_limit_counters IS 
  'Removes rate limit counters older than 7 days (run daily)';

-- Cleanup old security audit events (run monthly via cron)
CREATE OR REPLACE FUNCTION analytics.cleanup_old_security_audit_events(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than retention period
  DELETE FROM analytics.security_audit_events
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION analytics.cleanup_old_security_audit_events IS 
  'Removes security audit events older than retention period (default 90 days)';

-- ============================================================================
-- 4. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE analytics.rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.security_audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage rate limit counters
CREATE POLICY "Service role can manage rate limit counters"
  ON analytics.rate_limit_counters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Service role can manage security audit events
CREATE POLICY "Service role can manage security audit events"
  ON analytics.security_audit_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Users can view their own audit events (read-only)
CREATE POLICY "Users can view own security audit events"
  ON analytics.security_audit_events
  FOR SELECT
  USING (auth.uid()::TEXT = user_id);

-- ============================================================================
-- 5. Grants
-- ============================================================================

-- Grant execute permission on cleanup functions to service role
GRANT EXECUTE ON FUNCTION analytics.cleanup_old_rate_limit_counters TO service_role;
GRANT EXECUTE ON FUNCTION analytics.cleanup_old_security_audit_events TO service_role;

-- Grant table access to service role (for Edge Functions)
GRANT ALL ON analytics.rate_limit_counters TO service_role;
GRANT ALL ON analytics.security_audit_events TO service_role;

-- Grant read access to authenticated users for their own audit events
GRANT SELECT ON analytics.security_audit_events TO authenticated;

-- ============================================================================
-- 6. Initial Data / Validation
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'analytics' 
    AND table_name = 'rate_limit_counters'
  ) THEN
    RAISE EXCEPTION 'Failed to create analytics.rate_limit_counters table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'analytics' 
    AND table_name = 'security_audit_events'
  ) THEN
    RAISE EXCEPTION 'Failed to create analytics.security_audit_events table';
  END IF;
  
  RAISE NOTICE 'Step 5 security hardening migration completed successfully';
END $$;
