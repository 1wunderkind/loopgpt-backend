# LoopKitchen Phase 5: Database Activation Guide

**Status**: Ready to activate  
**Complexity**: Medium (30-60 minutes)  
**Prerequisites**: Database access, Supabase CLI  

---

## Overview

Phase 5 adds **meal logging with database integration** to LoopKitchen. The code and schema are ready, but the database tables haven't been deployed yet. This guide shows you how to activate these features when you're ready.

---

## What Phase 5 Adds

### Features
1. **Meal Logging** - Log meals with full nutrition data
2. **Daily Summaries** - Aggregate nutrition by day
3. **Weekly Summaries** - Track weekly trends
4. **User Preferences** - Store dietary goals and targets
5. **Progress Tracking** - Monitor nutrition over time

### Tools to Activate
- `loopkitchen.nutrition.logMeal` (currently placeholder)
- `loopkitchen.nutrition.daily` (currently placeholder)

---

## Current Status

### ✅ Ready
- Database schema created (`database/schemas/loopkitchen_meal_logs.sql`)
- Migration file ready (`supabase/migrations/20251206000000_loopkitchen_meal_logging.sql`)
- Code written (commented out in `loopkitchen_nutrition.ts`)
- Helper functions implemented
- Documentation complete

### ⏳ Pending
- Database tables not yet created
- Functions still return placeholder responses
- No data persistence yet

---

## Activation Steps

### Step 1: Deploy Database Schema (10 minutes)

**Option A: Using Supabase CLI** (Recommended)

```bash
# 1. Navigate to project
cd /home/ubuntu/loopgpt-backend

# 2. Link to production (if not already linked)
export SUPABASE_ACCESS_TOKEN="your-token"
supabase link --project-ref qmagnwxeijctkksqbcqz

# 3. Push migration
supabase db push

# 4. Verify tables created
supabase db diff
```

**Option B: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz/editor
2. Click "SQL Editor"
3. Copy content from `database/schemas/loopkitchen_meal_logs.sql`
4. Paste and run
5. Verify tables in "Table Editor"

**Option C: Using SQL Execution Tool**

```bash
# Use the webdev_execute_sql tool (if available)
# Or execute via psql
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  -f database/schemas/loopkitchen_meal_logs.sql
```

---

### Step 2: Activate Meal Logging Functions (15 minutes)

**File**: `supabase/functions/mcp-tools/loopkitchen_nutrition.ts`

**Changes needed**:

1. **Uncomment database integration code** (lines ~300-450)

Find this section:
```typescript
// ============================================================================
// DATABASE INTEGRATION (Phase 4)
// ============================================================================
// Uncomment when database is ready
/*
async function logMealToDatabase(/* ... */) {
  // ... database code ...
}
*/
```

Change to:
```typescript
// ============================================================================
// DATABASE INTEGRATION (Phase 5)
// ============================================================================
async function logMealToDatabase(/* ... */) {
  // ... database code ...
}
```

2. **Update logMeal function** (line ~500)

Find:
```typescript
export async function logMeal(input: MealLogInput): Promise<InfoMessage> {
  // Placeholder response
  return {
    type: "info",
    data: {
      message: "Meal logging will be available in Phase 4...",
      // ...
    }
  };
}
```

Change to:
```typescript
export async function logMeal(input: MealLogInput): Promise<InfoMessage> {
  try {
    const result = await logMealToDatabase(input);
    return {
      type: "info",
      data: {
        message: `Meal logged successfully! ${result.meal_type} on ${result.meal_date}`,
        details: result
      }
    };
  } catch (error) {
    console.error("[loopkitchen.nutrition.logMeal] Error:", error);
    return {
      type: "info",
      data: {
        message: "Failed to log meal",
        error: error.message
      }
    };
  }
}
```

3. **Update getDailyNutrition function** (line ~550)

Find:
```typescript
export async function getDailyNutrition(input: DailyNutritionInput): Promise<NutritionSummary> {
  // Placeholder response
  return {
    type: "nutrition_summary",
    data: {
      // ... placeholder data ...
    }
  };
}
```

Change to:
```typescript
export async function getDailyNutrition(input: DailyNutritionInput): Promise<NutritionSummary> {
  try {
    const summary = await getDailyNutritionFromDatabase(input);
    return {
      type: "nutrition_summary",
      data: summary
    };
  } catch (error) {
    console.error("[loopkitchen.nutrition.daily] Error:", error);
    // Return empty summary on error
    return {
      type: "nutrition_summary",
      data: {
        servings: 0,
        total: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        perServing: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        healthScore: 0,
        tags: [],
        warnings: ["No meals logged for this date"],
        insights: [],
        confidence: "low"
      }
    };
  }
}
```

---

### Step 3: Add Supabase Client (10 minutes)

**File**: `supabase/functions/_shared/loopkitchen/supabaseClient.ts` (create new file)

```typescript
/**
 * Supabase Client for LoopKitchen Database Operations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Get Supabase client instance
 */
export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Execute raw SQL query
 */
export async function executeSQL(query: string, params: any[] = []) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('exec_sql', {
    query,
    params
  });
  
  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }
  
  return data;
}
```

**Then import in `loopkitchen_nutrition.ts`**:
```typescript
import { getSupabaseClient } from "../_shared/loopkitchen/supabaseClient.ts";
```

---

### Step 4: Deploy Updated Functions (5 minutes)

```bash
# 1. Deploy to production
cd /home/ubuntu/loopgpt-backend
export SUPABASE_ACCESS_TOKEN="your-token"
supabase functions deploy mcp-tools --no-verify-jwt \
  --import-map supabase/functions/import_map.json

# 2. Verify deployment
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

---

### Step 5: Test Meal Logging (10 minutes)

**Test 1: Log a meal**

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.logMeal \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "mealType": "breakfast",
    "mealDate": "2025-12-06",
    "recipeTitle": "Scrambled Eggs",
    "nutrition": {
      "calories": 300,
      "protein": 20,
      "carbs": 5,
      "fat": 22,
      "fiber": 0,
      "sugar": 1,
      "sodium": 400
    },
    "servings": 1
  }' | jq '.'
```

**Expected response**:
```json
{
  "type": "info",
  "data": {
    "message": "Meal logged successfully! breakfast on 2025-12-06",
    "details": {
      "id": "...",
      "meal_type": "breakfast",
      "meal_date": "2025-12-06",
      "calories": 300,
      ...
    }
  }
}
```

**Test 2: Get daily summary**

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.daily \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "date": "2025-12-06"
  }' | jq '.'
```

**Expected response**:
```json
{
  "type": "nutrition_summary",
  "data": {
    "servings": 1,
    "total": {
      "calories": 300,
      "protein": 20,
      ...
    },
    "healthScore": 75,
    "tags": ["high-protein"],
    ...
  }
}
```

---

## Database Schema Details

### Tables Created

**1. `loopkitchen_meal_logs`** (Main meal logging table)
- Stores individual meal entries
- Nutrition breakdown per meal
- Recipe references
- Health scores and tags

**2. `loopkitchen_user_nutrition_prefs`** (User preferences)
- Daily calorie/macro targets
- Dietary preferences
- Allergies
- Activity level

**3. `loopkitchen_daily_nutrition`** (Materialized view)
- Pre-aggregated daily summaries
- Faster queries for common use cases
- Auto-refreshed via triggers

### Helper Functions

**1. `refresh_daily_nutrition_summary(user_id, date)`**
- Refreshes materialized view for specific user/date
- Called automatically after meal logging

**2. `get_weekly_nutrition(user_id, start_date, end_date)`**
- Aggregates nutrition across date range
- Returns weekly averages and totals

**3. `get_nutrition_progress(user_id, days)`**
- Tracks progress toward goals
- Compares actual vs targets
- Returns compliance percentage

---

## Troubleshooting

### Issue: "Supabase credentials not configured"

**Solution**: Verify environment variables in Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy functions

### Issue: "Table does not exist"

**Solution**: Run database migration:
```bash
supabase db push
```

Or execute SQL manually in Supabase Dashboard.

### Issue: "Permission denied"

**Solution**: Check Row Level Security (RLS) policies:
```sql
-- Disable RLS for testing (re-enable in production!)
ALTER TABLE loopkitchen_meal_logs DISABLE ROW LEVEL SECURITY;
```

### Issue: "Function returns placeholder"

**Solution**: Verify you uncommented the database code and redeployed:
```bash
grep -n "logMealToDatabase" supabase/functions/mcp-tools/loopkitchen_nutrition.ts
# Should show uncommented function
```

---

## Performance Considerations

### Indexes
The schema includes optimized indexes for:
- User ID lookups
- Date range queries
- User + date combinations

### Materialized Views
Daily summaries are pre-aggregated for fast retrieval.

**Refresh strategy**:
- Auto-refresh on meal insert/update/delete
- Manual refresh: `REFRESH MATERIALIZED VIEW loopkitchen_daily_nutrition;`

### Caching
Meal logging responses are NOT cached (always fresh data).  
Daily summaries CAN be cached (1 hour TTL recommended).

---

## Security

### Row Level Security (RLS)

**Enable RLS in production**:
```sql
-- Enable RLS on all tables
ALTER TABLE loopkitchen_meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopkitchen_user_nutrition_prefs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own meals"
  ON loopkitchen_meal_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own meals"
  ON loopkitchen_meal_logs
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own meals"
  ON loopkitchen_meal_logs
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own meals"
  ON loopkitchen_meal_logs
  FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Data Privacy
- No PII in logs
- User IDs are opaque
- Nutrition data encrypted at rest

---

## Rollback Plan

**If issues arise**:

1. **Disable meal logging** (keep other tools working):
   ```typescript
   // In loopkitchen_nutrition.ts
   export async function logMeal(input: MealLogInput): Promise<InfoMessage> {
     return {
       type: "info",
       data: {
         message: "Meal logging temporarily disabled for maintenance",
       }
     };
   }
   ```

2. **Drop tables** (if schema issues):
   ```sql
   DROP TABLE IF EXISTS loopkitchen_meal_logs CASCADE;
   DROP TABLE IF EXISTS loopkitchen_user_nutrition_prefs CASCADE;
   DROP MATERIALIZED VIEW IF EXISTS loopkitchen_daily_nutrition CASCADE;
   ```

3. **Restore from backup**:
   - Supabase auto-backups daily
   - Restore via Dashboard → Database → Backups

---

## Monitoring

### Key Metrics

**Database**:
- Table size growth
- Query performance (p95 latency)
- Index usage

**Application**:
- Meal logging success rate
- Daily summary cache hit rate
- Error rates

### Alerts

**Set up alerts for**:
- Database table > 1GB (scale up)
- Query latency > 500ms (optimize)
- Error rate > 1% (investigate)

---

## Next Steps After Activation

### Week 1
1. Monitor error logs
2. Track usage metrics
3. Gather user feedback
4. Optimize queries if needed

### Month 1
1. Add weekly/monthly summaries
2. Implement progress tracking
3. Add nutrition insights
4. Build analytics dashboard

### Future Enhancements
1. Meal photo uploads
2. Barcode scanning
3. Restaurant menu integration
4. Nutrition coaching AI

---

## Summary

**Activation Checklist**:
- [ ] Deploy database schema (Step 1)
- [ ] Uncomment database code (Step 2)
- [ ] Add Supabase client (Step 3)
- [ ] Deploy functions (Step 4)
- [ ] Test meal logging (Step 5)
- [ ] Enable RLS (Security)
- [ ] Set up monitoring (Monitoring)

**Estimated Time**: 30-60 minutes  
**Complexity**: Medium  
**Risk**: Low (can rollback easily)

---

**When you're ready to activate Phase 5, follow this guide step-by-step!** 🚀
