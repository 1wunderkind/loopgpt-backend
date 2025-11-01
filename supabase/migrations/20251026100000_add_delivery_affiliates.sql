-- Migration: Add Delivery Affiliate Integration
-- Date: 2025-10-26
-- Purpose: Enable food delivery affiliate links as alternative to cooking

-- ============================================================================
-- DELIVERY PARTNERS TABLE
-- ============================================================================

CREATE TABLE delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  api_key text,
  affiliate_id text NOT NULL,
  supported_countries text[] DEFAULT ARRAY['US'],
  cuisine_tags text[] NOT NULL,
  diet_tags text[] DEFAULT ARRAY[]::text[],
  commission_rate decimal(5,2),
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast cuisine matching
CREATE INDEX idx_delivery_partners_cuisine ON delivery_partners USING gin (cuisine_tags);

-- Index for diet filtering
CREATE INDEX idx_delivery_partners_diet ON delivery_partners USING gin (diet_tags);

-- Index for active partners
CREATE INDEX idx_delivery_partners_active ON delivery_partners (active);

-- ============================================================================
-- DELIVERY RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE delivery_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  cuisine_tag text,
  diet text,
  calories int,
  partner_id uuid REFERENCES delivery_partners(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  affiliate_url text NOT NULL,
  clicked boolean DEFAULT false,
  clicked_at timestamptz,
  converted boolean DEFAULT false,
  converted_at timestamptz,
  order_value decimal(10,2),
  commission_earned decimal(10,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_delivery_recommendations_user ON delivery_recommendations (chatgpt_user_id);

-- Index for analytics queries
CREATE INDEX idx_delivery_recommendations_partner ON delivery_recommendations (partner_id);

-- Index for conversion tracking
CREATE INDEX idx_delivery_recommendations_converted ON delivery_recommendations (converted, created_at);

-- ============================================================================
-- DELIVERY ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW delivery_analytics AS
SELECT 
  partner_name,
  COUNT(*) as total_recommendations,
  COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
  COUNT(*) FILTER (WHERE converted = true) as total_conversions,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked = true)::decimal / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as click_rate,
  ROUND(
    (COUNT(*) FILTER (WHERE converted = true)::decimal / NULLIF(COUNT(*) FILTER (WHERE clicked = true), 0)) * 100, 
    2
  ) as conversion_rate,
  SUM(order_value) as total_order_value,
  SUM(commission_earned) as total_commission,
  DATE_TRUNC('day', created_at) as date
FROM delivery_recommendations
GROUP BY partner_name, DATE_TRUNC('day', created_at)
ORDER BY date DESC, total_recommendations DESC;

-- ============================================================================
-- UPDATE TRIGGER FOR delivery_partners
-- ============================================================================

CREATE OR REPLACE FUNCTION update_delivery_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_partners_updated_at
  BEFORE UPDATE ON delivery_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_partners_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE delivery_partners IS 'Food delivery partners with affiliate information';
COMMENT ON TABLE delivery_recommendations IS 'Log of delivery recommendations shown to users';
COMMENT ON VIEW delivery_analytics IS 'Analytics view for delivery affiliate performance';

COMMENT ON COLUMN delivery_partners.cuisine_tags IS 'Array of cuisine types (e.g., thai, italian, mexican)';
COMMENT ON COLUMN delivery_partners.diet_tags IS 'Array of diet types (e.g., vegetarian, vegan, gluten_free)';
COMMENT ON COLUMN delivery_partners.commission_rate IS 'Commission percentage (e.g., 10.50 for 10.5%)';

COMMENT ON COLUMN delivery_recommendations.clicked IS 'Whether user clicked the affiliate link';
COMMENT ON COLUMN delivery_recommendations.converted IS 'Whether user completed an order';
COMMENT ON COLUMN delivery_recommendations.order_value IS 'Total order value if converted';
COMMENT ON COLUMN delivery_recommendations.commission_earned IS 'Commission earned from this conversion';

