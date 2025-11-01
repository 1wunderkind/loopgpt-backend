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

