-- ============================================================================
-- Analytics Dashboard - Key Metrics & Visualizations (FIXED for JSONB)
-- Created: 2025-12-06
-- Updated: 2025-12-06 - Fixed JSONB extraction for ingredients
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
-- FIXED: Extract ingredient names from JSONB array
CREATE OR REPLACE VIEW top_ingredients_7d AS
WITH ingredient_extracts AS (
  SELECT 
    user_id,
    session_id,
    source_gpt,
    created_at,
    jsonb_array_elements(ingredients) as ingredient,
    ingredients
  FROM analytics.ingredient_submissions
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
  LOWER(TRIM(ingredient->>'name')) as ingredient_name,
  COUNT(*) as submission_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  source_gpt,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ingredient_extracts
WHERE ingredient->>'name' IS NOT NULL
GROUP BY LOWER(TRIM(ingredient->>'name')), source_gpt
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
  ROUND(COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '1 week' THEN a.user_id END) * 100.0 / NULLIF(COUNT(DISTINCT fs.user_id), 0), 2) as retention_week_1,
  ROUND(COUNT(DISTINCT CASE WHEN a.activity_week = fs.cohort_week + INTERVAL '2 weeks' THEN a.user_id END) * 100.0 / NULLIF(COUNT(DISTINCT fs.user_id), 0), 2) as retention_week_2
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
  ROUND(AVG((metadata->>'generationTimeMs')::NUMERIC) / 1000, 2) as avg_generation_time_seconds
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
  AND is_active = true
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
