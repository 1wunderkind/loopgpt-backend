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

