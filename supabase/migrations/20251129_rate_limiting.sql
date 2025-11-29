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
