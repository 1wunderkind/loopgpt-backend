-- Create order_receipts table for External Checkout Handoff (Mode A)

CREATE TABLE IF NOT EXISTS public.order_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT, -- Optional, for authenticated users
    
    -- Provider Details (Single Source of Truth)
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_support_url TEXT,
    checkout_url TEXT NOT NULL,
    
    -- Financials
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC,
    delivery_fee NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    
    -- Cart Content (JSONB)
    cart JSONB NOT NULL, -- Array of items
    cart_hash TEXT NOT NULL, -- For integrity checks
    
    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'handoff_opened', 'unknown', 'completed', 'failed')),
    
    -- Support & Legal
    support_info JSONB NOT NULL, -- { providerSupportText, loopSupportText, loopSupportEmail }
    disclaimer_text TEXT NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_receipts_user_id ON public.order_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_order_receipts_created_at ON public.order_receipts(created_at);

-- RLS Policies
ALTER TABLE public.order_receipts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.order_receipts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to read their own receipts (if user_id is present)
CREATE POLICY "Users can read own receipts" ON public.order_receipts
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);
