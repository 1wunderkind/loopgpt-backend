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
