# LoopGPT Commerce Layer - Deployment Guide

Complete guide for deploying the production-grade multi-provider commerce routing system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Steps](#deployment-steps)
4. [Provider Setup](#provider-setup)
5. [Testing Deployment](#testing-deployment)
6. [Rollback Procedure](#rollback-procedure)
7. [Monitoring](#monitoring)

---

## Prerequisites

### Required Services
- ✅ Supabase project (production)
- ✅ Deno runtime (v1.37+)
- ✅ GitHub repository access
- ✅ API credentials for providers

### Required Access
- ✅ Supabase project admin
- ✅ Environment variable management
- ✅ Function deployment permissions

---

## Environment Configuration

### 1. Core Configuration

```bash
# Environment
LOOPGPT_ENV=production

# Provider Enablement
LOOPGPT_ENABLE_KROGER=true
LOOPGPT_ENABLE_WALMART=true
```

### 2. Provider API Credentials

#### Kroger API
```bash
KROGER_CLIENT_ID=your-production-client-id
KROGER_CLIENT_SECRET=your-production-secret
KROGER_ENV=production
```

**How to obtain:**
1. Register at [developer.kroger.com](https://developer.kroger.com)
2. Create production application
3. Request production API access
4. Copy credentials to environment

#### Walmart API
```bash
WALMART_API_KEY=your-production-api-key
WALMART_PARTNER_ID=your-partner-id
WALMART_ENV=production
```

**How to obtain:**
1. Register at [developer.walmart.com](https://developer.walmart.com)
2. Apply for Affiliate Program
3. Request API access
4. Copy credentials to environment

#### MealMe (Optional - if using real API)
```bash
MEALME_API_KEY=your-mealme-key
```

#### Instacart (Optional - if using real API)
```bash
INSTACART_API_KEY=your-instacart-key
```

### 3. Scoring Configuration

```bash
# Scoring weights (tune for your business goals)
LOOPGPT_SCORE_PRIORITY_WEIGHT=1.0
LOOPGPT_SCORE_PRICE_WEIGHT=0.30
LOOPGPT_SCORE_SPEED_WEIGHT=0.15
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.20
LOOPGPT_SCORE_AVAILABILITY_WEIGHT=0.25
LOOPGPT_SCORE_RELIABILITY_WEIGHT=0.10
```

**Optimization Strategies:**

**Price-First** (maximize user savings):
```bash
LOOPGPT_SCORE_PRICE_WEIGHT=0.50
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.10
```

**Revenue-First** (maximize commission):
```bash
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.40
LOOPGPT_SCORE_PRICE_WEIGHT=0.20
```

**Speed-First** (fastest delivery):
```bash
LOOPGPT_SCORE_SPEED_WEIGHT=0.40
LOOPGPT_SCORE_PRICE_WEIGHT=0.20
```

### 4. Provider Priority Boosts

```bash
# Prefer direct APIs over aggregators
LOOPGPT_PREFER_DIRECT_KROGER=true
LOOPGPT_PREFER_DIRECT_WALMART=true
```

### 5. Timeout Configuration

```bash
# Per-provider timeouts (milliseconds)
LOOPGPT_KROGER_TIMEOUT=10000
LOOPGPT_WALMART_TIMEOUT=10000
LOOPGPT_MEALME_TIMEOUT=8000
LOOPGPT_INSTACART_TIMEOUT=8000
```

### 6. Mock Mode (Development/Staging Only)

```bash
# NEVER set these in production!
LOOPGPT_KROGER_MOCK=false
LOOPGPT_WALMART_MOCK=false
```

---

## Deployment Steps

### Step 1: Prepare Codebase

```bash
# Clone repository
git clone https://github.com/your-org/loopgpt-backend.git
cd loopgpt-backend

# Checkout production branch
git checkout main

# Verify latest commit
git log -1
```

### Step 2: Set Environment Variables

**Via Supabase Dashboard:**
1. Navigate to Project Settings → Edge Functions
2. Add environment variables from sections above
3. Save configuration

**Via Supabase CLI:**
```bash
# Set all variables at once
supabase secrets set \
  LOOPGPT_ENV=production \
  LOOPGPT_ENABLE_KROGER=true \
  LOOPGPT_ENABLE_WALMART=true \
  KROGER_CLIENT_ID=xxx \
  KROGER_CLIENT_SECRET=xxx \
  WALMART_API_KEY=xxx \
  WALMART_PARTNER_ID=xxx
```

### Step 3: Deploy Functions

```bash
# Deploy loopgpt_route_order function
supabase functions deploy loopgpt_route_order

# Verify deployment
supabase functions list
```

### Step 4: Verify Deployment

```bash
# Test function invocation
supabase functions invoke loopgpt_route_order \
  --data '{
    "items": [
      {"id": "item-1", "name": "Chicken Breast", "quantity": 2, "unit": "lbs"}
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94102",
      "country": "US"
    }
  }'
```

**Expected Response:**
```json
{
  "selectedProvider": {
    "id": "WALMART_API",
    "name": "Walmart Direct",
    "priority": 60
  },
  "quote": {
    "totalCents": 4599,
    "currency": "USD"
  },
  "confirmationToken": "...",
  "requestId": "req_..."
}
```

### Step 5: Enable Function

```bash
# Enable public access (if needed)
supabase functions update loopgpt_route_order --no-verify-jwt
```

---

## Provider Setup

### Kroger API Setup

**1. Authentication Test**
```bash
# Test OAuth2 flow
curl -X POST https://api.kroger.com/v1/connect/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$KROGER_CLIENT_ID" \
  -d "client_secret=$KROGER_CLIENT_SECRET"
```

**2. Store Locator Test**
```bash
# Find stores by ZIP
curl -X GET "https://api.kroger.com/v1/locations?filter.zipCode.near=94102" \
  -H "Authorization: Bearer $KROGER_TOKEN"
```

**3. Product Search Test**
```bash
# Search for products
curl -X GET "https://api.kroger.com/v1/products?filter.term=chicken&filter.locationId=01400943" \
  -H "Authorization: Bearer $KROGER_TOKEN"
```

### Walmart API Setup

**1. Authentication Test**
```bash
# Test API key
curl -X GET "https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?query=chicken" \
  -H "WM_SEC.KEY_VERSION: 1" \
  -H "WM_CONSUMER.ID: $WALMART_PARTNER_ID" \
  -H "WM_SEC.AUTH_SIGNATURE: $WALMART_API_KEY"
```

**2. Product Search Test**
```bash
# Search products
curl -X GET "https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?query=chicken&numItems=5" \
  -H "WM_SEC.KEY_VERSION: 1" \
  -H "WM_CONSUMER.ID: $WALMART_PARTNER_ID" \
  -H "WM_SEC.AUTH_SIGNATURE: $WALMART_API_KEY"
```

---

## Testing Deployment

### 1. Health Check

```bash
# Check all providers
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{"action": "health_check"}'
```

**Expected Response:**
```json
{
  "providers": {
    "MEALME": { "healthy": true },
    "INSTACART": { "healthy": true },
    "KROGER_API": { "healthy": true },
    "WALMART_API": { "healthy": true }
  }
}
```

### 2. Smoke Test

```bash
# Test with minimal cart
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"id": "1", "name": "Milk", "quantity": 1, "unit": "gallon"}],
    "shippingAddress": {
      "street": "123 Test St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94102",
      "country": "US"
    }
  }'
```

### 3. Load Test

```bash
# Run load test with k6
k6 run loadtest.js
```

**loadtest.js:**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const payload = JSON.stringify({
    items: [
      { id: '1', name: 'Chicken', quantity: 2, unit: 'lbs' },
      { id: '2', name: 'Rice', quantity: 1, unit: 'bag' },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
    },
  });

  const res = http.post(
    'https://your-project.supabase.co/functions/v1/loopgpt_route_order',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has selectedProvider': (r) => JSON.parse(r.body).selectedProvider !== undefined,
  });
}
```

---

## Rollback Procedure

### Quick Rollback

```bash
# Rollback to previous deployment
supabase functions deploy loopgpt_route_order --version previous
```

### Emergency Fallback to Mock Mode

```bash
# Temporarily disable real APIs
supabase secrets set \
  LOOPGPT_KROGER_MOCK=true \
  LOOPGPT_WALMART_MOCK=true

# Redeploy
supabase functions deploy loopgpt_route_order
```

### Disable Specific Provider

```bash
# Disable Kroger
supabase secrets set LOOPGPT_ENABLE_KROGER=false

# Redeploy
supabase functions deploy loopgpt_route_order
```

---

## Monitoring

### Key Metrics

**1. Provider Success Rate**
```sql
-- Query Supabase logs
SELECT
  provider_id,
  COUNT(*) FILTER (WHERE event = 'provider_quote_success') as success_count,
  COUNT(*) FILTER (WHERE event = 'provider_quote_error') as error_count,
  AVG(latency_ms) FILTER (WHERE event = 'provider_quote_success') as avg_latency_ms
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY provider_id;
```

**2. Provider Selection Distribution**
```sql
-- Which providers are being selected?
SELECT
  selected_provider_id,
  COUNT(*) as selection_count,
  AVG(total_cents) as avg_total_cents
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND event = 'router_decision'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY selected_provider_id
ORDER BY selection_count DESC;
```

**3. Latency P95**
```sql
-- 95th percentile latency
SELECT
  provider_id,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms
FROM edge_logs
WHERE function_name = 'loopgpt_route_order'
  AND event = 'provider_quote_success'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY provider_id;
```

### Alerts

**Set up alerts for:**
- ✅ Provider error rate > 10%
- ✅ Average latency > 5 seconds
- ✅ No successful quotes in 5 minutes
- ✅ API credential expiration

### Dashboards

**Create dashboards for:**
- Provider selection distribution (pie chart)
- Provider latency over time (line chart)
- Error rate by provider (bar chart)
- Total requests per hour (line chart)

---

## Troubleshooting

### Issue: No Providers Return Quotes

**Symptoms:**
```json
{
  "error": "No providers returned valid quotes"
}
```

**Diagnosis:**
1. Check provider enablement: `LOOPGPT_ENABLE_*`
2. Check API credentials
3. Check provider health checks
4. Review logs for errors

**Solution:**
```bash
# Enable mock mode temporarily
supabase secrets set \
  LOOPGPT_KROGER_MOCK=true \
  LOOPGPT_WALMART_MOCK=true
```

### Issue: Kroger API Timeout

**Symptoms:**
```json
{
  "event": "provider_quote_error",
  "providerId": "KROGER_API",
  "error": "Provider KROGER_API timed out after 10000ms"
}
```

**Solution:**
```bash
# Increase timeout
supabase secrets set LOOPGPT_KROGER_TIMEOUT=15000
```

### Issue: Walmart API 401 Unauthorized

**Symptoms:**
```json
{
  "event": "provider_quote_error",
  "providerId": "WALMART_API",
  "error": "Unauthorized"
}
```

**Solution:**
1. Verify API key is correct
2. Check API key hasn't expired
3. Verify partner ID matches
4. Test credentials manually (see Provider Setup)

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Provider credentials validated
- [ ] Health check passes
- [ ] Smoke test passes
- [ ] Load test passes
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation updated
- [ ] Rollback plan tested

---

## Support

**For deployment issues:**
- Slack: #loopgpt-commerce
- Email: devops@loopgpt.com
- On-call: PagerDuty

**For provider API issues:**
- Kroger: developer.kroger.com/support
- Walmart: developer.walmart.com/support
