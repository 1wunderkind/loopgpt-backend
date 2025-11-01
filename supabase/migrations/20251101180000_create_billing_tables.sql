-- Migration: Create billing and subscription tables
-- Created: 2025-11-01
-- Purpose: Add Stripe subscription management and entitlement tracking

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'family')),
  status text DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'cancelled', 'past_due', 'trialing')),
  renewal_date timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Metadata for Agentic Commerce migration
  sku text,
  launch_phase text,
  
  -- Constraints
  UNIQUE(chatgpt_user_id),
  UNIQUE(email),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_chatgpt_user_id ON subscriptions(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own subscription
CREATE POLICY user_isolation_select ON subscriptions
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything (for Edge Functions)
CREATE POLICY service_role_all ON subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. ENTITLEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL UNIQUE,
  credits int DEFAULT 0,
  last_refill timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Foreign key to subscriptions
  CONSTRAINT fk_entitlements_user
    FOREIGN KEY (chatgpt_user_id)
    REFERENCES subscriptions(chatgpt_user_id)
    ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_entitlements_chatgpt_user_id ON entitlements(chatgpt_user_id);

-- Enable Row Level Security
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own entitlements
CREATE POLICY user_isolation_entitlements ON entitlements
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything
CREATE POLICY service_role_entitlements ON entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. ANALYTICS_EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  chatgpt_user_id text,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(chatgpt_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Enable Row Level Security (read-only for users)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own events
CREATE POLICY user_view_own_events ON analytics_events
  FOR SELECT
  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policy: Service role can do anything
CREATE POLICY service_role_analytics ON analytics_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION has_premium_access(user_id text)
RETURNS boolean AS $$
DECLARE
  sub_record RECORD;
  trial_active boolean;
BEGIN
  -- Get subscription record
  SELECT status, tier, trial_end INTO sub_record
  FROM subscriptions
  WHERE chatgpt_user_id = user_id;
  
  -- If no subscription, return false
  IF sub_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if trial is active
  trial_active := sub_record.trial_end IS NOT NULL AND sub_record.trial_end > now();
  
  -- Return true if active subscription or active trial
  RETURN (sub_record.status = 'active' OR trial_active) AND sub_record.tier IN ('premium', 'family');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user entitlement status
CREATE OR REPLACE FUNCTION get_user_entitlement(user_id text)
RETURNS jsonb AS $$
DECLARE
  sub_record RECORD;
  ent_record RECORD;
  trial_active boolean;
  result jsonb;
BEGIN
  -- Get subscription
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE chatgpt_user_id = user_id;
  
  -- Get entitlements
  SELECT * INTO ent_record
  FROM entitlements
  WHERE chatgpt_user_id = user_id;
  
  -- Check trial status
  trial_active := sub_record.trial_end IS NOT NULL AND sub_record.trial_end > now();
  
  -- Build result
  result := jsonb_build_object(
    'has_access', (sub_record.status = 'active' OR trial_active) AND sub_record.tier IN ('premium', 'family'),
    'tier', COALESCE(sub_record.tier, 'free'),
    'status', COALESCE(sub_record.status, 'inactive'),
    'trial_active', trial_active,
    'trial_end', sub_record.trial_end,
    'renewal_date', sub_record.renewal_date,
    'credits', COALESCE(ent_record.credits, 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SEED DEFAULT DATA
-- =====================================================

-- Create a default free tier subscription for existing users (optional)
-- This can be run separately if needed

COMMENT ON TABLE subscriptions IS 'Stripe subscription management for LoopGPT Premium';
COMMENT ON TABLE entitlements IS 'User entitlements and usage credits';
COMMENT ON TABLE analytics_events IS 'Billing and subscription analytics events';
COMMENT ON FUNCTION has_premium_access IS 'Check if user has active premium access';
COMMENT ON FUNCTION get_user_entitlement IS 'Get complete entitlement status for user';

