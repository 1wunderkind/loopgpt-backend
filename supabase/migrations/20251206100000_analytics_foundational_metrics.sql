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
CREATE UNIQUE INDEX idx_user_goals_active 
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

CREATE UNIQUE INDEX idx_dau_date ON analytics.daily_active_users(date);

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
