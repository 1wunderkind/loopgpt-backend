-- ============================================================================
-- Migration: Fix Permissive RLS Policies
-- Date: 2024-12-15
-- Purpose: Replace USING(true) with proper user-scoped policies
-- ============================================================================

-- ============================================================================
-- 1. FIX weight_logs TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view their own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can insert their own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can update their own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can delete their own weight logs" ON public.weight_logs;

-- Create properly scoped policies
CREATE POLICY "weight_logs_select_own"
  ON public.weight_logs
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "weight_logs_insert_own"
  ON public.weight_logs
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "weight_logs_update_own"
  ON public.weight_logs
  FOR UPDATE
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "weight_logs_delete_own"
  ON public.weight_logs
  FOR DELETE
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- 2. FIX plan_outcomes TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own plan outcomes" ON public.plan_outcomes;
DROP POLICY IF EXISTS "Users can insert their own plan outcomes" ON public.plan_outcomes;

CREATE POLICY "plan_outcomes_select_own"
  ON public.plan_outcomes
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "plan_outcomes_insert_own"
  ON public.plan_outcomes
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- 3. FIX weight_prefs TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own weight prefs" ON public.weight_prefs;
DROP POLICY IF EXISTS "Users can insert their own weight prefs" ON public.weight_prefs;
DROP POLICY IF EXISTS "Users can update their own weight prefs" ON public.weight_prefs;

CREATE POLICY "weight_prefs_select_own"
  ON public.weight_prefs
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "weight_prefs_insert_own"
  ON public.weight_prefs
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "weight_prefs_update_own"
  ON public.weight_prefs
  FOR UPDATE
  USING (
    user_id IN (
      SELECT user_id FROM public.users 
      WHERE chatgpt_user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================================
-- 4. FIX meal_logs TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_logs') THEN
    DROP POLICY IF EXISTS "Users can view their own meal logs" ON public.meal_logs;
    DROP POLICY IF EXISTS "Users can insert their own meal logs" ON public.meal_logs;
    
    CREATE POLICY "meal_logs_select_own"
      ON public.meal_logs
      FOR SELECT
      USING (
        user_id IN (
          SELECT user_id FROM public.users 
          WHERE chatgpt_user_id = auth.uid()::text
        )
        OR auth.role() = 'service_role'
      );

    CREATE POLICY "meal_logs_insert_own"
      ON public.meal_logs
      FOR INSERT
      WITH CHECK (
        user_id IN (
          SELECT user_id FROM public.users 
          WHERE chatgpt_user_id = auth.uid()::text
        )
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- ============================================================================
-- 5. FIX tracker_food_logs TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracker_food_logs') THEN
    DROP POLICY IF EXISTS "Users can view their own food logs" ON public.tracker_food_logs;
    DROP POLICY IF EXISTS "Users can insert their own food logs" ON public.tracker_food_logs;
    
    CREATE POLICY "tracker_food_logs_select_own"
      ON public.tracker_food_logs
      FOR SELECT
      USING (
        user_id IN (
          SELECT id FROM public.tracker_users 
          WHERE chatgpt_user_id = auth.uid()::text
        )
        OR auth.role() = 'service_role'
      );

    CREATE POLICY "tracker_food_logs_insert_own"
      ON public.tracker_food_logs
      FOR INSERT
      WITH CHECK (
        user_id IN (
          SELECT id FROM public.tracker_users 
          WHERE chatgpt_user_id = auth.uid()::text
        )
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- ============================================================================
-- 6. FIX tracker_daily_summaries TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracker_daily_summaries') THEN
    DROP POLICY IF EXISTS "Users can view their own daily summaries" ON public.tracker_daily_summaries;
    
    CREATE POLICY "tracker_daily_summaries_select_own"
      ON public.tracker_daily_summaries
      FOR SELECT
      USING (
        user_id IN (
          SELECT id FROM public.tracker_users 
          WHERE chatgpt_user_id = auth.uid()::text
        )
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- ============================================================================
-- 7. FIX user_profiles TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
    
    CREATE POLICY "user_profiles_select_own"
      ON public.user_profiles
      FOR SELECT
      USING (
        chatgpt_user_id = auth.uid()::text
        OR auth.role() = 'service_role'
      );

    CREATE POLICY "user_profiles_update_own"
      ON public.user_profiles
      FOR UPDATE
      USING (
        chatgpt_user_id = auth.uid()::text
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname LIKE '%_own';
  
  RAISE NOTICE 'Migration complete. Created % user-scoped policies.', policy_count;
END $$;
