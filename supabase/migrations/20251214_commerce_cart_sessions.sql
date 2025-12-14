-- Create commerce schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS commerce;

-- Create cart_sessions table
CREATE TABLE IF NOT EXISTS commerce.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL,
  session_id TEXT,

  -- Cart & routing snapshot
  selected_provider TEXT,
  selected_provider_id TEXT,
  alternatives JSONB,
  cart JSONB NOT NULL,
  quote JSONB NOT NULL,
  score_breakdown JSONB,
  affiliate_url TEXT,
  confirmation_token TEXT,

  -- Consent & control flags
  allow_failover BOOLEAN NOT NULL DEFAULT false,
  allow_auto_confirm BOOLEAN NOT NULL DEFAULT false,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_consent', 'confirmed_pending_execution', 'confirmed', 'failed', 'cancelled', 'expired')),
  
  last_error JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_sessions_user
  ON commerce.cart_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_status
  ON commerce.cart_sessions(status);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires_at
  ON commerce.cart_sessions(expires_at);

-- RLS Policies
ALTER TABLE commerce.cart_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON commerce.cart_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to read/write their own sessions
CREATE POLICY "Users can access own sessions" ON commerce.cart_sessions
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
