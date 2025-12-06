# LoopGPT Commerce Layer - Operations Runbook

Complete guide for operating, monitoring, and troubleshooting the production commerce routing system.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Common Issues](#common-issues)
5. [Emergency Procedures](#emergency-procedures)
6. [Maintenance Tasks](#maintenance-tasks)
7. [Performance Tuning](#performance-tuning)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LoopGPT Frontend                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                          │
│           loopgpt_route_order/index.ts                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Provider Registry                           │
│              (4 providers in parallel)                       │
└─────┬───────────┬──────────┬──────────┬─────────────────────┘
      │           │          │          │
      ▼           ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ MealMe  │ │Instacart│ │ Kroger  │ │ Walmart │
│   API   │ │   API   │ │   API   │ │   API   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| Router | Main routing logic | `loopgpt_route_order/index.ts` |
| Provider Registry | Provider management | `_shared/commerce/providers/providerRegistry.ts` |
| Provider Scorer | Quote ranking | `_shared/commerce/ProviderScorer.ts` |
| Kroger Provider | Kroger API integration | `_shared/commerce/providers/krogerProvider.ts` |
| Walmart Provider | Walmart API integration | `_shared/commerce/providers/walmartProvider.ts` |

---

## Daily Operations

### Morning Checklist

**1. Check System Health** (5 min)
```bash
# Run health check
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{"action": "health_check"}'
```

**Expected:** All providers return `healthy: true`

**2. Review Overnight Metrics** (10 min)
```sql
-- Check overnight request volume
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as requests,
  AVG(total_latency_ms) as avg_latency_ms
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**3. Check Error Rate** (5 min)
```sql
-- Check error rate by provider
SELECT
  provider_id,
  COUNT(*) FILTER (WHERE event = 'provider_quote_error') * 100.0 / COUNT(*) as error_rate_pct
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY provider_id;
```

**Expected:** Error rate < 5% for all providers

**4. Review Alerts** (5 min)
- Check PagerDuty for overnight alerts
- Review Slack #loopgpt-commerce channel
- Check email for automated alerts

---

### Weekly Checklist

**1. Provider Performance Review** (30 min)
```sql
-- Weekly provider stats
SELECT
  provider_id,
  COUNT(*) FILTER (WHERE event = 'provider_quote_success') as success_count,
  COUNT(*) FILTER (WHERE event = 'provider_quote_error') as error_count,
  AVG(latency_ms) FILTER (WHERE event = 'provider_quote_success') as avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY provider_id;
```

**2. Cost Analysis** (15 min)
```sql
-- Weekly API call costs
SELECT
  provider_id,
  COUNT(*) as api_calls,
  COUNT(*) * 0.001 as estimated_cost_usd  -- Adjust per provider pricing
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND event = 'provider_quote_success'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY provider_id;
```

**3. Provider Selection Distribution** (10 min)
```sql
-- Which providers are winning?
SELECT
  selected_provider_id,
  COUNT(*) as selection_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as selection_pct,
  AVG(total_cents) as avg_total_cents
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND event = 'router_decision'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY selected_provider_id
ORDER BY selection_count DESC;
```

**4. Update Documentation** (15 min)
- Update runbook with new issues/solutions
- Document any configuration changes
- Update team on Slack

---

## Monitoring & Alerts

### Key Metrics

**1. Request Volume**
- **Metric:** `loopgpt.router.requests_total`
- **Alert:** < 10 requests/hour (off-peak) or < 100 requests/hour (peak)
- **Action:** Check if frontend is down

**2. Provider Success Rate**
- **Metric:** `loopgpt.provider.success_rate`
- **Alert:** < 90% for any provider
- **Action:** Investigate provider errors

**3. Latency P95**
- **Metric:** `loopgpt.router.latency_p95_ms`
- **Alert:** > 5000ms
- **Action:** Check provider timeouts

**4. Error Rate**
- **Metric:** `loopgpt.router.error_rate`
- **Alert:** > 5%
- **Action:** Review error logs

**5. Provider Selection Distribution**
- **Metric:** `loopgpt.provider.selection_pct`
- **Alert:** One provider > 80% (possible misconfiguration)
- **Action:** Review scoring weights

### Alert Configuration

**PagerDuty Alerts:**

```yaml
# High Priority (Page On-Call)
- name: No Providers Available
  condition: error_rate > 50% for 5 minutes
  severity: critical
  
- name: Provider API Down
  condition: provider_success_rate < 50% for 10 minutes
  severity: critical

# Medium Priority (Slack Only)
- name: High Latency
  condition: p95_latency_ms > 5000 for 15 minutes
  severity: warning
  
- name: Provider Error Rate
  condition: provider_error_rate > 10% for 15 minutes
  severity: warning

# Low Priority (Email)
- name: Provider Selection Skew
  condition: single_provider_pct > 80% for 1 hour
  severity: info
```

### Dashboards

**1. Real-Time Dashboard**
- Request volume (last hour)
- Provider success rate (last hour)
- Latency P50/P95 (last hour)
- Error rate (last hour)

**2. Provider Performance Dashboard**
- Provider selection distribution (pie chart)
- Provider latency comparison (bar chart)
- Provider error rate over time (line chart)
- Provider cost analysis (table)

**3. Business Metrics Dashboard**
- Total orders routed (last 24h/7d/30d)
- Average cart value (last 24h/7d/30d)
- Commission earned (last 24h/7d/30d)
- User savings vs. alternatives (last 24h/7d/30d)

---

## Common Issues

### Issue 1: Provider Timeout

**Symptoms:**
```json
{
  "event": "provider_quote_error",
  "providerId": "KROGER_API",
  "error": "Provider KROGER_API timed out after 10000ms"
}
```

**Diagnosis:**
1. Check provider API status page
2. Check network connectivity
3. Check if timeout is too aggressive

**Solution:**
```bash
# Temporary: Increase timeout
supabase secrets set LOOPGPT_KROGER_TIMEOUT=15000

# Permanent: Investigate provider API performance
# Contact provider support if issue persists
```

**Prevention:**
- Set reasonable timeouts (10-15s)
- Monitor provider API status
- Have fallback providers enabled

---

### Issue 2: All Providers Failing

**Symptoms:**
```json
{
  "error": {
    "code": "NO_PROVIDERS_AVAILABLE",
    "message": "No providers returned valid quotes"
  }
}
```

**Diagnosis:**
1. Check if all provider APIs are down
2. Check if credentials expired
3. Check if network issue

**Solution:**
```bash
# Emergency: Enable mock mode
supabase secrets set \
  LOOPGPT_KROGER_MOCK=true \
  LOOPGPT_WALMART_MOCK=true

# Redeploy
supabase functions deploy loopgpt_route_order

# Investigate root cause
# Re-enable real APIs when fixed
```

**Prevention:**
- Monitor provider API status
- Rotate credentials before expiry
- Have mock mode as fallback

---

### Issue 3: Incorrect Provider Selected

**Symptoms:**
- User reports expensive provider selected
- Metrics show unexpected provider distribution

**Diagnosis:**
1. Check scoring weights
2. Check provider priority boosts
3. Check provider configs

**Solution:**
```bash
# Adjust scoring weights
supabase secrets set \
  LOOPGPT_SCORE_PRICE_WEIGHT=0.40 \
  LOOPGPT_SCORE_COMMISSION_WEIGHT=0.15

# Remove priority boosts if needed
supabase secrets unset LOOPGPT_PREFER_DIRECT_KROGER

# Redeploy
supabase functions deploy loopgpt_route_order
```

**Prevention:**
- Test scoring changes in staging first
- Monitor provider selection distribution
- Document scoring strategy

---

### Issue 4: High Latency

**Symptoms:**
- P95 latency > 5 seconds
- User complaints about slow loading

**Diagnosis:**
1. Check which provider is slowest
2. Check if parallel querying is working
3. Check if network issue

**Solution:**
```bash
# Check provider latencies
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{"action": "health_check"}'

# Disable slow provider temporarily
supabase secrets set LOOPGPT_ENABLE_KROGER=false

# Or increase timeout
supabase secrets set LOOPGPT_KROGER_TIMEOUT=15000
```

**Prevention:**
- Set aggressive timeouts
- Monitor provider latency
- Have fast fallback providers

---

### Issue 5: API Credentials Expired

**Symptoms:**
```json
{
  "event": "provider_quote_error",
  "providerId": "WALMART_API",
  "error": "Unauthorized"
}
```

**Diagnosis:**
1. Check credential expiry date
2. Test credentials manually
3. Check if API key revoked

**Solution:**
```bash
# Get new credentials from provider
# Update in Supabase
supabase secrets set \
  WALMART_API_KEY=new-api-key \
  WALMART_PARTNER_ID=new-partner-id

# Redeploy
supabase functions deploy loopgpt_route_order
```

**Prevention:**
- Set calendar reminders for credential expiry
- Monitor for 401/403 errors
- Have backup credentials ready

---

## Emergency Procedures

### Emergency 1: Complete System Outage

**Symptoms:**
- All requests failing
- No providers returning quotes

**Immediate Actions (5 min):**
```bash
# 1. Enable mock mode for all providers
supabase secrets set \
  LOOPGPT_KROGER_MOCK=true \
  LOOPGPT_WALMART_MOCK=true \
  LOOPGPT_MEALME_MOCK=true \
  LOOPGPT_INSTACART_MOCK=true

# 2. Redeploy
supabase functions deploy loopgpt_route_order

# 3. Verify
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "1", "name": "Test", "quantity": 1, "unit": "pcs"}], "shippingAddress": {"street": "123 Test", "city": "SF", "state": "CA", "postalCode": "94102", "country": "US"}}'
```

**Follow-Up (30 min):**
1. Investigate root cause
2. Fix underlying issue
3. Re-enable real APIs one by one
4. Monitor for stability

---

### Emergency 2: Provider API Compromised

**Symptoms:**
- Unusual provider behavior
- Security alerts from provider
- Unauthorized charges

**Immediate Actions (2 min):**
```bash
# 1. Disable compromised provider
supabase secrets set LOOPGPT_ENABLE_KROGER=false

# 2. Redeploy
supabase functions deploy loopgpt_route_order

# 3. Rotate credentials
supabase secrets set \
  KROGER_CLIENT_ID=new-id \
  KROGER_CLIENT_SECRET=new-secret
```

**Follow-Up (1 hour):**
1. Contact provider security team
2. Review access logs
3. Audit all API calls
4. Update security procedures

---

### Emergency 3: High Error Rate

**Symptoms:**
- Error rate > 20%
- Multiple providers failing

**Immediate Actions (5 min):**
```bash
# 1. Check provider health
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{"action": "health_check"}'

# 2. Review recent logs
supabase functions logs loopgpt_route_order --limit 100

# 3. Disable failing providers
supabase secrets set LOOPGPT_ENABLE_KROGER=false

# 4. Redeploy
supabase functions deploy loopgpt_route_order
```

**Follow-Up (30 min):**
1. Identify root cause
2. Fix or escalate to provider
3. Re-enable when stable
4. Post-mortem analysis

---

## Maintenance Tasks

### Monthly Tasks

**1. Credential Rotation** (30 min)
```bash
# Rotate all provider credentials
# Kroger
supabase secrets set \
  KROGER_CLIENT_ID=new-id \
  KROGER_CLIENT_SECRET=new-secret

# Walmart
supabase secrets set \
  WALMART_API_KEY=new-key \
  WALMART_PARTNER_ID=new-id

# Redeploy
supabase functions deploy loopgpt_route_order
```

**2. Performance Review** (1 hour)
- Review monthly metrics
- Analyze provider performance
- Adjust scoring weights if needed
- Update cost projections

**3. Dependency Updates** (30 min)
```bash
# Update Deno dependencies
cd supabase/functions/loopgpt_route_order
deno cache --reload index.ts

# Test
deno test

# Deploy
supabase functions deploy loopgpt_route_order
```

**4. Documentation Update** (30 min)
- Update runbook with new issues
- Update API documentation
- Update deployment guide
- Share updates with team

---

### Quarterly Tasks

**1. Provider Contract Review** (2 hours)
- Review provider agreements
- Negotiate better rates
- Evaluate new providers
- Sunset underperforming providers

**2. Architecture Review** (2 hours)
- Review system architecture
- Identify bottlenecks
- Plan improvements
- Update roadmap

**3. Disaster Recovery Test** (2 hours)
- Test rollback procedures
- Test emergency procedures
- Update runbook
- Train team

**4. Security Audit** (2 hours)
- Review access logs
- Rotate all credentials
- Update security policies
- Penetration testing

---

## Performance Tuning

### Optimize Scoring Weights

**Goal:** Maximize user satisfaction + revenue

**Current Baseline:**
```bash
LOOPGPT_SCORE_PRICE_WEIGHT=0.30
LOOPGPT_SCORE_SPEED_WEIGHT=0.15
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.20
```

**Tuning Process:**
1. Run A/B test with different weights
2. Measure user satisfaction (surveys)
3. Measure revenue (commission earned)
4. Find optimal balance

**Example Optimization:**
```bash
# Test 1: Price-first (user satisfaction)
LOOPGPT_SCORE_PRICE_WEIGHT=0.50
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.10

# Test 2: Revenue-first (commission)
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.40
LOOPGPT_SCORE_PRICE_WEIGHT=0.20

# Test 3: Speed-first (convenience)
LOOPGPT_SCORE_SPEED_WEIGHT=0.40
LOOPGPT_SCORE_PRICE_WEIGHT=0.20
```

---

### Optimize Provider Timeouts

**Goal:** Minimize latency while maximizing success rate

**Current Baseline:**
```bash
LOOPGPT_KROGER_TIMEOUT=10000
LOOPGPT_WALMART_TIMEOUT=10000
```

**Tuning Process:**
1. Measure P95 provider latency
2. Set timeout = P95 + 2 seconds
3. Monitor success rate
4. Adjust if success rate drops

**Example:**
```bash
# Kroger P95 = 3.5s → timeout = 5.5s
LOOPGPT_KROGER_TIMEOUT=5500

# Walmart P95 = 2.8s → timeout = 4.8s
LOOPGPT_WALMART_TIMEOUT=4800
```

---

### Optimize Caching

**Goal:** Reduce API calls while maintaining freshness

**Strategy:**
1. Cache provider quotes for 5 minutes
2. Cache store locations for 24 hours
3. Cache product SKUs for 1 hour

**Implementation:**
```typescript
// Cache provider quotes
const cacheKey = `quote:${providerId}:${cartHash}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const quote = await provider.getQuote(request, config);
await redis.set(cacheKey, JSON.stringify(quote), { ex: 300 });
return quote;
```

---

## Contact Information

**On-Call Rotation:**
- Week 1: Alice (alice@loopgpt.com)
- Week 2: Bob (bob@loopgpt.com)
- Week 3: Charlie (charlie@loopgpt.com)

**Escalation:**
- L1: On-call engineer
- L2: Engineering manager
- L3: CTO

**External Contacts:**
- Kroger API Support: kroger-api@kroger.com
- Walmart API Support: walmart-api@walmart.com
- Supabase Support: support@supabase.com

**Communication Channels:**
- Slack: #loopgpt-commerce
- PagerDuty: loopgpt-commerce
- Email: devops@loopgpt.com
