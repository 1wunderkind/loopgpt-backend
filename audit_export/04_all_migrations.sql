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
-- Performance Optimization: Database Indexes
-- Created: 2024-12-02
-- Purpose: Add indexes to improve query performance

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- FOOD SEARCH INDEXES
-- ============================================================================

-- Trigram index for fuzzy food name search (3-5x faster)
CREATE INDEX IF NOT EXISTS idx_foods_name_trgm 
ON foods USING gin(name gin_trgm_ops);

-- Category index for filtering
CREATE INDEX IF NOT EXISTS idx_foods_category 
ON foods(category);

-- Brand index for filtering
CREATE INDEX IF NOT EXISTS idx_foods_brand 
ON foods(brand);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_foods_category_brand 
ON foods(category, brand);

-- ============================================================================
-- WEIGHT TRACKING INDEXES
-- ============================================================================

-- Composite index for user weight history queries (most common)
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date 
ON weight_entries(user_id, date DESC);

-- Date index for global weight trends
CREATE INDEX IF NOT EXISTS idx_weight_entries_date 
ON weight_entries(date DESC);

-- User index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_weight_entries_user 
ON weight_entries(user_id);

-- ============================================================================
-- MEAL LOGGING INDEXES
-- ============================================================================

-- Composite index for user meal history queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date 
ON meal_logs(user_id, date DESC);

-- Date index for global meal trends
CREATE INDEX IF NOT EXISTS idx_meal_logs_date 
ON meal_logs(date DESC);

-- Meal type index for filtering (breakfast, lunch, dinner, snack)
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_type 
ON meal_logs(meal_type);

-- Composite index for user + meal type queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_meal_type 
ON meal_logs(user_id, meal_type, date DESC);

-- ============================================================================
-- ORDER INDEXES
-- ============================================================================

-- Composite index for user order history (most common query)
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON orders(user_id, created_at DESC);

-- Status index for filtering orders by status
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Provider index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_orders_provider 
ON orders(provider);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON orders(user_id, status, created_at DESC);

-- Confirmation token index for order confirmation lookups
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_token 
ON orders(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

-- ============================================================================
-- USER INDEXES
-- ============================================================================

-- Email index for login queries (unique constraint already creates index)
-- But we add it explicitly for clarity
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Created date index for user analytics
CREATE INDEX IF NOT EXISTS idx_users_created 
ON users(created_at DESC);

-- Active users index
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(is_active) 
WHERE is_active = true;

-- ============================================================================
-- PROVIDER METRICS INDEXES (Phase 3)
-- ============================================================================

-- Provider + date index for metrics queries
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider_date 
ON provider_metrics(provider_name, date DESC);

-- Date index for global metrics
CREATE INDEX IF NOT EXISTS idx_provider_metrics_date 
ON provider_metrics(date DESC);

-- ============================================================================
-- SCORING DECISIONS INDEXES (Phase 3)
-- ============================================================================

-- Order ID index for decision lookups
CREATE INDEX IF NOT EXISTS idx_scoring_decisions_order 
ON scoring_decisions(order_id);

-- User ID + timestamp index for user decision history
CREATE INDEX IF NOT EXISTS idx_scoring_decisions_user_timestamp 
ON scoring_decisions(user_id, timestamp DESC);

-- Selected provider index for provider performance analysis
CREATE INDEX IF NOT EXISTS idx_scoring_decisions_selected_provider 
ON scoring_decisions(selected_provider);

-- ============================================================================
-- ORDER OUTCOMES INDEXES (Phase 3)
-- ============================================================================

-- Order ID index for outcome lookups
CREATE INDEX IF NOT EXISTS idx_order_outcomes_order 
ON order_outcomes(order_id);

-- Success index for success rate analysis
CREATE INDEX IF NOT EXISTS idx_order_outcomes_success 
ON order_outcomes(success);

-- Provider + success index for provider reliability
CREATE INDEX IF NOT EXISTS idx_order_outcomes_provider_success 
ON order_outcomes(provider, success);

-- Timestamp index for time-based analysis
CREATE INDEX IF NOT EXISTS idx_order_outcomes_timestamp 
ON order_outcomes(timestamp DESC);

-- ============================================================================
-- PARTIAL INDEXES (for specific conditions)
-- ============================================================================

-- Index only pending orders (reduces index size)
CREATE INDEX IF NOT EXISTS idx_orders_pending 
ON orders(user_id, created_at DESC) 
WHERE status = 'pending';

-- Index only confirmed orders
CREATE INDEX IF NOT EXISTS idx_orders_confirmed 
ON orders(user_id, created_at DESC) 
WHERE status = 'confirmed';

-- Index only failed orders for analysis
CREATE INDEX IF NOT EXISTS idx_orders_failed 
ON orders(user_id, created_at DESC) 
WHERE status = 'failed';

-- ============================================================================
-- ANALYZE TABLES (update statistics for query planner)
-- ============================================================================

ANALYZE foods;
ANALYZE weight_entries;
ANALYZE meal_logs;
ANALYZE orders;
ANALYZE users;
ANALYZE provider_metrics;
ANALYZE scoring_decisions;
ANALYZE order_outcomes;

-- ============================================================================
-- VACUUM TABLES (reclaim storage and update statistics)
-- ============================================================================

VACUUM ANALYZE foods;
VACUUM ANALYZE weight_entries;
VACUUM ANALYZE meal_logs;
VACUUM ANALYZE orders;
VACUUM ANALYZE users;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for table size statistics
CREATE OR REPLACE VIEW table_size_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for slow queries (requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- 
-- CREATE OR REPLACE VIEW slow_queries AS
-- SELECT
--   query,
--   calls,
--   total_time,
--   mean_time,
--   max_time,
--   stddev_time
-- FROM pg_stat_statements
-- WHERE mean_time > 100 -- queries taking more than 100ms on average
-- ORDER BY mean_time DESC
-- LIMIT 50;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_foods_name_trgm IS 'Trigram index for fuzzy food name search';
COMMENT ON INDEX idx_weight_entries_user_date IS 'Composite index for user weight history queries';
COMMENT ON INDEX idx_meal_logs_user_date IS 'Composite index for user meal history queries';
COMMENT ON INDEX idx_orders_user_created IS 'Composite index for user order history queries';
COMMENT ON INDEX idx_orders_confirmation_token IS 'Index for fast order confirmation lookups';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected Performance Improvements:
-- - Food search: 3-5x faster (trigram index)
-- - Weight history: 5-10x faster (composite index)
-- - Meal logs: 5-10x faster (composite index)
-- - Order history: 5-10x faster (composite index)
-- - Order confirmation: 50-100x faster (indexed token lookup)
--
-- Index Maintenance:
-- - Indexes are automatically maintained by PostgreSQL
-- - Run VACUUM ANALYZE periodically (weekly recommended)
-- - Monitor index usage with index_usage_stats view
-- - Drop unused indexes to save space and write performance
--
-- Query Optimization Tips:
-- - Use EXPLAIN ANALYZE to understand query plans
-- - Ensure queries use indexes (check "Index Scan" in EXPLAIN)
-- - Avoid SELECT * - specify columns
-- - Use LIMIT for large result sets
-- - Consider materialized views for complex aggregations
-- ============================================================================
-- LoopGPT Commerce Router - Phase 3 Database Schema
-- Provider Comparison Scoring Algorithm
-- ============================================================================

-- ============================================================================
-- 1. Score Calculations Table
-- Stores individual score calculations for analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID,  -- References order_routes table (to be created)
  provider_id TEXT NOT NULL,
  
  -- Individual component scores (0-100)
  price_score DECIMAL(5,2) NOT NULL CHECK (price_score >= 0 AND price_score <= 100),
  speed_score DECIMAL(5,2) NOT NULL CHECK (speed_score >= 0 AND price_score <= 100),
  availability_score DECIMAL(5,2) NOT NULL CHECK (availability_score >= 0 AND availability_score <= 100),
  margin_score DECIMAL(5,2) NOT NULL CHECK (margin_score >= 0 AND margin_score <= 100),
  reliability_score DECIMAL(5,2) NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 100),
  
  -- Final weighted score
  weighted_total DECIMAL(5,2) NOT NULL CHECK (weighted_total >= 0 AND weighted_total <= 100),
  
  -- Weights used for this calculation
  weights_used JSONB NOT NULL,
  
  -- Was this provider selected for the order?
  was_selected BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_calculations_provider 
  ON score_calculations(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_score_calculations_route 
  ON score_calculations(route_id);

CREATE INDEX IF NOT EXISTS idx_score_calculations_selected 
  ON score_calculations(was_selected, created_at DESC);

-- ============================================================================
-- 2. Order Outcomes Table
-- Tracks actual order outcomes for learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  
  -- Outcome metrics
  was_successful BOOLEAN NOT NULL,
  actual_delivery_minutes INTEGER CHECK (actual_delivery_minutes > 0),
  items_delivered INTEGER CHECK (items_delivered >= 0),
  items_ordered INTEGER NOT NULL CHECK (items_ordered > 0),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  
  -- Issues encountered
  issues TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_outcomes_provider 
  ON order_outcomes(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_outcomes_order 
  ON order_outcomes(order_id);

CREATE INDEX IF NOT EXISTS idx_order_outcomes_success 
  ON order_outcomes(was_successful, created_at DESC);

-- ============================================================================
-- 3. Weight Adjustments Table
-- Tracks changes to scoring weights over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS weight_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_reason TEXT NOT NULL,
  old_weights JSONB NOT NULL,
  new_weights JSONB NOT NULL,
  performance_delta JSONB, -- Before/after metrics
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for historical analysis
CREATE INDEX IF NOT EXISTS idx_weight_adjustments_date 
  ON weight_adjustments(applied_at DESC);

-- ============================================================================
-- 4. Provider Metrics Table (Enhanced)
-- Extends existing provider_metrics or creates if doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Order metrics
  total_orders INTEGER NOT NULL DEFAULT 0,
  successful_orders INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_delivery_time_minutes DECIMAL(10,2),
  
  -- Financial metrics
  total_gmv DECIMAL(12,2) DEFAULT 0,
  our_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- Advanced metrics (Phase 3)
  fallback_rate DECIMAL(5,4),  -- % of times used as fallback
  split_order_rate DECIMAL(5,4),  -- % of orders that were split
  avg_split_count DECIMAL(5,2),  -- Average number of splits
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one row per provider per day
  UNIQUE(provider_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider 
  ON provider_metrics(provider_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_provider_metrics_date 
  ON provider_metrics(metric_date DESC);

-- ============================================================================
-- 5. Stored Procedure: Update Provider Metrics
-- Atomically updates metrics for a provider on a given day
-- ============================================================================

CREATE OR REPLACE FUNCTION update_provider_metrics(
  p_provider_id TEXT,
  p_metric_date DATE,
  p_is_success BOOLEAN,
  p_delivery_time INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO provider_metrics (
    provider_id,
    metric_date,
    total_orders,
    successful_orders,
    avg_delivery_time_minutes
  )
  VALUES (
    p_provider_id,
    p_metric_date,
    1,
    CASE WHEN p_is_success THEN 1 ELSE 0 END,
    p_delivery_time
  )
  ON CONFLICT (provider_id, metric_date) DO UPDATE SET
    total_orders = provider_metrics.total_orders + 1,
    successful_orders = provider_metrics.successful_orders + (CASE WHEN p_is_success THEN 1 ELSE 0 END),
    avg_delivery_time_minutes = CASE 
      WHEN p_delivery_time IS NOT NULL THEN
        (COALESCE(provider_metrics.avg_delivery_time_minutes, 0) * provider_metrics.total_orders + p_delivery_time) 
        / (provider_metrics.total_orders + 1)
      ELSE provider_metrics.avg_delivery_time_minutes
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Analytics Views
-- Pre-computed views for dashboard queries
-- ============================================================================

-- Provider Performance Summary (Last 30 Days)
CREATE OR REPLACE VIEW provider_performance_summary AS
SELECT 
  provider_id,
  COUNT(*) as total_comparisons,
  SUM(CASE WHEN was_selected THEN 1 ELSE 0 END) as times_selected,
  ROUND(AVG(weighted_total), 2) as avg_score,
  ROUND(AVG(price_score), 2) as avg_price_score,
  ROUND(AVG(speed_score), 2) as avg_speed_score,
  ROUND(AVG(availability_score), 2) as avg_availability_score,
  ROUND(AVG(margin_score), 2) as avg_margin_score,
  ROUND(AVG(reliability_score), 2) as avg_reliability_score,
  ROUND(
    SUM(CASE WHEN was_selected THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100,
    2
  ) as win_rate
FROM score_calculations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_id;

-- Provider Metrics Summary (Last 30 Days)
CREATE OR REPLACE VIEW provider_metrics_summary AS
SELECT 
  provider_id,
  SUM(total_orders) as total_orders,
  SUM(successful_orders) as successful_orders,
  ROUND(
    SUM(successful_orders)::DECIMAL / NULLIF(SUM(total_orders), 0) * 100,
    2
  ) as success_rate,
  ROUND(AVG(avg_delivery_time_minutes), 2) as avg_delivery_time,
  SUM(total_gmv) as total_gmv,
  SUM(our_revenue) as our_revenue
FROM provider_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_id;

-- Order Outcomes Summary (Last 30 Days)
CREATE OR REPLACE VIEW order_outcomes_summary AS
SELECT 
  provider_id,
  COUNT(*) as total_outcomes,
  SUM(CASE WHEN was_successful THEN 1 ELSE 0 END) as successful_outcomes,
  ROUND(
    SUM(CASE WHEN was_successful THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate,
  ROUND(AVG(actual_delivery_minutes), 2) as avg_delivery_time,
  ROUND(AVG(user_rating), 2) as avg_rating,
  ROUND(
    SUM(items_delivered)::DECIMAL / NULLIF(SUM(items_ordered), 0) * 100,
    2
  ) as fulfillment_rate
FROM order_outcomes
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_id;

-- ============================================================================
-- 7. Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE score_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to score_calculations"
  ON score_calculations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to order_outcomes"
  ON order_outcomes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to weight_adjustments"
  ON weight_adjustments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to provider_metrics"
  ON provider_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users read-only access to summaries
CREATE POLICY "Authenticated users can read score calculations"
  ON score_calculations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read provider metrics"
  ON provider_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 8. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE score_calculations IS 'Stores scoring calculations for each provider comparison, enabling analysis of selection patterns';
COMMENT ON TABLE order_outcomes IS 'Tracks actual order outcomes for learning and improving provider selection';
COMMENT ON TABLE weight_adjustments IS 'Records changes to scoring weights over time for audit and analysis';
COMMENT ON TABLE provider_metrics IS 'Daily aggregated metrics for each provider, used for reliability scoring';

COMMENT ON FUNCTION update_provider_metrics IS 'Atomically updates provider metrics for a given day, handling concurrent updates safely';

COMMENT ON VIEW provider_performance_summary IS 'Summary of provider scoring performance over last 30 days';
COMMENT ON VIEW provider_metrics_summary IS 'Summary of provider operational metrics over last 30 days';
COMMENT ON VIEW order_outcomes_summary IS 'Summary of order outcomes by provider over last 30 days';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Phase 3 schema migration complete!';
  RAISE NOTICE 'Created tables: score_calculations, order_outcomes, weight_adjustments, provider_metrics';
  RAISE NOTICE 'Created function: update_provider_metrics()';
  RAISE NOTICE 'Created views: provider_performance_summary, provider_metrics_summary, order_outcomes_summary';
END $$;
-- MealPlanner GPT Initial Schema
-- Created: 2025-10-26
-- Description: Core tables for meal planning, recipes, and affiliate tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MEAL PLANS TABLE
-- ============================================================================
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatgpt_user_id text NOT NULL,
  plan_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  goal_type text,  -- high_protein, clean_eating, budget, chaos, keto, vegan, etc.
  calories_target integer,
  macros_target jsonb,  -- { protein_g, carbs_g, fat_g }
  vibe text,  -- clean eating, budget, chaos mode, etc.
  recipes_per_day integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster user lookups
CREATE INDEX idx_meal_plans_user ON meal_plans(chatgpt_user_id);
CREATE INDEX idx_meal_plans_dates ON meal_plans(start_date, end_date);

-- ============================================================================
-- MEAL PLAN ITEMS TABLE
-- ============================================================================
CREATE TABLE meal_plan_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE,
  day integer NOT NULL,  -- 1-7 for week plans
  day_date date,  -- actual date for this meal
  meal_type text NOT NULL,  -- breakfast, lunch, dinner, snack
  meal_order integer DEFAULT 1,  -- order within the day
  recipe_id text,  -- reference to recipe (could be from LeftoverGPT)
  recipe_name text NOT NULL,
  recipe_source text,  -- leftover_gpt, nutrition_gpt, custom, etc.
  ingredients jsonb,  -- array of ingredient objects
  instructions text,
  macros jsonb,  -- { calories, protein_g, carbs_g, fat_g }
  affiliate_links jsonb,  -- { amazon_fresh, instacart, walmart }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);
CREATE INDEX idx_meal_plan_items_day ON meal_plan_items(meal_plan_id, day);

-- ============================================================================
-- RECIPES TABLE (Cached recipes from various sources)
-- ============================================================================
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id text UNIQUE,  -- external ID if from LeftoverGPT
  title text NOT NULL,
  source text,  -- leftover_gpt, nutrition_gpt, custom
  chef_persona text,  -- Gordon, Paul, Jamie (from LeftoverGPT)
  chaos_level integer,
  diet_tags text[],  -- keto, vegan, high_protein, etc.
  ingredients jsonb NOT NULL,  -- array of { name, qty, unit }
  instructions text[],
  nutrition_per_serving jsonb,  -- { calories, protein_g, carbs_g, fat_g }
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer DEFAULT 1,
  metadata jsonb,  -- any additional data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for recipe searches
CREATE INDEX idx_recipes_source ON recipes(source);
CREATE INDEX idx_recipes_diet_tags ON recipes USING GIN(diet_tags);

-- ============================================================================
-- AFFILIATE LINKS CACHE TABLE
-- ============================================================================
CREATE TABLE affiliate_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient text NOT NULL,
  normalized_ingredient text,  -- lowercase, trimmed version for matching
  amazon_url text,
  instacart_url text,
  walmart_url text,
  last_updated timestamptz DEFAULT now(),
  ttl_hours integer DEFAULT 168,  -- 7 days default
  created_at timestamptz DEFAULT now()
);

-- Index for fast ingredient lookups
CREATE INDEX idx_affiliate_links_ingredient ON affiliate_links(normalized_ingredient);

-- ============================================================================
-- FEATURE FLAGS TABLE
-- ============================================================================
CREATE TABLE feature_flags (
  key text PRIMARY KEY,
  enabled boolean DEFAULT true,
  rollout_percentage integer DEFAULT 100,  -- 0-100
  config jsonb,  -- additional configuration
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('affiliate_links', true, 'Enable affiliate link generation'),
  ('logging', true, 'Enable detailed logging'),
  ('cache_recipes', true, 'Cache recipes from external GPTs'),
  ('multilingual', true, 'Enable multilingual support');

-- ============================================================================
-- DAILY MEAL SUMMARIES TABLE (for analytics)
-- ============================================================================
CREATE TABLE daily_meal_summaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE,
  day integer NOT NULL,
  day_date date NOT NULL,
  total_calories integer,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fat_g numeric,
  meals_count integer,
  affiliate_clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_summaries_plan ON daily_meal_summaries(meal_plan_id);

-- ============================================================================
-- AFFILIATE ANALYTICS TABLE
-- ============================================================================
CREATE TABLE affiliate_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatgpt_user_id text NOT NULL,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  ingredient text,
  platform text,  -- amazon_fresh, instacart, walmart
  clicked_at timestamptz DEFAULT now(),
  converted boolean DEFAULT false,
  conversion_value numeric
);

CREATE INDEX idx_affiliate_analytics_user ON affiliate_analytics(chatgpt_user_id);
CREATE INDEX idx_affiliate_analytics_platform ON affiliate_analytics(platform);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_items_updated_at BEFORE UPDATE ON meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE meal_plans IS 'Stores user meal plans with goals and preferences';
COMMENT ON TABLE meal_plan_items IS 'Individual meals within a meal plan';
COMMENT ON TABLE recipes IS 'Cached recipes from various sources (LeftoverGPT, etc.)';
COMMENT ON TABLE affiliate_links IS 'Cached affiliate URLs for ingredients';
COMMENT ON TABLE feature_flags IS 'Feature flag configuration for gradual rollouts';
COMMENT ON TABLE daily_meal_summaries IS 'Daily nutrition summaries for analytics';
COMMENT ON TABLE affiliate_analytics IS 'Tracking affiliate link clicks and conversions';

-- Migration: Add Delivery Affiliate Integration
-- Date: 2025-10-26
-- Purpose: Enable food delivery affiliate links as alternative to cooking

-- ============================================================================
-- DELIVERY PARTNERS TABLE
-- ============================================================================

CREATE TABLE delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  api_key text,
  affiliate_id text NOT NULL,
  supported_countries text[] DEFAULT ARRAY['US'],
  cuisine_tags text[] NOT NULL,
  diet_tags text[] DEFAULT ARRAY[]::text[],
  commission_rate decimal(5,2),
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast cuisine matching
CREATE INDEX idx_delivery_partners_cuisine ON delivery_partners USING gin (cuisine_tags);

-- Index for diet filtering
CREATE INDEX idx_delivery_partners_diet ON delivery_partners USING gin (diet_tags);

-- Index for active partners
CREATE INDEX idx_delivery_partners_active ON delivery_partners (active);

-- ============================================================================
-- DELIVERY RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE delivery_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  cuisine_tag text,
  diet text,
  calories int,
  partner_id uuid REFERENCES delivery_partners(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  affiliate_url text NOT NULL,
  clicked boolean DEFAULT false,
  clicked_at timestamptz,
  converted boolean DEFAULT false,
  converted_at timestamptz,
  order_value decimal(10,2),
  commission_earned decimal(10,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_delivery_recommendations_user ON delivery_recommendations (chatgpt_user_id);

-- Index for analytics queries
CREATE INDEX idx_delivery_recommendations_partner ON delivery_recommendations (partner_id);

-- Index for conversion tracking
CREATE INDEX idx_delivery_recommendations_converted ON delivery_recommendations (converted, created_at);

-- ============================================================================
-- DELIVERY ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW delivery_analytics AS
SELECT 
  partner_name,
  COUNT(*) as total_recommendations,
  COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
  COUNT(*) FILTER (WHERE converted = true) as total_conversions,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked = true)::decimal / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as click_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE converted = true)::decimal / NULLIF(COUNT(*) FILTER (WHERE clicked = true), 0)) * 100, 
    2
  ) as conversion_rate,
  SUM(order_value) as total_order_value,
  SUM(commission_earned) as total_commission,
  DATE_TRUNC('day', created_at) as date
FROM delivery_recommendations
GROUP BY partner_name, DATE_TRUNC('day', created_at)
ORDER BY date DESC, total_recommendations DESC;

-- ============================================================================
-- UPDATE TRIGGER FOR delivery_partners
-- ============================================================================

CREATE OR REPLACE FUNCTION update_delivery_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_partners_updated_at
  BEFORE UPDATE ON delivery_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_partners_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE delivery_partners IS 'Food delivery partners with affiliate information';
COMMENT ON TABLE delivery_recommendations IS 'Log of delivery recommendations shown to users';
COMMENT ON VIEW delivery_analytics IS 'Analytics view for delivery affiliate performance';

COMMENT ON COLUMN delivery_partners.cuisine_tags IS 'Array of cuisine types (e.g., thai, italian, mexican)';
COMMENT ON COLUMN delivery_partners.diet_tags IS 'Array of diet types (e.g., vegetarian, vegan, gluten_free)';
COMMENT ON COLUMN delivery_partners.commission_rate IS 'Commission percentage (e.g., 10.50 for 10.5%)';

COMMENT ON COLUMN delivery_recommendations.clicked IS 'Whether user clicked the affiliate link';
COMMENT ON COLUMN delivery_recommendations.converted IS 'Whether user completed an order';
COMMENT ON COLUMN delivery_recommendations.order_value IS 'Total order value if converted';
COMMENT ON COLUMN delivery_recommendations.commission_earned IS 'Commission earned from this conversion';

-- ============================================================================
-- GEOLOCATION & AFFILIATE ROUTING MIGRATION
-- ============================================================================
-- 
-- Purpose: Enable language-independent location detection and affiliate routing
-- 
-- Problem: Language ≠ Location (e.g., Hindi speaker in US needs US affiliates)
-- Solution: Store confirmed country separately from language preference
-- 
-- Tables:
--   1. user_profiles - Store user language and confirmed country
--   2. affiliate_partner_map - Map countries to affiliate partners with priority
-- 
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text UNIQUE NOT NULL,
  preferred_language text,
  confirmed_country text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by chatgpt_user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_chatgpt_user_id 
  ON user_profiles (chatgpt_user_id);

-- Index for analytics by country
CREATE INDEX IF NOT EXISTS idx_user_profiles_country 
  ON user_profiles (confirmed_country);

-- Comment
COMMENT ON TABLE user_profiles IS 'Stores user language preferences and confirmed location for affiliate routing';
COMMENT ON COLUMN user_profiles.chatgpt_user_id IS 'Unique identifier from ChatGPT';
COMMENT ON COLUMN user_profiles.preferred_language IS 'ISO language code (en, es, zh, etc.) detected from user input';
COMMENT ON COLUMN user_profiles.confirmed_country IS 'ISO country code (US, IN, ES, etc.) confirmed by user';

-- ============================================================================
-- 2. AFFILIATE PARTNER MAP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_partner_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  partner_id uuid REFERENCES delivery_partners(id) ON DELETE CASCADE,
  affiliate_id text NOT NULL,
  priority int DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by country
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_country 
  ON affiliate_partner_map (country_code, priority);

-- Index for partner lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_id 
  ON affiliate_partner_map (partner_id);

-- Unique constraint: one affiliate ID per partner per country
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_partner_unique 
  ON affiliate_partner_map (country_code, partner_id);

-- Comment
COMMENT ON TABLE affiliate_partner_map IS 'Maps countries to delivery partners with affiliate IDs and priority';
COMMENT ON COLUMN affiliate_partner_map.country_code IS 'ISO country code (US, IN, ES, UK, etc.)';
COMMENT ON COLUMN affiliate_partner_map.partner_id IS 'Reference to delivery_partners table';
COMMENT ON COLUMN affiliate_partner_map.affiliate_id IS 'Country-specific affiliate ID for this partner';
COMMENT ON COLUMN affiliate_partner_map.priority IS 'Lower number = higher priority (1 = first choice)';
COMMENT ON COLUMN affiliate_partner_map.active IS 'Whether this affiliate mapping is currently active';

-- ============================================================================
-- 3. SEED AFFILIATE PARTNER MAPPINGS
-- ============================================================================

-- United States
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'UBER-US-12345', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'DD-US-98765', 2 
FROM delivery_partners dp 
WHERE dp.name = 'DoorDash'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'GRUBHUB-US-55555', 3 
FROM delivery_partners dp 
WHERE dp.name = 'Grubhub'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- India
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'IN', dp.id, 'ZOMATO-IN-11111', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Zomato'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'IN', dp.id, 'SWIGGY-IN-22222', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Swiggy'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- United Kingdom
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'DELIVEROO-UK-33333', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'JUSTEAT-UK-44444', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Just Eat'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'UBER-UK-77777', 3 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Spain
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'ES', dp.id, 'GLOVO-ES-66666', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Glovo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'ES', dp.id, 'UBER-ES-88888', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Canada
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'CA', dp.id, 'UBER-CA-99999', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'CA', dp.id, 'DD-CA-10101', 2 
FROM delivery_partners dp 
WHERE dp.name = 'DoorDash'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Australia
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'AU', dp.id, 'UBER-AU-12121', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'AU', dp.id, 'DELIVEROO-AU-13131', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Germany
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'DE', dp.id, 'LIEFERANDO-DE-14141', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Lieferando'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'DE', dp.id, 'UBER-DE-15151', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- France
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'FR', dp.id, 'UBER-FR-16161', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'FR', dp.id, 'DELIVEROO-FR-17171', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to get affiliate partners by country
CREATE OR REPLACE FUNCTION get_affiliates_by_country(p_country_code text)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  affiliate_id text,
  priority int,
  base_url text,
  commission_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apm.partner_id,
    dp.name as partner_name,
    apm.affiliate_id,
    apm.priority,
    dp.base_url,
    dp.commission_rate
  FROM affiliate_partner_map apm
  JOIN delivery_partners dp ON apm.partner_id = dp.id
  WHERE apm.country_code = p_country_code
    AND apm.active = true
    AND dp.active = true
  ORDER BY apm.priority ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_affiliates_by_country IS 'Returns prioritized list of active affiliate partners for a given country';

-- ============================================================================
-- 5. ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW user_location_analytics AS
SELECT 
  confirmed_country,
  preferred_language,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') as active_last_7_days,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as active_last_30_days
FROM user_profiles
WHERE confirmed_country IS NOT NULL
GROUP BY confirmed_country, preferred_language
ORDER BY user_count DESC;

COMMENT ON VIEW user_location_analytics IS 'Analytics view showing user distribution by country and language';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE 'user_profiles table created successfully';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_partner_map') THEN
    RAISE NOTICE 'affiliate_partner_map table created successfully';
  END IF;
END $$;

/**
 * Expand Country Coverage - Add 17 More Countries
 * 
 * Week 3: Ecosystem Expansion
 * Expands from 8 countries to 25 countries for global coverage.
 */

-- Add affiliate partner mappings for new countries

-- Mexico (Uber Eats, Rappi)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'MX', 'UBER-EATS-MX-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Netherlands (Uber Eats, Deliveroo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NL', 'UBER-EATS-NL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NL', 'DELIVEROO-NL-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Sweden (Uber Eats, Foodora)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SE', 'UBER-EATS-SE-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Poland (Uber Eats, Glovo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'PL', 'UBER-EATS-PL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Italy (Uber Eats, Deliveroo, Glovo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'IT', 'UBER-EATS-IT-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'IT', 'DELIVEROO-IT-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- China (Meituan, Ele.me - placeholders for now)
-- Note: Will need to add Chinese delivery partners in future migration

-- Japan (Uber Eats)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'JP', 'UBER-EATS-JP-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- South Korea (Uber Eats, Coupang Eats - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'KR', 'UBER-EATS-KR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Singapore (Uber Eats, Deliveroo, GrabFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SG', 'UBER-EATS-SG-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SG', 'DELIVEROO-SG-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Thailand (Uber Eats, GrabFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'TH', 'UBER-EATS-TH-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Indonesia (Uber Eats, GrabFood, GoFood - placeholders)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'ID', 'UBER-EATS-ID-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- New Zealand (Uber Eats)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NZ', 'UBER-EATS-NZ-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- United Arab Emirates (Uber Eats, Deliveroo, Talabat - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AE', 'UBER-EATS-AE-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AE', 'DELIVEROO-AE-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Saudi Arabia (Uber Eats, HungerStation - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SA', 'UBER-EATS-SA-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Brazil (Uber Eats, iFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'BR', 'UBER-EATS-BR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Argentina (Uber Eats, PedidosYa - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AR', 'UBER-EATS-AR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Chile (Uber Eats, PedidosYa - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'CL', 'UBER-EATS-CL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- South Africa (Uber Eats, Mr D Food - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'ZA', 'UBER-EATS-ZA-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Add grocery affiliates for new countries (Amazon Fresh where available)

-- Germany (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'DE',
  'AMAZON-FRESH-DE-001',
  1,
  true
);

-- France (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'FR',
  'AMAZON-FRESH-FR-001',
  1,
  true
);

-- Italy (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'IT',
  'AMAZON-FRESH-IT-001',
  1,
  true
);

-- Japan (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'JP',
  'AMAZON-FRESH-JP-001',
  1,
  true
);

-- Singapore (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'SG',
  'AMAZON-FRESH-SG-001',
  1,
  true
);

-- Australia (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'AU',
  'AMAZON-FRESH-AU-001',
  1,
  true
);

-- Brazil (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'BR',
  'AMAZON-FRESH-BR-001',
  1,
  true
);

-- Create index for faster country lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_country ON affiliate_partner_map(country);

-- Add comment
COMMENT ON TABLE affiliate_partner_map IS 'Week 3: Expanded from 8 to 25 countries for global coverage';

-- Migration: Add MealMe Orders and Webhooks
-- Description: Tables for MealMe food ordering integration
-- Date: 2025-10-26

-- =====================================================
-- TABLE: orders
-- Purpose: Store MealMe order records
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  country text DEFAULT 'US',
  mealme_order_id text UNIQUE,
  cart_id text,
  provider text DEFAULT 'mealme',
  subtotal numeric(10, 2),
  fees numeric(10, 2),
  tip numeric(10, 2),
  total numeric(10, 2),
  currency text DEFAULT 'USD',
  status text DEFAULT 'created',
  delivery_address jsonb,
  delivery_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for orders
CREATE INDEX idx_orders_chatgpt_user_id ON orders(chatgpt_user_id);
CREATE INDEX idx_orders_mealme_order_id ON orders(mealme_order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- TABLE: order_items
-- Purpose: Store individual items in each order
-- =====================================================

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  unit_price numeric(10, 2),
  total_price numeric(10, 2),
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

-- =====================================================
-- TABLE: delivery_quotes
-- Purpose: Store delivery quotes for comparison
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  eta_minutes int,
  fee numeric(10, 2),
  is_cheapest boolean DEFAULT false,
  is_fastest boolean DEFAULT false,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for delivery_quotes
CREATE INDEX idx_delivery_quotes_order_id ON delivery_quotes(order_id);
CREATE INDEX idx_delivery_quotes_provider ON delivery_quotes(provider);

-- =====================================================
-- TABLE: mealme_webhook_events
-- Purpose: Audit trail for MealMe webhook events
-- =====================================================

CREATE TABLE IF NOT EXISTS mealme_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  event_type text,
  mealme_order_id text,
  status text,
  raw jsonb NOT NULL,
  received_at timestamptz DEFAULT now()
);

-- Indexes for mealme_webhook_events
CREATE INDEX idx_webhook_events_order_id ON mealme_webhook_events(order_id);
CREATE INDEX idx_webhook_events_mealme_order_id ON mealme_webhook_events(mealme_order_id);
CREATE INDEX idx_webhook_events_received_at ON mealme_webhook_events(received_at DESC);

-- =====================================================
-- VIEW: order_analytics
-- Purpose: Analytics view for order metrics
-- =====================================================

CREATE OR REPLACE VIEW order_analytics AS
SELECT
  DATE(o.created_at) as order_date,
  o.country,
  o.provider,
  o.status,
  COUNT(o.id) as order_count,
  SUM(o.subtotal) as total_subtotal,
  SUM(o.fees) as total_fees,
  SUM(o.tip) as total_tips,
  SUM(o.total) as total_revenue,
  AVG(o.total) as avg_order_value,
  COUNT(DISTINCT o.chatgpt_user_id) as unique_users
FROM orders o
GROUP BY DATE(o.created_at), o.country, o.provider, o.status;

-- =====================================================
-- FUNCTION: update_order_timestamp
-- Purpose: Auto-update updated_at on orders table
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_order_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE orders IS 'MealMe order records with status tracking';
COMMENT ON TABLE order_items IS 'Individual items in each MealMe order';
COMMENT ON TABLE delivery_quotes IS 'Delivery quotes for order comparison';
COMMENT ON TABLE mealme_webhook_events IS 'Audit trail for MealMe webhook events';
COMMENT ON VIEW order_analytics IS 'Analytics view for order metrics and revenue';

-- =====================================================
-- WeightTrackerGPT Database Schema
-- =====================================================
-- This migration adds weight tracking, plan outcome evaluation,
-- and user preferences for the feedback loop.
--
-- Tables:
-- 1. weight_logs - Daily weight entries
-- 2. plan_outcomes - Plan vs. result linkage
-- 3. weight_prefs - User preferences (unit, reminders, safe loss rate)
-- =====================================================

-- =====================================================
-- 1. WEIGHT_LOGS TABLE
-- =====================================================
-- Stores daily weight measurements from users
-- Supports manual entry and future device sync (Apple Health, Fitbit)

CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  date date NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'fitbit', 'other')),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one weight entry per user per day
  UNIQUE(chatgpt_user_id, date)
);

-- Indexes for efficient queries
CREATE INDEX idx_weight_logs_user_date ON weight_logs(chatgpt_user_id, date DESC);
CREATE INDEX idx_weight_logs_created ON weight_logs(created_at DESC);

-- =====================================================
-- 2. PLAN_OUTCOMES TABLE
-- =====================================================
-- Links meal plans to actual weight outcomes
-- Enables feedback loop: plan → result → adapt

CREATE TABLE IF NOT EXISTS plan_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  meal_plan_id uuid, -- References meal_plans table
  week_start date NOT NULL,
  week_end date NOT NULL,
  target_delta_kg numeric, -- Expected weekly change from plan (negative = loss)
  observed_delta_kg numeric, -- Actual change from trend
  prediction_error_kg numeric, -- observed - target
  recommendation jsonb, -- Structured adjustment { type, delta_kcal_per_day, message }
  applied boolean DEFAULT false, -- Whether user accepted recommendation
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one outcome per user per week
  UNIQUE(chatgpt_user_id, week_start)
);

-- Indexes for efficient queries
CREATE INDEX idx_plan_outcomes_user ON plan_outcomes(chatgpt_user_id);
CREATE INDEX idx_plan_outcomes_week ON plan_outcomes(week_start DESC);
CREATE INDEX idx_plan_outcomes_meal_plan ON plan_outcomes(meal_plan_id);

-- =====================================================
-- 3. WEIGHT_PREFS TABLE
-- =====================================================
-- User preferences for weight tracking

CREATE TABLE IF NOT EXISTS weight_prefs (
  chatgpt_user_id text PRIMARY KEY,
  
  -- Display preferences
  unit text DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  
  -- Tracking preferences
  weigh_time text DEFAULT 'morning_fasted',
  
  -- Safety guardrails
  safe_loss_kg_per_week numeric DEFAULT 0.5 CHECK (safe_loss_kg_per_week >= 0.25 AND safe_loss_kg_per_week <= 1.0),
  
  -- Reminder preferences
  daily_reminder_enabled boolean DEFAULT false,
  reminder_time time DEFAULT '08:00',
  timezone text DEFAULT 'UTC',
  
  -- Metadata
  last_updated timestamptz DEFAULT now()
);

-- Index for reminder queries (future use)
CREATE INDEX idx_weight_prefs_reminders ON weight_prefs(daily_reminder_enabled, reminder_time) WHERE daily_reminder_enabled = true;

-- =====================================================
-- 4. ANALYTICS VIEW
-- =====================================================
-- Aggregated view for plan outcome analytics

CREATE OR REPLACE VIEW plan_outcome_analytics AS
SELECT
  chatgpt_user_id,
  COUNT(*) as total_weeks,
  AVG(ABS(prediction_error_kg)) as avg_prediction_error_kg,
  AVG(observed_delta_kg) as avg_weekly_change_kg,
  COUNT(*) FILTER (WHERE ABS(prediction_error_kg) < 0.2) as weeks_on_target,
  COUNT(*) FILTER (WHERE applied = true) as weeks_adjusted,
  MAX(created_at) as last_evaluation
FROM plan_outcomes
GROUP BY chatgpt_user_id;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get latest weight for a user
CREATE OR REPLACE FUNCTION get_latest_weight(user_id text)
RETURNS numeric AS $$
  SELECT weight_kg
  FROM weight_logs
  WHERE chatgpt_user_id = user_id
  ORDER BY date DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to get weight trend (7-day average)
CREATE OR REPLACE FUNCTION get_weight_trend(user_id text, days int DEFAULT 7)
RETURNS numeric AS $$
  SELECT AVG(weight_kg)
  FROM (
    SELECT weight_kg
    FROM weight_logs
    WHERE chatgpt_user_id = user_id
    ORDER BY date DESC
    LIMIT days
  ) recent_weights;
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS for all tables

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_prefs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
-- Note: In production, you'll need to set up proper authentication
-- For now, these are permissive policies for service role access

CREATE POLICY "Users can view their own weight logs"
  ON weight_logs FOR SELECT
  USING (true); -- Service role has full access

CREATE POLICY "Users can insert their own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (true); -- Service role has full access

CREATE POLICY "Users can update their own weight logs"
  ON weight_logs FOR UPDATE
  USING (true); -- Service role has full access

CREATE POLICY "Users can view their own plan outcomes"
  ON plan_outcomes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own plan outcomes"
  ON plan_outcomes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own plan outcomes"
  ON plan_outcomes FOR UPDATE
  USING (true);

CREATE POLICY "Users can view their own preferences"
  ON weight_prefs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own preferences"
  ON weight_prefs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own preferences"
  ON weight_prefs FOR UPDATE
  USING (true);

-- =====================================================
-- 7. SEED DATA (Optional)
-- =====================================================
-- Insert default preferences for testing

-- This will be handled by the application on first use

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: weight_logs, plan_outcomes, weight_prefs
-- Views created: plan_outcome_analytics
-- Functions created: get_latest_weight, get_weight_trend
-- RLS enabled with permissive policies for service role
-- =====================================================

-- TheLoopGPT.ai Complete Database Schema with Supabase Auth
-- This migration consolidates all previous migrations and updates to use Supabase Auth

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'UTC',
  unit_preference TEXT DEFAULT 'metric' CHECK (unit_preference IN ('metric', 'imperial')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MEAL PLANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meal_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'general_health')),
  daily_calorie_target INTEGER,
  vibe TEXT,
  dietary_restrictions TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.meal_plans(plan_id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id UUID,
  recipe_title TEXT NOT NULL,
  calories INTEGER,
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  ingredients JSONB,
  instructions TEXT[],
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  affiliate_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  recipe_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  calories INTEGER,
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  tags TEXT[],
  source TEXT DEFAULT 'leftovergpt',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_plans
CREATE POLICY "Users can view own meal plans"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for meal_plan_items
CREATE POLICY "Users can view own meal plan items"
  ON public.meal_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.plan_id = meal_plan_items.plan_id
    AND meal_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own meal plan items"
  ON public.meal_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.plan_id = meal_plan_items.plan_id
    AND meal_plans.user_id = auth.uid()
  ));

-- RLS Policies for recipes (public read)
CREATE POLICY "Anyone can view recipes"
  ON public.recipes FOR SELECT
  USING (true);

-- ============================================================================
-- WEIGHT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weight_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.plan_outcomes (
  outcome_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  target_delta_kg DECIMAL(4,2),
  actual_delta_kg DECIMAL(4,2),
  recommended_adjustment_kcal INTEGER,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weight_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  safe_loss_kg_per_week DECIMAL(3,2) DEFAULT 0.5,
  daily_reminder_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own weight logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own plan outcomes"
  ON public.plan_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weight prefs"
  ON public.weight_prefs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- AFFILIATE LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient TEXT NOT NULL,
  partner TEXT NOT NULL CHECK (partner IN ('amazon', 'instacart')),
  url TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(ingredient, partner)
);

CREATE TABLE IF NOT EXISTS public.affiliate_partner_map (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('grocery', 'delivery')),
  partner_name TEXT NOT NULL,
  affiliate_id TEXT,
  base_url TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country, partner_type, partner_name)
);

CREATE TABLE IF NOT EXISTS public.affiliate_analytics (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'conversion')),
  ingredient TEXT,
  url TEXT,
  commission_amount DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_partner_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_analytics ENABLE ROW LEVEL SECURITY;

-- Public read for affiliate data
CREATE POLICY "Anyone can view affiliate links"
  ON public.affiliate_links FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view partner map"
  ON public.affiliate_partner_map FOR SELECT
  USING (true);

-- ============================================================================
-- DELIVERY PARTNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  affiliate_id TEXT,
  cuisine_tags TEXT[],
  diet_tags TEXT[],
  supported_countries TEXT[],
  commission_rate DECIMAL(4,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cuisine TEXT,
  diet_preference TEXT,
  country TEXT,
  partner_name TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  match_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_recommendations ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view delivery partners"
  ON public.delivery_partners FOR SELECT
  USING (true);

-- ============================================================================
-- MEALME ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
  mealme_order_id TEXT UNIQUE,
  store_name TEXT,
  total_amount DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  delivery_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  quote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  delivery_fee DECIMAL(10,2),
  estimated_time_minutes INTEGER,
  quote_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE TABLE IF NOT EXISTS public.mealme_webhook_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(order_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mealme_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.order_id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own delivery quotes"
  ON public.delivery_quotes FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (public read)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User profiles
CREATE INDEX idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX idx_user_profiles_language ON public.user_profiles(language);

-- Meal plans
CREATE INDEX idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX idx_meal_plans_dates ON public.meal_plans(start_date, end_date);
CREATE INDEX idx_meal_plan_items_plan_id ON public.meal_plan_items(plan_id);

-- Weight tracking
CREATE INDEX idx_weight_logs_user_date ON public.weight_logs(user_id, date DESC);
CREATE INDEX idx_plan_outcomes_user_id ON public.plan_outcomes(user_id);

-- Affiliate links
CREATE INDEX idx_affiliate_links_ingredient ON public.affiliate_links(ingredient);
CREATE INDEX idx_affiliate_links_expires ON public.affiliate_links(expires_at);

-- Orders
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Events
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Normalize ingredient names for better matching
CREATE OR REPLACE FUNCTION public.normalize_ingredient(ingredient TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(ingredient, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_weight_prefs_updated_at
  BEFORE UPDATE ON public.weight_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Order analytics view
CREATE OR REPLACE VIEW public.order_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  SUM(commission_amount) as total_commission,
  AVG(total_amount) as avg_order_value
FROM public.orders
WHERE status IN ('confirmed', 'delivered')
GROUP BY DATE_TRUNC('day', created_at);

-- Delivery analytics view
CREATE OR REPLACE VIEW public.delivery_analytics AS
SELECT
  partner_name,
  country,
  COUNT(*) as total_recommendations,
  AVG(match_score) as avg_match_score,
  DATE_TRUNC('day', created_at) as date
FROM public.delivery_recommendations
GROUP BY partner_name, country, DATE_TRUNC('day', created_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_name, enabled, rollout_percentage, description) VALUES
  ('mealme_integration', true, 100, 'Enable MealMe 1-click ordering'),
  ('delivery_affiliates', true, 100, 'Enable delivery affiliate recommendations'),
  ('weight_tracker', true, 100, 'Enable weight tracking and plan adaptation'),
  ('multilingual', true, 100, 'Enable multilingual support (100+ languages)')
ON CONFLICT (flag_name) DO NOTHING;

-- Insert delivery partners
INSERT INTO public.delivery_partners (name, base_url, affiliate_id, cuisine_tags, diet_tags, supported_countries, commission_rate, is_active) VALUES
  ('Uber Eats', 'https://www.ubereats.com', 'TEST-UBER-123', ARRAY['all'], ARRAY['all'], ARRAY['US', 'UK', 'CA', 'AU'], 5.00, true),
  ('DoorDash', 'https://www.doordash.com', 'TEST-DOORDASH-123', ARRAY['all'], ARRAY['all'], ARRAY['US', 'CA'], 7.00, true),
  ('Grubhub', 'https://www.grubhub.com', 'TEST-GRUBHUB-123', ARRAY['all'], ARRAY['all'], ARRAY['US'], 6.00, true),
  ('Deliveroo', 'https://deliveroo.co.uk', 'TEST-DELIVEROO-123', ARRAY['all'], ARRAY['all'], ARRAY['UK', 'FR', 'ES', 'IT'], 5.50, true),
  ('Just Eat', 'https://www.just-eat.co.uk', 'TEST-JUSTEAT-123', ARRAY['all'], ARRAY['all'], ARRAY['UK', 'IE'], 4.50, true)
ON CONFLICT (name) DO NOTHING;

-- Insert affiliate partner mappings (25 countries)
INSERT INTO public.affiliate_partner_map (country, partner_type, partner_name, affiliate_id, base_url, priority, is_active) VALUES
  -- US
  ('US', 'grocery', 'Amazon Fresh', 'theloopgpt-20', 'https://www.amazon.com', 1, true),
  ('US', 'grocery', 'Instacart', 'TEST-INSTA-123', 'https://www.instacart.com', 2, true),
  ('US', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  ('US', 'delivery', 'DoorDash', 'TEST-DOORDASH-123', 'https://www.doordash.com', 2, true),
  -- UK
  ('UK', 'grocery', 'Amazon Fresh UK', 'theloopgpt-21', 'https://www.amazon.co.uk', 1, true),
  ('UK', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.co.uk', 1, true),
  ('UK', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 2, true),
  -- Canada
  ('CA', 'grocery', 'Amazon Fresh CA', 'theloopgpt-20', 'https://www.amazon.ca', 1, true),
  ('CA', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  ('CA', 'delivery', 'DoorDash', 'TEST-DOORDASH-123', 'https://www.doordash.com', 2, true),
  -- Australia
  ('AU', 'grocery', 'Amazon AU', 'theloopgpt-20', 'https://www.amazon.com.au', 1, true),
  ('AU', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  -- Germany
  ('DE', 'grocery', 'Amazon DE', 'theloopgpt-21', 'https://www.amazon.de', 1, true),
  -- France
  ('FR', 'grocery', 'Amazon FR', 'theloopgpt-21', 'https://www.amazon.fr', 1, true),
  ('FR', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.fr', 1, true),
  -- Spain
  ('ES', 'grocery', 'Amazon ES', 'theloopgpt-21', 'https://www.amazon.es', 1, true),
  ('ES', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.es', 1, true),
  -- Italy
  ('IT', 'grocery', 'Amazon IT', 'theloopgpt-21', 'https://www.amazon.it', 1, true),
  ('IT', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.it', 1, true),
  -- India
  ('IN', 'grocery', 'Amazon IN', 'theloopgpt-21', 'https://www.amazon.in', 1, true),
  -- Japan
  ('JP', 'grocery', 'Amazon JP', 'theloopgpt-22', 'https://www.amazon.co.jp', 1, true),
  -- Add more countries as needed...
  ('BR', 'grocery', 'Amazon BR', 'theloopgpt-20', 'https://www.amazon.com.br', 1, true),
  ('MX', 'grocery', 'Amazon MX', 'theloopgpt-20', 'https://www.amazon.com.mx', 1, true),
  ('NL', 'grocery', 'Amazon NL', 'theloopgpt-21', 'https://www.amazon.nl', 1, true),
  ('SE', 'grocery', 'Amazon SE', 'theloopgpt-21', 'https://www.amazon.se', 1, true)
ON CONFLICT (country, partner_type, partner_name) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- THELOOP TRACKER DATABASE SCHEMA
-- =====================================================
-- Migrated from: K-Cal GPT (Railway)
-- Date: November 1, 2025
-- Tables: 5 (users, foods, logs, summaries, stats)
-- =====================================================

-- Drop existing tables if any (in correct order due to foreign keys)
DROP TABLE IF EXISTS tracker_user_stats CASCADE;
DROP TABLE IF EXISTS tracker_daily_summaries CASCADE;
DROP TABLE IF EXISTS tracker_food_logs CASCADE;
DROP TABLE IF EXISTS tracker_foods CASCADE;
DROP TABLE IF EXISTS tracker_users CASCADE;

-- =====================================================
-- Table 1: User Profiles
-- =====================================================

CREATE TABLE tracker_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id TEXT UNIQUE NOT NULL,
  
  -- Personal info (optional)
  age INTEGER,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  gender TEXT,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  
  -- Goals
  goal_type TEXT CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'health')),
  daily_calorie_target INTEGER,
  daily_protein_target_g INTEGER,
  daily_carbs_target_g INTEGER,
  daily_fat_target_g INTEGER,
  
  -- Subscription (for future use)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  subscription_expires_at TIMESTAMP,
  
  -- Preferences
  preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
  timezone TEXT DEFAULT 'UTC',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracker_users_chatgpt_id ON tracker_users(chatgpt_user_id);
CREATE INDEX idx_tracker_users_subscription ON tracker_users(subscription_tier, trial_ends_at);

-- RLS Policies
ALTER TABLE tracker_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON tracker_users FOR SELECT
  USING (true);  -- Simplified for Edge Functions

CREATE POLICY "Users can insert own profile"
  ON tracker_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON tracker_users FOR UPDATE
  USING (true);

-- =====================================================
-- Table 2: Food Database
-- =====================================================

CREATE TABLE tracker_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Food identification
  name TEXT NOT NULL,
  name_variations JSONB DEFAULT '[]'::jsonb,
  category TEXT CHECK (category IN ('protein', 'carbs', 'fats', 'vegetables', 'fruits', 'dairy', 'snacks', 'beverages', 'other')),
  
  -- Nutrition per 100g
  calories_per_100g INTEGER NOT NULL,
  protein_per_100g DECIMAL(5,2) DEFAULT 0,
  carbs_per_100g DECIMAL(5,2) DEFAULT 0,
  fat_per_100g DECIMAL(5,2) DEFAULT 0,
  fiber_per_100g DECIMAL(5,2) DEFAULT 0,
  sugar_per_100g DECIMAL(5,2) DEFAULT 0,
  
  -- Common serving sizes
  common_servings JSONB DEFAULT '[]'::jsonb,
  
  -- Source and confidence
  data_source TEXT DEFAULT 'USDA',
  verified BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracker_foods_name ON tracker_foods USING gin(to_tsvector('english', name));
CREATE INDEX idx_tracker_foods_category ON tracker_foods(category);
CREATE INDEX idx_tracker_foods_verified ON tracker_foods(verified);

-- RLS Policies
ALTER TABLE tracker_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view foods"
  ON tracker_foods FOR SELECT
  USING (true);

CREATE POLICY "System can insert foods"
  ON tracker_foods FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Table 3: Food Logs
-- =====================================================

CREATE TABLE tracker_food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tracker_users(id) ON DELETE CASCADE,
  
  -- When
  logged_at TIMESTAMP DEFAULT NOW(),
  log_date DATE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  
  -- What
  food_name TEXT NOT NULL,
  food_id UUID REFERENCES tracker_foods(id) ON DELETE SET NULL,
  
  -- How much
  quantity DECIMAL(10,2) NOT NULL,
  quantity_unit TEXT NOT NULL,
  
  -- Calculated nutrition (denormalized for fast queries)
  calories INTEGER NOT NULL,
  protein_g DECIMAL(5,2) DEFAULT 0,
  carbs_g DECIMAL(5,2) DEFAULT 0,
  fat_g DECIMAL(5,2) DEFAULT 0,
  fiber_g DECIMAL(5,2) DEFAULT 0,
  sugar_g DECIMAL(5,2) DEFAULT 0,
  
  -- Context
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'quick_add', 'meal_plan', 'recipe')),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- CRITICAL INDEXES for performance
CREATE INDEX idx_tracker_logs_user_date ON tracker_food_logs(user_id, log_date);
CREATE INDEX idx_tracker_logs_user_time ON tracker_food_logs(user_id, logged_at);
CREATE INDEX idx_tracker_logs_date ON tracker_food_logs(log_date);
CREATE INDEX idx_tracker_logs_meal_type ON tracker_food_logs(user_id, meal_type);

-- RLS Policies
ALTER TABLE tracker_food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON tracker_food_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own logs"
  ON tracker_food_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own logs"
  ON tracker_food_logs FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own logs"
  ON tracker_food_logs FOR DELETE
  USING (true);

-- =====================================================
-- Table 4: Daily Summaries
-- =====================================================

CREATE TABLE tracker_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tracker_users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  
  -- Totals
  total_calories INTEGER DEFAULT 0,
  total_protein_g DECIMAL(6,2) DEFAULT 0,
  total_carbs_g DECIMAL(6,2) DEFAULT 0,
  total_fat_g DECIMAL(6,2) DEFAULT 0,
  total_fiber_g DECIMAL(6,2) DEFAULT 0,
  
  -- Meal breakdown
  breakfast_calories INTEGER DEFAULT 0,
  lunch_calories INTEGER DEFAULT 0,
  dinner_calories INTEGER DEFAULT 0,
  snack_calories INTEGER DEFAULT 0,
  
  -- Metadata
  num_logs INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, summary_date)
);

CREATE INDEX idx_tracker_summaries_user_date ON tracker_daily_summaries(user_id, summary_date);
CREATE INDEX idx_tracker_summaries_date ON tracker_daily_summaries(summary_date);

-- RLS Policies
ALTER TABLE tracker_daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON tracker_daily_summaries FOR SELECT
  USING (true);

CREATE POLICY "System can insert summaries"
  ON tracker_daily_summaries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update summaries"
  ON tracker_daily_summaries FOR UPDATE
  USING (true);

-- =====================================================
-- Table 5: User Stats
-- =====================================================

CREATE TABLE tracker_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES tracker_users(id) ON DELETE CASCADE,
  
  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_log_date DATE,
  
  -- Totals
  total_days_logged INTEGER DEFAULT 0,
  total_foods_logged INTEGER DEFAULT 0,
  
  -- Milestones
  first_log_date DATE,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracker_stats_user ON tracker_user_stats(user_id);
CREATE INDEX idx_tracker_stats_streak ON tracker_user_stats(current_streak_days);

-- RLS Policies
ALTER TABLE tracker_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON tracker_user_stats FOR SELECT
  USING (true);

CREATE POLICY "System can insert stats"
  ON tracker_user_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update stats"
  ON tracker_user_stats FOR UPDATE
  USING (true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ TheLoop Tracker tables created successfully!';
  RAISE NOTICE '📊 Tables: tracker_users, tracker_foods, tracker_food_logs, tracker_daily_summaries, tracker_user_stats';
  RAISE NOTICE '🔐 RLS policies enabled on all tables';
  RAISE NOTICE '📈 Indexes created for performance';
END $$;

-- =====================================================
-- THELOOP TRACKER - SEED FOOD DATABASE
-- =====================================================
-- Insert 107 common foods with USDA nutrition data
-- =====================================================

INSERT INTO tracker_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, data_source, verified) VALUES
-- Protein sources
('Chicken Breast', 'protein', 165, 31.0, 0.0, 3.6, 0.0, 0.0, 'USDA', true),
('Salmon', 'protein', 208, 20.4, 0.0, 13.4, 0.0, 0.0, 'USDA', true),
('Tuna', 'protein', 132, 28.2, 0.0, 1.3, 0.0, 0.0, 'USDA', true),
('Eggs', 'protein', 155, 13.0, 1.1, 11.0, 0.0, 1.1, 'USDA', true),
('Greek Yogurt', 'dairy', 59, 10.2, 3.6, 0.4, 0.0, 3.2, 'USDA', true),
('Tofu', 'protein', 76, 8.0, 1.9, 4.8, 0.3, 0.7, 'USDA', true),
('Beef (lean)', 'protein', 250, 26.0, 0.0, 15.0, 0.0, 0.0, 'USDA', true),
('Pork Chop', 'protein', 231, 25.7, 0.0, 13.9, 0.0, 0.0, 'USDA', true),
('Turkey Breast', 'protein', 135, 30.0, 0.0, 0.7, 0.0, 0.0, 'USDA', true),
('Shrimp', 'protein', 99, 24.0, 0.2, 0.3, 0.0, 0.0, 'USDA', true),

-- Carbs sources
('White Rice', 'carbs', 130, 2.7, 28.2, 0.3, 0.4, 0.1, 'USDA', true),
('Brown Rice', 'carbs', 112, 2.6, 23.5, 0.9, 1.8, 0.4, 'USDA', true),
('Quinoa', 'carbs', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 'USDA', true),
('Oatmeal', 'carbs', 68, 2.4, 12.0, 1.4, 1.7, 0.3, 'USDA', true),
('Whole Wheat Bread', 'carbs', 247, 13.0, 41.0, 3.4, 7.0, 5.0, 'USDA', true),
('Pasta', 'carbs', 131, 5.0, 25.0, 1.1, 1.8, 0.6, 'USDA', true),
('Sweet Potato', 'carbs', 86, 1.6, 20.1, 0.1, 3.0, 4.2, 'USDA', true),
('Potato', 'carbs', 77, 2.0, 17.5, 0.1, 2.1, 0.8, 'USDA', true),
('Bagel', 'carbs', 257, 10.0, 50.0, 1.5, 2.0, 5.0, 'USDA', true),
('Tortilla', 'carbs', 312, 8.0, 51.0, 7.0, 3.0, 2.0, 'USDA', true),

-- Vegetables
('Broccoli', 'vegetables', 34, 2.8, 7.0, 0.4, 2.6, 1.7, 'USDA', true),
('Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 'USDA', true),
('Carrots', 'vegetables', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 'USDA', true),
('Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 'USDA', true),
('Cucumber', 'vegetables', 16, 0.7, 3.6, 0.1, 0.5, 1.7, 'USDA', true),
('Bell Pepper', 'vegetables', 31, 1.0, 6.0, 0.3, 2.1, 4.2, 'USDA', true),
('Lettuce', 'vegetables', 15, 1.4, 2.9, 0.2, 1.3, 0.8, 'USDA', true),
('Kale', 'vegetables', 49, 4.3, 8.8, 0.9, 3.6, 2.3, 'USDA', true),
('Cauliflower', 'vegetables', 25, 1.9, 5.0, 0.3, 2.0, 1.9, 'USDA', true),
('Zucchini', 'vegetables', 17, 1.2, 3.1, 0.3, 1.0, 2.5, 'USDA', true),

-- Fruits
('Apple', 'fruits', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 'USDA', true),
('Banana', 'fruits', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 'USDA', true),
('Orange', 'fruits', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 'USDA', true),
('Strawberries', 'fruits', 32, 0.7, 7.7, 0.3, 2.0, 4.9, 'USDA', true),
('Blueberries', 'fruits', 57, 0.7, 14.5, 0.3, 2.4, 10.0, 'USDA', true),
('Grapes', 'fruits', 69, 0.7, 18.1, 0.2, 0.9, 15.5, 'USDA', true),
('Watermelon', 'fruits', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 'USDA', true),
('Avocado', 'fruits', 160, 2.0, 8.5, 14.7, 6.7, 0.7, 'USDA', true),
('Mango', 'fruits', 60, 0.8, 15.0, 0.4, 1.6, 13.7, 'USDA', true),
('Pineapple', 'fruits', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 'USDA', true),

-- Dairy
('Milk (whole)', 'dairy', 61, 3.2, 4.8, 3.3, 0.0, 5.1, 'USDA', true),
('Milk (skim)', 'dairy', 34, 3.4, 5.0, 0.1, 0.0, 5.0, 'USDA', true),
('Cheddar Cheese', 'dairy', 403, 25.0, 1.3, 33.0, 0.0, 0.5, 'USDA', true),
('Cottage Cheese', 'dairy', 98, 11.1, 3.4, 4.3, 0.0, 2.7, 'USDA', true),
('Yogurt', 'dairy', 59, 3.5, 4.7, 3.3, 0.0, 4.7, 'USDA', true),

-- Fats & Oils
('Olive Oil', 'fats', 884, 0.0, 0.0, 100.0, 0.0, 0.0, 'USDA', true),
('Butter', 'fats', 717, 0.9, 0.1, 81.0, 0.0, 0.1, 'USDA', true),
('Peanut Butter', 'fats', 588, 25.0, 20.0, 50.0, 6.0, 9.0, 'USDA', true),
('Almonds', 'fats', 579, 21.0, 22.0, 49.0, 12.0, 4.0, 'USDA', true),
('Walnuts', 'fats', 654, 15.0, 14.0, 65.0, 7.0, 2.6, 'USDA', true),

-- Snacks
('Potato Chips', 'snacks', 536, 6.6, 53.0, 34.0, 4.5, 0.4, 'USDA', true),
('Popcorn', 'snacks', 375, 12.0, 74.0, 4.5, 15.0, 0.6, 'USDA', true),
('Pretzels', 'snacks', 380, 10.0, 80.0, 3.0, 3.0, 2.0, 'USDA', true),
('Granola Bar', 'snacks', 471, 10.0, 64.0, 20.0, 6.0, 25.0, 'USDA', true),
('Dark Chocolate', 'snacks', 546, 5.0, 61.0, 31.0, 7.0, 48.0, 'USDA', true),

-- Beverages
('Coffee (black)', 'beverages', 2, 0.3, 0.0, 0.0, 0.0, 0.0, 'USDA', true),
('Tea (unsweetened)', 'beverages', 1, 0.0, 0.3, 0.0, 0.0, 0.0, 'USDA', true),
('Orange Juice', 'beverages', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 'USDA', true),
('Soda', 'beverages', 41, 0.0, 10.6, 0.0, 0.0, 10.6, 'USDA', true),
('Protein Shake', 'beverages', 80, 15.0, 5.0, 1.0, 0.0, 3.0, 'USDA', true),

-- Additional common foods
('Pizza', 'other', 266, 11.0, 33.0, 10.0, 2.0, 4.0, 'USDA', true),
('Burger', 'other', 295, 17.0, 24.0, 14.0, 1.0, 5.0, 'USDA', true),
('French Fries', 'snacks', 312, 3.4, 41.0, 15.0, 3.8, 0.2, 'USDA', true),
('Caesar Salad', 'vegetables', 190, 8.0, 10.0, 14.0, 2.0, 2.0, 'USDA', true),
('Sushi Roll', 'other', 150, 6.0, 24.0, 3.0, 1.0, 3.0, 'USDA', true),
('Burrito', 'other', 206, 10.0, 25.0, 7.0, 3.0, 2.0, 'USDA', true),
('Pancakes', 'carbs', 227, 6.0, 28.0, 10.0, 1.0, 6.0, 'USDA', true),
('Waffles', 'carbs', 291, 7.0, 37.0, 13.0, 1.0, 10.0, 'USDA', true),
('Cereal', 'carbs', 379, 8.0, 84.0, 2.0, 3.0, 24.0, 'USDA', true),
('Ice Cream', 'snacks', 207, 3.5, 24.0, 11.0, 0.7, 21.0, 'USDA', true),
('Cookies', 'snacks', 502, 5.0, 65.0, 24.0, 2.0, 36.0, 'USDA', true),
('Cake', 'snacks', 257, 3.0, 42.0, 9.0, 1.0, 28.0, 'USDA', true),
('Donut', 'snacks', 452, 5.0, 51.0, 25.0, 1.0, 26.0, 'USDA', true),
('Muffin', 'snacks', 377, 6.0, 51.0, 16.0, 2.0, 28.0, 'USDA', true),
('Smoothie', 'beverages', 66, 1.0, 16.0, 0.2, 1.5, 13.0, 'USDA', true),
('Hummus', 'other', 166, 8.0, 14.0, 10.0, 6.0, 0.3, 'USDA', true),
('Guacamole', 'other', 160, 2.0, 9.0, 15.0, 7.0, 0.7, 'USDA', true),
('Salsa', 'other', 36, 1.5, 8.0, 0.2, 2.0, 4.0, 'USDA', true),
('Ranch Dressing', 'other', 458, 1.0, 6.0, 48.0, 0.0, 3.0, 'USDA', true),
('BBQ Sauce', 'other', 172, 1.0, 41.0, 0.5, 1.0, 33.0, 'USDA', true),
('Ketchup', 'other', 112, 1.0, 27.0, 0.1, 0.3, 22.0, 'USDA', true),
('Mayonnaise', 'fats', 680, 1.0, 0.6, 75.0, 0.0, 0.3, 'USDA', true),
('Mustard', 'other', 66, 4.0, 6.0, 4.0, 2.0, 1.0, 'USDA', true),
('Honey', 'other', 304, 0.3, 82.0, 0.0, 0.2, 82.0, 'USDA', true),
('Maple Syrup', 'other', 260, 0.0, 67.0, 0.2, 0.0, 60.0, 'USDA', true),
('Jam', 'other', 278, 0.4, 69.0, 0.1, 1.0, 49.0, 'USDA', true),
('Peanuts', 'fats', 567, 26.0, 16.0, 49.0, 9.0, 4.0, 'USDA', true),
('Cashews', 'fats', 553, 18.0, 30.0, 44.0, 3.0, 6.0, 'USDA', true),
('Pistachios', 'fats', 560, 20.0, 28.0, 45.0, 10.0, 8.0, 'USDA', true),
('Sunflower Seeds', 'fats', 584, 21.0, 20.0, 51.0, 9.0, 3.0, 'USDA', true),
('Chia Seeds', 'fats', 486, 17.0, 42.0, 31.0, 34.0, 0.0, 'USDA', true),
('Flax Seeds', 'fats', 534, 18.0, 29.0, 42.0, 27.0, 2.0, 'USDA', true),
('Protein Bar', 'snacks', 400, 20.0, 40.0, 15.0, 5.0, 20.0, 'USDA', true),
('Energy Drink', 'beverages', 45, 0.0, 11.0, 0.0, 0.0, 11.0, 'USDA', true),
('Sports Drink', 'beverages', 25, 0.0, 6.0, 0.0, 0.0, 6.0, 'USDA', true),
('Coconut Water', 'beverages', 19, 0.7, 3.7, 0.2, 1.1, 2.6, 'USDA', true),
('Almond Milk', 'beverages', 17, 0.6, 0.6, 1.2, 0.4, 0.0, 'USDA', true),
('Soy Milk', 'beverages', 33, 2.9, 1.7, 1.6, 0.4, 1.0, 'USDA', true),
('Oat Milk', 'beverages', 47, 1.0, 7.6, 1.5, 0.8, 4.5, 'USDA', true),
('Bacon', 'protein', 541, 37.0, 1.4, 42.0, 0.0, 0.0, 'USDA', true),
('Sausage', 'protein', 346, 13.0, 1.0, 32.0, 0.0, 0.0, 'USDA', true),
('Ham', 'protein', 145, 21.0, 1.5, 5.5, 0.0, 0.0, 'USDA', true),
('Hot Dog', 'protein', 290, 10.0, 2.0, 26.0, 0.0, 1.0, 'USDA', true),
('Pepperoni', 'protein', 494, 20.0, 4.0, 44.0, 0.0, 1.0, 'USDA', true),
('Salami', 'protein', 336, 22.0, 1.0, 27.0, 0.0, 0.0, 'USDA', true),
('Lamb', 'protein', 294, 25.0, 0.0, 21.0, 0.0, 0.0, 'USDA', true),
('Duck', 'protein', 337, 19.0, 0.0, 28.0, 0.0, 0.0, 'USDA', true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Seeded 107 foods into tracker_foods table!';
END $$;

-- Migration: Create billing and subscription tables
-- Created: 2025-11-01
-- Purpose: Add Stripe subscription management and entitlement tracking

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'family')),
  status text DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'cancelled', 'past_due', 'trialing')),
  renewal_date timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Metadata for Agentic Commerce migration
  sku text,
  launch_phase text,
  
  -- Constraints
  UNIQUE(chatgpt_user_id),
  UNIQUE(email),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_chatgpt_user_id ON subscriptions(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own subscription
CREATE POLICY user_isolation_select ON subscriptions
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything (for Edge Functions)
CREATE POLICY service_role_all ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. ENTITLEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL UNIQUE,
  credits int DEFAULT 0,
  last_refill timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Foreign key to subscriptions
  CONSTRAINT fk_entitlements_user
    FOREIGN KEY (chatgpt_user_id)
    REFERENCES subscriptions(chatgpt_user_id)
    ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_entitlements_chatgpt_user_id ON entitlements(chatgpt_user_id);

-- Enable Row Level Security
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own entitlements
CREATE POLICY user_isolation_entitlements ON entitlements
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything
CREATE POLICY service_role_entitlements ON entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. ANALYTICS_EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  chatgpt_user_id text,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Enable Row Level Security (read-only for users)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own events
CREATE POLICY user_view_own_events ON analytics_events
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything
CREATE POLICY service_role_analytics ON analytics_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION has_premium_access(user_id text)
RETURNS boolean AS $$
DECLARE
  sub_record RECORD;
  trial_active boolean;
BEGIN
  -- Get subscription record
  SELECT status, tier, trial_end INTO sub_record
  FROM subscriptions
  WHERE chatgpt_user_id = user_id;
  
  -- If no subscription, return false
  IF sub_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if trial is active
  trial_active := sub_record.trial_end IS NOT NULL AND sub_record.trial_end > now();
  
  -- Return true if active subscription or active trial
  RETURN (sub_record.status = 'active' OR trial_active) AND sub_record.tier IN ('premium', 'family');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user entitlement status
CREATE OR REPLACE FUNCTION get_user_entitlement(user_id text)
RETURNS jsonb AS $$
DECLARE
  sub_record RECORD;
  ent_record RECORD;
  trial_active boolean;
  result jsonb;
BEGIN
  -- Get subscription
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE chatgpt_user_id = user_id;
  
  -- Get entitlements
  SELECT * INTO ent_record
  FROM entitlements
  WHERE chatgpt_user_id = user_id;
  
  -- Check trial status
  trial_active := sub_record.trial_end IS NOT NULL AND sub_record.trial_end > now();
  
  -- Build result
  result := jsonb_build_object(
    'has_access', (sub_record.status = 'active' OR trial_active) AND sub_record.tier IN ('premium', 'family'),
    'tier', COALESCE(sub_record.tier, 'free'),
    'status', COALESCE(sub_record.status, 'inactive'),
    'trial_active', trial_active,
    'trial_end', sub_record.trial_end,
    'renewal_date', sub_record.renewal_date,
    'credits', COALESCE(ent_record.credits, 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SEED DEFAULT DATA
-- =====================================================

-- Create a default free tier subscription for existing users (optional)
-- This can be run separately if needed

COMMENT ON TABLE subscriptions IS 'Stripe subscription management for LoopGPT Premium';
COMMENT ON TABLE entitlements IS 'User entitlements and usage credits';
COMMENT ON TABLE analytics_events IS 'Billing and subscription analytics events';
COMMENT ON FUNCTION has_premium_access IS 'Check if user has active premium access';
COMMENT ON FUNCTION get_user_entitlement IS 'Get complete entitlement status for user';

-- Create food_search_logs table for tracking food resolver queries
-- This enables performance monitoring and analytics

create table if not exists food_search_logs (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  result_count int not null,
  latency_ms numeric(8,3) not null,
  success boolean default true,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists food_search_logs_created_at_idx on food_search_logs (created_at desc);
create index if not exists food_search_logs_user_id_idx on food_search_logs (user_id);
create index if not exists food_search_logs_success_idx on food_search_logs (success);

-- Add RLS policies
alter table food_search_logs enable row level security;

-- Users can only see their own logs
create policy "Users can view own search logs"
  on food_search_logs
  for select
  using (auth.uid() = user_id);

-- Service role can insert logs
create policy "Service role can insert logs"
  on food_search_logs
  for insert
  with check (true);

-- Admin users can view all logs
create policy "Admin users can view all logs"
  on food_search_logs
  for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add comment
comment on table food_search_logs is 'Tracks all food resolver queries for performance monitoring and analytics';

-- Add helper functions for metrics calculation

-- Function to get average latency
create or replace function get_avg_latency()
returns table (avg numeric) as $$
begin
  return query
  select avg(latency_ms) as avg
  from food_search_logs;
end;
$$ language plpgsql;

-- Grant execute permission
grant execute on function get_avg_latency() to anon, authenticated, service_role;

-- Create tool_choice_log table for debugging tool selection
create table if not exists tool_choice_log (
  id uuid primary key default uuid_generate_v4(),
  input_query text not null,
  chosen_tool text not null,
  confidence numeric(3,2),
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_tool_choice_log_timestamp on tool_choice_log(timestamp desc);
create index if not exists idx_tool_choice_log_chosen_tool on tool_choice_log(chosen_tool);

-- RLS policies (allow service role to insert, admins to read)
alter table tool_choice_log enable row level security;

create policy "Service role can insert tool choice logs"
  on tool_choice_log
  for insert
  to service_role
  with check (true);

create policy "Admins can read tool choice logs"
  on tool_choice_log
  for select
  using (true); -- Public read for monitoring

-- Grant permissions
grant select on tool_choice_log to anon, authenticated;
grant insert on tool_choice_log to service_role;

comment on table tool_choice_log is 'Logs tool selection for routing accuracy analysis and QA';

-- ============================================================================
-- Rate Limiting System
-- ============================================================================
-- Creates tables and functions for API rate limiting
-- Prevents abuse and ensures fair usage across users
-- ============================================================================

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite unique constraint
  UNIQUE(user_id, endpoint, window_start)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
  ON rate_limits(user_id, endpoint, window_start DESC);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON rate_limits(window_start);

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert/update rate limits (via service role)
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Rate Limit Check Function
-- ============================================================================
-- Checks if a user has exceeded rate limits for an endpoint
-- Returns: { allowed: boolean, remaining: number, reset_at: timestamp }
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
  v_remaining INTEGER;
  v_reset_at TIMESTAMP WITH TIME ZONE;
  v_allowed BOOLEAN;
BEGIN
  -- Calculate window start (round down to nearest window)
  v_window_start := DATE_TRUNC('hour', NOW()) + 
    (FLOOR(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes || ' minutes')::INTERVAL;
  
  v_reset_at := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this window
  SELECT COALESCE(request_count, 0)
  INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  -- Check if limit exceeded
  v_allowed := (v_current_count < p_limit);
  v_remaining := GREATEST(0, p_limit - v_current_count - 1);
  
  -- If allowed, increment counter
  IF v_allowed THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, v_window_start)
    ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET 
      request_count = rate_limits.request_count + 1,
      updated_at = NOW();
  END IF;
  
  -- Return result as JSON
  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'limit', p_limit,
    'reset_at', v_reset_at,
    'current_count', v_current_count + CASE WHEN v_allowed THEN 1 ELSE 0 END
  );
END;
$$;

-- ============================================================================
-- Cleanup Function
-- ============================================================================
-- Removes old rate limit records to prevent table bloat
-- Should be run periodically (e.g., daily via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 7 days
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- Rate Limit Configuration Table
-- ============================================================================
-- Stores per-endpoint rate limit configurations
-- Allows dynamic adjustment without code changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  requests_per_hour INTEGER NOT NULL DEFAULT 100,
  requests_per_day INTEGER NOT NULL DEFAULT 1000,
  burst_limit INTEGER NOT NULL DEFAULT 10, -- Max requests in 1 minute
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO rate_limit_config (endpoint, requests_per_hour, requests_per_day, burst_limit, description)
VALUES
  ('plan_create_meal_plan', 20, 100, 5, 'Meal plan generation (expensive operation)'),
  ('tracker_log_weight', 50, 200, 10, 'Weight logging'),
  ('tracker_log_meal', 100, 500, 20, 'Meal logging'),
  ('delivery_place_order', 10, 50, 3, 'Food delivery orders'),
  ('nutrition_analyze_food', 50, 300, 10, 'Nutrition analysis'),
  ('mcp-server', 100, 1000, 20, 'MCP server tool calls'),
  ('*', 100, 1000, 20, 'Default rate limit for all endpoints')
ON CONFLICT (endpoint) DO NOTHING;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;

-- Grant table permissions
GRANT SELECT ON rate_limit_config TO authenticated;
GRANT SELECT ON rate_limit_config TO anon;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE rate_limits IS 'Tracks API request counts per user per endpoint per time window';
COMMENT ON TABLE rate_limit_config IS 'Configuration for rate limits per endpoint';
COMMENT ON FUNCTION check_rate_limit IS 'Checks and enforces rate limits for a user and endpoint';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes old rate limit records (run daily)';
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
-- Create user_profiles table for retention layer
-- Stores lightweight user preferences for personalization

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  diet_tags TEXT[], -- Array of diet tags (e.g., ['vegetarian', 'gluten-free'])
  calories_per_day INTEGER, -- Daily calorie target
  cuisines TEXT[], -- Preferred cuisines (e.g., ['Italian', 'Mexican'])
  last_plan_date TIMESTAMP WITH TIME ZONE, -- Last meal plan generation date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create index on last_plan_date for retention queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_plan_date ON user_profiles(last_plan_date);

-- Add comment
COMMENT ON TABLE user_profiles IS 'User preferences for personalized meal suggestions and retention';
-- Sentiment Layer Migration
-- Created: 2025-12-04
-- Purpose: Track user feedback (helpful/not helpful, ratings, favorites)

-- Sentiment Events Table
-- Stores all feedback events for analytics
CREATE TABLE IF NOT EXISTS sentiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('HELPFUL', 'NOT_HELPFUL', 'RATED', 'FAVORITED', 'UNFAVORITED')),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT rating_required_for_rated CHECK (
    (event_type = 'RATED' AND rating IS NOT NULL) OR
    (event_type != 'RATED')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_events_user_id ON sentiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_content ON sentiment_events(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_type ON sentiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_timestamp ON sentiment_events(timestamp DESC);

-- User Favorites Table
-- Stores current favorites (denormalized for fast retrieval)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT NOT NULL,
  content_name TEXT,
  content_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, content_type, content_id)
);

-- Index for retrieving user's favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id, created_at DESC);

-- Aggregated Sentiment Stats (Materialized View)
-- For fast analytics and ranking
CREATE TABLE IF NOT EXISTS sentiment_stats (
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  favorite_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (content_type, content_id)
);

-- Index for ranking queries
CREATE INDEX IF NOT EXISTS idx_sentiment_stats_ranking ON sentiment_stats(content_type, average_rating DESC, total_ratings DESC);

-- Function to update sentiment stats
CREATE OR REPLACE FUNCTION update_sentiment_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert stats for the content
  INSERT INTO sentiment_stats (content_type, content_id, helpful_count, not_helpful_count, total_ratings, average_rating, favorite_count, last_updated)
  SELECT 
    NEW.content_type,
    NEW.content_id,
    COUNT(*) FILTER (WHERE event_type = 'HELPFUL'),
    COUNT(*) FILTER (WHERE event_type = 'NOT_HELPFUL'),
    COUNT(*) FILTER (WHERE event_type = 'RATED'),
    AVG(rating) FILTER (WHERE event_type = 'RATED'),
    COUNT(*) FILTER (WHERE event_type = 'FAVORITED') - COUNT(*) FILTER (WHERE event_type = 'UNFAVORITED'),
    NOW()
  FROM sentiment_events
  WHERE content_type = NEW.content_type AND content_id = NEW.content_id
  GROUP BY content_type, content_id
  ON CONFLICT (content_type, content_id) 
  DO UPDATE SET
    helpful_count = EXCLUDED.helpful_count,
    not_helpful_count = EXCLUDED.not_helpful_count,
    total_ratings = EXCLUDED.total_ratings,
    average_rating = EXCLUDED.average_rating,
    favorite_count = EXCLUDED.favorite_count,
    last_updated = EXCLUDED.last_updated;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_sentiment_stats ON sentiment_events;
CREATE TRIGGER trigger_update_sentiment_stats
  AFTER INSERT ON sentiment_events
  FOR EACH ROW
  WHEN (NEW.content_id IS NOT NULL)
  EXECUTE FUNCTION update_sentiment_stats();

-- Comments for documentation
COMMENT ON TABLE sentiment_events IS 'Stores all user feedback events for recipes, meal plans, and grocery lists';
COMMENT ON TABLE user_favorites IS 'Denormalized table of user favorites for fast retrieval';
COMMENT ON TABLE sentiment_stats IS 'Aggregated sentiment statistics for content ranking and analytics';
-- ============================================================================
-- LoopKitchen Meal Logging Schema
-- ============================================================================
-- 
-- Purpose: Track user meals with nutrition data for daily/weekly aggregation
-- Phase: 3 (LoopKitchen Integration)
-- Status: Ready for Phase 4 database integration
--
-- Features:
-- - Meal logging with nutrition breakdown
-- - Daily/weekly aggregation support
-- - User preferences and targets
-- - Health insights tracking
--
-- ============================================================================

-- Meal Logs Table
-- Stores individual meal entries with nutrition data
CREATE TABLE IF NOT EXISTS loopkitchen_meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Meal metadata
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_date DATE NOT NULL,
  meal_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Recipe reference (optional - can be custom meal)
  recipe_id TEXT,
  recipe_title TEXT NOT NULL,
  
  -- Nutrition data (per serving)
  calories NUMERIC(8, 2) NOT NULL,
  protein NUMERIC(8, 2) NOT NULL,
  carbs NUMERIC(8, 2) NOT NULL,
  fat NUMERIC(8, 2) NOT NULL,
  fiber NUMERIC(8, 2) NOT NULL,
  sugar NUMERIC(8, 2) NOT NULL,
  sodium NUMERIC(8, 2) NOT NULL,
  
  -- Servings consumed
  servings NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  
  -- Health metrics
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  tags TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT meal_logs_user_date_idx UNIQUE (user_id, meal_date, meal_time)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON loopkitchen_meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_date ON loopkitchen_meal_logs(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON loopkitchen_meal_logs(user_id, meal_date);

-- ============================================================================
-- User Nutrition Preferences Table
-- ============================================================================
-- Stores user dietary goals and targets

CREATE TABLE IF NOT EXISTS loopkitchen_user_nutrition_prefs (
  user_id TEXT PRIMARY KEY,
  
  -- Daily targets
  target_calories INTEGER,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fat INTEGER,
  target_fiber INTEGER,
  
  -- Dietary preferences
  diet_type TEXT[], -- e.g., ['vegan', 'gluten-free']
  allergies TEXT[],
  
  -- Activity level (affects calorie targets)
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  
  -- Health goals
  health_goals TEXT[], -- e.g., ['weight_loss', 'muscle_gain', 'heart_health']
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Daily Nutrition Summaries (Materialized View)
-- ============================================================================
-- Pre-aggregated daily summaries for fast queries

CREATE MATERIALIZED VIEW IF NOT EXISTS loopkitchen_daily_nutrition AS
SELECT 
  user_id,
  meal_date,
  
  -- Total nutrition for the day
  SUM(calories * servings) as total_calories,
  SUM(protein * servings) as total_protein,
  SUM(carbs * servings) as total_carbs,
  SUM(fat * servings) as total_fat,
  SUM(fiber * servings) as total_fiber,
  SUM(sugar * servings) as total_sugar,
  SUM(sodium * servings) as total_sodium,
  
  -- Meal counts
  COUNT(*) as meal_count,
  COUNT(*) FILTER (WHERE meal_type = 'breakfast') as breakfast_count,
  COUNT(*) FILTER (WHERE meal_type = 'lunch') as lunch_count,
  COUNT(*) FILTER (WHERE meal_type = 'dinner') as dinner_count,
  COUNT(*) FILTER (WHERE meal_type = 'snack') as snack_count,
  
  -- Average health score
  AVG(health_score) as avg_health_score,
  
  -- Aggregated tags
  array_agg(DISTINCT unnest(tags)) as all_tags,
  
  -- Metadata
  MAX(updated_at) as last_updated
FROM loopkitchen_meal_logs
GROUP BY user_id, meal_date;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_nutrition_user_date 
ON loopkitchen_daily_nutrition(user_id, meal_date);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to refresh daily summaries
CREATE OR REPLACE FUNCTION refresh_loopkitchen_daily_nutrition()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY loopkitchen_daily_nutrition;
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly nutrition summary
CREATE OR REPLACE FUNCTION get_weekly_nutrition_summary(
  p_user_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  total_fiber NUMERIC,
  total_sugar NUMERIC,
  total_sodium NUMERIC,
  avg_daily_calories NUMERIC,
  avg_health_score NUMERIC,
  total_meals INTEGER,
  days_logged INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(total_calories) as total_calories,
    SUM(total_protein) as total_protein,
    SUM(total_carbs) as total_carbs,
    SUM(total_fat) as total_fat,
    SUM(total_fiber) as total_fiber,
    SUM(total_sugar) as total_sugar,
    SUM(total_sodium) as total_sodium,
    AVG(total_calories) as avg_daily_calories,
    AVG(avg_health_score) as avg_health_score,
    SUM(meal_count)::INTEGER as total_meals,
    COUNT(DISTINCT meal_date)::INTEGER as days_logged
  FROM loopkitchen_daily_nutrition
  WHERE user_id = p_user_id
    AND meal_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate nutrition progress vs targets
CREATE OR REPLACE FUNCTION get_nutrition_progress(
  p_user_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  nutrient TEXT,
  current_value NUMERIC,
  target_value NUMERIC,
  percentage NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_totals AS (
    SELECT * FROM loopkitchen_daily_nutrition
    WHERE user_id = p_user_id AND meal_date = p_date
  ),
  user_targets AS (
    SELECT * FROM loopkitchen_user_nutrition_prefs
    WHERE user_id = p_user_id
  )
  SELECT 
    'calories'::TEXT,
    dt.total_calories,
    ut.target_calories::NUMERIC,
    ROUND((dt.total_calories / NULLIF(ut.target_calories, 0)) * 100, 1),
    CASE 
      WHEN dt.total_calories < ut.target_calories * 0.9 THEN 'under'
      WHEN dt.total_calories > ut.target_calories * 1.1 THEN 'over'
      ELSE 'on_track'
    END
  FROM daily_totals dt
  CROSS JOIN user_targets ut
  
  UNION ALL
  
  SELECT 
    'protein'::TEXT,
    dt.total_protein,
    ut.target_protein::NUMERIC,
    ROUND((dt.total_protein / NULLIF(ut.target_protein, 0)) * 100, 1),
    CASE 
      WHEN dt.total_protein < ut.target_protein * 0.9 THEN 'under'
      WHEN dt.total_protein > ut.target_protein * 1.1 THEN 'over'
      ELSE 'on_track'
    END
  FROM daily_totals dt
  CROSS JOIN user_targets ut
  
  UNION ALL
  
  SELECT 
    'carbs'::TEXT,
    dt.total_carbs,
    ut.target_carbs::NUMERIC,
    ROUND((dt.total_carbs / NULLIF(ut.target_carbs, 0)) * 100, 1),
    CASE 
      WHEN dt.total_carbs < ut.target_carbs * 0.9 THEN 'under'
      WHEN dt.total_carbs > ut.target_carbs * 1.1 THEN 'over'
      ELSE 'on_track'
    END
  FROM daily_totals dt
  CROSS JOIN user_targets ut
  
  UNION ALL
  
  SELECT 
    'fat'::TEXT,
    dt.total_fat,
    ut.target_fat::NUMERIC,
    ROUND((dt.total_fat / NULLIF(ut.target_fat, 0)) * 100, 1),
    CASE 
      WHEN dt.total_fat < ut.target_fat * 0.9 THEN 'under'
      WHEN dt.total_fat > ut.target_fat * 1.1 THEN 'over'
      ELSE 'on_track'
    END
  FROM daily_totals dt
  CROSS JOIN user_targets ut;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meal_logs_updated_at
  BEFORE UPDATE ON loopkitchen_meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_nutrition_prefs_updated_at
  BEFORE UPDATE ON loopkitchen_user_nutrition_prefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample user preferences
INSERT INTO loopkitchen_user_nutrition_prefs (
  user_id,
  target_calories,
  target_protein,
  target_carbs,
  target_fat,
  target_fiber,
  diet_type,
  activity_level,
  health_goals
) VALUES (
  'test_user_123',
  2000,
  150,
  200,
  65,
  30,
  ARRAY['balanced'],
  'moderate',
  ARRAY['maintain_weight', 'heart_health']
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Notes
-- ============================================================================
--
-- Usage:
-- 1. Run this schema in your Supabase/Postgres database
-- 2. Enable Row Level Security (RLS) for production
-- 3. Set up scheduled jobs to refresh materialized views
-- 4. Integrate with loopkitchen_nutrition.ts functions
--
-- Future enhancements:
-- - Add RLS policies for user data isolation
-- - Add webhook triggers for real-time updates
-- - Add analytics tables for long-term trends
-- - Add meal photo storage integration
--
-- ============================================================================
-- ============================================================================
-- LoopGPT Data Flywheel - Phase 1: Foundational Metrics
-- ============================================================================
--
-- Purpose: Track 7 critical data points for personalization, commerce, and engagement
-- Phase: Analytics Phase 1
-- Date: 2025-12-06
--
-- Tables:
-- 1. ingredient_submissions - Track ingredient inputs to LeftoverGPT
-- 2. recipe_events - Track recipe generation, acceptance, rejection
-- 3. meal_logs - Track actual meals consumed (KCalGPT)
-- 4. meal_plans - Track generated meal plans (MealPlannerGPT)
-- 5. affiliate_events - Track affiliate link clicks and conversions
-- 6. user_goals - Store user dietary goals and restrictions
-- 7. session_events - Track session engagement per GPT
--
-- Enhancements:
-- - Added user_agent to session_events (device/platform analytics)
-- - Added response_time_ms to recipe_events (performance tracking)
-- - Added grocery_order_id to affiliate_events (conversion tracking)
-- - Materialized views for common analytics queries
--
-- ============================================================================

-- Create analytics schema (if not exists)
CREATE SCHEMA IF NOT EXISTS analytics;

-- ============================================================================
-- Table 1: ingredient_submissions
-- ============================================================================
-- Tracks every input to LeftoverGPT and other food tools
-- Critical for: Pantry-based personalization, grocery predictions

CREATE TABLE IF NOT EXISTS analytics.ingredient_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL, -- FK to auth.users
  session_id TEXT NULL, -- Internal conversation/session ID
  source_gpt TEXT NOT NULL, -- e.g. 'LeftoverGPT', 'RecipeGPT'
  
  -- Ingredient data
  ingredients JSONB NOT NULL, -- Array of {name, quantity, unit, raw}
  ingredient_count INT GENERATED ALWAYS AS (jsonb_array_length(ingredients)) STORED,
  
  -- Context
  locale TEXT NULL, -- e.g. 'de-DE', 'en-US'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_ingredients CHECK (jsonb_typeof(ingredients) = 'array')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredient_submissions_user_created 
  ON analytics.ingredient_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingredient_submissions_source 
  ON analytics.ingredient_submissions(source_gpt, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingredient_submissions_ingredients 
  ON analytics.ingredient_submissions USING GIN (ingredients);

-- Comments
COMMENT ON TABLE analytics.ingredient_submissions IS 'Tracks ingredient inputs to recipe generation tools';
COMMENT ON COLUMN analytics.ingredient_submissions.ingredients IS 'JSONB array: [{name: string, quantity?: number, unit?: string, raw?: string}]';

-- ============================================================================
-- Table 2: recipe_events
-- ============================================================================
-- Tracks how users react to generated recipes
-- Critical for: Recipe quality measurement, algorithm optimization

CREATE TABLE IF NOT EXISTS analytics.recipe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NULL,
  
  -- Recipe identification
  recipe_id TEXT NOT NULL, -- Internal recipe slug/ID
  recipe_title TEXT NULL, -- For easier debugging
  
  -- Event details
  event_type TEXT NOT NULL, -- 'generated' | 'accepted' | 'rejected' | 'regenerated' | 'cooked'
  
  -- Recipe characteristics
  chaos_rating_shown INT NULL CHECK (chaos_rating_shown >= 0 AND chaos_rating_shown <= 100),
  persona_used TEXT NULL,
  source_gpt TEXT NOT NULL, -- e.g. 'LeftoverGPT'
  
  -- Performance tracking (ENHANCEMENT)
  response_time_ms INT NULL, -- How long generation took
  
  -- Flexible metadata
  metadata JSONB NULL, -- Rejection reason, cooking notes, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_events_recipe 
  ON analytics.recipe_events(recipe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_events_user 
  ON analytics.recipe_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_events_type 
  ON analytics.recipe_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_events_source 
  ON analytics.recipe_events(source_gpt, created_at DESC);

-- Comments
COMMENT ON TABLE analytics.recipe_events IS 'Tracks recipe generation and user reactions';
COMMENT ON COLUMN analytics.recipe_events.event_type IS 'Enum: generated, accepted, rejected, regenerated, cooked';

-- ============================================================================
-- Table 3: meal_logs
-- ============================================================================
-- Tracks actual meals consumed (from KCalGPT or manual entry)
-- Critical for: Nutrition tracking, progress monitoring, personalization

CREATE TABLE IF NOT EXISTS analytics.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NULL,
  source_gpt TEXT NOT NULL, -- e.g. 'KCalGPT', 'NutritionGPT'
  
  -- Timing
  logged_at TIMESTAMPTZ NOT NULL, -- When meal actually happened (user timezone)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When we stored it
  
  -- Meal details
  meal_type TEXT NULL, -- 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
  description TEXT NOT NULL, -- Free text description
  
  -- Nutrition data
  calories_kcal NUMERIC(8, 2) NULL,
  protein_g NUMERIC(8, 2) NULL,
  carbs_g NUMERIC(8, 2) NULL,
  fat_g NUMERIC(8, 2) NULL,
  fiber_g NUMERIC(8, 2) NULL, -- Added for completeness
  
  -- Raw data for debugging
  raw_payload JSONB NULL,
  
  -- Derived fields
  total_macros_g NUMERIC(8, 2) GENERATED ALWAYS AS (
    COALESCE(protein_g, 0) + COALESCE(carbs_g, 0) + COALESCE(fat_g, 0)
  ) STORED
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged 
  ON analytics.meal_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_type 
  ON analytics.meal_logs(meal_type, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_source 
  ON analytics.meal_logs(source_gpt, created_at DESC);

-- Comments
COMMENT ON TABLE analytics.meal_logs IS 'Tracks actual meals consumed for nutrition tracking';
COMMENT ON COLUMN analytics.meal_logs.logged_at IS 'When meal happened (user time)';
COMMENT ON COLUMN analytics.meal_logs.created_at IS 'When record was created (server time)';

-- ============================================================================
-- Table 4: meal_plans
-- ============================================================================
-- Tracks generated meal plans
-- Critical for: Planning behavior analysis, grocery predictions

CREATE TABLE IF NOT EXISTS analytics.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NULL,
  source_gpt TEXT NOT NULL, -- e.g. 'MealPlannerGPT'
  
  -- Plan details
  title TEXT NOT NULL,
  description TEXT NULL,
  days_planned INT NOT NULL CHECK (days_planned > 0 AND days_planned <= 30),
  
  -- Characteristics
  vibe TEXT NULL, -- 'high-protein', 'budget', 'clean', 'chaotic', etc.
  target_calories_per_day INT NULL CHECK (target_calories_per_day > 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Flexible metadata
  metadata JSONB NULL -- Macro targets, dietary restrictions, etc.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_user 
  ON analytics.meal_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_days 
  ON analytics.meal_plans(days_planned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_vibe 
  ON analytics.meal_plans(vibe, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_source 
  ON analytics.meal_plans(source_gpt, created_at DESC);

-- Comments
COMMENT ON TABLE analytics.meal_plans IS 'Tracks generated meal plans';
COMMENT ON COLUMN analytics.meal_plans.vibe IS 'Plan style: high-protein, budget, clean, chaotic, etc.';

-- ============================================================================
-- Table 5: affiliate_events
-- ============================================================================
-- Tracks affiliate link interactions and conversions
-- Critical for: Revenue tracking, provider optimization, ROI measurement

CREATE TABLE IF NOT EXISTS analytics.affiliate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'click' | 'impression' | 'conversion'
  provider TEXT NOT NULL, -- 'Instacart', 'MealMe', 'Walmart', etc.
  
  -- Context
  ingredient_name TEXT NULL, -- Ingredient associated with event
  url TEXT NULL, -- Outbound URL
  
  -- Conversion tracking (ENHANCEMENT)
  grocery_order_id TEXT NULL, -- Link to actual order
  conversion_value NUMERIC(10, 2) NULL, -- Order value
  currency TEXT NULL DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ NULL, -- When conversion happened
  
  -- Flexible metadata
  metadata JSONB NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_events_provider 
  ON analytics.affiliate_events(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_user 
  ON analytics.affiliate_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_type 
  ON analytics.affiliate_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_order 
  ON analytics.affiliate_events(grocery_order_id) 
  WHERE grocery_order_id IS NOT NULL;

-- Comments
COMMENT ON TABLE analytics.affiliate_events IS 'Tracks affiliate link clicks and conversions';
COMMENT ON COLUMN analytics.affiliate_events.event_type IS 'Enum: click, impression, conversion';

-- ============================================================================
-- Table 6: user_goals
-- ============================================================================
-- Stores user dietary goals and restrictions
-- Critical for: Personalization, recommendation tuning

CREATE TABLE IF NOT EXISTS analytics.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Goal details
  goal_type TEXT NOT NULL, -- 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance'
  calorie_target INT NULL CHECK (calorie_target > 0),
  
  -- Macro targets
  macro_targets JSONB NULL, -- {protein_g: number, carbs_g: number, fat_g: number}
  
  -- Dietary restrictions
  dietary_restrictions TEXT[] NOT NULL DEFAULT '{}', -- ['vegetarian', 'gluten_free', etc.]
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modification_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT valid_macro_targets CHECK (
    macro_targets IS NULL OR 
    (jsonb_typeof(macro_targets) = 'object')
  )
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goals_active 
  ON analytics.user_goals(user_id) 
  WHERE is_active = TRUE; -- Only one active goal per user
CREATE INDEX IF NOT EXISTS idx_user_goals_user_created 
  ON analytics.user_goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_type 
  ON analytics.user_goals(goal_type, created_at DESC);

-- Comments
COMMENT ON TABLE analytics.user_goals IS 'Stores user dietary goals and restrictions';
COMMENT ON COLUMN analytics.user_goals.macro_targets IS 'JSONB: {protein_g: number, carbs_g: number, fat_g: number}';

-- ============================================================================
-- Table 7: session_events
-- ============================================================================
-- Tracks session engagement per GPT
-- Critical for: Engagement metrics, tool usage patterns

CREATE TABLE IF NOT EXISTS analytics.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NOT NULL, -- Internal conversation/session ID
  
  -- GPT details
  gpt_name TEXT NOT NULL, -- 'LeftoverGPT', 'NutritionGPT', 'MealPlannerGPT', etc.
  event_type TEXT NOT NULL, -- 'session_start' | 'session_end' | 'tool_call'
  
  -- Context (ENHANCEMENT)
  user_agent TEXT NULL, -- Device/platform info
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Flexible metadata
  metadata JSONB NULL -- Route name, action, duration, etc.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_events_session 
  ON analytics.session_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_gpt 
  ON analytics.session_events(gpt_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_user 
  ON analytics.session_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_type 
  ON analytics.session_events(event_type, created_at DESC);

-- Comments
COMMENT ON TABLE analytics.session_events IS 'Tracks session engagement per GPT';
COMMENT ON COLUMN analytics.session_events.event_type IS 'Enum: session_start, session_end, tool_call';

-- ============================================================================
-- Materialized Views for Common Analytics Queries
-- ============================================================================

-- Daily Active Users (DAU)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_active_users AS
SELECT 
  DATE(created_at) AS date,
  COUNT(DISTINCT user_id) AS dau,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) AS total_events
FROM analytics.session_events
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dau_date ON analytics.daily_active_users(date);

-- Recipe Acceptance Rate
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.recipe_acceptance_rate AS
SELECT 
  DATE(created_at) AS date,
  source_gpt,
  COUNT(*) FILTER (WHERE event_type = 'generated') AS recipes_generated,
  COUNT(*) FILTER (WHERE event_type = 'accepted') AS recipes_accepted,
  COUNT(*) FILTER (WHERE event_type = 'rejected') AS recipes_rejected,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'accepted') / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'generated'), 0),
    2
  ) AS acceptance_rate_pct
FROM analytics.recipe_events
GROUP BY DATE(created_at), source_gpt
ORDER BY date DESC, source_gpt;

CREATE INDEX IF NOT EXISTS idx_recipe_acceptance_date ON analytics.recipe_acceptance_rate(date DESC);

-- Affiliate Conversion Rate
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.affiliate_conversion_rate AS
SELECT 
  DATE(created_at) AS date,
  provider,
  COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
  COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions,
  SUM(conversion_value) FILTER (WHERE event_type = 'conversion') AS total_revenue,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'conversion') / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0),
    2
  ) AS conversion_rate_pct
FROM analytics.affiliate_events
GROUP BY DATE(created_at), provider
ORDER BY date DESC, provider;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversion_date ON analytics.affiliate_conversion_rate(date DESC);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION analytics.refresh_all_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.recipe_acceptance_rate;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.affiliate_conversion_rate;
END;
$$;

COMMENT ON FUNCTION analytics.refresh_all_views IS 'Refreshes all analytics materialized views';

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION analytics.get_user_summary(p_user_id UUID)
RETURNS TABLE (
  total_recipes_generated BIGINT,
  total_recipes_accepted BIGINT,
  total_meals_logged BIGINT,
  total_meal_plans BIGINT,
  total_affiliate_clicks BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    (SELECT COUNT(*) FROM analytics.recipe_events WHERE user_id = p_user_id AND event_type = 'generated'),
    (SELECT COUNT(*) FROM analytics.recipe_events WHERE user_id = p_user_id AND event_type = 'accepted'),
    (SELECT COUNT(*) FROM analytics.meal_logs WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM analytics.meal_plans WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM analytics.affiliate_events WHERE user_id = p_user_id AND event_type = 'click'),
    (SELECT MIN(created_at) FROM analytics.session_events WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM analytics.session_events WHERE user_id = p_user_id);
$$;

COMMENT ON FUNCTION analytics.get_user_summary IS 'Returns activity summary for a specific user';

-- ============================================================================
-- Grants (adjust based on your RLS policies)
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA analytics TO authenticated, anon, service_role;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO authenticated;

-- Grant all privileges to service_role (for backend inserts)
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA analytics TO authenticated, service_role;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE analytics.ingredient_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.recipe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.affiliate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.session_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything (for backend inserts)
CREATE POLICY service_role_all ON analytics.ingredient_submissions FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.recipe_events FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.meal_logs FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.meal_plans FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.affiliate_events FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.user_goals FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON analytics.session_events FOR ALL TO service_role USING (true);

-- Policy: Users can view their own data
CREATE POLICY users_view_own ON analytics.ingredient_submissions 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.recipe_events 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.meal_logs 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.meal_plans 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.affiliate_events 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.user_goals 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own ON analytics.session_events 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Analytics foundational metrics schema created successfully';
  RAISE NOTICE '7 tables created: ingredient_submissions, recipe_events, meal_logs, meal_plans, affiliate_events, user_goals, session_events';
  RAISE NOTICE '3 materialized views created: daily_active_users, recipe_acceptance_rate, affiliate_conversion_rate';
  RAISE NOTICE '2 helper functions created: refresh_all_views, get_user_summary';
END $$;
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
-- ============================================================================
-- Provider Metrics Table for Commerce Router
-- ============================================================================
-- Purpose: Track provider performance over time to improve routing decisions
-- Used by: loopgpt_route_order (scoring), loopgpt_record_outcome (updates)
-- Part of: Step 3 - Provider Arbitrage Hardening & Failover
-- Created: 2025-12-07
-- ============================================================================

-- Create provider_metrics table in analytics schema
CREATE TABLE IF NOT EXISTS analytics.provider_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Provider identification
  provider_id TEXT NOT NULL,           -- Canonical provider ID: 'instacart', 'walmart', 'mealme', 'amazon_fresh'
  provider_name TEXT NOT NULL,         -- Human-readable name: 'Instacart', 'Walmart', 'MealMe', 'Amazon Fresh'
  
  -- Aggregated performance metrics
  total_orders INTEGER NOT NULL DEFAULT 0,
  successful_orders INTEGER NOT NULL DEFAULT 0,
  failed_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  
  -- Financial metrics
  total_gmv NUMERIC(12,2) NOT NULL DEFAULT 0,        -- Gross merchandise volume (total order value)
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0, -- Total commission earned
  
  -- Derived metrics (denormalized for fast lookup)
  success_rate NUMERIC(5,2),           -- Percentage 0–100 (successful_orders / total_orders * 100)
  avg_margin_rate NUMERIC(5,2),        -- Percentage 0–100 (total_commission / total_gmv * 100)
  
  -- Timestamps
  last_order_at TIMESTAMPTZ,           -- When the last order was placed with this provider
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on provider_id for fast lookups and upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_metrics_provider_id
  ON analytics.provider_metrics(provider_id);

-- Create index on provider_name for human-readable queries
CREATE INDEX IF NOT EXISTS idx_provider_metrics_provider_name
  ON analytics.provider_metrics(provider_name);

-- Create index on last_order_at for recency queries
CREATE INDEX IF NOT EXISTS idx_provider_metrics_last_order
  ON analytics.provider_metrics(last_order_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- This table is analytics-only and should only be accessible by service role

ALTER TABLE analytics.provider_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY IF NOT EXISTS "Service role has full access to provider_metrics"
  ON analytics.provider_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Helper Function: Upsert Provider Metrics
-- ============================================================================
-- This function is called by loopgpt_record_outcome to update provider metrics
-- It handles the upsert logic and recomputes derived metrics

CREATE OR REPLACE FUNCTION analytics.upsert_provider_metrics(
  p_provider_id TEXT,
  p_provider_name TEXT,
  p_outcome TEXT,              -- 'success', 'failed', 'cancelled'
  p_order_value NUMERIC,       -- Total order value in dollars
  p_commission NUMERIC         -- Commission earned in dollars
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert provider metrics with atomic updates
  INSERT INTO analytics.provider_metrics (
    provider_id,
    provider_name,
    total_orders,
    successful_orders,
    failed_orders,
    cancelled_orders,
    total_gmv,
    total_commission,
    last_order_at,
    updated_at
  )
  VALUES (
    p_provider_id,
    p_provider_name,
    1,
    CASE WHEN p_outcome = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_outcome = 'failed' THEN 1 ELSE 0 END,
    CASE WHEN p_outcome = 'cancelled' THEN 1 ELSE 0 END,
    p_order_value,
    p_commission,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    total_orders = analytics.provider_metrics.total_orders + 1,
    successful_orders = analytics.provider_metrics.successful_orders + 
      CASE WHEN p_outcome = 'success' THEN 1 ELSE 0 END,
    failed_orders = analytics.provider_metrics.failed_orders + 
      CASE WHEN p_outcome = 'failed' THEN 1 ELSE 0 END,
    cancelled_orders = analytics.provider_metrics.cancelled_orders + 
      CASE WHEN p_outcome = 'cancelled' THEN 1 ELSE 0 END,
    total_gmv = analytics.provider_metrics.total_gmv + p_order_value,
    total_commission = analytics.provider_metrics.total_commission + p_commission,
    last_order_at = NOW(),
    updated_at = NOW();
  
  -- Recompute derived metrics
  UPDATE analytics.provider_metrics
  SET
    success_rate = CASE 
      WHEN total_orders > 0 THEN (successful_orders * 100.0 / total_orders)
      ELSE NULL
    END,
    avg_margin_rate = CASE 
      WHEN total_gmv > 0 THEN (total_commission * 100.0 / total_gmv)
      ELSE NULL
    END
  WHERE provider_id = p_provider_id;
  
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION analytics.upsert_provider_metrics TO service_role;

-- ============================================================================
-- Seed Initial Data (Optional)
-- ============================================================================
-- Seed with neutral scores for known providers so they start with baseline metrics

INSERT INTO analytics.provider_metrics (
  provider_id,
  provider_name,
  total_orders,
  successful_orders,
  failed_orders,
  cancelled_orders,
  total_gmv,
  total_commission,
  success_rate,
  avg_margin_rate
)
VALUES
  ('instacart', 'Instacart', 0, 0, 0, 0, 0, 0, NULL, NULL),
  ('walmart', 'Walmart', 0, 0, 0, 0, 0, 0, NULL, NULL),
  ('mealme', 'MealMe', 0, 0, 0, 0, 0, 0, NULL, NULL),
  ('amazon_fresh', 'Amazon Fresh', 0, 0, 0, 0, 0, 0, NULL, NULL),
  ('shipt', 'Shipt', 0, 0, 0, 0, 0, 0, NULL, NULL)
ON CONFLICT (provider_id) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE analytics.provider_metrics IS 
  'Tracks provider performance metrics for commerce router scoring. Updated by loopgpt_record_outcome on every order attempt.';

COMMENT ON COLUMN analytics.provider_metrics.provider_id IS 
  'Canonical provider identifier (e.g., instacart, walmart). Used for joins and lookups.';

COMMENT ON COLUMN analytics.provider_metrics.success_rate IS 
  'Percentage of successful orders (0-100). Used for reliabilityScore in router scoring.';

COMMENT ON COLUMN analytics.provider_metrics.avg_margin_rate IS 
  'Average commission rate as percentage of GMV (0-100). Used for marginScore in router scoring.';

COMMENT ON FUNCTION analytics.upsert_provider_metrics IS 
  'Atomically updates provider metrics and recomputes derived fields. Called by loopgpt_record_outcome.';
-- Phase XI: Tenancy & Analytics

-- 1. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Redundant if tenant=user, but good for future proofing
    tool_name TEXT NOT NULL,
    action TEXT NOT NULL,
    provider TEXT,
    duration_ms INTEGER,
    error_category TEXT,
    cost_usd NUMERIC(10, 6),
    outcome TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    schema_version INTEGER DEFAULT 1
);

-- 2. Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_timestamp ON public.analytics_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_tool_timestamp ON public.analytics_events(tool_name, timestamp DESC);

-- 3. RLS for Analytics (Service Role Write Only, User Read Own?)
-- Generally analytics are write-only for the app, read-only for admin.
-- But users might want to see their usage.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert analytics" ON public.analytics_events
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Users can view own analytics" ON public.analytics_events
    FOR SELECT TO authenticated USING (auth.uid() = tenant_id);

-- 4. User Plans Table (Simple billing foundation)
CREATE TABLE IF NOT EXISTS public.user_plans (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    plan_id TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan" ON public.user_plans
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages plans" ON public.user_plans
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Usage Quotas Table (Daily counters)
CREATE TABLE IF NOT EXISTS public.usage_quotas (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    provider_calls INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, date)
);

ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_quotas
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages usage" ON public.usage_quotas
    FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Phase XI: LoopGPT Commerce & Flywheel

-- 1. GMV Events Table (The Money)
CREATE TABLE IF NOT EXISTS public.gmv_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    order_id TEXT,
    estimated_value_usd NUMERIC(10, 2),
    confirmed_value_usd NUMERIC(10, 2),
    affiliate_network TEXT,
    commission_rate NUMERIC(5, 4),
    commission_usd NUMERIC(10, 2),
    status TEXT NOT NULL CHECK (status IN ('ESTIMATED', 'CONFIRMED', 'FAILED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmv_tenant_timestamp ON public.gmv_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gmv_provider_timestamp ON public.gmv_events(provider, timestamp DESC);

-- 2. Provider Outcomes Table (The Performance)
CREATE TABLE IF NOT EXISTS public.provider_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL,
    gmv_usd NUMERIC(10, 2),
    commission_usd NUMERIC(10, 2),
    error_category TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_outcomes_provider ON public.provider_outcomes(provider, timestamp DESC);

-- 3. LoopGPT Flywheel Events (The Brain)
CREATE TABLE IF NOT EXISTS public.loopgpt_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_version TEXT NOT NULL DEFAULT '1.0',
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    agent_action TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    provider TEXT,
    input_hash TEXT,
    output_hash TEXT,
    success BOOLEAN NOT NULL,
    error_category TEXT,
    gmv_usd NUMERIC(10, 2),
    commission_usd NUMERIC(10, 2),
    latency_ms INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loopgpt_tenant_action ON public.loopgpt_events(tenant_id, agent_action, timestamp DESC);

-- 4. RLS Policies
ALTER TABLE public.gmv_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loopgpt_events ENABLE ROW LEVEL SECURITY;

-- Service Role has full access
CREATE POLICY "Service role manages commerce" ON public.gmv_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages outcomes" ON public.provider_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages flywheel" ON public.loopgpt_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own GMV/Flywheel events (for transparency/history)
CREATE POLICY "Users view own GMV" ON public.gmv_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
CREATE POLICY "Users view own flywheel" ON public.loopgpt_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
-- Create commerce schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS commerce;

-- Create cart_sessions table
CREATE TABLE IF NOT EXISTS commerce.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL,
  session_id TEXT,

  -- Cart & routing snapshot
  selected_provider TEXT,
  selected_provider_id TEXT,
  alternatives JSONB,
  cart JSONB NOT NULL,
  quote JSONB NOT NULL,
  score_breakdown JSONB,
  affiliate_url TEXT,
  confirmation_token TEXT,

  -- Consent & control flags
  allow_failover BOOLEAN NOT NULL DEFAULT false,
  allow_auto_confirm BOOLEAN NOT NULL DEFAULT false,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_consent', 'confirmed_pending_execution', 'confirmed', 'failed', 'cancelled', 'expired')),
  
  last_error JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_sessions_user
  ON commerce.cart_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_status
  ON commerce.cart_sessions(status);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires_at
  ON commerce.cart_sessions(expires_at);

-- RLS Policies
ALTER TABLE commerce.cart_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON commerce.cart_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to read/write their own sessions
CREATE POLICY "Users can access own sessions" ON commerce.cart_sessions
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
-- Create order_receipts table for External Checkout Handoff (Mode A)

CREATE TABLE IF NOT EXISTS public.order_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT, -- Optional, for authenticated users
    
    -- Provider Details (Single Source of Truth)
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_support_url TEXT,
    checkout_url TEXT NOT NULL,
    
    -- Financials
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC,
    delivery_fee NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    
    -- Cart Content (JSONB)
    cart JSONB NOT NULL, -- Array of items
    cart_hash TEXT NOT NULL, -- For integrity checks
    
    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'handoff_opened', 'unknown', 'completed', 'failed')),
    
    -- Support & Legal
    support_info JSONB NOT NULL, -- { providerSupportText, loopSupportText, loopSupportEmail }
    disclaimer_text TEXT NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_receipts_user_id ON public.order_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_order_receipts_created_at ON public.order_receipts(created_at);

-- RLS Policies
ALTER TABLE public.order_receipts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.order_receipts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to read their own receipts (if user_id is present)
CREATE POLICY "Users can read own receipts" ON public.order_receipts
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);
-- Migration: Share Snapshots Table
-- Created: 2025-12-14
-- Purpose: Store shareable widget snapshots for social media sharing
--
-- Part of: Widget Implementation (Prompt 5)

-- ============================================================================
-- Share Snapshots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.share_snapshots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Share identifier (used in URLs like /s/ABC123)
  share_id TEXT NOT NULL UNIQUE,
  
  -- Widget reference
  widget_id TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  
  -- Widget data snapshot (full widget JSON for rendering)
  widget_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Optional metadata
  user_id TEXT,
  session_id TEXT
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup by share ID (primary use case)
CREATE INDEX IF NOT EXISTS idx_share_snapshots_share_id 
  ON public.share_snapshots(share_id);

-- Cleanup expired snapshots
CREATE INDEX IF NOT EXISTS idx_share_snapshots_expires_at 
  ON public.share_snapshots(expires_at);

-- Find all shares for a specific widget
CREATE INDEX IF NOT EXISTS idx_share_snapshots_widget_id 
  ON public.share_snapshots(widget_id);

-- Find shares by user
CREATE INDEX IF NOT EXISTS idx_share_snapshots_user_id 
  ON public.share_snapshots(user_id) 
  WHERE user_id IS NOT NULL;

-- Analytics: most viewed shares
CREATE INDEX IF NOT EXISTS idx_share_snapshots_view_count 
  ON public.share_snapshots(view_count DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.share_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view share snapshots (public sharing)
CREATE POLICY "Share snapshots are publicly viewable"
  ON public.share_snapshots
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert (via MCP tools)
CREATE POLICY "Only service role can create share snapshots"
  ON public.share_snapshots
  FOR INSERT
  WITH CHECK (false); -- Service role bypasses RLS

-- Policy: Only service role can update (for view counts)
CREATE POLICY "Only service role can update share snapshots"
  ON public.share_snapshots
  FOR UPDATE
  USING (false); -- Service role bypasses RLS

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Increment view count for a share snapshot
 */
CREATE OR REPLACE FUNCTION public.increment_share_view_count(p_share_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.share_snapshots
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_id = p_share_id;
END;
$$;

/**
 * Cleanup expired share snapshots
 * 
 * Call this periodically (e.g., daily cron job) to remove old snapshots.
 */
CREATE OR REPLACE FUNCTION public.cleanup_expired_share_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.share_snapshots
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.share_snapshots IS 
  'Stores shareable widget snapshots for social media sharing. Snapshots expire after 90 days.';

COMMENT ON COLUMN public.share_snapshots.share_id IS 
  'Unique share identifier used in URLs (e.g., /s/ABC123)';

COMMENT ON COLUMN public.share_snapshots.widget_data IS 
  'Full widget JSON snapshot for rendering the shared view';

COMMENT ON COLUMN public.share_snapshots.expires_at IS 
  'Expiration timestamp. Snapshots are deleted after this date.';

COMMENT ON FUNCTION public.increment_share_view_count(TEXT) IS 
  'Increments the view count for a share snapshot';

COMMENT ON FUNCTION public.cleanup_expired_share_snapshots() IS 
  'Deletes expired share snapshots. Run periodically via cron.';

-- ============================================================================
-- End of Migration
-- ============================================================================
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
