-- ============================================================================
-- Affiliate Partner Mapping Table
-- Created: 2025-11-02
-- Purpose: Store affiliate partners by country for geo-routing
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_partner_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  category TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_url TEXT NOT NULL,
  commission_rate DECIMAL(5,2),
  commission_type TEXT DEFAULT 'percentage',
  priority INTEGER DEFAULT 1,
  min_order_value DECIMAL(10,2),
  delivery_fee DECIMAL(10,2),
  free_delivery_threshold DECIMAL(10,2),
  delivery_time TEXT,
  coverage TEXT,
  affiliate_id TEXT NOT NULL,
  tracking_template TEXT NOT NULL,
  description TEXT,
  benefit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT affiliate_partner_map_country_check CHECK (length(country_code) = 2),
  CONSTRAINT affiliate_partner_map_category_check CHECK (category IN ('grocery', 'delivery', 'meal_kit')),
  CONSTRAINT affiliate_partner_map_commission_type_check CHECK (commission_type IN ('percentage', 'fixed')),
  CONSTRAINT affiliate_partner_map_priority_check CHECK (priority > 0),
  UNIQUE(country_code, category, partner_name)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_country ON affiliate_partner_map(country_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_category ON affiliate_partner_map(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_active ON affiliate_partner_map(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_priority ON affiliate_partner_map(priority);

-- ============================================================================
-- Seed Data: Top 3 Countries (US, UK, Canada)
-- ============================================================================

-- United States - Grocery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  min_order_value, delivery_fee, free_delivery_threshold, delivery_time, coverage,
  affiliate_id, tracking_template, description, benefit
) VALUES
  ('US', 'grocery', 'Amazon Fresh', 'https://amazon.com/fresh', 3.00, 1,
   35.00, 3.99, 35.00, '2 hours', 'major cities',
   'loopgpt-20', 'https://amazon.com/fresh?tag={affiliate_id}&ref={user_id}',
   '2-hour delivery | Free over $35', 'Free delivery over $35'),
  
  ('US', 'grocery', 'Instacart', 'https://instacart.com', 5.00, 2,
   35.00, 5.99, 35.00, 'same-day', 'nationwide',
   'loopgpt', 'https://instacart.com/?aff={affiliate_id}&uid={user_id}',
   'Same-day from local stores', 'Shop from your favorite stores'),
  
  ('US', 'grocery', 'Walmart Grocery', 'https://walmart.com/grocery', 2.00, 3,
   0.00, 0.00, 0.00, '2 hours', 'nationwide',
   'loopgpt', 'https://walmart.com/grocery?aff={affiliate_id}&uid={user_id}',
   'Free pickup in 2 hours', 'Save on delivery fees');

-- United States - Delivery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  delivery_time, coverage, affiliate_id, tracking_template, description, benefit
) VALUES
  ('US', 'delivery', 'MealMe', 'https://mealme.ai', 10.00, 1,
   '25-45 min', 'nationwide',
   'loopgpt', 'https://mealme.ai?partner={affiliate_id}&ref={user_id}',
   'Best prices across all platforms', '5% cashback on orders'),
  
  ('US', 'delivery', 'Uber Eats', 'https://ubereats.com', 8.00, 2,
   '20-40 min', 'nationwide',
   'loopgpt', 'https://ubereats.com?aff={affiliate_id}&uid={user_id}',
   'Fast delivery from local restaurants', 'Free delivery on first order'),
  
  ('US', 'delivery', 'DoorDash', 'https://doordash.com', 8.00, 3,
   '25-45 min', 'nationwide',
   'loopgpt', 'https://doordash.com?aff={affiliate_id}&uid={user_id}',
   'Wide restaurant selection', '$10 off first order');

-- United States - Meal Kits
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, commission_type, priority,
  delivery_time, coverage, affiliate_id, tracking_template, description, benefit
) VALUES
  ('US', 'meal_kit', 'HelloFresh', 'https://hellofresh.com', 15.00, 'fixed', 1,
   '3-5 days', 'nationwide',
   'loopgpt', 'https://hellofresh.com?c={affiliate_id}&ref={user_id}',
   'Pre-portioned ingredients with recipes', '50% off first box'),
  
  ('US', 'meal_kit', 'Factor', 'https://factor75.com', 12.00, 'fixed', 2,
   '2-3 days', 'nationwide',
   'loopgpt', 'https://factor75.com?c={affiliate_id}&ref={user_id}',
   'Fully prepared meals | Just heat and eat', '$50 off first order');

-- United Kingdom - Grocery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  min_order_value, delivery_fee, free_delivery_threshold, delivery_time, coverage,
  affiliate_id, tracking_template, description, benefit
) VALUES
  ('GB', 'grocery', 'Tesco', 'https://tesco.com', 2.50, 1,
   40.00, 4.99, 40.00, 'next-day', 'nationwide',
   'loopgpt-uk', 'https://tesco.com?aff={affiliate_id}&uid={user_id}',
   'Next-day delivery | Free over £40', 'Free delivery over £40'),
  
  ('GB', 'grocery', 'Sainsburys', 'https://sainsburys.co.uk', 2.50, 2,
   40.00, 5.00, 40.00, 'same-day', 'nationwide',
   'loopgpt-uk', 'https://sainsburys.co.uk?aff={affiliate_id}&uid={user_id}',
   'Same-day delivery available', 'Shop from home'),
  
  ('GB', 'grocery', 'Ocado', 'https://ocado.com', 3.00, 3,
   40.00, 5.99, 60.00, 'next-day', 'nationwide',
   'loopgpt-uk', 'https://ocado.com?aff={affiliate_id}&uid={user_id}',
   'Premium selection | Next-day delivery', 'Quality groceries');

-- United Kingdom - Delivery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  delivery_time, coverage, affiliate_id, tracking_template, description, benefit
) VALUES
  ('GB', 'delivery', 'Uber Eats', 'https://ubereats.com/gb', 8.00, 1,
   '20-40 min', 'nationwide',
   'loopgpt-uk', 'https://ubereats.com/gb?aff={affiliate_id}&uid={user_id}',
   'Fast delivery from local restaurants', 'Free delivery on first order'),
  
  ('GB', 'delivery', 'Deliveroo', 'https://deliveroo.co.uk', 8.00, 2,
   '20-40 min', 'nationwide',
   'loopgpt-uk', 'https://deliveroo.co.uk?aff={affiliate_id}&uid={user_id}',
   'Premium restaurant selection', '£10 off first order'),
  
  ('GB', 'delivery', 'Just Eat', 'https://just-eat.co.uk', 7.00, 3,
   '25-45 min', 'nationwide',
   'loopgpt-uk', 'https://just-eat.co.uk?aff={affiliate_id}&uid={user_id}',
   'Wide restaurant selection', 'Free delivery on first order');

-- Canada - Grocery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  min_order_value, delivery_fee, free_delivery_threshold, delivery_time, coverage,
  affiliate_id, tracking_template, description, benefit
) VALUES
  ('CA', 'grocery', 'Instacart', 'https://instacart.ca', 5.00, 1,
   35.00, 5.99, 35.00, 'same-day', 'major cities',
   'loopgpt-ca', 'https://instacart.ca/?aff={affiliate_id}&uid={user_id}',
   'Same-day from local stores', 'Shop from your favorite stores'),
  
  ('CA', 'grocery', 'Walmart Grocery', 'https://walmart.ca/grocery', 2.00, 2,
   0.00, 0.00, 0.00, '2 hours', 'nationwide',
   'loopgpt-ca', 'https://walmart.ca/grocery?aff={affiliate_id}&uid={user_id}',
   'Free pickup in 2 hours', 'Save on delivery fees');

-- Canada - Delivery
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  delivery_time, coverage, affiliate_id, tracking_template, description, benefit
) VALUES
  ('CA', 'delivery', 'Uber Eats', 'https://ubereats.com/ca', 8.00, 1,
   '20-40 min', 'nationwide',
   'loopgpt-ca', 'https://ubereats.com/ca?aff={affiliate_id}&uid={user_id}',
   'Fast delivery from local restaurants', 'Free delivery on first order'),
  
  ('CA', 'delivery', 'DoorDash', 'https://doordash.com/ca', 8.00, 2,
   '25-45 min', 'major cities',
   'loopgpt-ca', 'https://doordash.com/ca?aff={affiliate_id}&uid={user_id}',
   'Wide restaurant selection', '$10 off first order'),
  
  ('CA', 'delivery', 'SkipTheDishes', 'https://skipthedishes.com', 7.00, 3,
   '25-45 min', 'nationwide',
   'loopgpt-ca', 'https://skipthedishes.com?aff={affiliate_id}&uid={user_id}',
   'Canadian restaurant selection', 'Free delivery on first order');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get affiliate partners by country and category
CREATE OR REPLACE FUNCTION get_affiliates_by_country(
  p_country_code TEXT,
  p_category TEXT
) RETURNS TABLE (
  partner_name TEXT,
  partner_url TEXT,
  commission_rate DECIMAL,
  description TEXT,
  benefit TEXT,
  tracking_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apm.partner_name,
    apm.partner_url,
    apm.commission_rate,
    apm.description,
    apm.benefit,
    REPLACE(REPLACE(apm.tracking_template, '{affiliate_id}', apm.affiliate_id), '{user_id}', 'PLACEHOLDER') as tracking_url
  FROM affiliate_partner_map apm
  WHERE apm.country_code = p_country_code
    AND apm.category = p_category
    AND apm.is_active = true
  ORDER BY apm.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE affiliate_partner_map IS 'Maps affiliate partners to countries for geo-routing';
COMMENT ON FUNCTION get_affiliates_by_country IS 'Returns active affiliate partners for a given country and category, ordered by priority';
