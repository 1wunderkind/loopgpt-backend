-- ============================================================================
-- GEOLOCATION & AFFILIATE ROUTING MIGRATION
-- ============================================================================
-- 
-- Purpose: Enable language-independent location detection and affiliate routing
-- 
-- Problem: Language ≠ Location (e.g., Hindi speaker in US needs US affiliates)
-- Solution: Store confirmed country separately from language preference
-- 
-- Tables:
--   1. user_profiles - Store user language and confirmed country
--   2. affiliate_partner_map - Map countries to affiliate partners with priority
-- 
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text UNIQUE NOT NULL,
  preferred_language text,
  confirmed_country text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by chatgpt_user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_chatgpt_user_id 
  ON user_profiles (chatgpt_user_id);

-- Index for analytics by country
CREATE INDEX IF NOT EXISTS idx_user_profiles_country 
  ON user_profiles (confirmed_country);

-- Comment
COMMENT ON TABLE user_profiles IS 'Stores user language preferences and confirmed location for affiliate routing';
COMMENT ON COLUMN user_profiles.chatgpt_user_id IS 'Unique identifier from ChatGPT';
COMMENT ON COLUMN user_profiles.preferred_language IS 'ISO language code (en, es, zh, etc.) detected from user input';
COMMENT ON COLUMN user_profiles.confirmed_country IS 'ISO country code (US, IN, ES, etc.) confirmed by user';

-- ============================================================================
-- 2. AFFILIATE PARTNER MAP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_partner_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  partner_id uuid REFERENCES delivery_partners(id) ON DELETE CASCADE,
  affiliate_id text NOT NULL,
  priority int DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by country
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_country 
  ON affiliate_partner_map (country_code, priority);

-- Index for partner lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_id 
  ON affiliate_partner_map (partner_id);

-- Unique constraint: one affiliate ID per partner per country
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_partner_unique 
  ON affiliate_partner_map (country_code, partner_id);

-- Comment
COMMENT ON TABLE affiliate_partner_map IS 'Maps countries to delivery partners with affiliate IDs and priority';
COMMENT ON COLUMN affiliate_partner_map.country_code IS 'ISO country code (US, IN, ES, UK, etc.)';
COMMENT ON COLUMN affiliate_partner_map.partner_id IS 'Reference to delivery_partners table';
COMMENT ON COLUMN affiliate_partner_map.affiliate_id IS 'Country-specific affiliate ID for this partner';
COMMENT ON COLUMN affiliate_partner_map.priority IS 'Lower number = higher priority (1 = first choice)';
COMMENT ON COLUMN affiliate_partner_map.active IS 'Whether this affiliate mapping is currently active';

-- ============================================================================
-- 3. SEED AFFILIATE PARTNER MAPPINGS
-- ============================================================================

-- United States
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'UBER-US-12345', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'DD-US-98765', 2 
FROM delivery_partners dp 
WHERE dp.name = 'DoorDash'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'US', dp.id, 'GRUBHUB-US-55555', 3 
FROM delivery_partners dp 
WHERE dp.name = 'Grubhub'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- India
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'IN', dp.id, 'ZOMATO-IN-11111', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Zomato'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'IN', dp.id, 'SWIGGY-IN-22222', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Swiggy'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- United Kingdom
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'DELIVEROO-UK-33333', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'JUSTEAT-UK-44444', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Just Eat'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'GB', dp.id, 'UBER-UK-77777', 3 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Spain
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'ES', dp.id, 'GLOVO-ES-66666', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Glovo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'ES', dp.id, 'UBER-ES-88888', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Canada
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'CA', dp.id, 'UBER-CA-99999', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'CA', dp.id, 'DD-CA-10101', 2 
FROM delivery_partners dp 
WHERE dp.name = 'DoorDash'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Australia
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'AU', dp.id, 'UBER-AU-12121', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'AU', dp.id, 'DELIVEROO-AU-13131', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- Germany
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'DE', dp.id, 'LIEFERANDO-DE-14141', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Lieferando'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'DE', dp.id, 'UBER-DE-15151', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- France
INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'FR', dp.id, 'UBER-FR-16161', 1 
FROM delivery_partners dp 
WHERE dp.name = 'Uber Eats'
ON CONFLICT (country_code, partner_id) DO NOTHING;

INSERT INTO affiliate_partner_map (country_code, partner_id, affiliate_id, priority)
SELECT 'FR', dp.id, 'DELIVEROO-FR-17171', 2 
FROM delivery_partners dp 
WHERE dp.name = 'Deliveroo'
ON CONFLICT (country_code, partner_id) DO NOTHING;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to get affiliate partners by country
CREATE OR REPLACE FUNCTION get_affiliates_by_country(p_country_code text)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  affiliate_id text,
  priority int,
  base_url text,
  commission_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apm.partner_id,
    dp.name as partner_name,
    apm.affiliate_id,
    apm.priority,
    dp.base_url,
    dp.commission_rate
  FROM affiliate_partner_map apm
  JOIN delivery_partners dp ON apm.partner_id = dp.id
  WHERE apm.country_code = p_country_code
    AND apm.active = true
    AND dp.active = true
  ORDER BY apm.priority ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_affiliates_by_country IS 'Returns prioritized list of active affiliate partners for a given country';

-- ============================================================================
-- 5. ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW user_location_analytics AS
SELECT 
  confirmed_country,
  preferred_language,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') as active_last_7_days,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as active_last_30_days
FROM user_profiles
WHERE confirmed_country IS NOT NULL
GROUP BY confirmed_country, preferred_language
ORDER BY user_count DESC;

COMMENT ON VIEW user_location_analytics IS 'Analytics view showing user distribution by country and language';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE 'user_profiles table created successfully';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_partner_map') THEN
    RAISE NOTICE 'affiliate_partner_map table created successfully';
  END IF;
END $$;

