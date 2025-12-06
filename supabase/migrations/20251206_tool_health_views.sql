-- Migration: Tool Health Monitoring Views
-- Date: 2025-12-06
-- Purpose: Add materialized views for tool error rates and latency percentiles
--
-- This migration creates:
-- 1. analytics.tool_error_rate_24h - Per-tool error rates over 24 hours
-- 2. analytics.tool_latency_p50_p95_24h - Per-tool latency percentiles over 24 hours
-- 3. Updates analytics.refresh_all_views() to refresh these views

-- ============================================================================
-- 1. Tool Error Rate View (24 hours)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.tool_error_rate_24h AS
SELECT
  tool_name,
  COUNT(*) AS total_invocations,
  COUNT(*) FILTER (WHERE success = false) AS error_count,
  ROUND(
    (COUNT(*) FILTER (WHERE success = false)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS error_rate_pct,
  COUNT(DISTINCT error_code) FILTER (WHERE success = false) AS unique_error_codes,
  MODE() WITHIN GROUP (ORDER BY error_code) FILTER (WHERE success = false) AS most_common_error,
  COUNT(*) AS sample_size,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM analytics.tool_invocations
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY tool_name
ORDER BY error_rate_pct DESC NULLS LAST;

-- Index for fast lookups by tool_name
CREATE INDEX IF NOT EXISTS idx_tool_error_rate_24h_tool_name
  ON analytics.tool_error_rate_24h(tool_name);

COMMENT ON MATERIALIZED VIEW analytics.tool_error_rate_24h IS
  'Per-tool error rates over the last 24 hours. Refresh periodically to keep metrics current.';

-- ============================================================================
-- 2. Tool Latency Percentiles View (24 hours)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.tool_latency_p50_p95_24h AS
SELECT
  tool_name,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  ROUND(AVG(duration_ms), 2) AS avg_ms,
  MIN(duration_ms) AS min_ms,
  MAX(duration_ms) AS max_ms,
  COUNT(*) AS sample_size,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM analytics.tool_invocations
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND success = true  -- Only include successful invocations for latency metrics
GROUP BY tool_name
ORDER BY p95_ms DESC;

-- Index for fast lookups by tool_name
CREATE INDEX IF NOT EXISTS idx_tool_latency_24h_tool_name
  ON analytics.tool_latency_p50_p95_24h(tool_name);

COMMENT ON MATERIALIZED VIEW analytics.tool_latency_p50_p95_24h IS
  'Per-tool latency percentiles (P50, P95) over the last 24 hours for successful invocations only. Refresh periodically to keep metrics current.';

-- ============================================================================
-- 3. Update analytics.refresh_all_views() Function
-- ============================================================================

-- Check if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'refresh_all_views' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'analytics')
  ) THEN
    -- Function exists, replace it with updated version
    EXECUTE '
      CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
      RETURNS void
      LANGUAGE plpgsql
      AS $func$
      BEGIN
        -- Existing views (from Phase 1)
        REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_active_users;
        REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.recipe_acceptance_rate;
        REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.affiliate_conversion_rate;
        
        -- New observability views (from Step 2)
        REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.tool_error_rate_24h;
        REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.tool_latency_p50_p95_24h;
      END;
      $func$;
    ';
    
    RAISE NOTICE 'Updated analytics.refresh_all_views() to include new observability views';
  ELSE
    -- Function doesn''t exist, create it with just the new views
    CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
    RETURNS void
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Observability views (from Step 2)
      REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.tool_error_rate_24h;
      REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.tool_latency_p50_p95_24h;
      
      -- Note: If other materialized views exist (daily_active_users, recipe_acceptance_rate, etc.),
      -- add them here manually or run this migration after Phase 1 views are created.
    END;
    $func$;
    
    RAISE NOTICE 'Created analytics.refresh_all_views() with observability views';
  END IF;
END $$;

COMMENT ON FUNCTION analytics.refresh_all_views() IS
  'Refresh all materialized views in the analytics schema. Should be run periodically (e.g., hourly via cron job).';

-- ============================================================================
-- 4. Create Helper View: Tool Health Summary (Optional)
-- ============================================================================

-- This is a regular view (not materialized) that combines error rates and latency
-- for a quick health check dashboard
CREATE OR REPLACE VIEW analytics.tool_health_summary AS
SELECT
  COALESCE(e.tool_name, l.tool_name) AS tool_name,
  e.total_invocations,
  e.error_count,
  e.error_rate_pct,
  e.most_common_error,
  l.p50_ms,
  l.p95_ms,
  l.avg_ms,
  CASE
    WHEN e.error_rate_pct > 10 THEN 'critical'
    WHEN e.error_rate_pct > 5 THEN 'warning'
    WHEN l.p95_ms > 10000 THEN 'warning'  -- P95 > 10 seconds
    ELSE 'healthy'
  END AS health_status,
  GREATEST(e.last_seen, l.last_seen) AS last_activity
FROM analytics.tool_error_rate_24h e
FULL OUTER JOIN analytics.tool_latency_p50_p95_24h l
  ON e.tool_name = l.tool_name
ORDER BY
  CASE
    WHEN e.error_rate_pct > 10 THEN 1
    WHEN e.error_rate_pct > 5 THEN 2
    WHEN l.p95_ms > 10000 THEN 3
    ELSE 4
  END,
  e.error_rate_pct DESC NULLS LAST;

COMMENT ON VIEW analytics.tool_health_summary IS
  'Combined view of tool error rates and latency metrics with health status classification. Useful for dashboards and alerting.';

-- ============================================================================
-- 5. Initial Refresh (Optional)
-- ============================================================================

-- Refresh the views immediately after creation (if data exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM analytics.tool_invocations LIMIT 1) THEN
    REFRESH MATERIALIZED VIEW analytics.tool_error_rate_24h;
    REFRESH MATERIALIZED VIEW analytics.tool_latency_p50_p95_24h;
    RAISE NOTICE 'Initial refresh complete for tool health views';
  ELSE
    RAISE NOTICE 'No data in analytics.tool_invocations yet - skipping initial refresh';
  END IF;
END $$;

-- ============================================================================
-- 6. Log Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Tool health monitoring views created';
  RAISE NOTICE '  - analytics.tool_error_rate_24h';
  RAISE NOTICE '  - analytics.tool_latency_p50_p95_24h';
  RAISE NOTICE '  - analytics.tool_health_summary';
  RAISE NOTICE '  - analytics.refresh_all_views() updated';
END $$;
