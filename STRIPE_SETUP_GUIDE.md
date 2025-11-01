# Stripe Setup Guide for LoopGPT Premium

This guide will help you set up Stripe for LoopGPT Premium subscriptions.

---

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to Supabase project
- GitHub repository access

---

## 🔧 Step 1: Create Stripe Account

1. Go to https://stripe.com and sign up
2. Complete business verification (required for live mode)
3. Enable **Test Mode** (toggle in top-right corner)

---

## 💳 Step 2: Create Products & Prices

### Option A: Using Stripe Dashboard

1. Go to **Products** → **Add Product**
2. Create **LoopGPT Premium** product

3. Add **Monthly Price**:
   - Price: $4.99 USD
   - Billing period: Monthly
   - Price ID: `price_loop_premium_monthly_v1`
   - Metadata:
     ```json
     {
       "sku": "loop_premium_monthly_v1",
       "tier": "premium",
       "launch_phase": "intro_499"
     }
     ```

4. Add **Annual Price**:
   - Price: $49.00 USD
   - Billing period: Yearly
   - Price ID: `price_loop_premium_annual_v1`
   - Metadata:
     ```json
     {
       "sku": "loop_premium_annual_v1",
       "tier": "premium",
       "launch_phase": "intro_499",
       "discount_months": "2"
     }
     ```

5. Add **Family Plan Price** (optional):
   - Price: $14.99 USD
   - Billing period: Monthly
   - Price ID: `price_loop_family_monthly_v1`
   - Metadata:
     ```json
     {
       "sku": "loop_family_monthly_v1",
       "tier": "family",
       "launch_phase": "intro_499"
     }
     ```

6. For each price, go to **Advanced options** → Enable **7-day free trial**

### Option B: Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create monthly price
stripe prices create \
  --unit-amount 499 \
  --currency usd \
  --recurring interval=month \
  --product "LoopGPT Premium" \
  --metadata '{"sku":"loop_premium_monthly_v1","tier":"premium","launch_phase":"intro_499"}'

# Create annual price
stripe prices create \
  --unit-amount 4900 \
  --currency usd \
  --recurring interval=year \
  --product "LoopGPT Premium" \
  --metadata '{"sku":"loop_premium_annual_v1","tier":"premium","launch_phase":"intro_499","discount_months":"2"}'

# Create family price
stripe prices create \
  --unit-amount 1499 \
  --currency usd \
  --recurring interval=month \
  --product "LoopGPT Premium" \
  --metadata '{"sku":"loop_family_monthly_v1","tier":"family","launch_phase":"intro_499"}'
```

---

## 🔑 Step 3: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)
4. **Important:** Keep secret key secure! Never commit to Git.

---

## 🪝 Step 4: Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL:
   ```
   https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/stripe_webhook
   ```

4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_`)

---

## 🔐 Step 5: Update Environment Variables

### In Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
STRIPE_PRICE_ID_MONTHLY=price_YOUR_ACTUAL_MONTHLY_ID
STRIPE_PRICE_ID_ANNUAL=price_YOUR_ACTUAL_ANNUAL_ID
STRIPE_PRICE_ID_FAMILY=price_YOUR_ACTUAL_FAMILY_ID
APP_URL=https://theloopgpt.ai
```

### In GitHub Secrets (for CI/CD):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the same secrets as above

---

## 🧪 Step 6: Test in Test Mode

### Test with Stripe CLI:

```bash
# Listen for webhooks locally (for testing)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe_webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

### Test with Stripe Dashboard:

1. Go to **Developers** → **Webhooks** → Your endpoint
2. Click **Send test webhook**
3. Select event type
4. Click **Send test webhook**

### Test with real checkout:

1. Use test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **3D Secure:** `4000 0027 6000 3184`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC

2. Complete checkout flow
3. Check Supabase database for subscription record
4. Check webhook logs in Stripe Dashboard

---

## 🌍 Step 7: Enable Stripe Tax (Optional)

1. Go to **Products** → **Tax**
2. Click **Enable Stripe Tax**
3. Configure tax settings for your business
4. Stripe will automatically calculate VAT/GST for global customers

---

## 🎫 Step 8: Enable Customer Portal

1. Go to **Settings** → **Billing** → **Customer portal**
2. Click **Activate test link**
3. Configure portal settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to update billing information

4. Save settings

---

## 🚀 Step 9: Deploy Functions

```bash
# Navigate to project
cd /home/ubuntu/loopgpt-backend

# Deploy billing migration
supabase db push

# Deploy Edge Functions
supabase functions deploy create_checkout_session --project-ref qmagnwxeijctkksqbcqz
supabase functions deploy stripe_webhook --project-ref qmagnwxeijctkksqbcqz
supabase functions deploy create_customer_portal --project-ref qmagnwxeijctkksqbcqz
supabase functions deploy check_entitlement --project-ref qmagnwxeijctkksqbcqz
supabase functions deploy upgrade_to_premium --project-ref qmagnwxeijctkksqbcqz
supabase functions deploy trial_reminder --project-ref qmagnwxeijctkksqbcqz
```

---

## ✅ Step 10: Verify Everything Works

### Test Upgrade Flow:

1. Call `upgrade_to_premium` tool in ChatGPT:
   ```json
   {
     "chatgpt_user_id": "test_user_001",
     "email": "your-email@example.com",
     "plan": "monthly"
   }
   ```

2. Check your email for magic link
3. Click link → should redirect to billing page
4. Complete checkout with test card `4242 4242 4242 4242`
5. Check Supabase `subscriptions` table for new record
6. Call `check_subscription_status` to verify:
   ```json
   {
     "chatgpt_user_id": "test_user_001"
   }
   ```

### Test Webhook Events:

```bash
# Trigger checkout completion
stripe trigger checkout.session.completed

# Check Supabase database
# Should see new subscription with status "trialing"

# Trigger subscription deletion
stripe trigger customer.subscription.deleted

# Check Supabase database
# Should see subscription status changed to "cancelled"
```

---

## 🔄 Step 11: Migrate to Live Mode (When Ready)

1. **Complete Stripe verification** (business details, bank account)
2. **Switch to Live Mode** in Stripe Dashboard
3. **Recreate products and prices** (same structure as test mode)
4. **Update webhook endpoint** (same URL, but in live mode)
5. **Update environment variables** with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET
   STRIPE_PRICE_ID_MONTHLY=price_YOUR_LIVE_MONTHLY_ID
   STRIPE_PRICE_ID_ANNUAL=price_YOUR_LIVE_ANNUAL_ID
   STRIPE_PRICE_ID_FAMILY=price_YOUR_LIVE_FAMILY_ID
   ```

6. **Test with real card** (small amount, then refund)
7. **Go live!** 🎉

---

## 📊 Monitoring & Analytics

### Stripe Dashboard:

- **Payments** → View all transactions
- **Customers** → View customer list
- **Subscriptions** → View active subscriptions
- **Webhooks** → View webhook delivery logs
- **Logs** → View API request logs

### Supabase Dashboard:

- **Table Editor** → View `subscriptions`, `entitlements`, `analytics_events`
- **Edge Functions** → View function logs
- **Database** → Run SQL queries for analytics

### Useful SQL Queries:

```sql
-- Total active subscriptions
SELECT tier, COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY tier;

-- Monthly Recurring Revenue (MRR)
SELECT 
  SUM(CASE 
    WHEN tier = 'premium' THEN 4.99
    WHEN tier = 'family' THEN 14.99
    ELSE 0
  END) as mrr
FROM subscriptions
WHERE status = 'active';

-- Trial conversion rate
SELECT 
  COUNT(CASE WHEN status = 'active' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
FROM subscriptions
WHERE trial_end IS NOT NULL;

-- Recent analytics events
SELECT event_type, COUNT(*) as count
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

---

## 🆘 Troubleshooting

### Webhook not receiving events:

1. Check webhook URL is correct
2. Verify webhook secret is correct
3. Check Edge Function logs in Supabase
4. Test webhook with Stripe CLI: `stripe listen --forward-to ...`

### Subscription not created:

1. Check `subscriptions` table in Supabase
2. Check Edge Function logs for errors
3. Verify `chatgpt_user_id` is being passed correctly
4. Check Stripe webhook logs for delivery failures

### Trial not working:

1. Verify `trial_period_days: 7` in checkout session
2. Check `trial_end` field in `subscriptions` table
3. Verify `check_entitlement` function logic

### Customer Portal not accessible:

1. Verify Customer Portal is enabled in Stripe
2. Check user has `stripe_customer_id` in database
3. Verify `create_customer_portal` function is deployed

---

## 📚 Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe Testing:** https://stripe.com/docs/testing
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Supabase Auth:** https://supabase.com/docs/guides/auth

---

## 🎯 Next Steps

1. ✅ Set up Stripe account
2. ✅ Create products and prices
3. ✅ Get API keys
4. ✅ Set up webhook
5. ✅ Update environment variables
6. ✅ Deploy functions
7. ✅ Test in test mode
8. ✅ Enable Stripe Tax
9. ✅ Enable Customer Portal
10. ⏳ Go live when ready!

---

**Questions?** Check the troubleshooting section or contact support@theloopgpt.ai

**Good luck with your launch!** 🚀

