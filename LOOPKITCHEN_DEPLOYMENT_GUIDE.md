# LoopKitchen Deployment Guide

**Version**: 1.0.0  
**Date**: December 6, 2025  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Migration](#database-migration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Overview

LoopKitchen is a comprehensive recipe generation, nutrition analysis, and meal planning system integrated into the LoopGPT backend. This guide covers deployment to Supabase Edge Functions.

**Components**:
- **Phase 1**: Shared module (types, prompts, utilities)
- **Phase 2**: Recipe generation with chaos mode
- **Phase 3**: Nutrition analysis and meal logging
- **Phase 4**: Meal planning with commerce integration
- **Phase 5**: Testing and deployment

**Total Code**: 2,342+ lines  
**MCP Tools**: 9 (7 available, 2 planned)

---

## Prerequisites

### Required

- ✅ Supabase project (production)
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ OpenAI API key (GPT-4o-mini access)
- ✅ Git repository access
- ✅ Node.js 18+ and Deno 1.37+

### Optional (for full features)

- ⏳ PostgreSQL database (for meal logging - Phase 3)
- ⏳ Commerce Router URL (for grocery ordering - Phase 4)
- ⏳ Supabase Service Role Key (for database access)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd loopgpt-backend
```

### 2. Install Dependencies

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### 3. Link to Supabase Project

```bash
# Link to your production project
supabase link --project-ref <your-project-ref>
```

### 4. Set Environment Variables

Create `.env` file or set in Supabase dashboard:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (for meal logging)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional (for commerce integration)
COMMERCE_ROUTER_URL=https://your-commerce-router.supabase.co/functions/v1
```

**Set in Supabase Dashboard**:
1. Go to Project Settings → Edge Functions
2. Add environment variables
3. Save changes

---

## Database Migration

### Option A: Full Database Integration (Recommended for Production)

**Run meal logging schema**:

```bash
# Connect to your database
psql <your-database-url>

# Run migration
\i database/schemas/loopkitchen_meal_logs.sql
```

**Verify migration**:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'loopkitchen%';

-- Should return:
-- loopkitchen_meal_logs
-- loopkitchen_user_nutrition_prefs

-- Check materialized view
SELECT * FROM loopkitchen_daily_nutrition LIMIT 1;

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%loopkitchen%';
```

**Activate meal logging** (uncomment code in `loopkitchen_nutrition.ts`):

1. Open `supabase/functions/mcp-tools/loopkitchen_nutrition.ts`
2. Find `logMeal()` function
3. Uncomment database code (lines 346-447)
4. Find `getDailyNutrition()` function
5. Uncomment database code (lines 479-617)
6. Redeploy functions

### Option B: Skip Database (Placeholder Mode)

If you want to deploy without database integration:
- Meal logging tools will return placeholder InfoMessage widgets
- All other features work normally
- Can add database later without code changes

---

## Deployment Steps

### Step 1: Deploy Shared Module

```bash
# Deploy shared LoopKitchen module
supabase functions deploy _shared
```

### Step 2: Deploy MCP Tools Function

```bash
# Deploy main MCP tools function (includes all LoopKitchen tools)
supabase functions deploy mcp-tools
```

### Step 3: Verify Deployment

```bash
# Get function URL
supabase functions list

# Test health endpoint
curl https://your-project.supabase.co/functions/v1/mcp-tools/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.8.0-loopkitchen-phase4",
#   ...
# }
```

### Step 4: Test LoopKitchen Tools

```bash
# Run integration test suite
cd tests
./loopkitchen_integration_tests.sh https://your-project.supabase.co/functions/v1/mcp-tools
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-project.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

**Expected**:
- `status: "healthy"`
- `version: "1.8.0-loopkitchen-phase4"`
- `services.environment.hasOpenAI: true`

### 2. Manifest Check

```bash
curl https://your-project.supabase.co/functions/v1/mcp-tools/ | jq '.tools[] | select(.name | startswith("loopkitchen"))'
```

**Expected**: 9 LoopKitchen tools listed

### 3. Recipe Generation Test

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick", "Asian"],
    "count": 3
  }' | jq '.'
```

**Expected**: Array of RecipeCardCompact widgets

### 4. Nutrition Analysis Test

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "chicken breast", "quantity": "200g"},
      {"name": "rice", "quantity": "1 cup"}
    ],
    "servings": 2
  }' | jq '.'
```

**Expected**: NutritionSummary widget

### 5. Meal Planning Test

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 7
  }' | jq '.'
```

**Expected**: WeekPlanner widget with 7 days

### 6. Performance Check

```bash
# Measure response time
time curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "count": 3}' > /dev/null
```

**Expected**: < 5 seconds

---

## Monitoring & Maintenance

### Logs

**View function logs**:

```bash
# Real-time logs
supabase functions logs mcp-tools --tail

# Filter by LoopKitchen
supabase functions logs mcp-tools | grep loopkitchen
```

**Key log patterns**:
- `[loopkitchen.recipes]` - Recipe generation
- `[loopkitchen.nutrition]` - Nutrition analysis
- `[loopkitchen.mealplan]` - Meal planning

### Metrics to Monitor

1. **Response Times**
   - Recipe generation: < 5s
   - Nutrition analysis: < 3s
   - Meal planning: < 5s
   - Complete flow: < 10s

2. **Error Rates**
   - Target: < 1% error rate
   - Monitor OpenAI API errors
   - Check retry logic effectiveness

3. **Usage Patterns**
   - Most popular tools
   - Peak usage times
   - Average requests per user

### Database Maintenance (if enabled)

**Refresh materialized views** (daily):

```sql
-- Refresh daily nutrition summaries
SELECT refresh_loopkitchen_daily_nutrition();
```

**Set up cron job**:

```sql
-- Create cron extension (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily refresh at 2 AM
SELECT cron.schedule(
  'refresh-loopkitchen-daily',
  '0 2 * * *',
  'SELECT refresh_loopkitchen_daily_nutrition();'
);
```

**Monitor database size**:

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'loopkitchen%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Rollback Procedures

### Rollback Function Deployment

```bash
# List function versions
supabase functions list --version

# Rollback to previous version
supabase functions deploy mcp-tools --version <previous-version-id>
```

### Rollback Database Migration

```bash
# Connect to database
psql <your-database-url>

# Drop LoopKitchen tables (if needed)
DROP MATERIALIZED VIEW IF EXISTS loopkitchen_daily_nutrition;
DROP TABLE IF EXISTS loopkitchen_meal_logs;
DROP TABLE IF EXISTS loopkitchen_user_nutrition_prefs;

# Drop functions
DROP FUNCTION IF EXISTS refresh_loopkitchen_daily_nutrition();
DROP FUNCTION IF EXISTS get_weekly_nutrition_summary(TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS get_nutrition_progress(TEXT, DATE);
```

### Emergency Disable

If LoopKitchen tools are causing issues:

1. **Disable specific tools** (edit `index.ts`):
   ```typescript
   case "loopkitchen.recipes.generate":
     throw new Error("Tool temporarily disabled");
   ```

2. **Redeploy**:
   ```bash
   supabase functions deploy mcp-tools
   ```

---

## Troubleshooting

### Issue: OpenAI API Errors

**Symptoms**: 
- "OpenAI API error" in logs
- Slow response times
- Timeout errors

**Solutions**:
1. Check OpenAI API key is valid
2. Verify API quota/limits
3. Check retry logic is working
4. Monitor OpenAI status page

### Issue: Database Connection Errors

**Symptoms**:
- "Database not configured" errors
- Meal logging fails
- Daily summary fails

**Solutions**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Check database is accessible
3. Verify RLS policies (if enabled)
4. Check connection pool limits

### Issue: Slow Performance

**Symptoms**:
- Response times > 10s
- Timeout errors
- High latency

**Solutions**:
1. Check OpenAI API response times
2. Optimize GPT prompts (reduce token count)
3. Add caching for common requests
4. Consider parallel API calls
5. Monitor Supabase Edge Function cold starts

### Issue: Commerce Integration Fails

**Symptoms**:
- "Commerce Router URL not set" errors
- Provider quotes fail
- Order preparation fails

**Solutions**:
1. Verify `COMMERCE_ROUTER_URL` is set
2. Check commerce router is deployed
3. Verify service role key has permissions
4. Test commerce router independently

### Issue: Widget Structure Errors

**Symptoms**:
- "Invalid widget type" errors
- Missing fields in response
- Type validation errors

**Solutions**:
1. Check GPT schema matches widget types
2. Verify structured output is enabled
3. Check for schema drift
4. Review widget type definitions

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] OpenAI API key tested
- [ ] Database schema migrated (if using)
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Code reviewed
- [ ] Documentation updated

### Deployment

- [ ] Shared module deployed
- [ ] MCP tools function deployed
- [ ] Health check passes
- [ ] Manifest shows all tools
- [ ] Integration tests pass on production
- [ ] Performance verified

### Post-Deployment

- [ ] Monitoring set up
- [ ] Logs reviewed
- [ ] Error tracking configured
- [ ] Database maintenance scheduled (if using)
- [ ] Backup procedures in place
- [ ] Team notified

### Ongoing

- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Check database growth (if using)
- [ ] Update documentation
- [ ] Plan feature enhancements

---

## Support & Resources

**Documentation**:
- Phase 1 Complete: `LOOPKITCHEN_PHASE1_COMPLETE.md`
- Phase 2 Complete: `LOOPKITCHEN_PHASE2_COMPLETE.md`
- Phase 3 Complete: `LOOPKITCHEN_PHASE3_COMPLETE.md`
- Phase 4 Complete: `LOOPKITCHEN_PHASE4_COMPLETE.md`
- API Documentation: `LOOPKITCHEN_API_DOCS.md`

**Test Suites**:
- Integration tests: `tests/loopkitchen_integration_tests.sh`
- Nutrition tests: `tests/test_nutrition_tool.sh`
- Validation guides: `tests/loopkitchen_*_validation.md`

**Database**:
- Schema: `database/schemas/loopkitchen_meal_logs.sql`

---

## Version History

**v1.8.0-loopkitchen-phase4** (December 6, 2025)
- ✅ Phase 1: Shared module
- ✅ Phase 2: Recipe generation
- ✅ Phase 3: Nutrition analysis
- ✅ Phase 4: Meal planning
- ✅ Phase 5: Testing & deployment

**Next Version** (Planned)
- Database integration activation
- Performance optimizations
- Enhanced commerce features
- Analytics dashboard

---

*Last Updated: December 6, 2025*  
*LoopKitchen Integration Project*
