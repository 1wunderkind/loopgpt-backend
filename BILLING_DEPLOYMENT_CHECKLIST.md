# Billing System Deployment Checklist

**Status:** ✅ Code Complete - Ready for Deployment  
**Date:** November 1, 2025

---

## 📦 What Was Built

### **Database (3 Tables)**
- ✅ `subscriptions` - User subscription management
- ✅ `entitlements` - Usage credits and limits
- ✅ `analytics_events` - Billing analytics

### **Edge Functions (6 Functions)**
- ✅ `create_checkout_session` - Generate Stripe checkout
- ✅ `stripe_webhook` - Handle subscription lifecycle
- ✅ `create_customer_portal` - Self-service billing
- ✅ `check_entitlement` - Validate premium access
- ✅ `upgrade_to_premium` - MCP tool for ChatGPT
- ✅ `trial_reminder` - Cron job for trial emails

### **Middleware**
- ✅ `check-premium.ts` - Reusable entitlement validation

### **MCP Integration**
- ✅ Updated manifest with 3 new billing tools
- ✅ Total tools: 30 (was 27)

### **Documentation**
- ✅ `STRIPE_SETUP_GUIDE.md` - Complete setup instructions
- ✅ `.env.example` - Updated with Stripe variables
- ✅ This deployment checklist

---

## 🚀 Deployment Steps

### **Step 1: Deploy Database Migration**

**Option A: Via GitHub Actions (Recommended)**

The migration will be automatically deployed when you push to GitHub:

```bash
cd /home/ubuntu/loopgpt-backend
git add .
git commit -m "Add Stripe billing system with 3 tables and 6 Edge Functions"
git push origin main
```

The GitHub Actions workflow will:
1. Run database migrations
2. Deploy all Edge Functions
3. Verify deployment

**Option B: Manual Deployment (If GitHub Actions fails)**

```bash
# Set Supabase access token
export SUPABASE_ACCESS_TOKEN=your_access_token

# Link project
supabase link --project-ref qmagnwxeijctkksqbcqz

# Push database migration
supabase db push

# Deploy Edge Functions
supabase functions deploy create_checkout_session
supabase functions deploy stripe_webhook
supabase functions deploy create_customer_portal
supabase functions deploy check_entitlement
supabase functions deploy upgrade_to_premium
supabase functions deploy trial_reminder
```

**Option C: Direct SQL Execution (Emergency)**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251101180000_create_billing_tables.sql`
3. Paste and run
4. Deploy Edge Functions via Dashboard or CLI

---

### **Step 2: Set Environment Variables**

**In Supabase Dashboard:**

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these variables:

```bash
# Stripe (use test mode first)
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER
STRIPE_PRICE_ID_MONTHLY=price_loop_premium_monthly_v1
STRIPE_PRICE_ID_ANNUAL=price_loop_premium_annual_v1
STRIPE_PRICE_ID_FAMILY=price_loop_family_monthly_v1

# App URL
APP_URL=https://theloopgpt.ai

# Cron secret (optional)
CRON_SECRET=your_random_secret
```

**Note:** Use placeholder values until you set up Stripe (see `STRIPE_SETUP_GUIDE.md`)

---

### **Step 3: Set Up Stripe (When Ready)**

Follow the complete guide in `STRIPE_SETUP_GUIDE.md`:

1. Create Stripe account
2. Create products and prices
3. Get API keys
4. Set up webhook endpoint
5. Update environment variables with real keys
6. Test in test mode
7. Go live when ready

---

### **Step 4: Verify Deployment**

#### **Check Database Tables:**

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'entitlements', 'analytics_events');
```

Expected: 3 rows

#### **Check Edge Functions:**

```bash
# List deployed functions
supabase functions list

# Expected output should include:
# - create_checkout_session
# - stripe_webhook
# - create_customer_portal
# - check_entitlement
# - upgrade_to_premium
# - trial_reminder
```

#### **Test MCP Manifest:**

```bash
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server | jq '.tools | length'
```

Expected: 30 (was 27)

#### **Test Entitlement Check:**

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/check_entitlement \
  -H "Content-Type: application/json" \
  -d '{"chatgpt_user_id": "test_user_001"}'
```

Expected response:
```json
{
  "has_access": false,
  "tier": "free",
  "status": "inactive",
  "upgrade_url": "https://theloopgpt.ai/upgrade",
  "message": "No active subscription..."
}
```

---

## 🧪 Testing Plan

### **Phase 1: Database Testing**

```sql
-- Test subscription creation
INSERT INTO subscriptions (chatgpt_user_id, email, tier, status)
VALUES ('test_user_001', 'test@example.com', 'premium', 'trialing');

-- Test entitlement creation
INSERT INTO entitlements (chatgpt_user_id, credits)
VALUES ('test_user_001', 100);

-- Test helper function
SELECT has_premium_access('test_user_001');
-- Expected: true

-- Test entitlement function
SELECT get_user_entitlement('test_user_001');
-- Expected: JSON with has_access: true

-- Cleanup
DELETE FROM subscriptions WHERE chatgpt_user_id = 'test_user_001';
DELETE FROM entitlements WHERE chatgpt_user_id = 'test_user_001';
```

### **Phase 2: Edge Function Testing**

```bash
# Test check_entitlement (free user)
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/check_entitlement \
  -H "Content-Type: application/json" \
  -d '{"chatgpt_user_id": "new_user_001"}'

# Expected: has_access: false, tier: "free"

# Test upgrade_to_premium (requires Stripe keys)
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/upgrade_to_premium \
  -H "Content-Type: application/json" \
  -d '{
    "chatgpt_user_id": "new_user_001",
    "email": "test@example.com",
    "plan": "monthly"
  }'

# Expected: magic_link_sent: true (if Stripe keys configured)
```

### **Phase 3: Stripe Integration Testing**

**After setting up Stripe (see STRIPE_SETUP_GUIDE.md):**

1. **Test Checkout Flow:**
   - Call `upgrade_to_premium` via ChatGPT
   - Check email for magic link
   - Click link → redirected to billing page
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Verify subscription created in database

2. **Test Webhook Events:**
   ```bash
   # Use Stripe CLI
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.deleted
   
   # Check database for updates
   ```

3. **Test Customer Portal:**
   ```bash
   curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/create_customer_portal \
     -H "Content-Type: application/json" \
     -d '{"chatgpt_user_id": "test_user_001"}'
   
   # Expected: portal_url returned
   ```

---

## 📊 Monitoring

### **Database Queries:**

```sql
-- Count subscriptions by tier
SELECT tier, status, COUNT(*) 
FROM subscriptions 
GROUP BY tier, status;

-- Recent analytics events
SELECT event_type, COUNT(*) 
FROM analytics_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Active trials
SELECT COUNT(*) 
FROM subscriptions 
WHERE status = 'trialing' 
AND trial_end > NOW();
```

### **Edge Function Logs:**

- Supabase Dashboard → Edge Functions → Select function → Logs
- Look for errors, performance issues, webhook failures

### **Stripe Dashboard:**

- Payments → View transactions
- Customers → View customer list
- Webhooks → View delivery logs
- Logs → View API requests

---

## ✅ Deployment Checklist

### **Pre-Deployment:**
- [x] Database migration created
- [x] Edge Functions created
- [x] Middleware created
- [x] MCP manifest updated
- [x] Documentation created
- [x] .env.example updated

### **Deployment:**
- [ ] Push code to GitHub
- [ ] Verify GitHub Actions deployment
- [ ] Check database tables created
- [ ] Verify Edge Functions deployed
- [ ] Set environment variables in Supabase
- [ ] Test MCP manifest (30 tools)

### **Stripe Setup (When Ready):**
- [ ] Create Stripe account
- [ ] Create products and prices
- [ ] Get API keys
- [ ] Set up webhook
- [ ] Update environment variables
- [ ] Test in test mode
- [ ] Enable Stripe Tax
- [ ] Enable Customer Portal

### **Testing:**
- [ ] Test database functions
- [ ] Test check_entitlement
- [ ] Test upgrade_to_premium
- [ ] Test checkout flow (with Stripe)
- [ ] Test webhook events
- [ ] Test customer portal
- [ ] Test trial reminder cron

### **Go Live:**
- [ ] Migrate Stripe to live mode
- [ ] Update environment variables with live keys
- [ ] Test with real payment
- [ ] Monitor for 24 hours
- [ ] Announce launch! 🎉

---

## 🆘 Rollback Plan

If something goes wrong:

### **Rollback Database:**

```sql
-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS has_premium_access(text);
DROP FUNCTION IF EXISTS get_user_entitlement(text);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### **Rollback Edge Functions:**

```bash
# Delete functions
supabase functions delete create_checkout_session
supabase functions delete stripe_webhook
supabase functions delete create_customer_portal
supabase functions delete check_entitlement
supabase functions delete upgrade_to_premium
supabase functions delete trial_reminder
```

### **Rollback MCP Manifest:**

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

---

## 📞 Support

If you encounter issues:

1. **Check logs:** Supabase Dashboard → Edge Functions → Logs
2. **Check database:** Run diagnostic SQL queries
3. **Check Stripe:** Webhook delivery logs
4. **Review docs:** `STRIPE_SETUP_GUIDE.md`
5. **GitHub Issues:** Create issue in repository

---

## 🎯 Next Steps After Deployment

1. **Set up Stripe** (follow `STRIPE_SETUP_GUIDE.md`)
2. **Test upgrade flow** end-to-end
3. **Configure trial reminder cron** (daily at 10 AM UTC)
4. **Add premium features** to existing tools
5. **Create frontend billing page** (React/Next.js)
6. **Set up monitoring alerts** (Sentry, LogRocket)
7. **Launch marketing campaign** 🚀

---

**Deployment Status:** ⏳ Ready to Deploy  
**Estimated Time:** 30 minutes  
**Risk Level:** Low (can rollback easily)

**Good luck with the deployment!** 🎉

