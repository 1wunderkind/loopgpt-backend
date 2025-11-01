-- Migration: Add MealMe Orders and Webhooks
-- Description: Tables for MealMe food ordering integration
-- Date: 2025-10-26

-- =====================================================
-- TABLE: orders
-- Purpose: Store MealMe order records
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatgpt_user_id text NOT NULL,
  country text DEFAULT 'US',
  mealme_order_id text UNIQUE,
  cart_id text,
  provider text DEFAULT 'mealme',
  subtotal numeric(10, 2),
  fees numeric(10, 2),
  tip numeric(10, 2),
  total numeric(10, 2),
  currency text DEFAULT 'USD',
  status text DEFAULT 'created',
  delivery_address jsonb,
  delivery_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for orders
CREATE INDEX idx_orders_chatgpt_user_id ON orders(chatgpt_user_id);
CREATE INDEX idx_orders_mealme_order_id ON orders(mealme_order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- TABLE: order_items
-- Purpose: Store individual items in each order
-- =====================================================

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  unit_price numeric(10, 2),
  total_price numeric(10, 2),
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

-- =====================================================
-- TABLE: delivery_quotes
-- Purpose: Store delivery quotes for comparison
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  eta_minutes int,
  fee numeric(10, 2),
  is_cheapest boolean DEFAULT false,
  is_fastest boolean DEFAULT false,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for delivery_quotes
CREATE INDEX idx_delivery_quotes_order_id ON delivery_quotes(order_id);
CREATE INDEX idx_delivery_quotes_provider ON delivery_quotes(provider);

-- =====================================================
-- TABLE: mealme_webhook_events
-- Purpose: Audit trail for MealMe webhook events
-- =====================================================

CREATE TABLE IF NOT EXISTS mealme_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  event_type text,
  mealme_order_id text,
  status text,
  raw jsonb NOT NULL,
  received_at timestamptz DEFAULT now()
);

-- Indexes for mealme_webhook_events
CREATE INDEX idx_webhook_events_order_id ON mealme_webhook_events(order_id);
CREATE INDEX idx_webhook_events_mealme_order_id ON mealme_webhook_events(mealme_order_id);
CREATE INDEX idx_webhook_events_received_at ON mealme_webhook_events(received_at DESC);

-- =====================================================
-- VIEW: order_analytics
-- Purpose: Analytics view for order metrics
-- =====================================================

CREATE OR REPLACE VIEW order_analytics AS
SELECT
  DATE(o.created_at) as order_date,
  o.country,
  o.provider,
  o.status,
  COUNT(o.id) as order_count,
  SUM(o.subtotal) as total_subtotal,
  SUM(o.fees) as total_fees,
  SUM(o.tip) as total_tips,
  SUM(o.total) as total_revenue,
  AVG(o.total) as avg_order_value,
  COUNT(DISTINCT o.chatgpt_user_id) as unique_users
FROM orders o
GROUP BY DATE(o.created_at), o.country, o.provider, o.status;

-- =====================================================
-- FUNCTION: update_order_timestamp
-- Purpose: Auto-update updated_at on orders table
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_order_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE orders IS 'MealMe order records with status tracking';
COMMENT ON TABLE order_items IS 'Individual items in each MealMe order';
COMMENT ON TABLE delivery_quotes IS 'Delivery quotes for order comparison';
COMMENT ON TABLE mealme_webhook_events IS 'Audit trail for MealMe webhook events';
COMMENT ON VIEW order_analytics IS 'Analytics view for order metrics and revenue';

