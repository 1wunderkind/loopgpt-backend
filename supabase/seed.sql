-- Seed data for LoopGPT Backend
-- This file should be idempotent (safe to run multiple times)

-- 1. Configuration / Lookup Tables
-- (Add any lookup tables here if they exist, e.g. diet_tags, locales)

-- 2. Test Users (for development only)
-- Note: In a real scenario, you'd use auth.users, but we can't easily seed that via SQL directly 
-- without knowing the internal auth schema details or using the Supabase CLI's auth seeding capabilities.
-- For now, we'll assume auth users are created via the dashboard or CLI helper.

-- 3. Feature Flags (Example)
-- INSERT INTO public.feature_flags (key, value, description)
-- VALUES ('enable_beta_features', 'true', 'Enable beta features for testing')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. Initial Data for Testing
-- Example: Seed some initial food items if the table exists
-- INSERT INTO public.food_items (name, calories)
-- VALUES ('Test Apple', 95)
-- ON CONFLICT DO NOTHING;

-- Log seed completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data applied successfully';
END $$;
