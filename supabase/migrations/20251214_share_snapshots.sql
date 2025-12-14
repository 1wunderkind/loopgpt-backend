-- Migration: Share Snapshots Table
-- Created: 2025-12-14
-- Purpose: Store shareable widget snapshots for social media sharing
--
-- Part of: Widget Implementation (Prompt 5)

-- ============================================================================
-- Share Snapshots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.share_snapshots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Share identifier (used in URLs like /s/ABC123)
  share_id TEXT NOT NULL UNIQUE,
  
  -- Widget reference
  widget_id TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  
  -- Widget data snapshot (full widget JSON for rendering)
  widget_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Optional metadata
  user_id TEXT,
  session_id TEXT
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup by share ID (primary use case)
CREATE INDEX IF NOT EXISTS idx_share_snapshots_share_id 
  ON public.share_snapshots(share_id);

-- Cleanup expired snapshots
CREATE INDEX IF NOT EXISTS idx_share_snapshots_expires_at 
  ON public.share_snapshots(expires_at);

-- Find all shares for a specific widget
CREATE INDEX IF NOT EXISTS idx_share_snapshots_widget_id 
  ON public.share_snapshots(widget_id);

-- Find shares by user
CREATE INDEX IF NOT EXISTS idx_share_snapshots_user_id 
  ON public.share_snapshots(user_id) 
  WHERE user_id IS NOT NULL;

-- Analytics: most viewed shares
CREATE INDEX IF NOT EXISTS idx_share_snapshots_view_count 
  ON public.share_snapshots(view_count DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.share_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view share snapshots (public sharing)
CREATE POLICY "Share snapshots are publicly viewable"
  ON public.share_snapshots
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert (via MCP tools)
CREATE POLICY "Only service role can create share snapshots"
  ON public.share_snapshots
  FOR INSERT
  WITH CHECK (false); -- Service role bypasses RLS

-- Policy: Only service role can update (for view counts)
CREATE POLICY "Only service role can update share snapshots"
  ON public.share_snapshots
  FOR UPDATE
  USING (false); -- Service role bypasses RLS

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Increment view count for a share snapshot
 */
CREATE OR REPLACE FUNCTION public.increment_share_view_count(p_share_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.share_snapshots
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_id = p_share_id;
END;
$$;

/**
 * Cleanup expired share snapshots
 * 
 * Call this periodically (e.g., daily cron job) to remove old snapshots.
 */
CREATE OR REPLACE FUNCTION public.cleanup_expired_share_snapshots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.share_snapshots
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.share_snapshots IS 
  'Stores shareable widget snapshots for social media sharing. Snapshots expire after 90 days.';

COMMENT ON COLUMN public.share_snapshots.share_id IS 
  'Unique share identifier used in URLs (e.g., /s/ABC123)';

COMMENT ON COLUMN public.share_snapshots.widget_data IS 
  'Full widget JSON snapshot for rendering the shared view';

COMMENT ON COLUMN public.share_snapshots.expires_at IS 
  'Expiration timestamp. Snapshots are deleted after this date.';

COMMENT ON FUNCTION public.increment_share_view_count(TEXT) IS 
  'Increments the view count for a share snapshot';

COMMENT ON FUNCTION public.cleanup_expired_share_snapshots() IS 
  'Deletes expired share snapshots. Run periodically via cron.';

-- ============================================================================
-- End of Migration
-- ============================================================================
