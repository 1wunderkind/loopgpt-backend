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
  FROM analytics.ingredient_submissions
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
  FROM analytics.recipe_events
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
  FROM analytics.session_events
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
  FROM analytics.ingredient_submissions
  
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
  FROM analytics.session_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
    AND user_id IS NOT NULL
  
  UNION ALL
  
  -- Table Growth
  SELECT 
    'Growth'::TEXT,
    'Total events (all time)'::TEXT,
    (
      (SELECT COUNT(*) FROM analytics.ingredient_submissions) +
      (SELECT COUNT(*) FROM analytics.recipe_events) +
      (SELECT COUNT(*) FROM analytics.meal_logs) +
      (SELECT COUNT(*) FROM analytics.session_events)
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
  FROM analytics.ingredient_submissions
  HAVING MAX(created_at) < NOW() - INTERVAL '1 hour'
  
  UNION ALL
  
  SELECT 
    'DATA_COLLECTION_STALLED'::TEXT,
    'session_events'::TEXT,
    MAX(created_at),
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600
  FROM analytics.session_events
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
  FROM analytics.ingredient_submissions
  HAVING COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / COUNT(*) > 1
  
  UNION ALL
  
  SELECT 
    'HIGH_NULL_RATE'::TEXT,
    'recipe_events'::TEXT,
    'recipe_id'::TEXT,
    ROUND(COUNT(*) FILTER (WHERE recipe_id IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2)
  FROM analytics.recipe_events
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
    FROM analytics.session_events
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
    (SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::TEXT,
    (SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL) > 0 THEN
        ROUND(
          ((SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC - 
           (SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(DISTINCT user_id) FROM analytics.session_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL AND user_id IS NOT NULL)::NUMERIC, 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Recipe Acceptance Rate
  SELECT 
    'Product'::TEXT,
    'Recipe Acceptance Rate'::TEXT,
    ROUND(COALESCE((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL), 0), 1)::TEXT || '%',
    ROUND(COALESCE((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL), 0), 1)::TEXT || '%',
    CASE 
      WHEN (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL) - 
           (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)) * 100.0 / 
          (SELECT COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0) FROM analytics.recipe_events WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL), 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Total Ingredient Submissions
  SELECT 
    'Usage'::TEXT,
    'Ingredient Submissions'::TEXT,
    (SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    (SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC - 
           (SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(*) FROM analytics.ingredient_submissions WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC, 1
        )::TEXT || '%'
      ELSE 'N/A'
    END
  
  UNION ALL
  
  -- Meal Plans Generated
  SELECT 
    'Usage'::TEXT,
    'Meal Plans Generated'::TEXT,
    (SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    (SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL) > 0 THEN
        ROUND(
          ((SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC - 
           (SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC) * 100.0 / 
          (SELECT COUNT(*) FROM analytics.meal_plans WHERE created_at >= CURRENT_DATE - (days_back * 2 || ' days')::INTERVAL AND created_at < CURRENT_DATE - (days_back || ' days')::INTERVAL)::NUMERIC, 1
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
-- ============================================================================
-- Analytics Dashboard - Key Metrics & Visualizations
-- Created: 2025-12-06
-- Purpose: Pre-built queries for analytics dashboard
-- ============================================================================

-- ============================================================================
-- OVERVIEW METRICS
-- ============================================================================

-- Daily Active Users (Last 30 Days)
CREATE OR REPLACE VIEW daily_active_users_30d AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(*) as events
FROM analytics.session_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top Ingredients (Last 7 Days)
CREATE OR REPLACE VIEW top_ingredients_7d AS
SELECT 
  ingredient_name,
  COUNT(*) as submission_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  source_gpt,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM analytics.ingredient_submissions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ingredient_name, source_gpt
ORDER BY submission_count DESC
LIMIT 50;

-- Recipe Performance (Last 30 Days)
CREATE OR REPLACE VIEW recipe_performance_30d AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'generated') as generated,
  COUNT(*) FILTER (WHERE event_type = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0),
    2
  ) as acceptance_rate
FROM analytics.recipe_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- GPT Usage Distribution (Last 7 Days)
CREATE OR REPLACE VIEW gpt_usage_7d AS
SELECT 
  gpt_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))), 2) as avg_duration_seconds,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM analytics.session_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY gpt_name
ORDER BY total_events DESC;

-- ============================================================================
-- USER ENGAGEMENT METRICS
-- ============================================================================

-- User Retention Cohort (Weekly)
CREATE OR REPLACE VIEW user_retention_weekly AS
WITH first_seen AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', MIN(created_at)) as cohort_week
  FROM analytics.session_events
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', created_at) as activity_week
  FROM analytics.session_events
  WHERE user_id IS NOT NULL
  GROUP BY user_id, DATE_TRUNC('week', created_at)
)
SELECT 
  fs.cohort_week,
  COUNT(DISTINCT fs.user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week THEN a.user_id END) as week_0,
  COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '1 week' THEN a.user_id END) as week_1,
  COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '2 weeks' THEN a.user_id END) as week_2,
  COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '3 weeks' THEN a.user_id END) as week_3,
  ROUND(COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '1 week' THEN a.user_id END) * 100.0 / COUNT(DISTINCT fs.user_id), 2) as retention_week_1,
  ROUND(COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '2 weeks' THEN a.user_id END) * 100.0 / COUNT(DISTINCT fs.user_id), 2) as retention_week_2
FROM first_seen fs
LEFT JOIN activity a ON fs.user_id = a.user_id
GROUP BY fs.cohort_week
ORDER BY fs.cohort_week DESC;

-- User Engagement Levels (Last 30 Days)
CREATE OR REPLACE VIEW user_engagement_levels_30d AS
WITH user_activity AS (
  SELECT 
    user_id,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_events
  FROM analytics.session_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND user_id IS NOT NULL
  GROUP BY user_id
)
SELECT 
  CASE 
    WHEN active_days >= 20 THEN 'Power User (20+ days)'
    WHEN active_days >= 10 THEN 'Active User (10-19 days)'
    WHEN active_days >= 3 THEN 'Regular User (3-9 days)'
    ELSE 'Casual User (1-2 days)'
  END as engagement_level,
  COUNT(*) as user_count,
  ROUND(AVG(active_days), 1) as avg_active_days,
  ROUND(AVG(sessions), 1) as avg_sessions,
  ROUND(AVG(total_events), 1) as avg_events,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_activity
GROUP BY 
  CASE 
    WHEN active_days >= 20 THEN 'Power User (20+ days)'
    WHEN active_days >= 10 THEN 'Active User (10-19 days)'
    WHEN active_days >= 3 THEN 'Regular User (3-9 days)'
    ELSE 'Casual User (1-2 days)'
  END
ORDER BY 
  CASE 
    WHEN engagement_level LIKE 'Power%' THEN 1
    WHEN engagement_level LIKE 'Active%' THEN 2
    WHEN engagement_level LIKE 'Regular%' THEN 3
    ELSE 4
  END;

-- ============================================================================
-- PRODUCT METRICS
-- ============================================================================

-- Meal Planning Funnel (Last 30 Days)
CREATE OR REPLACE VIEW meal_planning_funnel_30d AS
WITH funnel_steps AS (
  SELECT 
    COUNT(DISTINCT mp.id) as meal_plans_generated,
    COUNT(DISTINCT CASE WHEN mp.metadata->>'hasGroceryList' = 'true' THEN mp.id END) as with_grocery_list,
    COUNT(DISTINCT ae.id) FILTER (WHERE ae.event_type = 'impression') as affiliate_impressions,
    COUNT(DISTINCT ae.id) FILTER (WHERE ae.event_type = 'click') as affiliate_clicks
  FROM analytics.meal_plans mp
  LEFT JOIN analytics.affiliate_events ae ON ae.session_id = mp.session_id
  WHERE mp.created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  'Meal Plans Generated' as step,
  meal_plans_generated as count,
  100.0 as conversion_rate
FROM funnel_steps
UNION ALL
SELECT 
  'With Grocery List',
  with_grocery_list,
  ROUND(with_grocery_list * 100.0 / NULLIF(meal_plans_generated, 0), 2)
FROM funnel_steps
UNION ALL
SELECT 
  'Affiliate Impressions',
  affiliate_impressions,
  ROUND(affiliate_impressions * 100.0 / NULLIF(meal_plans_generated, 0), 2)
FROM funnel_steps
UNION ALL
SELECT 
  'Affiliate Clicks',
  affiliate_clicks,
  ROUND(affiliate_clicks * 100.0 / NULLIF(affiliate_impressions, 0), 2)
FROM funnel_steps;

-- Recipe Chaos Mode Analysis (Last 30 Days)
CREATE OR REPLACE VIEW recipe_chaos_analysis_30d AS
SELECT 
  chaos_rating_shown,
  COUNT(*) FILTER (WHERE event_type = 'generated') as generated,
  COUNT(*) FILTER (WHERE event_type = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE event_type = 'rejected') as rejected,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'accepted') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0),
    2
  ) as acceptance_rate,
  ROUND(AVG(metadata->>'generationTimeMs')::NUMERIC / 1000, 2) as avg_generation_time_seconds
FROM analytics.recipe_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND chaos_rating_shown IS NOT NULL
GROUP BY chaos_rating_shown
ORDER BY chaos_rating_shown;

-- ============================================================================
-- COMMERCE METRICS
-- ============================================================================

-- Affiliate Performance (Last 30 Days)
CREATE OR REPLACE VIEW affiliate_performance_30d AS
SELECT 
  provider_name,
  COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
  COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'click') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0),
    2
  ) as ctr,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'conversion') * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0),
    2
  ) as conversion_rate,
  SUM((metadata->>'estimatedRevenueUsd')::NUMERIC) FILTER (WHERE event_type = 'conversion') as total_revenue_usd
FROM analytics.affiliate_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_name
ORDER BY clicks DESC;

-- Daily Affiliate Revenue (Last 30 Days)
CREATE OR REPLACE VIEW daily_affiliate_revenue_30d AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
  SUM((metadata->>'estimatedRevenueUsd')::NUMERIC) FILTER (WHERE event_type = 'conversion') as revenue_usd
FROM analytics.affiliate_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- NUTRITION & MEAL LOGGING METRICS
-- ============================================================================

-- Meal Logging Activity (Last 30 Days)
CREATE OR REPLACE VIEW meal_logging_activity_30d AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as meals_logged,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(AVG(calories_kcal), 0) as avg_calories,
  ROUND(AVG(protein_g), 1) as avg_protein_g,
  ROUND(AVG(carbs_g), 1) as avg_carbs_g,
  ROUND(AVG(fat_g), 1) as avg_fat_g
FROM analytics.meal_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User Dietary Preferences Distribution
CREATE OR REPLACE VIEW dietary_preferences_distribution AS
SELECT 
  diet_style,
  COUNT(*) as user_count,
  ROUND(AVG(target_calories_per_day), 0) as avg_target_calories,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM analytics.user_goals
WHERE diet_style IS NOT NULL
GROUP BY diet_style
ORDER BY user_count DESC;

-- ============================================================================
-- GROWTH METRICS
-- ============================================================================

-- Weekly Growth Trends
CREATE OR REPLACE VIEW weekly_growth_trends AS
WITH weekly_stats AS (
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as events
  FROM analytics.session_events
  WHERE user_id IS NOT NULL
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
  week,
  active_users,
  sessions,
  events,
  LAG(active_users) OVER (ORDER BY week) as prev_week_users,
  ROUND(
    (active_users - LAG(active_users) OVER (ORDER BY week)) * 100.0 / 
    NULLIF(LAG(active_users) OVER (ORDER BY week), 0),
    2
  ) as user_growth_percentage
FROM weekly_stats
ORDER BY week DESC
LIMIT 12;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- View daily active users
-- SELECT * FROM daily_active_users_30d;

-- View top ingredients
-- SELECT * FROM top_ingredients_7d;

-- View recipe performance
-- SELECT * FROM recipe_performance_30d;

-- View GPT usage
-- SELECT * FROM gpt_usage_7d;

-- View user engagement levels
-- SELECT * FROM user_engagement_levels_30d;

-- View meal planning funnel
-- SELECT * FROM meal_planning_funnel_30d;

-- View affiliate performance
-- SELECT * FROM affiliate_performance_30d;

-- View weekly growth
-- SELECT * FROM weekly_growth_trends;
-- ============================================================================
-- User Segmentation Schema
-- Created: 2025-12-06
-- Purpose: Segment users based on behavior patterns for personalization
-- ============================================================================

-- ============================================================================
-- USER SEGMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  segment_type TEXT NOT NULL, -- 'engagement', 'dietary', 'feature_usage', 'value'
  segment_name TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL for permanent segments
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_segment_type ON user_segments(segment_type);
CREATE INDEX idx_user_segments_segment_name ON user_segments(segment_name);
CREATE INDEX idx_user_segments_expires_at ON user_segments(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own segments"
  ON user_segments FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage all segments"
  ON user_segments FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SEGMENT DEFINITIONS
-- ============================================================================

-- Engagement Segments:
-- - power_user: Active 20+ days/month, high session count
-- - active_user: Active 10-19 days/month
-- - regular_user: Active 3-9 days/month
-- - casual_user: Active 1-2 days/month
-- - at_risk: Was active, now declining
-- - churned: No activity in 30+ days

-- Dietary Segments:
-- - vegan: Vegan diet preference
-- - vegetarian: Vegetarian diet preference
-- - keto: Keto diet preference
-- - high_protein: High protein focus
-- - low_carb: Low carb focus
-- - balanced: Balanced diet

-- Feature Usage Segments:
-- - recipe_explorer: High chaos mode usage, many recipe generations
-- - meal_planner: Frequent meal plan generation
-- - nutrition_tracker: Frequent meal logging
-- - grocery_shopper: High affiliate click rate

-- Value Segments:
-- - high_value: High affiliate conversion, frequent usage
-- - medium_value: Moderate engagement and conversion
-- - low_value: Low engagement, no conversion
-- - potential_high_value: High engagement, no conversion yet

-- ============================================================================
-- SEGMENTATION FUNCTIONS
-- ============================================================================

-- Function: Assign engagement segments
CREATE OR REPLACE FUNCTION assign_engagement_segments()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Clear existing engagement segments
  DELETE FROM user_segments WHERE segment_type = 'engagement';
  
  -- Power Users (20+ active days in last 30 days)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'engagement',
    'power_user',
    jsonb_build_object(
      'active_days', active_days,
      'sessions', sessions,
      'events', events
    )
  FROM (
    SELECT 
      user_id,
      COUNT(DISTINCT DATE(created_at)) as active_days,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(*) as events
    FROM analytics.session_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(created_at)) >= 20
  ) power_users;
  
  -- Active Users (10-19 active days)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'engagement',
    'active_user',
    jsonb_build_object(
      'active_days', active_days,
      'sessions', sessions,
      'events', events
    )
  FROM (
    SELECT 
      user_id,
      COUNT(DISTINCT DATE(created_at)) as active_days,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(*) as events
    FROM analytics.session_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(created_at)) BETWEEN 10 AND 19
  ) active_users;
  
  -- Regular Users (3-9 active days)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'engagement',
    'regular_user',
    jsonb_build_object(
      'active_days', active_days,
      'sessions', sessions,
      'events', events
    )
  FROM (
    SELECT 
      user_id,
      COUNT(DISTINCT DATE(created_at)) as active_days,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(*) as events
    FROM analytics.session_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(created_at)) BETWEEN 3 AND 9
  ) regular_users;
  
  -- Casual Users (1-2 active days)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'engagement',
    'casual_user',
    jsonb_build_object(
      'active_days', active_days,
      'sessions', sessions,
      'events', events
    )
  FROM (
    SELECT 
      user_id,
      COUNT(DISTINCT DATE(created_at)) as active_days,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(*) as events
    FROM analytics.session_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(created_at)) BETWEEN 1 AND 2
  ) casual_users;
  
  -- At Risk Users (active 2-4 weeks ago, but not in last 2 weeks)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'engagement',
    'at_risk',
    jsonb_build_object(
      'last_active', last_active,
      'days_since_active', days_since_active
    )
  FROM (
    SELECT 
      user_id,
      MAX(created_at) as last_active,
      EXTRACT(DAY FROM (NOW() - MAX(created_at))) as days_since_active
    FROM analytics.session_events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING MAX(created_at) BETWEEN CURRENT_DATE - INTERVAL '4 weeks' AND CURRENT_DATE - INTERVAL '2 weeks'
  ) at_risk_users;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function: Assign dietary segments
CREATE OR REPLACE FUNCTION assign_dietary_segments()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Clear existing dietary segments
  DELETE FROM user_segments WHERE segment_type = 'dietary';
  
  -- Assign based on user_goals table
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'dietary',
    LOWER(diet_style),
    jsonb_build_object(
      'target_calories', target_calories_per_day,
      'restrictions', dietary_restrictions
    )
  FROM analytics.user_goals
  WHERE diet_style IS NOT NULL;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function: Assign feature usage segments
CREATE OR REPLACE FUNCTION assign_feature_usage_segments()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Clear existing feature usage segments
  DELETE FROM user_segments WHERE segment_type = 'feature_usage';
  
  -- Recipe Explorers (high recipe generation, high chaos mode usage)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'feature_usage',
    'recipe_explorer',
    jsonb_build_object(
      'recipes_generated', recipes_generated,
      'avg_chaos_rating', avg_chaos_rating
    )
  FROM (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE event_type = 'generated') as recipes_generated,
      ROUND(AVG(chaos_rating_shown), 1) as avg_chaos_rating
    FROM analytics.recipe_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) FILTER (WHERE event_type = 'generated') >= 10
  ) recipe_explorers;
  
  -- Meal Planners (frequent meal plan generation)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'feature_usage',
    'meal_planner',
    jsonb_build_object(
      'meal_plans_generated', meal_plans_generated,
      'avg_days_planned', avg_days_planned
    )
  FROM (
    SELECT 
      user_id,
      COUNT(*) as meal_plans_generated,
      ROUND(AVG(days_planned), 1) as avg_days_planned
    FROM analytics.meal_plans
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) >= 3
  ) meal_planners;
  
  -- Nutrition Trackers (frequent meal logging)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'feature_usage',
    'nutrition_tracker',
    jsonb_build_object(
      'meals_logged', meals_logged,
      'avg_calories', avg_calories
    )
  FROM (
    SELECT 
      user_id,
      COUNT(*) as meals_logged,
      ROUND(AVG(calories_kcal), 0) as avg_calories
    FROM analytics.meal_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) >= 10
  ) nutrition_trackers;
  
  -- Grocery Shoppers (high affiliate click rate)
  INSERT INTO user_segments (user_id, segment_type, segment_name, metadata)
  SELECT 
    user_id,
    'feature_usage',
    'grocery_shopper',
    jsonb_build_object(
      'affiliate_clicks', affiliate_clicks,
      'affiliate_conversions', affiliate_conversions
    )
  FROM (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE event_type = 'click') as affiliate_clicks,
      COUNT(*) FILTER (WHERE event_type = 'conversion') as affiliate_conversions
    FROM analytics.affiliate_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) FILTER (WHERE event_type = 'click') >= 3
  ) grocery_shoppers;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function: Assign value segments
CREATE OR REPLACE FUNCTION assign_value_segments()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Clear existing value segments
  DELETE FROM user_segments WHERE segment_type = 'value';
  
  -- High Value (high engagement + affiliate conversion)
  INSERT INTO user_segments (user_id, segment_type, segment_name, confidence_score, metadata)
  SELECT 
    se.user_id,
    'value',
    'high_value',
    0.9,
    jsonb_build_object(
      'active_days', active_days,
      'affiliate_conversions', affiliate_conversions,
      'estimated_revenue', estimated_revenue
    )
  FROM (
    SELECT 
      user_id,
      COUNT(DISTINCT DATE(created_at)) as active_days
    FROM analytics.session_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(created_at)) >= 10
  ) se
  INNER JOIN (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE event_type = 'conversion') as affiliate_conversions,
      SUM((metadata->>'estimatedRevenueUsd')::NUMERIC) as estimated_revenue
    FROM analytics.affiliate_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) FILTER (WHERE event_type = 'conversion') >= 1
  ) ae ON se.user_id = ae.user_id;
  
  -- Potential High Value (high engagement, no conversion yet)
  INSERT INTO user_segments (user_id, segment_type, segment_name, confidence_score, metadata)
  SELECT 
    user_id,
    'value',
    'potential_high_value',
    0.7,
    jsonb_build_object(
      'active_days', active_days,
      'sessions', sessions,
      'affiliate_clicks', affiliate_clicks
    )
  FROM (
    SELECT 
      se.user_id,
      COUNT(DISTINCT DATE(se.created_at)) as active_days,
      COUNT(DISTINCT se.session_id) as sessions,
      COUNT(*) FILTER (WHERE ae.event_type = 'click') as affiliate_clicks
    FROM analytics.session_events se
    LEFT JOIN analytics.affiliate_events ae ON se.user_id = ae.user_id
    WHERE se.created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND se.user_id IS NOT NULL
    GROUP BY se.user_id
    HAVING COUNT(DISTINCT DATE(se.created_at)) >= 10
      AND COUNT(*) FILTER (WHERE ae.event_type = 'conversion') = 0
  ) potential_high_value_users;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function: Run all segmentation
CREATE OR REPLACE FUNCTION run_all_segmentation()
RETURNS JSONB AS $$
DECLARE
  engagement_count INTEGER;
  dietary_count INTEGER;
  feature_count INTEGER;
  value_count INTEGER;
BEGIN
  engagement_count := assign_engagement_segments();
  dietary_count := assign_dietary_segments();
  feature_count := assign_feature_usage_segments();
  value_count := assign_value_segments();
  
  RETURN jsonb_build_object(
    'engagement_segments', engagement_count,
    'dietary_segments', dietary_count,
    'feature_usage_segments', feature_count,
    'value_segments', value_count,
    'total_segments', engagement_count + dietary_count + feature_count + value_count,
    'run_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEGMENTATION VIEWS
-- ============================================================================

-- Current user segments (non-expired)
CREATE OR REPLACE VIEW current_user_segments AS
SELECT *
FROM user_segments
WHERE expires_at IS NULL OR expires_at > NOW()
ORDER BY user_id, segment_type, assigned_at DESC;

-- User segment summary
CREATE OR REPLACE VIEW user_segment_summary AS
SELECT 
  user_id,
  ARRAY_AGG(segment_name) FILTER (WHERE segment_type = 'engagement') as engagement_segments,
  ARRAY_AGG(segment_name) FILTER (WHERE segment_type = 'dietary') as dietary_segments,
  ARRAY_AGG(segment_name) FILTER (WHERE segment_type = 'feature_usage') as feature_usage_segments,
  ARRAY_AGG(segment_name) FILTER (WHERE segment_type = 'value') as value_segments
FROM current_user_segments
GROUP BY user_id;

-- Segment distribution
CREATE OR REPLACE VIEW segment_distribution AS
SELECT 
  segment_type,
  segment_name,
  COUNT(*) as user_count,
  ROUND(AVG(confidence_score), 2) as avg_confidence,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY segment_type), 2) as percentage_of_type
FROM current_user_segments
GROUP BY segment_type, segment_name
ORDER BY segment_type, user_count DESC;

-- ============================================================================
-- AUTOMATED SEGMENTATION (Run daily)
-- ============================================================================

-- Create a scheduled job to run segmentation daily (requires pg_cron extension)
-- SELECT cron.schedule('daily-user-segmentation', '0 2 * * *', 'SELECT run_all_segmentation()');

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Run all segmentation
-- SELECT run_all_segmentation();

-- View current segments for a user
-- SELECT * FROM current_user_segments WHERE user_id = 'user123';

-- View segment distribution
-- SELECT * FROM segment_distribution;

-- View user segment summary
-- SELECT * FROM user_segment_summary;

-- Get all power users
-- SELECT DISTINCT user_id FROM current_user_segments WHERE segment_name = 'power_user';

-- Get all high-value users
-- SELECT DISTINCT user_id FROM current_user_segments WHERE segment_name = 'high_value';

-- ============================================================================
-- DEPLOYMENT COMPLETE - RUN VERIFICATION
-- ============================================================================

-- Verify deployment
SELECT 'Monitoring functions deployed' as status;
SELECT 'Dashboard views deployed' as status;
SELECT 'User segmentation deployed' as status;

-- Run initial segmentation
SELECT run_all_segmentation();

-- View results
SELECT * FROM get_analytics_health_report();

