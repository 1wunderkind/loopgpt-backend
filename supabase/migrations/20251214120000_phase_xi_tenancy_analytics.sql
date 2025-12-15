-- Phase XI: Tenancy & Analytics

-- 1. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Redundant if tenant=user, but good for future proofing
    tool_name TEXT NOT NULL,
    action TEXT NOT NULL,
    provider TEXT,
    duration_ms INTEGER,
    error_category TEXT,
    cost_usd NUMERIC(10, 6),
    outcome TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    schema_version INTEGER DEFAULT 1
);

-- 2. Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_tenant_timestamp ON public.analytics_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_tool_timestamp ON public.analytics_events(tool_name, timestamp DESC);

-- 3. RLS for Analytics (Service Role Write Only, User Read Own?)
-- Generally analytics are write-only for the app, read-only for admin.
-- But users might want to see their usage.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert analytics" ON public.analytics_events
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Users can view own analytics" ON public.analytics_events
    FOR SELECT TO authenticated USING (auth.uid() = tenant_id);

-- 4. User Plans Table (Simple billing foundation)
CREATE TABLE IF NOT EXISTS public.user_plans (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    plan_id TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan" ON public.user_plans
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages plans" ON public.user_plans
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Usage Quotas Table (Daily counters)
CREATE TABLE IF NOT EXISTS public.usage_quotas (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    provider_calls INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, date)
);

ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_quotas
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages usage" ON public.usage_quotas
    FOR ALL TO service_role USING (true) WITH CHECK (true);
