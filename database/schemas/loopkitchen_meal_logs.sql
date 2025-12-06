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
