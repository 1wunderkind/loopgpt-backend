-- Sentiment Layer Migration
-- Created: 2025-12-04
-- Purpose: Track user feedback (helpful/not helpful, ratings, favorites)

-- Sentiment Events Table
-- Stores all feedback events for analytics
CREATE TABLE IF NOT EXISTS sentiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('HELPFUL', 'NOT_HELPFUL', 'RATED', 'FAVORITED', 'UNFAVORITED')),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
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

-- User Favorites Table
-- Stores current favorites (denormalized for fast retrieval)
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

-- Aggregated Sentiment Stats (Materialized View)
-- For fast analytics and ranking
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

-- Function to update sentiment stats
CREATE OR REPLACE FUNCTION update_sentiment_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert stats for the content
  INSERT INTO sentiment_stats (content_type, content_id, helpful_count, not_helpful_count, total_ratings, average_rating, favorite_count, last_updated)
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_sentiment_stats ON sentiment_events;
CREATE TRIGGER trigger_update_sentiment_stats
  AFTER INSERT ON sentiment_events
  FOR EACH ROW
  WHEN (NEW.content_id IS NOT NULL)
  EXECUTE FUNCTION update_sentiment_stats();

-- Comments for documentation
COMMENT ON TABLE sentiment_events IS 'Stores all user feedback events for recipes, meal plans, and grocery lists';
COMMENT ON TABLE user_favorites IS 'Denormalized table of user favorites for fast retrieval';
COMMENT ON TABLE sentiment_stats IS 'Aggregated sentiment statistics for content ranking and analytics';
