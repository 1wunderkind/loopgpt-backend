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
    FROM session_events
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
    FROM session_events
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
    FROM session_events
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
    FROM session_events
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
    FROM session_events
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
  FROM user_goals
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
    FROM recipe_events
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
    FROM meal_plans
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
    FROM meal_logs
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
    FROM affiliate_events
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
    FROM session_events
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
    FROM affiliate_events
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
    FROM session_events se
    LEFT JOIN affiliate_events ae ON se.user_id = ae.user_id
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
