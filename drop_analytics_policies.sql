-- Drop all existing policies on analytics tables
DO $$ 
BEGIN
  -- Drop service_role_all policies
  DROP POLICY IF EXISTS service_role_all ON analytics.ingredient_submissions;
  DROP POLICY IF EXISTS service_role_all ON analytics.recipe_events;
  DROP POLICY IF EXISTS service_role_all ON analytics.meal_logs;
  DROP POLICY IF EXISTS service_role_all ON analytics.meal_plans;
  DROP POLICY IF EXISTS service_role_all ON analytics.affiliate_events;
  DROP POLICY IF EXISTS service_role_all ON analytics.user_goals;
  DROP POLICY IF EXISTS service_role_all ON analytics.session_events;
  
  -- Drop users_view_own policies
  DROP POLICY IF EXISTS users_view_own ON analytics.ingredient_submissions;
  DROP POLICY IF EXISTS users_view_own ON analytics.recipe_events;
  DROP POLICY IF EXISTS users_view_own ON analytics.meal_logs;
  DROP POLICY IF EXISTS users_view_own ON analytics.meal_plans;
  DROP POLICY IF EXISTS users_view_own ON analytics.affiliate_events;
  DROP POLICY IF EXISTS users_view_own ON analytics.user_goals;
  DROP POLICY IF EXISTS users_view_own ON analytics.session_events;
END $$;
