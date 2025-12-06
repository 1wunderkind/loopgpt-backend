-- ============================================================================
-- Analytics Data Validation Test Suite
-- Created: 2025-12-06
-- Purpose: Validate data quality and collection health for Phase 1 analytics
-- ============================================================================

-- ============================================================================
-- TEST 1: Table Existence & Structure
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== TEST 1: Table Existence & Structure ===';
END $$;

-- Check all 7 analytics tables exist
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      'ingredient_submissions',
      'recipe_events',
      'meal_logs',
      'meal_plans',
      'affiliate_events',
      'user_goals',
      'session_events'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'ingredient_submissions',
    'recipe_events',
    'meal_logs',
    'meal_plans',
    'affiliate_events',
    'user_goals',
    'session_events'
  )
ORDER BY tablename;

-- Check materialized views exist
SELECT 
  matviewname as view_name,
  '✅ EXISTS' as status
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname IN (
    'daily_ingredient_trends',
    'weekly_recipe_performance',
    'monthly_affiliate_revenue'
  )
ORDER BY matviewname;

-- ============================================================================
-- TEST 2: Data Collection Health
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: Data Collection Health ===';
END $$;

-- Count rows in each table
SELECT 
  'ingredient_submissions' as table_name,
  COUNT(*) as row_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '⚠️ NO DATA YET'
  END as status
FROM ingredient_submissions
UNION ALL
SELECT 
  'recipe_events',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM recipe_events
UNION ALL
SELECT 
  'meal_logs',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM meal_logs
UNION ALL
SELECT 
  'meal_plans',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM meal_plans
UNION ALL
SELECT 
  'affiliate_events',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM affiliate_events
UNION ALL
SELECT 
  'user_goals',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM user_goals
UNION ALL
SELECT 
  'session_events',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ NO DATA YET' END
FROM session_events
ORDER BY table_name;

-- ============================================================================
-- TEST 3: Data Quality - Null Values
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Data Quality - Null Values ===';
END $$;

-- Check for null values in critical fields
SELECT 
  'ingredient_submissions' as table_name,
  'ingredient_name' as field,
  COUNT(*) FILTER (WHERE ingredient_name IS NULL) as null_count,
  COUNT(*) as total_count,
  ROUND(COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2) as null_percentage,
  CASE 
    WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) = 0 THEN '✅ NO NULLS'
    WHEN COUNT(*) FILTER (WHERE ingredient_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0) < 1 THEN '⚠️ <1% NULLS'
    ELSE '❌ >1% NULLS'
  END as status
FROM ingredient_submissions
UNION ALL
SELECT 
  'recipe_events',
  'recipe_id',
  COUNT(*) FILTER (WHERE recipe_id IS NULL),
  COUNT(*),
  ROUND(COUNT(*) FILTER (WHERE recipe_id IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2),
  CASE 
    WHEN COUNT(*) FILTER (WHERE recipe_id IS NULL) = 0 THEN '✅ NO NULLS'
    WHEN COUNT(*) FILTER (WHERE recipe_id IS NULL) * 100.0 / NULLIF(COUNT(*), 0) < 1 THEN '⚠️ <1% NULLS'
    ELSE '❌ >1% NULLS'
  END
FROM recipe_events
UNION ALL
SELECT 
  'meal_logs',
  'calories_kcal',
  COUNT(*) FILTER (WHERE calories_kcal IS NULL),
  COUNT(*),
  ROUND(COUNT(*) FILTER (WHERE calories_kcal IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2),
  CASE 
    WHEN COUNT(*) FILTER (WHERE calories_kcal IS NULL) = 0 THEN '✅ NO NULLS'
    WHEN COUNT(*) FILTER (WHERE calories_kcal IS NULL) * 100.0 / NULLIF(COUNT(*), 0) < 1 THEN '⚠️ <1% NULLS'
    ELSE '❌ >1% NULLS'
  END
FROM meal_logs
UNION ALL
SELECT 
  'session_events',
  'gpt_name',
  COUNT(*) FILTER (WHERE gpt_name IS NULL),
  COUNT(*),
  ROUND(COUNT(*) FILTER (WHERE gpt_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0), 2),
  CASE 
    WHEN COUNT(*) FILTER (WHERE gpt_name IS NULL) = 0 THEN '✅ NO NULLS'
    WHEN COUNT(*) FILTER (WHERE gpt_name IS NULL) * 100.0 / NULLIF(COUNT(*), 0) < 1 THEN '⚠️ <1% NULLS'
    ELSE '❌ >1% NULLS'
  END
FROM session_events;

-- ============================================================================
-- TEST 4: Data Freshness
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Data Freshness ===';
END $$;

-- Check when data was last collected
SELECT 
  'ingredient_submissions' as table_name,
  MAX(created_at) as last_event,
  CASE 
    WHEN MAX(created_at) >= NOW() - INTERVAL '1 hour' THEN '✅ FRESH (<1h)'
    WHEN MAX(created_at) >= NOW() - INTERVAL '24 hours' THEN '⚠️ STALE (1-24h)'
    WHEN MAX(created_at) IS NULL THEN '⚠️ NO DATA'
    ELSE '❌ VERY STALE (>24h)'
  END as status
FROM ingredient_submissions
UNION ALL
SELECT 
  'recipe_events',
  MAX(created_at),
  CASE 
    WHEN MAX(created_at) >= NOW() - INTERVAL '1 hour' THEN '✅ FRESH (<1h)'
    WHEN MAX(created_at) >= NOW() - INTERVAL '24 hours' THEN '⚠️ STALE (1-24h)'
    WHEN MAX(created_at) IS NULL THEN '⚠️ NO DATA'
    ELSE '❌ VERY STALE (>24h)'
  END
FROM recipe_events
UNION ALL
SELECT 
  'meal_logs',
  MAX(created_at),
  CASE 
    WHEN MAX(created_at) >= NOW() - INTERVAL '1 hour' THEN '✅ FRESH (<1h)'
    WHEN MAX(created_at) >= NOW() - INTERVAL '24 hours' THEN '⚠️ STALE (1-24h)'
    WHEN MAX(created_at) IS NULL THEN '⚠️ NO DATA'
    ELSE '❌ VERY STALE (>24h)'
  END
FROM meal_logs
UNION ALL
SELECT 
  'session_events',
  MAX(created_at),
  CASE 
    WHEN MAX(created_at) >= NOW() - INTERVAL '1 hour' THEN '✅ FRESH (<1h)'
    WHEN MAX(created_at) >= NOW() - INTERVAL '24 hours' THEN '⚠️ STALE (1-24h)'
    WHEN MAX(created_at) IS NULL THEN '⚠️ NO DATA'
    ELSE '❌ VERY STALE (>24h)'
  END
FROM session_events
ORDER BY table_name;

-- ============================================================================
-- TEST 5: Data Consistency
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Data Consistency ===';
END $$;

-- Check for orphaned recipe events (recipe_id not in ingredient_submissions)
-- Note: This is expected if recipes are generated without ingredient tracking
SELECT 
  'Orphaned recipe events' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ORPHANS'
    ELSE '⚠️ HAS ORPHANS (expected if recipes generated without ingredients)'
  END as status
FROM recipe_events re
WHERE NOT EXISTS (
  SELECT 1 FROM ingredient_submissions ings
  WHERE ings.session_id = re.session_id
);

-- Check for duplicate session events (same session_id, gpt_name, event_type, timestamp)
SELECT 
  'Duplicate session events' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO DUPLICATES'
    ELSE '❌ HAS DUPLICATES'
  END as status
FROM (
  SELECT session_id, gpt_name, event_type, created_at, COUNT(*) as dup_count
  FROM session_events
  GROUP BY session_id, gpt_name, event_type, created_at
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================================================
-- TEST 6: User ID Distribution
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: User ID Distribution ===';
END $$;

-- Check user ID distribution
SELECT 
  'Total unique users' as metric,
  COUNT(DISTINCT user_id) as value,
  CASE 
    WHEN COUNT(DISTINCT user_id) > 0 THEN '✅ HAS USERS'
    ELSE '⚠️ NO USERS YET'
  END as status
FROM (
  SELECT user_id FROM ingredient_submissions
  UNION
  SELECT user_id FROM recipe_events
  UNION
  SELECT user_id FROM meal_logs
  UNION
  SELECT user_id FROM session_events
) all_users
WHERE user_id IS NOT NULL;

-- Check anonymous vs. authenticated users
SELECT 
  'Anonymous sessions' as metric,
  COUNT(*) FILTER (WHERE user_id IS NULL) as value,
  CASE 
    WHEN COUNT(*) FILTER (WHERE user_id IS NULL) * 100.0 / COUNT(*) < 50 THEN '✅ <50% ANONYMOUS'
    WHEN COUNT(*) FILTER (WHERE user_id IS NULL) * 100.0 / COUNT(*) < 80 THEN '⚠️ 50-80% ANONYMOUS'
    ELSE '❌ >80% ANONYMOUS'
  END as status
FROM session_events
UNION ALL
SELECT 
  'Authenticated sessions',
  COUNT(*) FILTER (WHERE user_id IS NOT NULL),
  CASE 
    WHEN COUNT(*) FILTER (WHERE user_id IS NOT NULL) * 100.0 / COUNT(*) > 50 THEN '✅ >50% AUTHENTICATED'
    WHEN COUNT(*) FILTER (WHERE user_id IS NOT NULL) * 100.0 / COUNT(*) > 20 THEN '⚠️ 20-50% AUTHENTICATED'
    ELSE '❌ <20% AUTHENTICATED'
  END
FROM session_events;

-- ============================================================================
-- TEST 7: GPT Usage Distribution
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: GPT Usage Distribution ===';
END $$;

-- Check which GPTs are being used
SELECT 
  source_gpt as gpt_name,
  COUNT(*) as event_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  '✅ ACTIVE' as status
FROM ingredient_submissions
GROUP BY source_gpt
UNION ALL
SELECT 
  source_gpt,
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2),
  '✅ ACTIVE'
FROM meal_logs
GROUP BY source_gpt
UNION ALL
SELECT 
  gpt_name,
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2),
  '✅ ACTIVE'
FROM session_events
GROUP BY gpt_name
ORDER BY event_count DESC;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST SUMMARY ===';
  RAISE NOTICE 'Review all tests above for data quality issues';
  RAISE NOTICE '✅ = PASS | ⚠️ = WARNING | ❌ = FAIL';
END $$;
