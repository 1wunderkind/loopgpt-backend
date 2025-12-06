-- ============================================================================
-- Analytics Monitoring & Health Checks
-- Created: 2025-12-06
-- Purpose: Daily health checks and monitoring queries for analytics data
-- ============================================================================

-- ============================================================================
-- DAILY HEALTH CHECK
-- Run this query every day to monitor analytics health
-- ============================================================================

CREATE OR REPLACE FUNCTION get_analytics_health_report()
RETURNS TABLE (
  category TEXT,
  metric TEXT,
  value TEXT,
  status TEXT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Data Collection Health
  SELECT 
    'Data Collection'::TEXT,
    'ingredient_submissions (24h)'::TEXT,
    COUNT(*)::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Collecting'
      ELSE 'No Data'
    END::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'success'
      ELSE 'warning'
    END::TEXT
  FROM ingredient_submissions
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'Data Collection'::TEXT,
    'recipe_events (24h)'::TEXT,
    COUNT(*)::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Collecting'
      ELSE 'No Data'
    END::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'success'
      ELSE 'warning'
    END::TEXT
  FROM recipe_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'Data Collection'::TEXT,
    'session_events (24h)'::TEXT,
    COUNT(*)::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'Collecting'
      ELSE 'No Data'
    END::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 'success'
      ELSE 'warning'
    END::TEXT
  FROM session_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Data Quality
  SELECT 
    'Data Quality'::TEXT,
    'Null ingredient names'::TEXT,
    ROUND(COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2)::TEXT || '%',
    CASE 
      WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) = 0 THEN 'No Nulls'
      WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / COUNT(*) < 1 THEN '<1% Nulls'
      ELSE '>1% Nulls'
    END::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) = 0 THEN 'success'
      WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / COUNT(*) < 1 THEN 'warning'
      ELSE 'error'
    END::TEXT
  FROM ingredient_submissions
  
  UNION ALL
  
  -- User Engagement
  SELECT 
    'Engagement'::TEXT,
    'DAU (yesterday)'::TEXT,
    COUNT(DISTINCT user_id)::TEXT,
    CASE 
      WHEN COUNT(DISTINCT user_id) > 10 THEN 'Healthy'
      WHEN COUNT(DISTINCT user_id) > 0 THEN 'Low'
      ELSE 'None'
    END::TEXT,
    CASE 
      WHEN COUNT(DISTINCT user_id) > 10 THEN 'success'
      WHEN COUNT(DISTINCT user_id) > 0 THEN 'warning'
      ELSE 'error'
    END::TEXT
  FROM session_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
    AND user_id IS NOT NULL
  
  UNION ALL
  
  -- Table Growth
  SELECT 
    'Growth'::TEXT,
    'Total events (all time)'::TEXT,
    (
      (SELECT COUNT(*) FROM ingredient_submissions) +
      (SELECT COUNT(*) FROM recipe_events) +
      (SELECT COUNT(*) FROM meal_logs) +
      (SELECT COUNT(*) FROM session_events)
    )::TEXT,
    'Growing'::TEXT,
    'info'::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ALERT QUERIES
-- Run these queries to detect issues that need immediate attention
-- ============================================================================

-- Alert: No data collected in last hour
CREATE OR REPLACE FUNCTION check_data_collection_stalled()
RETURNS TABLE (
  alert_type TEXT,
  table_name TEXT,
  last_event TIMESTAMP,
  hours_since_last_event NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    'DATA_COLLECTION_STALLED'::TEXT,
    'ingredient_submissions'::TEXT,
    MAX(created_at),
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600
  FROM ingredient_submissions
  HAVING MAX(created_at) < NOW() - INTERVAL '1 hour'
  
  UNION ALL
  
  SELECT 
    'DATA_COLLECTION_STALLED'::TEXT,
    'session_events'::TEXT,
    MAX(created_at),
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600
  FROM session_events
  HAVING MAX(created_at) < NOW() - INTERVAL '1 hour';
  
END;
$$ LANGUAGE plpgsql;

-- Alert: High null rate in critical fields
CREATE OR REPLACE FUNCTION check_high_null_rate()
RETURNS TABLE (
  alert_type TEXT,
  table_name TEXT,
  field_name TEXT,
  null_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    'HIGH_NULL_RATE'::TEXT,
    'ingredient_submissions'::TEXT,
    'ingredient_name'::TEXT,
    ROUND(COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2)
  FROM ingredient_submissions
  HAVING COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / COUNT(*) > 1
  
  UNION ALL
  
  SELECT 
    'HIGH_NULL_RATE'::TEXT,
    'recipe_events'::TEXT,
    'recipe_id'::TEXT,
    ROUND(COUNT(*) FILTER (WHERE recipe_id IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2)
  FROM recipe_events
  HAVING COUNT(*) FILTER (WHERE recipe_id IS NULL) * 100.0 / COUNT(*) > 1;
  
END;
$$ LANGUAGE plpgsql;

-- Alert: Duplicate events detected
CREATE OR REPLACE FUNCTION check_duplicate_events()
RETURNS TABLE (
  alert_type TEXT,
  table_name TEXT,
  duplicate_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  
  SELECT 
    'DUPLICATE_EVENTS'::TEXT,
    'session_events'::TEXT,
    COUNT(*)
  FROM (
    SELECT session_id, gpt_name, event_type, created_at, COUNT(*) as dup_count
    FROM session_events
    GROUP BY session_id, gpt_name, event_type, created_at
    HAVING COUNT(*) > 1
  ) duplicates;
  
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- KEY METRICS DASHBOARD
-- Quick overview of key metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_key_metrics_dashboard(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  metric_category TEXT,
  metric_name TEXT,
  current_value TEXT,
  previous_value TEXT,
  change_percentage TEXT
) AS $$
BEGIN
  RETURN QUERY
  
  -- Daily Active Users
  SELECT 
    'Engagement'::TEXT,
    'Daily Active Users (avg)'::TEXT,
    (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::TEXT,
    (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL) > 0 THEN
        ROUND(
          ((SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC - 
           (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(DISTINCT user_id) FROM session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC, 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Recipe Acceptance Rate
  SELECT 
    'Product'::TEXT,
    'Recipe Acceptance Rate'::TEXT,
    ROUND(COALESCE((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL), 0), 1)::TEXT || '%',
    ROUND(COALESCE((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL), 0), 1)::TEXT || '%',
    CASE 
      WHEN (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL) - 
           (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)) * 100.0 / 
          (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL), 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Total Ingredient Submissions
  SELECT 
    'Usage'::TEXT,
    'Ingredient Submissions'::TEXT,
    (SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    (SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC - 
           (SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(*) FROM ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC, 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Meal Plans Generated
  SELECT 
    'Usage'::TEXT,
    'Meal Plans Generated'::TEXT,
    (SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    (SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC - 
           (SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(*) FROM meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC, 1
        )::TEXT || '%'
      ELSE 'N/A'
    END;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Run daily health check
-- SELECT * FROM get_analytics_health_report();

-- Check for alerts
-- SELECT * FROM check_data_collection_stalled();
-- SELECT * FROM check_high_null_rate();
-- SELECT * FROM check_duplicate_events();

-- View key metrics dashboard (last 7 days)
-- SELECT * FROM get_key_metrics_dashboard(7);

-- View key metrics dashboard (last 30 days)
-- SELECT * FROM get_key_metrics_dashboard(30);
