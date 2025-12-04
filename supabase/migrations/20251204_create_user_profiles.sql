-- Create user_profiles table for retention layer
-- Stores lightweight user preferences for personalization

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  diet_tags TEXT[], -- Array of diet tags (e.g., ['vegetarian', 'gluten-free'])
  calories_per_day INTEGER, -- Daily calorie target
  cuisines TEXT[], -- Preferred cuisines (e.g., ['Italian', 'Mexican'])
  last_plan_date TIMESTAMP WITH TIME ZONE, -- Last meal plan generation date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create index on last_plan_date for retention queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_plan_date ON user_profiles(last_plan_date);

-- Add comment
COMMENT ON TABLE user_profiles IS 'User preferences for personalized meal suggestions and retention';
