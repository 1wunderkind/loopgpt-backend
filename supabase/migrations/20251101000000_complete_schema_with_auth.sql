-- TheLoopGPT.ai Complete Database Schema with Supabase Auth
-- This migration consolidates all previous migrations and updates to use Supabase Auth

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'UTC',
  unit_preference TEXT DEFAULT 'metric' CHECK (unit_preference IN ('metric', 'imperial')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MEAL PLANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meal_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'maintenance', 'general_health')),
  daily_calorie_target INTEGER,
  vibe TEXT,
  dietary_restrictions TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.meal_plans(plan_id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id UUID,
  recipe_title TEXT NOT NULL,
  calories INTEGER,
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  ingredients JSONB,
  instructions TEXT[],
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  affiliate_links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  recipe_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  calories INTEGER,
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  tags TEXT[],
  source TEXT DEFAULT 'leftovergpt',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_plans
CREATE POLICY "Users can view own meal plans"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for meal_plan_items
CREATE POLICY "Users can view own meal plan items"
  ON public.meal_plan_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.plan_id = meal_plan_items.plan_id
    AND meal_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own meal plan items"
  ON public.meal_plan_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.plan_id = meal_plan_items.plan_id
    AND meal_plans.user_id = auth.uid()
  ));

-- RLS Policies for recipes (public read)
CREATE POLICY "Anyone can view recipes"
  ON public.recipes FOR SELECT
  USING (true);

-- ============================================================================
-- WEIGHT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weight_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.plan_outcomes (
  outcome_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  target_delta_kg DECIMAL(4,2),
  actual_delta_kg DECIMAL(4,2),
  recommended_adjustment_kcal INTEGER,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weight_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  safe_loss_kg_per_week DECIMAL(3,2) DEFAULT 0.5,
  daily_reminder_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own weight logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own plan outcomes"
  ON public.plan_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weight prefs"
  ON public.weight_prefs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- AFFILIATE LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient TEXT NOT NULL,
  partner TEXT NOT NULL CHECK (partner IN ('amazon', 'instacart')),
  url TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(ingredient, partner)
);

CREATE TABLE IF NOT EXISTS public.affiliate_partner_map (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('grocery', 'delivery')),
  partner_name TEXT NOT NULL,
  affiliate_id TEXT,
  base_url TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country, partner_type, partner_name)
);

CREATE TABLE IF NOT EXISTS public.affiliate_analytics (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'conversion')),
  ingredient TEXT,
  url TEXT,
  commission_amount DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_partner_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_analytics ENABLE ROW LEVEL SECURITY;

-- Public read for affiliate data
CREATE POLICY "Anyone can view affiliate links"
  ON public.affiliate_links FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view partner map"
  ON public.affiliate_partner_map FOR SELECT
  USING (true);

-- ============================================================================
-- DELIVERY PARTNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  affiliate_id TEXT,
  cuisine_tags TEXT[],
  diet_tags TEXT[],
  supported_countries TEXT[],
  commission_rate DECIMAL(4,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cuisine TEXT,
  diet_preference TEXT,
  country TEXT,
  partner_name TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  match_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_recommendations ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view delivery partners"
  ON public.delivery_partners FOR SELECT
  USING (true);

-- ============================================================================
-- MEALME ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
  mealme_order_id TEXT UNIQUE,
  store_name TEXT,
  total_amount DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  delivery_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  quote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  delivery_fee DECIMAL(10,2),
  estimated_time_minutes INTEGER,
  quote_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE TABLE IF NOT EXISTS public.mealme_webhook_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(order_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mealme_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.order_id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own delivery quotes"
  ON public.delivery_quotes FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (public read)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User profiles
CREATE INDEX idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX idx_user_profiles_language ON public.user_profiles(language);

-- Meal plans
CREATE INDEX idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX idx_meal_plans_dates ON public.meal_plans(start_date, end_date);
CREATE INDEX idx_meal_plan_items_plan_id ON public.meal_plan_items(plan_id);

-- Weight tracking
CREATE INDEX idx_weight_logs_user_date ON public.weight_logs(user_id, date DESC);
CREATE INDEX idx_plan_outcomes_user_id ON public.plan_outcomes(user_id);

-- Affiliate links
CREATE INDEX idx_affiliate_links_ingredient ON public.affiliate_links(ingredient);
CREATE INDEX idx_affiliate_links_expires ON public.affiliate_links(expires_at);

-- Orders
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Events
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Normalize ingredient names for better matching
CREATE OR REPLACE FUNCTION public.normalize_ingredient(ingredient TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(ingredient, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_weight_prefs_updated_at
  BEFORE UPDATE ON public.weight_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Order analytics view
CREATE OR REPLACE VIEW public.order_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  SUM(commission_amount) as total_commission,
  AVG(total_amount) as avg_order_value
FROM public.orders
WHERE status IN ('confirmed', 'delivered')
GROUP BY DATE_TRUNC('day', created_at);

-- Delivery analytics view
CREATE OR REPLACE VIEW public.delivery_analytics AS
SELECT
  partner_name,
  country,
  COUNT(*) as total_recommendations,
  AVG(match_score) as avg_match_score,
  DATE_TRUNC('day', created_at) as date
FROM public.delivery_recommendations
GROUP BY partner_name, country, DATE_TRUNC('day', created_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_name, enabled, rollout_percentage, description) VALUES
  ('mealme_integration', true, 100, 'Enable MealMe 1-click ordering'),
  ('delivery_affiliates', true, 100, 'Enable delivery affiliate recommendations'),
  ('weight_tracker', true, 100, 'Enable weight tracking and plan adaptation'),
  ('multilingual', true, 100, 'Enable multilingual support (100+ languages)')
ON CONFLICT (flag_name) DO NOTHING;

-- Insert delivery partners
INSERT INTO public.delivery_partners (name, base_url, affiliate_id, cuisine_tags, diet_tags, supported_countries, commission_rate, is_active) VALUES
  ('Uber Eats', 'https://www.ubereats.com', 'TEST-UBER-123', ARRAY['all'], ARRAY['all'], ARRAY['US', 'UK', 'CA', 'AU'], 5.00, true),
  ('DoorDash', 'https://www.doordash.com', 'TEST-DOORDASH-123', ARRAY['all'], ARRAY['all'], ARRAY['US', 'CA'], 7.00, true),
  ('Grubhub', 'https://www.grubhub.com', 'TEST-GRUBHUB-123', ARRAY['all'], ARRAY['all'], ARRAY['US'], 6.00, true),
  ('Deliveroo', 'https://deliveroo.co.uk', 'TEST-DELIVEROO-123', ARRAY['all'], ARRAY['all'], ARRAY['UK', 'FR', 'ES', 'IT'], 5.50, true),
  ('Just Eat', 'https://www.just-eat.co.uk', 'TEST-JUSTEAT-123', ARRAY['all'], ARRAY['all'], ARRAY['UK', 'IE'], 4.50, true)
ON CONFLICT (name) DO NOTHING;

-- Insert affiliate partner mappings (25 countries)
INSERT INTO public.affiliate_partner_map (country, partner_type, partner_name, affiliate_id, base_url, priority, is_active) VALUES
  -- US
  ('US', 'grocery', 'Amazon Fresh', 'theloopgpt-20', 'https://www.amazon.com', 1, true),
  ('US', 'grocery', 'Instacart', 'TEST-INSTA-123', 'https://www.instacart.com', 2, true),
  ('US', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  ('US', 'delivery', 'DoorDash', 'TEST-DOORDASH-123', 'https://www.doordash.com', 2, true),
  -- UK
  ('UK', 'grocery', 'Amazon Fresh UK', 'theloopgpt-21', 'https://www.amazon.co.uk', 1, true),
  ('UK', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.co.uk', 1, true),
  ('UK', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 2, true),
  -- Canada
  ('CA', 'grocery', 'Amazon Fresh CA', 'theloopgpt-20', 'https://www.amazon.ca', 1, true),
  ('CA', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  ('CA', 'delivery', 'DoorDash', 'TEST-DOORDASH-123', 'https://www.doordash.com', 2, true),
  -- Australia
  ('AU', 'grocery', 'Amazon AU', 'theloopgpt-20', 'https://www.amazon.com.au', 1, true),
  ('AU', 'delivery', 'Uber Eats', 'TEST-UBER-123', 'https://www.ubereats.com', 1, true),
  -- Germany
  ('DE', 'grocery', 'Amazon DE', 'theloopgpt-21', 'https://www.amazon.de', 1, true),
  -- France
  ('FR', 'grocery', 'Amazon FR', 'theloopgpt-21', 'https://www.amazon.fr', 1, true),
  ('FR', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.fr', 1, true),
  -- Spain
  ('ES', 'grocery', 'Amazon ES', 'theloopgpt-21', 'https://www.amazon.es', 1, true),
  ('ES', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.es', 1, true),
  -- Italy
  ('IT', 'grocery', 'Amazon IT', 'theloopgpt-21', 'https://www.amazon.it', 1, true),
  ('IT', 'delivery', 'Deliveroo', 'TEST-DELIVEROO-123', 'https://deliveroo.it', 1, true),
  -- India
  ('IN', 'grocery', 'Amazon IN', 'theloopgpt-21', 'https://www.amazon.in', 1, true),
  -- Japan
  ('JP', 'grocery', 'Amazon JP', 'theloopgpt-22', 'https://www.amazon.co.jp', 1, true),
  -- Add more countries as needed...
  ('BR', 'grocery', 'Amazon BR', 'theloopgpt-20', 'https://www.amazon.com.br', 1, true),
  ('MX', 'grocery', 'Amazon MX', 'theloopgpt-20', 'https://www.amazon.com.mx', 1, true),
  ('NL', 'grocery', 'Amazon NL', 'theloopgpt-21', 'https://www.amazon.nl', 1, true),
  ('SE', 'grocery', 'Amazon SE', 'theloopgpt-21', 'https://www.amazon.se', 1, true)
ON CONFLICT (country, partner_type, partner_name) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

