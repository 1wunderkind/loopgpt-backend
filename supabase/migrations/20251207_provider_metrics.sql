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
