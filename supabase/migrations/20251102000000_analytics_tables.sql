-- ============================================================================
-- Analytics Tables for LoopGPT MVP
-- Created: 2025-11-02
-- Purpose: Track tool calls, user events, and affiliate performance
-- ============================================================================

-- ============================================================================
-- Tool Calls Tracking
-- Purpose: Monitor which tools ChatGPT calls, success rates, and errors
-- ============================================================================
CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms DECIMAL(10,2),
  called_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for analytics queries
  CONSTRAINT tool_calls_tool_name_check CHECK (length(tool_name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_user_id ON tool_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_calls_called_at ON tool_calls(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_calls_success ON tool_calls(success);

-- ============================================================================
-- User Events Tracking
-- Purpose: Track user journey milestones and behaviors
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_events_event_name_check CHECK (length(event_name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);

-- ============================================================================
-- Affiliate Performance Tracking
-- Purpose: Track affiliate link clicks, conversions, and revenue
-- ============================================================================
CREATE TABLE IF NOT EXISTS affiliate_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'grocery', 'delivery', 'meal_kit'
  journey_name TEXT, -- Which journey triggered this affiliate link
  link_clicked BOOLEAN DEFAULT false,
  order_completed BOOLEAN DEFAULT false,
  order_value DECIMAL(10,2),
  commission_earned DECIMAL(10,2),
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT affiliate_performance_country_check CHECK (length(country_code) = 2),
  CONSTRAINT affiliate_performance_category_check CHECK (category IN ('grocery', 'delivery', 'meal_kit'))
);

CREATE INDEX IF NOT EXISTS idx_affiliate_performance_user_id ON affiliate_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_country ON affiliate_performance(country_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_partner ON affiliate_performance(partner_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_journey ON affiliate_performance(journey_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_performance_clicked_at ON affiliate_performance(clicked_at DESC);

-- ============================================================================
-- Error Logs
-- Purpose: Track errors for debugging and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_tool_name ON error_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);

-- ============================================================================
-- Analytics Views
-- Purpose: Pre-computed views for common analytics queries
-- ============================================================================

-- Tool call success rates
CREATE OR REPLACE VIEW tool_success_rates AS
SELECT 
  tool_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as success_rate_pct,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms
FROM tool_calls
GROUP BY tool_name
ORDER BY total_calls DESC;

-- Affiliate performance by country
CREATE OR REPLACE VIEW affiliate_performance_by_country AS
SELECT 
  country_code,
  partner_name,
  COUNT(*) as total_shown,
  SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END) as clicks,
  SUM(CASE WHEN order_completed THEN 1 ELSE 0 END) as conversions,
  ROUND((SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as ctr_pct,
  ROUND((SUM(CASE WHEN order_completed THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END), 0)) * 100, 2) as conversion_rate_pct,
  ROUND(SUM(commission_earned), 2) as total_revenue
FROM affiliate_performance
GROUP BY country_code, partner_name
ORDER BY total_revenue DESC NULLS LAST;

-- User journey completion rates
CREATE OR REPLACE VIEW journey_completion_rates AS
SELECT 
  event_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_events,
  DATE(created_at) as event_date
FROM user_events
WHERE event_name LIKE 'journey_%'
GROUP BY event_name, DATE(created_at)
ORDER BY event_date DESC, unique_users DESC;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to log tool calls
CREATE OR REPLACE FUNCTION log_tool_call(
  p_user_id UUID,
  p_tool_name TEXT,
  p_parameters JSONB,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tool_calls (
    user_id,
    tool_name,
    parameters,
    success,
    error_message,
    duration_ms
  ) VALUES (
    p_user_id,
    p_tool_name,
    p_parameters,
    p_success,
    p_error_message,
    p_duration_ms
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log user events
CREATE OR REPLACE FUNCTION log_user_event(
  p_user_id UUID,
  p_event_name TEXT,
  p_event_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_events (
    user_id,
    event_name,
    event_data
  ) VALUES (
    p_user_id,
    p_event_name,
    p_event_data
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log affiliate clicks
CREATE OR REPLACE FUNCTION log_affiliate_click(
  p_user_id UUID,
  p_country_code TEXT,
  p_partner_name TEXT,
  p_category TEXT,
  p_journey_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO affiliate_performance (
    user_id,
    country_code,
    partner_name,
    category,
    journey_name,
    link_clicked,
    clicked_at
  ) VALUES (
    p_user_id,
    p_country_code,
    p_partner_name,
    p_category,
    p_journey_name,
    true,
    NOW()
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE tool_calls IS 'Tracks every MCP tool call from ChatGPT with success/failure status';
COMMENT ON TABLE user_events IS 'Tracks user journey milestones and behavioral events';
COMMENT ON TABLE affiliate_performance IS 'Tracks affiliate link performance and revenue';
COMMENT ON TABLE error_logs IS 'Centralized error logging for debugging';
COMMENT ON VIEW tool_success_rates IS 'Pre-computed tool call success rates for monitoring';
COMMENT ON VIEW affiliate_performance_by_country IS 'Affiliate performance metrics by country and partner';
COMMENT ON VIEW journey_completion_rates IS 'User journey completion tracking';
