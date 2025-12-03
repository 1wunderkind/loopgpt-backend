-- Analytics Dashboard Views
-- Created: 2024-12-02
-- Purpose: Create materialized views and queries for business analytics

-- ============================================================================
-- USER ANALYTICS
-- ============================================================================

-- Daily active users
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM (
  SELECT user_id, created_at FROM weight_entries
  UNION ALL
  SELECT user_id, created_at FROM meal_logs
  UNION ALL
  SELECT user_id, created_at FROM orders
) user_activity
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User growth metrics
CREATE OR REPLACE VIEW user_growth_metrics AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('week', created_at)) as cumulative_users
FROM users
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- User engagement metrics
CREATE OR REPLACE VIEW user_engagement_metrics AS
SELECT
  user_id,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  COUNT(*) as total_activities,
  MAX(created_at) as last_activity,
  MIN(created_at) as first_activity,
  EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) as days_since_signup
FROM (
  SELECT user_id, created_at FROM weight_entries
  UNION ALL
  SELECT user_id, created_at FROM meal_logs
  UNION ALL
  SELECT user_id, created_at FROM orders
) user_activity
GROUP BY user_id;

-- ============================================================================
-- ORDER ANALYTICS
-- ============================================================================

-- Daily order metrics
CREATE OR REPLACE VIEW daily_order_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate,
  SUM(total_amount) FILTER (WHERE status = 'completed') as total_revenue,
  AVG(total_amount) FILTER (WHERE status = 'completed') as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Provider performance
CREATE OR REPLACE VIEW provider_performance AS
SELECT
  provider,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate,
  SUM(total_amount) FILTER (WHERE status = 'completed') as total_revenue,
  AVG(total_amount) FILTER (WHERE status = 'completed') as avg_order_value,
  AVG(delivery_fee) as avg_delivery_fee,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_fulfillment_time_seconds
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider
ORDER BY total_orders DESC;

-- Hourly order distribution
CREATE OR REPLACE VIEW hourly_order_distribution AS
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as order_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- ============================================================================
-- REVENUE ANALYTICS
-- ============================================================================

-- Daily revenue metrics
CREATE OR REPLACE VIEW daily_revenue_metrics AS
SELECT
  DATE(created_at) as date,
  SUM(total_amount) as total_revenue,
  SUM(subtotal) as subtotal,
  SUM(delivery_fee) as delivery_fees,
  SUM(service_fee) as service_fees,
  SUM(tax) as taxes,
  COUNT(*) as order_count,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Revenue by provider
CREATE OR REPLACE VIEW revenue_by_provider AS
SELECT
  provider,
  SUM(total_amount) as total_revenue,
  COUNT(*) as order_count,
  AVG(total_amount) as avg_order_value,
  SUM(total_amount) / SUM(SUM(total_amount)) OVER () * 100 as revenue_percentage
FROM orders
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider
ORDER BY total_revenue DESC;

-- Monthly recurring revenue (MRR)
CREATE OR REPLACE VIEW monthly_recurring_revenue AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(total_amount) as revenue,
  COUNT(DISTINCT user_id) as paying_users,
  SUM(total_amount) / NULLIF(COUNT(DISTINCT user_id), 0) as arpu
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================================================
-- FOOD & NUTRITION ANALYTICS
-- ============================================================================

-- Popular foods
CREATE OR REPLACE VIEW popular_foods AS
SELECT
  food_id,
  COUNT(*) as log_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(quantity) as total_quantity,
  AVG(calories) as avg_calories
FROM meal_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY food_id
ORDER BY log_count DESC
LIMIT 100;

-- Meal type distribution
CREATE OR REPLACE VIEW meal_type_distribution AS
SELECT
  meal_type,
  COUNT(*) as log_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage,
  AVG(calories) as avg_calories,
  AVG(protein) as avg_protein,
  AVG(carbs) as avg_carbs,
  AVG(fat) as avg_fat
FROM meal_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY meal_type
ORDER BY log_count DESC;

-- Daily nutrition averages
CREATE OR REPLACE VIEW daily_nutrition_averages AS
SELECT
  DATE(created_at) as date,
  AVG(total_calories) as avg_calories,
  AVG(total_protein) as avg_protein,
  AVG(total_carbs) as avg_carbs,
  AVG(total_fat) as avg_fat,
  COUNT(DISTINCT user_id) as active_users
FROM (
  SELECT
    user_id,
    DATE(created_at) as created_at,
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(carbs) as total_carbs,
    SUM(fat) as total_fat
  FROM meal_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id, DATE(created_at)
) daily_totals
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- WEIGHT TRACKING ANALYTICS
-- ============================================================================

-- Weight loss progress
CREATE OR REPLACE VIEW weight_loss_progress AS
SELECT
  user_id,
  MIN(weight_kg) as starting_weight,
  MAX(weight_kg) as current_weight,
  MAX(weight_kg) - MIN(weight_kg) as weight_change,
  COUNT(*) as entries_count,
  MAX(date) - MIN(date) as days_tracked,
  (MAX(weight_kg) - MIN(weight_kg)) / NULLIF(MAX(date) - MIN(date), 0) as avg_daily_change
FROM weight_entries
GROUP BY user_id
HAVING COUNT(*) >= 2;

-- Daily weight tracking activity
CREATE OR REPLACE VIEW daily_weight_tracking_activity AS
SELECT
  DATE(date) as date,
  COUNT(*) as entries,
  COUNT(DISTINCT user_id) as active_users,
  AVG(weight_kg) as avg_weight
FROM weight_entries
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(date)
ORDER BY date DESC;

-- ============================================================================
-- SCORING & PROVIDER ANALYTICS (Phase 3)
-- ============================================================================

-- Scoring decision analytics
CREATE OR REPLACE VIEW scoring_decision_analytics AS
SELECT
  selected_provider,
  COUNT(*) as selection_count,
  AVG(final_score) as avg_score,
  AVG(price_score) as avg_price_score,
  AVG(speed_score) as avg_speed_score,
  AVG(availability_score) as avg_availability_score,
  AVG(margin_score) as avg_margin_score,
  AVG(reliability_score) as avg_reliability_score,
  COUNT(DISTINCT user_id) as unique_users
FROM scoring_decisions
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY selected_provider
ORDER BY selection_count DESC;

-- Provider reliability trends
CREATE OR REPLACE VIEW provider_reliability_trends AS
SELECT
  provider,
  DATE(timestamp) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE success = true) as successful_orders,
  ROUND(
    COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate,
  AVG(actual_delivery_time_minutes) as avg_delivery_time,
  AVG(actual_total_cost) as avg_cost
FROM order_outcomes
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY provider, DATE(timestamp)
ORDER BY provider, date DESC;

-- Learning effectiveness
CREATE OR REPLACE VIEW learning_effectiveness AS
SELECT
  DATE_TRUNC('week', timestamp) as week,
  AVG(final_score) as avg_score,
  AVG(price_score) as avg_price_score,
  AVG(speed_score) as avg_speed_score,
  AVG(availability_score) as avg_availability_score,
  COUNT(*) as decision_count
FROM scoring_decisions
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC;

-- ============================================================================
-- PERFORMANCE ANALYTICS
-- ============================================================================

-- Create table for storing performance metrics (if not exists)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
ON performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name 
ON performance_metrics(metric_name);

-- Performance metrics summary
CREATE OR REPLACE VIEW performance_metrics_summary AS
SELECT
  metric_name,
  COUNT(*) as sample_count,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric_value) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) as p99
FROM performance_metrics
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY metric_name
ORDER BY metric_name;

-- ============================================================================
-- MATERIALIZED VIEWS (for better performance)
-- ============================================================================

-- Refresh materialized views periodically (e.g., every hour)
-- These are faster to query but need to be refreshed

-- CREATE MATERIALIZED VIEW mv_daily_order_metrics AS
-- SELECT * FROM daily_order_metrics;
-- 
-- CREATE MATERIALIZED VIEW mv_provider_performance AS
-- SELECT * FROM provider_performance;
-- 
-- CREATE MATERIALIZED VIEW mv_daily_revenue_metrics AS
-- SELECT * FROM daily_revenue_metrics;
-- 
-- -- Refresh command (run periodically):
-- -- REFRESH MATERIALIZED VIEW mv_daily_order_metrics;
-- -- REFRESH MATERIALIZED VIEW mv_provider_performance;
-- -- REFRESH MATERIALIZED VIEW mv_daily_revenue_metrics;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get KPIs for a date range
CREATE OR REPLACE FUNCTION get_kpis(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_orders'::TEXT, COUNT(*)::NUMERIC FROM orders WHERE created_at BETWEEN start_date AND end_date
  UNION ALL
  SELECT 'successful_orders'::TEXT, COUNT(*)::NUMERIC FROM orders WHERE status = 'completed' AND created_at BETWEEN start_date AND end_date
  UNION ALL
  SELECT 'total_revenue'::TEXT, COALESCE(SUM(total_amount), 0)::NUMERIC FROM orders WHERE status = 'completed' AND created_at BETWEEN start_date AND end_date
  UNION ALL
  SELECT 'active_users'::TEXT, COUNT(DISTINCT user_id)::NUMERIC FROM (
    SELECT user_id FROM weight_entries WHERE created_at BETWEEN start_date AND end_date
    UNION
    SELECT user_id FROM meal_logs WHERE created_at BETWEEN start_date AND end_date
    UNION
    SELECT user_id FROM orders WHERE created_at BETWEEN start_date AND end_date
  ) users;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW daily_active_users IS 'Daily active users across all activities';
COMMENT ON VIEW user_growth_metrics IS 'Weekly user growth and cumulative users';
COMMENT ON VIEW daily_order_metrics IS 'Daily order counts, success rates, and revenue';
COMMENT ON VIEW provider_performance IS 'Provider performance metrics over last 30 days';
COMMENT ON VIEW daily_revenue_metrics IS 'Daily revenue breakdown by component';
COMMENT ON VIEW popular_foods IS 'Most logged foods in last 30 days';
COMMENT ON VIEW scoring_decision_analytics IS 'Provider selection analytics from scoring system';
COMMENT ON VIEW provider_reliability_trends IS 'Daily provider reliability trends';
COMMENT ON FUNCTION get_kpis IS 'Get key performance indicators for a date range';
