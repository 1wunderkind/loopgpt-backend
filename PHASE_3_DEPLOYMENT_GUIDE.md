# Phase 3 Deployment Guide

**LoopGPT Commerce Router - Provider Comparison Scoring Algorithm**

This guide walks you through deploying Phase 3 to production.

---

## Prerequisites

- [ ] Supabase project access
- [ ] Supabase CLI installed (`supabase`)
- [ ] Database access credentials
- [ ] Edge function deployment permissions

---

## Step 1: Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz/sql
2. Click **"New Query"**
3. Copy the contents of `supabase/migrations/20241202_phase3_scoring_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. Verify success message: "Phase 3 schema migration complete!"

### Option B: Via Supabase CLI

```bash
cd /home/ubuntu/loopgpt-backend
supabase db push
```

### Verification

Run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'score_calculations',
  'order_outcomes',
  'weight_adjustments',
  'provider_metrics'
);
```

Expected result: 4 rows

---

## Step 2: Deploy Edge Functions

### Deploy All Functions

```bash
cd /home/ubuntu/loopgpt-backend

# Deploy route order function
supabase functions deploy loopgpt_route_order

# Deploy confirm order function
supabase functions deploy loopgpt_confirm_order

# Deploy cancel order function
supabase functions deploy loopgpt_cancel_order

# Deploy record outcome function
supabase functions deploy loopgpt_record_outcome
```

### Verify Deployment

```bash
supabase functions list
```

Expected output should include:
- `loopgpt_route_order`
- `loopgpt_confirm_order`
- `loopgpt_cancel_order`
- `loopgpt_record_outcome`

---

## Step 3: Update MCP Manifest

The MCP manifest has already been updated with the 3 new tools:
1. `loopgpt_route_order`
2. `loopgpt_confirm_order`
3. `loopgpt_cancel_order`

### Verify Manifest

```bash
cd /home/ubuntu/loopgpt-backend
cat supabase/functions/mcp-server/manifest.json | grep -A 5 "loopgpt_route_order"
```

### Redeploy MCP Server

```bash
supabase functions deploy mcp-server
```

---

## Step 4: Test Deployment

### Test 1: Route Order

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/loopgpt_route_order \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "items": [
      { "name": "Pizza", "quantity": 2 },
      { "name": "Salad", "quantity": 1 }
    ],
    "location": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    },
    "preferences": {
      "optimizeFor": "balanced"
    }
  }'
```

Expected response:
- `success: true`
- `provider` name
- `scoreBreakdown` with explanation
- `alternatives` array
- `confirmationToken`

### Test 2: Confirm Order

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/loopgpt_confirm_order \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_token": "CONFIRMATION_TOKEN_FROM_ROUTE_ORDER",
    "user_id": "test_user_001",
    "payment_method": {
      "type": "card",
      "token": "test_card_123"
    }
  }'
```

Expected response:
- `success: true`
- `order_ids` array
- `message` confirmation

### Test 3: Cancel Order

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/loopgpt_cancel_order \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_token": "CONFIRMATION_TOKEN_FROM_ROUTE_ORDER",
    "user_id": "test_user_001"
  }'
```

Expected response:
- `success: true`
- `message` confirmation

### Test 4: Record Outcome

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/loopgpt_record_outcome \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "providerId": "mealme",
    "wasSuccessful": true,
    "actualDeliveryTime": 42,
    "itemsDelivered": 3,
    "itemsOrdered": 3,
    "userRating": 5,
    "issues": []
  }'
```

Expected response:
- `success: true`
- `message` confirmation

---

## Step 5: Verify Database

### Check Score Calculations

```sql
SELECT COUNT(*) FROM score_calculations;
```

Should return 0 initially (no calculations yet).

### Check Provider Metrics

```sql
SELECT * FROM provider_metrics ORDER BY metric_date DESC LIMIT 10;
```

Should return existing metrics or empty if none yet.

### Check Views

```sql
SELECT * FROM provider_performance_summary;
SELECT * FROM provider_metrics_summary;
SELECT * FROM order_outcomes_summary;
```

All should execute without errors.

---

## Step 6: Monitor Performance

### Set Up Monitoring

1. **Supabase Dashboard** → **Database** → **Query Performance**
   - Monitor slow queries
   - Check index usage

2. **Supabase Dashboard** → **Functions** → **Logs**
   - Monitor function execution
   - Check for errors

3. **Create Custom Dashboards**
   - Provider win rates
   - Score distributions
   - Success rates

### Key Metrics to Track

- **Scoring Performance:** < 50ms per route
- **Database Queries:** < 100ms per query
- **Function Execution:** < 500ms total
- **Success Rate:** > 95%
- **Provider Availability:** > 99%

---

## Step 7: Analytics Setup

### Create Dashboard Queries

Save these queries in Supabase Dashboard for quick access:

#### Provider Win Rates (Last 7 Days)
```sql
SELECT 
  provider_id,
  COUNT(*) as total_comparisons,
  SUM(CASE WHEN was_selected THEN 1 ELSE 0 END) as wins,
  ROUND(SUM(CASE WHEN was_selected THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as win_rate
FROM score_calculations
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY provider_id
ORDER BY win_rate DESC;
```

#### Average Scores by Provider
```sql
SELECT 
  provider_id,
  ROUND(AVG(price_score), 2) as avg_price,
  ROUND(AVG(speed_score), 2) as avg_speed,
  ROUND(AVG(availability_score), 2) as avg_availability,
  ROUND(AVG(margin_score), 2) as avg_margin,
  ROUND(AVG(reliability_score), 2) as avg_reliability,
  ROUND(AVG(weighted_total), 2) as avg_total
FROM score_calculations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_id;
```

#### Success Rate by Provider
```sql
SELECT 
  provider_id,
  COUNT(*) as total_orders,
  SUM(CASE WHEN was_successful THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN was_successful THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2) as success_rate
FROM order_outcomes
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_id
ORDER BY success_rate DESC;
```

---

## Step 8: ChatGPT Desktop Integration

### Update MCP Configuration

If using ChatGPT Desktop:

1. Open ChatGPT Desktop → Settings → Model Context Protocol
2. Verify server: `https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server`
3. Restart ChatGPT Desktop
4. Test new tools:
   - `loopgpt_route_order`
   - `loopgpt_confirm_order`
   - `loopgpt_cancel_order`

### Test via ChatGPT

```
I want to order food from a restaurant in San Francisco:
- 2x Margherita Pizza
- 1x Caesar Salad
- 1x Tiramisu

Deliver to: 123 Main St, San Francisco, CA 94102
User ID: test_user_001
```

ChatGPT should:
1. Call `loopgpt_route_order`
2. Show quote with explanation
3. Show alternatives
4. Offer to confirm or cancel

---

## Troubleshooting

### Issue: Database migration fails

**Solution:**
1. Check if tables already exist
2. Drop existing tables if safe
3. Re-run migration

```sql
DROP TABLE IF EXISTS score_calculations CASCADE;
DROP TABLE IF EXISTS order_outcomes CASCADE;
DROP TABLE IF EXISTS weight_adjustments CASCADE;
-- Re-run migration
```

### Issue: Edge function deployment fails

**Solution:**
1. Check Supabase CLI is logged in: `supabase login`
2. Check project is linked: `supabase link`
3. Check function syntax: `deno check supabase/functions/loopgpt_route_order/index.ts`

### Issue: Scoring returns errors

**Solution:**
1. Check database connection
2. Verify provider_metrics table exists
3. Check RLS policies allow service role access

### Issue: Reliability score always 50

**Solution:**
- No historical data yet
- Record some outcomes using `loopgpt_record_outcome`
- Wait for data to accumulate

---

## Rollback Plan

If deployment fails:

### Rollback Database

```sql
DROP TABLE IF EXISTS score_calculations CASCADE;
DROP TABLE IF EXISTS order_outcomes CASCADE;
DROP TABLE IF EXISTS weight_adjustments CASCADE;
DROP VIEW IF EXISTS provider_performance_summary;
DROP VIEW IF EXISTS provider_metrics_summary;
DROP VIEW IF EXISTS order_outcomes_summary;
DROP FUNCTION IF EXISTS update_provider_metrics;
```

### Rollback Edge Functions

```bash
# Remove functions
supabase functions delete loopgpt_route_order
supabase functions delete loopgpt_confirm_order
supabase functions delete loopgpt_cancel_order
supabase functions delete loopgpt_record_outcome
```

### Restore MCP Manifest

Redeploy previous version of MCP server without Phase 3 tools.

---

## Post-Deployment Checklist

- [ ] Database migration successful
- [ ] All 4 edge functions deployed
- [ ] MCP manifest updated
- [ ] All tests passing
- [ ] Monitoring set up
- [ ] Analytics queries saved
- [ ] ChatGPT Desktop integration working
- [ ] Documentation updated
- [ ] Team notified

---

## Support

If you encounter issues:

1. **Check Logs:** Supabase Dashboard → Functions → Logs
2. **Check Database:** Supabase Dashboard → Database → Query
3. **Run Tests:** `deno run tests/run_phase3_tests.ts`
4. **Review Docs:** PHASE_3_COMPLETE.md

---

**Deployment Guide Version:** 1.0  
**Last Updated:** December 2, 2025  
**Status:** Ready for Production
