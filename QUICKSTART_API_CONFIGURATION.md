# 🚀 Quick-Start Guide: API Configuration for TheLoopGPT Backend

This guide will walk you through configuring all external API keys needed for TheLoopGPT backend to unlock its full functionality.

---

## 📋 Overview

TheLoopGPT backend integrates with several external services to provide comprehensive food, nutrition, and commerce features. While the system is functional without these keys, configuring them unlocks advanced capabilities.

### API Keys Priority

| Priority | Service | Purpose | Required For |
|----------|---------|---------|--------------|
| 🔴 **High** | OpenAI | AI-powered meal planning, nutrition analysis | Core features |
| 🟡 **Medium** | MealMe | Grocery delivery integration | Commerce features |
| 🟡 **Medium** | Stripe | Payment processing, subscriptions | Monetization |
| 🟢 **Low** | Sentry | Error tracking and monitoring | Observability |
| 🟢 **Low** | Affiliate Programs | Revenue generation from referrals | Monetization |

---

## 🔧 How to Add Environment Variables in Supabase

### Step 1: Access Your Supabase Project Settings

1. Navigate to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **qmagnwxeijctkksqbcqz**
3. Click on **Settings** (⚙️ icon) in the left sidebar
4. Select **Edge Functions** from the settings menu

### Step 2: Add Environment Variables

1. Scroll down to the **Secrets** section
2. Click **Add new secret**
3. Enter the **Name** (e.g., `OPENAI_API_KEY`)
4. Enter the **Value** (your actual API key)
5. Click **Save**
6. Repeat for each API key below

### Step 3: Restart Edge Functions (if needed)

After adding new secrets, you may need to restart your edge functions:
```bash
# From your local terminal
cd /home/ubuntu/loopgpt-backend
supabase functions deploy --no-verify-jwt
```

---

## 🔑 API Key Configuration Guide

### 1. OpenAI API Key (High Priority)

**Purpose:** Powers AI-driven meal planning, recipe generation, nutrition analysis, and natural language processing.

**Environment Variable:** `OPENAI_API_KEY`

#### How to Obtain:

1. **Sign up for OpenAI:**
   - Visit: https://platform.openai.com/signup
   - Create an account or sign in

2. **Generate API Key:**
   - Go to: https://platform.openai.com/api-keys
   - Click **+ Create new secret key**
   - Name it: `TheLoopGPT Backend`
   - Copy the key immediately (you won't see it again!)

3. **Set up billing:**
   - Go to: https://platform.openai.com/account/billing
   - Add a payment method
   - Set usage limits to control costs (recommended: $50/month to start)

4. **Add to Supabase:**
   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-[YOUR_OPENAI_KEY_HERE]
   ```

#### Cost Estimate:
- **GPT-4o:** ~$0.005 per meal plan generation
- **GPT-3.5-turbo:** ~$0.0005 per nutrition analysis
- **Expected monthly cost:** $20-100 depending on usage

#### Functions Using This Key:
- `plan_create_meal_plan`
- `plan_generate_from_leftovers`
- `nutrition_analyze_food`
- `loop_predict_outcome`
- `loop_adjust_calories`

---

### 2. MealMe API Key (Medium Priority)

**Purpose:** Enables grocery delivery integration for ordering ingredients directly from meal plans.

**Environment Variable:** `MEALME_API_KEY`

#### How to Obtain:

1. **Apply for MealMe Partnership:**
   - Visit: https://www.mealme.ai/partners
   - Fill out the partnership application form
   - Mention you're building a meal planning application

2. **Wait for Approval:**
   - MealMe team will review your application (typically 3-5 business days)
   - You'll receive an email with API credentials

3. **Access API Dashboard:**
   - Log in to: https://dashboard.mealme.ai
   - Navigate to **API Keys** section
   - Copy your production API key

4. **Add to Supabase:**
   ```
   Name: MEALME_API_KEY
   Value: mealme_live_[YOUR_KEY_HERE]
   ```

#### Alternative (For Testing):
If you don't have a MealMe key yet, you can use test mode:
```
Name: MEALME_API_KEY
Value: mealme_test_[YOUR_KEY_HERE]
```

#### Cost Structure:
- **Free tier:** 1,000 API calls/month
- **Pro tier:** $99/month for 10,000 calls
- **Transaction fee:** 2-5% of order value

#### Functions Using This Key:
- `mealme_create_cart`
- `mealme_get_quotes`
- `mealme_checkout_url`
- `loopgpt_route_order`
- `loopgpt_confirm_order`

---

### 3. Stripe API Keys (Medium Priority)

**Purpose:** Handles payment processing, subscription management, and billing.

**Environment Variables:** 
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (for frontend)

#### How to Obtain:

1. **Create Stripe Account:**
   - Visit: https://dashboard.stripe.com/register
   - Complete account setup and verification

2. **Get API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy your **Secret key** (starts with `sk_live_` or `sk_test_`)
   - Copy your **Publishable key** (starts with `pk_live_` or `pk_test_`)

3. **Set Up Webhook:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click **+ Add endpoint**
   - Enter URL: `https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/stripe_webhook`
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click **Add endpoint**
   - Copy the **Signing secret** (starts with `whsec_`)

4. **Add to Supabase:**
   ```
   Name: STRIPE_SECRET_KEY
   Value: sk_live_[YOUR_STRIPE_SECRET_KEY]
   
   Name: STRIPE_WEBHOOK_SECRET
   Value: whsec_[YOUR_WEBHOOK_SECRET]
   
   Name: STRIPE_PUBLISHABLE_KEY
   Value: pk_live_[YOUR_PUBLISHABLE_KEY]
   ```

#### Development vs Production:
- **Test mode:** Use `sk_test_` and `pk_test_` keys for development
- **Live mode:** Use `sk_live_` and `pk_live_` for production
- Switch between modes in Stripe dashboard (top-right toggle)

#### Cost Structure:
- **Transaction fee:** 2.9% + $0.30 per successful charge
- **Subscription billing:** No additional fees
- **No monthly fees** for basic usage

#### Functions Using These Keys:
- `create_checkout_session`
- `create_customer_portal`
- `stripe_webhook`
- `check_entitlement`
- `upgrade_to_premium`

---

### 4. External GPT Endpoints (Optional)

**Purpose:** Connect to specialized GPT models for K-Cal tracking, leftover recipes, and nutrition analysis.

**Environment Variables:**
- `KCAL_GPT_ENDPOINT`
- `LEFTOVER_GPT_ENDPOINT`
- `NUTRITION_GPT_ENDPOINT`

#### How to Configure:

These are custom GPT endpoints you may have deployed separately. If you have these services:

1. **Add to Supabase:**
   ```
   Name: KCAL_GPT_ENDPOINT
   Value: https://your-kcal-gpt-endpoint.com/api
   
   Name: LEFTOVER_GPT_ENDPOINT
   Value: https://your-leftover-gpt-endpoint.com/api
   
   Name: NUTRITION_GPT_ENDPOINT
   Value: https://your-nutrition-gpt-endpoint.com/api
   ```

#### If You Don't Have These:
The system will fall back to using the main OpenAI integration. These are optional enhancements.

#### Functions Using These Endpoints:
- `plan_create_meal_plan` (uses MCP wrappers)
- `plan_generate_from_leftovers`
- `nutrition_get_macros`

---

### 5. Sentry Error Tracking (Low Priority)

**Purpose:** Real-time error tracking, performance monitoring, and debugging.

**Environment Variable:** `SENTRY_DSN`

#### How to Obtain:

1. **Create Sentry Account:**
   - Visit: https://sentry.io/signup
   - Sign up for free account

2. **Create New Project:**
   - Click **Create Project**
   - Select **Deno** as platform
   - Name it: `TheLoopGPT Backend`
   - Click **Create Project**

3. **Get DSN:**
   - After project creation, you'll see your DSN
   - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - Or find it later in: **Settings** → **Client Keys (DSN)**

4. **Add to Supabase:**
   ```
   Name: SENTRY_DSN
   Value: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
   ```

#### Cost Structure:
- **Free tier:** 5,000 errors/month
- **Team tier:** $26/month for 50,000 errors
- **Business tier:** $80/month for 100,000 errors

#### Benefits:
- Real-time error alerts
- Stack traces and debugging info
- Performance monitoring
- Release tracking

---

### 6. Affiliate Program IDs (Low Priority)

**Purpose:** Generate revenue through affiliate links for ingredient purchases.

**Environment Variables:**
- `AMAZON_AFFILIATE_TAG`
- `INSTACART_AFFILIATE_ID`

#### Amazon Associates:

1. **Join Amazon Associates:**
   - Visit: https://affiliate-program.amazon.com
   - Click **Join Now for Free**
   - Complete application (requires website/app info)

2. **Get Your Tag:**
   - After approval, log in to Associates Central
   - Your tracking ID is displayed at the top
   - Format: `yourname-20`

3. **Add to Supabase:**
   ```
   Name: AMAZON_AFFILIATE_TAG
   Value: yourname-20
   ```

#### Instacart Affiliate:

1. **Apply for Instacart Affiliate Program:**
   - Visit: https://www.instacart.com/company/partnerships
   - Contact their partnership team
   - Mention you're building a meal planning app

2. **Get Your Affiliate ID:**
   - After approval, you'll receive your unique affiliate ID
   - Format varies by program

3. **Add to Supabase:**
   ```
   Name: INSTACART_AFFILIATE_ID
   Value: your-affiliate-id
   ```

#### Revenue Potential:
- **Amazon:** 1-4% commission on qualifying purchases
- **Instacart:** Varies by partnership agreement

#### Functions Using These IDs:
- `get_affiliate_links`
- `get_affiliate_by_country`
- `plan_create_meal_plan` (includes affiliate links in response)

---

## ✅ Verification Steps

After adding your API keys, verify they're working:

### 1. Test Health Endpoint
```bash
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/sys_healthcheck
```

Expected response should show configured services.

### 2. Test OpenAI Integration
```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/nutrition_analyze_food \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"food": "chicken breast", "amount": "100g"}'
```

### 3. Test Stripe Integration
```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/create_checkout_session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"priceId": "price_xxxxx"}'
```

### 4. Check Sentry Dashboard
- Generate a test error
- Check Sentry dashboard for the error event
- Verify source maps and stack traces are working

---

## 🔒 Security Best Practices

### 1. Never Commit API Keys to Git
- All keys should be in Supabase environment variables only
- Never hardcode keys in your codebase
- Use `.env.local` for local development (already in `.gitignore`)

### 2. Use Different Keys for Development and Production
- Test keys for development: `sk_test_`, `pk_test_`
- Live keys for production: `sk_live_`, `pk_live_`
- Separate Sentry projects for each environment

### 3. Rotate Keys Regularly
- Rotate API keys every 90 days
- Immediately rotate if you suspect a key has been compromised
- Use key rotation features when available (e.g., Stripe)

### 4. Monitor API Usage
- Set up billing alerts in each service
- Monitor for unusual activity
- Review API usage logs regularly

### 5. Restrict API Key Permissions
- Use the principle of least privilege
- Restrict keys to only necessary permissions
- Use IP allowlists when available

---

## 📊 Cost Estimation Summary

Here's what you can expect to spend monthly with moderate usage (1,000 users):

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|------------------------|
| **OpenAI** | $5 credit (new users) | $50-200 |
| **MealMe** | 1,000 calls | $0-99 (depending on volume) |
| **Stripe** | Unlimited | 2.9% + $0.30 per transaction |
| **Sentry** | 5,000 errors | $0-26 |
| **Amazon Associates** | Free | $0 (generates revenue) |
| **Instacart Affiliate** | Free | $0 (generates revenue) |
| **Total** | - | **$50-325/month** |

**Note:** Costs scale with usage. Start with free tiers and upgrade as needed.

---

## 🆘 Troubleshooting

### API Key Not Working

**Problem:** Getting authentication errors after adding API key

**Solution:**
1. Verify the key is correct (no extra spaces)
2. Check if the key has necessary permissions
3. Restart edge functions: `supabase functions deploy --no-verify-jwt`
4. Check Supabase logs: https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz/logs

### Webhook Not Receiving Events

**Problem:** Stripe webhook not triggering

**Solution:**
1. Verify webhook URL is correct
2. Check webhook signing secret matches
3. Test webhook in Stripe dashboard: **Webhooks** → **Send test webhook**
4. Check edge function logs for errors

### Rate Limiting Issues

**Problem:** Getting rate limit errors

**Solution:**
1. Implement request queuing in your frontend
2. Upgrade API tier if needed
3. Add caching to reduce API calls
4. Contact service provider for rate limit increase

### Cost Overruns

**Problem:** Unexpected high costs

**Solution:**
1. Set up billing alerts in each service
2. Implement request caching
3. Add rate limiting on your frontend
4. Review and optimize API usage patterns

---

## 📞 Support Resources

### OpenAI
- Documentation: https://platform.openai.com/docs
- Support: https://help.openai.com
- Status: https://status.openai.com

### MealMe
- Documentation: https://docs.mealme.ai
- Support: support@mealme.ai
- Partnership inquiries: partnerships@mealme.ai

### Stripe
- Documentation: https://stripe.com/docs
- Support: https://support.stripe.com
- Status: https://status.stripe.com

### Sentry
- Documentation: https://docs.sentry.io
- Support: https://sentry.io/support
- Status: https://status.sentry.io

### Supabase
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support
- Status: https://status.supabase.com

---

## 🎯 Next Steps

After configuring your API keys:

1. **Test all integrations** using the verification steps above
2. **Set up monitoring alerts** in each service
3. **Configure billing alerts** to avoid surprises
4. **Review the main documentation** in `DEPLOYMENT_COMPLETE.md`
5. **Start building your frontend** to consume these APIs

---

## 📝 Configuration Checklist

Use this checklist to track your progress:

- [ ] OpenAI API key configured and tested
- [ ] MealMe API key configured (or skipped for now)
- [ ] Stripe secret key configured
- [ ] Stripe webhook configured and tested
- [ ] Sentry DSN configured (optional)
- [ ] Amazon affiliate tag configured (optional)
- [ ] Instacart affiliate ID configured (optional)
- [ ] All edge functions redeployed after adding keys
- [ ] Health endpoint verified
- [ ] Test requests successful
- [ ] Billing alerts set up in all services
- [ ] API usage monitoring configured

---

**Questions or issues?** Open an issue on GitHub: https://github.com/1wunderkind/loopgpt-backend/issues

**Ready to start?** Begin with the OpenAI API key (highest priority) and work your way down the list!
