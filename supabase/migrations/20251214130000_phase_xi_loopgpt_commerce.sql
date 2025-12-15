-- Phase XI: LoopGPT Commerce & Flywheel

-- 1. GMV Events Table (The Money)
CREATE TABLE IF NOT EXISTS public.gmv_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    order_id TEXT,
    estimated_value_usd NUMERIC(10, 2),
    confirmed_value_usd NUMERIC(10, 2),
    affiliate_network TEXT,
    commission_rate NUMERIC(5, 4),
    commission_usd NUMERIC(10, 2),
    status TEXT NOT NULL CHECK (status IN ('ESTIMATED', 'CONFIRMED', 'FAILED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmv_tenant_timestamp ON public.gmv_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gmv_provider_timestamp ON public.gmv_events(provider, timestamp DESC);

-- 2. Provider Outcomes Table (The Performance)
CREATE TABLE IF NOT EXISTS public.provider_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL,
    gmv_usd NUMERIC(10, 2),
    commission_usd NUMERIC(10, 2),
    error_category TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_outcomes_provider ON public.provider_outcomes(provider, timestamp DESC);

-- 3. LoopGPT Flywheel Events (The Brain)
CREATE TABLE IF NOT EXISTS public.loopgpt_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_version TEXT NOT NULL DEFAULT '1.0',
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    agent_action TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    provider TEXT,
    input_hash TEXT,
    output_hash TEXT,
    success BOOLEAN NOT NULL,
    error_category TEXT,
    gmv_usd NUMERIC(10, 2),
    commission_usd NUMERIC(10, 2),
    latency_ms INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loopgpt_tenant_action ON public.loopgpt_events(tenant_id, agent_action, timestamp DESC);

-- 4. RLS Policies
ALTER TABLE public.gmv_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loopgpt_events ENABLE ROW LEVEL SECURITY;

-- Service Role has full access
CREATE POLICY "Service role manages commerce" ON public.gmv_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages outcomes" ON public.provider_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages flywheel" ON public.loopgpt_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own GMV/Flywheel events (for transparency/history)
CREATE POLICY "Users view own GMV" ON public.gmv_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
CREATE POLICY "Users view own flywheel" ON public.loopgpt_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
