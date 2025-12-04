-- ============================================================================
-- SENTIMENT LAYER - DATABASE TABLES
-- ============================================================================
-- Purpose: Create tables for user feedback, ratings, and favorites
-- Version: 1.6.0
-- Date: December 4, 2025
-- 
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to: SQL Editor (left sidebar)
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" (or press Cmd/Ctrl + Enter)
-- 
-- Expected result: 3 tables created with indexes and triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1: sentiment_events
-- Stores all feedback events for analytics (append-only log)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sentiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('HELPFUL', 'NOT_HELPFUL', 'RATED', 'FAVORITED', 'UNFAVORITED')),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: rating is required for RATED events
  CONSTRAINT rating_required_for_rated CHECK (
    (event_type = 'RATED' AND rating IS NOT NULL) OR
    (event_type != 'RATED')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_events_user_id ON sentiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_content ON sentiment_events(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_type ON sentiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_timestamp ON sentiment_events(timestamp DESC);

COMMENT ON TABLE sentiment_events IS 'Stores all user feedback events for recipes, meal plans, and grocery lists';
COMMENT ON COLUMN sentiment_events.user_id IS 'User identifier (optional for anonymous feedback)';
COMMENT ON COLUMN sentiment_events.content_type IS 'Type of content: recipe, mealplan, grocery, or other';
COMMENT ON COLUMN sentiment_events.content_id IS 'Unique identifier of the content being rated';
COMMENT ON COLUMN sentiment_events.event_type IS 'Type of feedback: HELPFUL, NOT_HELPFUL, RATED, FAVORITED, UNFAVORITED';
COMMENT ON COLUMN sentiment_events.rating IS 'Star rating (1-5), required only for RATED events';
COMMENT ON COLUMN sentiment_events.metadata IS 'Additional metadata (extensible)';

-- ----------------------------------------------------------------------------
-- TABLE 2: user_favorites
-- Denormalized table of user favorites for fast retrieval
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT NOT NULL,
  content_name TEXT,
  content_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, content_type, content_id)
);

-- Index for retrieving user's favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id, created_at DESC);

COMMENT ON TABLE user_favorites IS 'Denormalized table of user favorites for fast retrieval';
COMMENT ON COLUMN user_favorites.content_name IS 'Human-readable name of the favorited content';
COMMENT ON COLUMN user_favorites.content_data IS 'Additional data about the favorited content (e.g., prepTime, difficulty)';

-- ----------------------------------------------------------------------------
-- TABLE 3: sentiment_stats
-- Aggregated sentiment statistics (auto-updated via trigger)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sentiment_stats (
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  favorite_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (content_type, content_id)
);

-- Index for ranking queries
CREATE INDEX IF NOT EXISTS idx_sentiment_stats_ranking ON sentiment_stats(content_type, average_rating DESC, total_ratings DESC);

COMMENT ON TABLE sentiment_stats IS 'Aggregated sentiment statistics for content ranking and analytics';
COMMENT ON COLUMN sentiment_stats.helpful_count IS 'Number of HELPFUL votes';
COMMENT ON COLUMN sentiment_stats.not_helpful_count IS 'Number of NOT_HELPFUL votes';
COMMENT ON COLUMN sentiment_stats.total_ratings IS 'Number of star ratings';
COMMENT ON COLUMN sentiment_stats.average_rating IS 'Average star rating (1-5)';
COMMENT ON COLUMN sentiment_stats.favorite_count IS 'Net favorite count (FAVORITED - UNFAVORITED)';

-- ----------------------------------------------------------------------------
-- TRIGGER: Auto-update sentiment_stats
-- Automatically recalculates statistics when new events are recorded
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_sentiment_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stats if content_id is provided
  IF NEW.content_id IS NOT NULL THEN
    -- Update or insert stats for the content
    INSERT INTO sentiment_stats (
      content_type, 
      content_id, 
      helpful_count, 
      not_helpful_count, 
      total_ratings, 
      average_rating, 
      favorite_count, 
      last_updated
    )
    SELECT 
      NEW.content_type,
      NEW.content_id,
      COUNT(*) FILTER (WHERE event_type = 'HELPFUL'),
      COUNT(*) FILTER (WHERE event_type = 'NOT_HELPFUL'),
      COUNT(*) FILTER (WHERE event_type = 'RATED'),
      AVG(rating) FILTER (WHERE event_type = 'RATED'),
      COUNT(*) FILTER (WHERE event_type = 'FAVORITED') - COUNT(*) FILTER (WHERE event_type = 'UNFAVORITED'),
      NOW()
    FROM sentiment_events
    WHERE content_type = NEW.content_type AND content_id = NEW.content_id
    GROUP BY content_type, content_id
    ON CONFLICT (content_type, content_id) 
    DO UPDATE SET
      helpful_count = EXCLUDED.helpful_count,
      not_helpful_count = EXCLUDED.not_helpful_count,
      total_ratings = EXCLUDED.total_ratings,
      average_rating = EXCLUDED.average_rating,
      favorite_count = EXCLUDED.favorite_count,
      last_updated = EXCLUDED.last_updated;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_sentiment_stats ON sentiment_events;

-- Create trigger to auto-update stats
CREATE TRIGGER trigger_update_sentiment_stats
  AFTER INSERT ON sentiment_events
  FOR EACH ROW
  WHEN (NEW.content_id IS NOT NULL)
  EXECUTE FUNCTION update_sentiment_stats();

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- Run these to verify tables were created successfully
-- ----------------------------------------------------------------------------

-- Check table existence
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('sentiment_events', 'user_favorites', 'sentiment_stats')
ORDER BY table_name;

-- Check indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('sentiment_events', 'user_favorites', 'sentiment_stats')
ORDER BY tablename, indexname;

-- ----------------------------------------------------------------------------
-- SUCCESS MESSAGE
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Sentiment Layer tables created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - sentiment_events (with 4 indexes)';
  RAISE NOTICE '  - user_favorites (with 1 index)';
  RAISE NOTICE '  - sentiment_stats (with 1 index)';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger created:';
  RAISE NOTICE '  - trigger_update_sentiment_stats (auto-updates sentiment_stats)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test the sentiment layer: deno run --allow-net --allow-env test-sentiment-layer.ts';
  RAISE NOTICE '  2. Events will now be persisted to the database';
  RAISE NOTICE '  3. Stats will be automatically calculated';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Sentiment Layer is now fully operational!';
END $$;
