# Commerce & Flywheel Reporting

These SQL queries provide insights into the economic performance of the LooptOS
agent.

## 1. GMV by Provider (Daily)

```sql
SELECT 
    date_trunc('day', timestamp) as day,
    provider,
    SUM(estimated_value_usd) as estimated_gmv,
    SUM(confirmed_value_usd) as confirmed_gmv,
    SUM(commission_usd) as total_commission
FROM public.gmv_events
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

## 2. Conversion Funnel

```sql
WITH funnel AS (
    SELECT 
        request_id,
        MAX(CASE WHEN agent_action = 'QUOTE' THEN 1 ELSE 0 END) as quoted,
        MAX(CASE WHEN agent_action = 'HANDOFF_CHECKOUT' THEN 1 ELSE 0 END) as checkout,
        MAX(CASE WHEN agent_action = 'ORDER_CONFIRMED' THEN 1 ELSE 0 END) as confirmed
    FROM public.loopgpt_events
    GROUP BY 1
)
SELECT 
    COUNT(*) as total_requests,
    SUM(quoted) as quotes_generated,
    SUM(checkout) as checkouts_initiated,
    SUM(confirmed) as orders_confirmed,
    (SUM(checkout)::float / NULLIF(SUM(quoted), 0)) * 100 as quote_to_checkout_rate
FROM funnel;
```

## 3. Provider ROI (Latency vs Success vs Commission)

```sql
SELECT 
    provider,
    AVG(latency_ms) as avg_latency,
    (COUNT(CASE WHEN success THEN 1 END)::float / COUNT(*)) * 100 as success_rate,
    AVG(commission_usd) as avg_commission_per_call
FROM public.provider_outcomes
GROUP BY 1
ORDER BY 4 DESC;
```
