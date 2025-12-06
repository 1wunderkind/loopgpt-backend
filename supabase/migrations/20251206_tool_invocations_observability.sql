-- Migration: Tool Invocations Observability Layer
-- Date: 2025-12-06
-- Purpose: Add comprehensive per-tool observability with analytics.tool_invocations table
--
-- This migration creates:
-- 1. analytics.tool_invocations table for logging all tool executions
-- 2. Indexes for efficient querying by tool_name, created_at, and success
-- 3. RLS policy for service_role access only

-- ============================================================================
-- 1. Create analytics.tool_invocations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics.tool_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tool identity
  tool_name TEXT NOT NULL,

  -- Optional user/session context (TEXT to decouple from auth schema)
  user_id TEXT,
  session_id TEXT,
  gpt_name TEXT, -- e.g. 'LeftoverGPT', 'MealPlannerGPT', 'RecipeGPT'

  -- Timing + outcome
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,

  success BOOLEAN NOT NULL,
  error_code TEXT,          -- maps to ToolErrorCode when success = false

  -- High-level metadata
  provider TEXT,            -- e.g. 'MealMe', 'Instacart', 'Affiliate:US'
  source_gpt TEXT,          -- optional extra source classification

  -- Arbitrary JSON for debugging and enrichment
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Create Indexes for Query Performance
-- ============================================================================

-- Index for filtering by tool name (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tool_invocations_tool_name
  ON analytics.tool_invocations(tool_name);

-- Index for time-based queries (24h windows, etc.)
CREATE INDEX IF NOT EXISTS idx_tool_invocations_created_at
  ON analytics.tool_invocations(created_at DESC);

-- Index for filtering by success/failure
CREATE INDEX IF NOT EXISTS idx_tool_invocations_success
  ON analytics.tool_invocations(success);

-- Composite index for common query pattern: tool + time + success
CREATE INDEX IF NOT EXISTS idx_tool_invocations_tool_time_success
  ON analytics.tool_invocations(tool_name, created_at DESC, success);

-- Index for error analysis
CREATE INDEX IF NOT EXISTS idx_tool_invocations_error_code
  ON analytics.tool_invocations(error_code)
  WHERE error_code IS NOT NULL;

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE analytics.tool_invocations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can access (analytics-only table)
CREATE POLICY service_role_all ON analytics.tool_invocations
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. Add Comment for Documentation
-- ============================================================================

COMMENT ON TABLE analytics.tool_invocations IS 
  'Observability table for tracking all MCP tool invocations with timing, success/failure, and error codes. Used for monitoring, alerting, and performance analysis.';

COMMENT ON COLUMN analytics.tool_invocations.tool_name IS 
  'Name of the MCP tool that was invoked (e.g., delivery_search_restaurants, get_affiliate_links)';

COMMENT ON COLUMN analytics.tool_invocations.duration_ms IS 
  'Total execution time in milliseconds, including retries';

COMMENT ON COLUMN analytics.tool_invocations.error_code IS 
  'Standardized error code from ToolErrorCode enum (TIMEOUT, NETWORK_ERROR, UPSTREAM_4XX, UPSTREAM_5XX, VALIDATION_ERROR, UNKNOWN)';

COMMENT ON COLUMN analytics.tool_invocations.metadata IS 
  'Arbitrary JSON for debugging context (keep lightweight to avoid storage bloat)';

-- ============================================================================
-- 5. Log Migration Completion
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE 'Migration complete: analytics.tool_invocations table created with % indexes', 
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'tool_invocations' AND schemaname = 'analytics');
END $$;
