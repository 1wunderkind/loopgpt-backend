# LooptOS Deployment Guide

Complete guide to deploying the LooptOS backend to Supabase.

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. ✅ **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. ✅ **Supabase CLI** - Install with `npm install -g supabase`
3. ✅ **OpenAI API Key** - For multilingual formatting
4. ✅ **MealMe API Key** - For 1-click ordering (optional for MVP)
5. ✅ **Affiliate IDs** - Amazon, Instacart (optional for MVP)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Create Supabase Project**

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `looptos-backend` (or your choice)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Start with **Free** ($0/month) or **Pro** ($25/month)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

### **Step 2: Get Project Credentials**

1. In your project dashboard, click **"Settings"** (gear icon)
2. Go to **"API"** section
3. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **Project Ref:** `xxxxx` (from URL)
   - **anon public key:** `eyJh...` (long JWT token)
   - **service_role key:** `eyJh...` (different JWT token)
4. Save these in a secure location

### **Step 3: Configure Environment Variables**

1. In your local repository:
   ```bash
   cd loopgpt-backend
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   # Supabase
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJh...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   SUPABASE_PROJECT_REF=xxxxx

   # OpenAI
   OPENAI_API_KEY=sk-...

   # MealMe (optional for MVP)
   MEALME_API_KEY=your-key
   MEALME_PARTNER_ID=your-id

   # Affiliates (optional for MVP)
   AMAZON_AFFILIATE_ID=looptos-20
   INSTACART_AFFILIATE_ID=your-id
   ```

### **Step 4: Login to Supabase CLI**

```bash
supabase login
```

This will open a browser window. Authorize the CLI.

### **Step 5: Link Project**

```bash
supabase link --project-ref xxxxx
```

Replace `xxxxx` with your Project Ref from Step 2.

### **Step 6: Run Database Migrations**

```bash
supabase db push
```

This creates:

- 18 database tables
- RLS policies
- Indexes
- Helper functions
- Seed data

**Expected output:**

```
✓ Applying migration 20251101000000_complete_schema_with_auth.sql
✓ Migration complete
```

### **Step 7: Verify Database**

1. Go to Supabase Dashboard → **"Table Editor"**
2. You should see 18 tables:
   - `user_profiles`
   - `meal_plans`
   - `meal_plan_items`
   - `recipes`
   - `weight_logs`
   - `plan_outcomes`
   - `weight_prefs`
   - `orders`
   - `order_items`
   - `delivery_quotes`
   - `mealme_webhook_events`
   - `affiliate_links`
   - `affiliate_partner_map`
   - `affiliate_analytics`
   - `delivery_partners`
   - `delivery_recommendations`
   - `feature_flags`
   - `events`

### **Step 8: Set Edge Function Environment Variables**

1. Go to Supabase Dashboard → **"Edge Functions"**
2. Click **"Manage environment variables"**
3. Add these variables (Note: `LOOPGPT_*` vars are supported for backward compatibility, but `LOOPTOS_*` is preferred):
   ```
   OPENAI_API_KEY=sk-...
   MEALME_API_KEY=your-key (optional)
   MEALME_PARTNER_ID=your-id (optional)
   AMAZON_AFFILIATE_ID=looptos-20 (optional)
   INSTACART_AFFILIATE_ID=your-id (optional)
   ```
4. Click **"Save"**

### **Step 9: Deploy Edge Functions**

```bash
./scripts/deploy-all.sh
```

This deploys all 20+ Edge Functions to Supabase.

**Expected output:**

```
🚀 Deploying LooptOS Backend to Supabase...
📦 Deploying Edge Functions...
  → Deploying meal-planner functions...
  → Deploying weight-tracker functions...
  → Deploying delivery functions...
  → Deploying mealme functions...
  → Deploying geolocation functions...
✅ Deployment complete!
```

### **Step 10: Verify Deployment**

1. Go to Supabase Dashboard → **"Edge Functions"**
2. You should see all functions listed
3. Click on any function to see logs and details

### **Step 11: Test Functions**

Test a simple function:

```bash
curl -X POST https://xxxxx.supabase.co/functions/v1/generate_week_plan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"goal": "weight_loss", "days": 7, "language": "en"}'
```

Replace:

- `xxxxx` with your Project Ref
- `YOUR_ANON_KEY` with your anon public key

**Expected response:**

```json
{
  "success": true,
  "meal_plan": { ... },
  "daily_meals": [ ... ]
}
```

---

## 🔐 Security Setup

### **Enable Email Auth (Optional)**

1. Go to **"Authentication"** → **"Providers"**
2. Enable **"Email"**
3. Configure email templates
4. Set **"Site URL"** to your app URL

### **Configure RLS Policies**

RLS policies are already created by the migration. Verify:

1. Go to **"Authentication"** → **"Policies"**
2. Check that policies exist for all tables
3. Test with a real user:
   ```sql
   -- Create test user
   SELECT auth.uid(); -- Should return user ID when authenticated
   ```

### **Set Up Webhooks (Optional)**

For MealMe order updates:

1. Go to **"Database"** → **"Webhooks"**
2. Create webhook for `mealme_webhook_events` table
3. Point to your MealMe webhook URL

---

## 🧪 Testing

### **Manual Testing**

Test each function manually:

```bash
# Meal Planning
curl -X POST https://xxxxx.supabase.co/functions/v1/generate_week_plan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"goal": "weight_loss", "days": 7}'

# Weight Logging
curl -X POST https://xxxxx.supabase.co/functions/v1/log_weight \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"weight_kg": 75.5, "date": "2025-11-01"}'

# Delivery Recommendations
curl -X POST https://xxxxx.supabase.co/functions/v1/get_delivery_recommendations \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"cuisine": "italian", "country": "US"}'
```

### **Automated Testing**

```bash
./scripts/test-functions.sh
```

---

## 📊 Monitoring

### **View Function Logs**

```bash
# View logs for specific function
supabase functions logs generate_week_plan

# Follow logs in real-time
supabase functions logs generate_week_plan --follow
```

### **Dashboard Monitoring**

1. Go to **"Edge Functions"** → Select function
2. View:
   - **Invocations** - Number of calls
   - **Errors** - Error rate
   - **Duration** - Execution time
   - **Logs** - Recent logs

### **Database Monitoring**

1. Go to **"Database"** → **"Logs"**
2. Monitor:
   - Query performance
   - Slow queries
   - Connection pool usage

---

## 🐛 Troubleshooting

### **Problem: Migration Failed**

**Solution:**

```bash
# Reset database (⚠️ deletes all data)
supabase db reset

# Re-run migration
supabase db push
```

### **Problem: Function Deployment Failed**

**Solution:**

```bash
# Check function syntax
cd supabase/functions/meal-planner/generate_week_plan
deno check index.ts

# Deploy single function
supabase functions deploy generate_week_plan --project-ref xxxxx
```

### **Problem: RLS Policy Blocking Access**

**Solution:**

```bash
# Temporarily disable RLS (for testing only!)
ALTER TABLE meal_plans DISABLE ROW LEVEL SECURITY;

# Re-enable after testing
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
```

### **Problem: Function Timeout**

**Solution:**

- Increase timeout in Supabase Dashboard (max 60s)
- Optimize function code
- Add caching

### **Problem: CORS Errors**

**Solution:**

- Add CORS headers in Edge Functions:
  ```typescript
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  ```

---

## 🔄 Updates & Maintenance

### **Deploy Code Changes**

```bash
# Deploy single function
supabase functions deploy generate_week_plan

# Deploy all functions
./scripts/deploy-all.sh
```

### **Database Migrations**

```bash
# Create new migration
supabase migration new add_new_feature

# Edit migration file
# supabase/migrations/20251102000000_add_new_feature.sql

# Apply migration
supabase db push
```

### **Rollback Migration**

```bash
# Reset to specific migration
supabase db reset --version 20251101000000
```

---

## 💰 Cost Optimization

### **Free Tier Limits**

- **Database:** 500 MB
- **Edge Functions:** 500K invocations/month
- **Auth:** 50K MAU
- **Storage:** 1 GB

### **Pro Tier ($25/month)**

- **Database:** 8 GB
- **Edge Functions:** 2M invocations/month
- **Auth:** 100K MAU
- **Storage:** 100 GB

### **Optimization Tips**

1. **Cache affiliate links** (24-hour TTL)
2. **Batch database queries**
3. **Use indexes** (already created)
4. **Enable connection pooling**
5. **Monitor slow queries**

---

## 📈 Scaling

### **When to Upgrade**

- **Free → Pro:** When you hit 500K function invocations/month
- **Pro → Team:** When you need dedicated resources
- **Team → Enterprise:** When you need SLA guarantees

### **Horizontal Scaling**

Supabase automatically scales:

- Database connections
- Edge Function instances
- Storage capacity

### **Vertical Scaling**

Upgrade compute resources in Dashboard:

- **Database:** Increase RAM/CPU
- **Edge Functions:** Increase timeout/memory

---

## 🎉 Success Checklist

Before going live, verify:

- ✅ All migrations applied
- ✅ All Edge Functions deployed
- ✅ Environment variables set
- ✅ RLS policies enabled
- ✅ Auth configured
- ✅ Functions tested manually
- ✅ Monitoring set up
- ✅ Backup strategy in place

---

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Discord:** https://discord.supabase.com
- **GitHub Issues:** For bugs in this repo

---

**You're ready to go live!** 🚀

**Plan → Eat → Track → Result → Adapt** 🔄
