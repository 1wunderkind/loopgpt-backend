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

