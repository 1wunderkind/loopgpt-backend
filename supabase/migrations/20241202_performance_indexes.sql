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
