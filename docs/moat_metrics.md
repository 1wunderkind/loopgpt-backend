# Moat Metrics & Provider Intelligence

These metrics quantify LoopGPT's economic leverage and competitive advantage.

## 1. Provider Intelligence Dossier
Internal record for negotiating with providers.

```sql
-- Provider Performance Summary
SELECT 
    provider,
    COUNT(*) as total_attempts,
    AVG(latency_ms) as avg_latency,
    (COUNT(CASE WHEN success THEN 1 END)::float / COUNT(*)) as success_rate,
    SUM(gmv_usd) as total_gmv,
    AVG(gmv_usd) as avg_basket_size,
    SUM(commission_usd) as total_commission
FROM public.provider_outcomes
WHERE timestamp > now() - interval '30 days'
GROUP BY 1;
```

## 2. Moat Metrics (Investor Grade)

### A. GMV per Agent Decision
Measures the economic density of our intelligence.
```sql
SELECT 
    SUM(gmv_usd) / COUNT(DISTINCT request_id) as gmv_per_decision
FROM public.loopgpt_events
WHERE agent_action IN ('QUOTE', 'ROUTE_PROVIDER');
```

### B. Learning Lift
Measures improvement in routing outcomes over time.
```sql
WITH monthly_stats AS (
    SELECT 
        date_trunc('month', timestamp) as month,
        AVG(latency_ms) as avg_latency,
        (COUNT(CASE WHEN success THEN 1 END)::float / COUNT(*)) as success_rate
    FROM public.provider_outcomes
    GROUP BY 1
)
SELECT * FROM monthly_stats ORDER BY 1;
```

### C. Provider Concentration Risk
Ensures we aren't dependent on a single provider.
```sql
SELECT 
    provider,
    SUM(gmv_usd) / (SELECT SUM(gmv_usd) FROM public.gmv_events) as gmv_share
FROM public.gmv_events
GROUP BY 1;
```
