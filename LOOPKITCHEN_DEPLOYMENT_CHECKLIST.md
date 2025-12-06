# LoopKitchen Deployment Verification Checklist

**Version**: 1.8.0-loopkitchen-phase5  
**Date**: December 6, 2025  
**Purpose**: Step-by-step verification for safe deployment

---

## 📋 Pre-Deployment Checklist

### Environment Preparation

- [ ] **Dev/Staging Supabase project exists**
  - Project URL: `_______________________`
  - Project Ref: `_______________________`
  
- [ ] **OpenAI API key available**
  - Key starts with: `sk-...`
  - Quota confirmed: Yes / No
  
- [ ] **Supabase CLI installed**
  ```bash
  supabase --version
  # Should show v1.x.x or higher
  ```

- [ ] **Git repository up to date**
  ```bash
  cd /home/ubuntu/loopgpt-backend
  git pull origin master
  # Should show: Already up to date
  ```

---

## 🚀 Step 1: Deploy to Dev/Staging

### 1.1 Link to Dev Project

```bash
cd /home/ubuntu/loopgpt-backend
supabase link --project-ref <your-dev-project-ref>
```

- [ ] Successfully linked to dev project
- [ ] Confirmation message received

### 1.2 Set Environment Variables

**In Supabase Dashboard** (Project Settings → Edge Functions):

- [ ] `OPENAI_API_KEY` = `sk-...`
- [ ] `SUPABASE_URL` = `https://<project-ref>.supabase.co` (optional)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (optional, for database)
- [ ] `COMMERCE_ROUTER_URL` = `https://...` (optional, for commerce)

**Save changes** ✅

### 1.3 Deploy Shared Module

```bash
supabase functions deploy _shared
```

- [ ] Deployment successful
- [ ] No error messages
- [ ] Function version created

**Expected output**:
```
Deploying _shared (project ref: ...)
Deployed _shared successfully
```

### 1.4 Deploy MCP Tools

```bash
supabase functions deploy mcp-tools
```

- [ ] Deployment successful
- [ ] No error messages
- [ ] Function version created

**Expected output**:
```
Deploying mcp-tools (project ref: ...)
Deployed mcp-tools successfully
```

### 1.5 Get Function URL

```bash
supabase functions list
```

- [ ] `mcp-tools` function listed
- [ ] Function URL noted: `_______________________`

---

## ✅ Step 2: Basic Verification

### 2.1 Health Check

```bash
curl https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.8.0-loopkitchen-phase4",
  "timestamp": "...",
  "services": {
    "environment": {
      "hasOpenAI": true,
      "hasSupabase": true/false,
      "hasCommerceRouter": true/false
    }
  }
}
```

**Verification**:
- [ ] `status` = `"healthy"`
- [ ] `version` = `"1.8.0-loopkitchen-phase4"` or higher
- [ ] `hasOpenAI` = `true`

### 2.2 Manifest Check

```bash
curl https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/ | jq '.tools[] | select(.name | startswith("loopkitchen"))'
```

**Expected**: 9 LoopKitchen tools listed

**Verification**:
- [ ] `loopkitchen.recipes.generate` - status: `available`
- [ ] `loopkitchen.recipes.details` - status: `available`
- [ ] `loopkitchen.nutrition.analyze` - status: `available`
- [ ] `loopkitchen.nutrition.logMeal` - status: `planned`
- [ ] `loopkitchen.nutrition.daily` - status: `planned`
- [ ] `loopkitchen.mealplan.generate` - status: `available`
- [ ] `loopkitchen.mealplan.withGrocery` - status: `available`
- [ ] `loopkitchen.mealplan.prepareOrder` - status: `available`
- [ ] `loopkitchen.mealplan.complete` - status: `available`

---

## 🧪 Step 3: Integration Tests

### 3.1 Run Full Test Suite

```bash
cd /home/ubuntu/loopgpt-backend
./tests/loopkitchen_integration_tests.sh https://<your-dev-project>.supabase.co/functions/v1/mcp-tools
```

**Expected Output**:
```
========================================
LoopKitchen Integration Test Suite
Phase 5 - Final Testing
========================================

[Tests running...]

╔════════════════════════════════════════╗
║  Test Results Summary                  ║
╚════════════════════════════════════════╝

Passed:  X
Failed:  0
Skipped: Y
Total:   Z

╔════════════════════════════════════════╗
║  ✓ ALL TESTS PASSED!                  ║
╚════════════════════════════════════════╝
```

**Verification**:
- [ ] All critical tests passed
- [ ] Failed count = 0 (or acceptable failures documented)
- [ ] Performance tests within targets

### 3.2 Document Test Results

**Test Run Date**: `_______________________`  
**Total Tests**: `_______`  
**Passed**: `_______`  
**Failed**: `_______`  
**Skipped**: `_______`

**Failed Tests** (if any):
1. Test name: `_______________________`
   - Error: `_______________________`
   - Action: `_______________________`

---

## 🔍 Step 4: Manual Testing

### 4.1 Test Recipe Generation

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick", "Asian"],
    "count": 3
  }' | jq '.'
```

**Verification**:
- [ ] Returns array of 3 recipes
- [ ] Each recipe has `type: "RecipeCardCompact"`
- [ ] Recipes have realistic titles
- [ ] Ingredients match input
- [ ] Response time < 5 seconds

### 4.2 Test Nutrition Analysis

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "chicken breast", "quantity": "200g"},
      {"name": "rice", "quantity": "1 cup"}
    ],
    "servings": 2
  }' | jq '.'
```

**Verification**:
- [ ] Returns `type: "NutritionSummary"`
- [ ] Has `totalNutrition` and `perServing`
- [ ] All 7 macros present (calories, protein, carbs, fat, fiber, sugar, sodium)
- [ ] `healthScore` is 0-100
- [ ] `confidence` is "low", "medium", or "high"
- [ ] Response time < 3 seconds

### 4.3 Test Meal Planning

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 7
  }' | jq '.'
```

**Verification**:
- [ ] Returns `type: "WeekPlanner"`
- [ ] Has 7 days
- [ ] Each day has breakfast, lunch, dinner
- [ ] Each meal has `recipeId`, `title`, `approxCalories`
- [ ] `dayTotalCalories` ≈ 2000 (±15%)
- [ ] `weeklySummary` present with notes
- [ ] Response time < 5 seconds

### 4.4 Test Recipe Details

```bash
# First, get a recipe from generation
# Then use its recipeId and title here

curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.details \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "quick-chicken-rice-bowl-0",
    "recipeTitle": "Quick Chicken Rice Bowl",
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick"],
    "chaosTarget": 5
  }' | jq '.'
```

**Verification**:
- [ ] Returns `type: "RecipeCardDetailed"`
- [ ] Has `instructions` array
- [ ] Has `nutrition` object (NutritionSummary)
- [ ] Instructions are step-by-step
- [ ] Response time < 5 seconds

### 4.5 Test Meal Plan with Grocery

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.withGrocery \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "pasta", "tomatoes"],
    "caloriesPerDay": 1800,
    "days": 5
  }' | jq '.'
```

**Verification**:
- [ ] Returns object with `mealPlan` and `groceryList`
- [ ] `mealPlan` is WeekPlanner widget
- [ ] `groceryList` is GroceryList widget
- [ ] Grocery list has categories (Produce, Meat & Seafood, etc.)
- [ ] Items have `name`, `quantity`, `checked: false`
- [ ] Response time < 8 seconds

---

## 📊 Step 5: Performance Verification

### 5.1 Measure Response Times

**Recipe Generation**:
```bash
time curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "count": 3}' > /dev/null
```

- [ ] Time: `_______` seconds (target: < 5s)

**Nutrition Analysis**:
```bash
time curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{"ingredients": [{"name": "chicken", "quantity": "200g"}], "servings": 1}' > /dev/null
```

- [ ] Time: `_______` seconds (target: < 3s)

**Meal Planning**:
```bash
time curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "days": 7}' > /dev/null
```

- [ ] Time: `_______` seconds (target: < 5s)

### 5.2 Performance Summary

- [ ] All response times within targets
- [ ] No timeouts observed
- [ ] Consistent performance across multiple runs

---

## 🐛 Step 6: Error Handling

### 6.1 Test Missing Ingredients

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{"vibes": ["Quick"], "count": 3}' | jq '.'
```

**Verification**:
- [ ] Returns `type: "InfoMessage"`
- [ ] `severity: "error"`
- [ ] Message mentions missing ingredients

### 6.2 Test Invalid Input

```bash
curl -X POST https://<your-dev-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{"servings": 2}' | jq '.'
```

**Verification**:
- [ ] Returns `type: "InfoMessage"`
- [ ] `severity: "error"`
- [ ] Error message is clear and helpful

---

## 📝 Step 7: Log Review

### 7.1 Check Function Logs

```bash
supabase functions logs mcp-tools --tail
```

**Look for**:
- [ ] No critical errors
- [ ] LoopKitchen logs present (`[loopkitchen.recipes]`, `[loopkitchen.nutrition]`, etc.)
- [ ] Response times logged
- [ ] No OpenAI API errors

### 7.2 Document Issues

**Issues Found**:
1. Issue: `_______________________`
   - Severity: Critical / Major / Minor
   - Action: `_______________________`

---

## ✅ Step 8: Dev Deployment Sign-Off

### 8.1 Verification Complete

- [ ] All health checks passed
- [ ] Integration tests passed
- [ ] Manual tests passed
- [ ] Performance targets met
- [ ] Error handling works correctly
- [ ] Logs reviewed, no critical issues

### 8.2 Issues Resolution

- [ ] All critical issues resolved
- [ ] Major issues resolved or documented
- [ ] Minor issues documented for future fix

### 8.3 Sign-Off

**Verified By**: `_______________________`  
**Date**: `_______________________`  
**Dev Environment**: `_______________________`  
**Status**: ✅ Ready for Production / ⏳ Issues to Fix

---

## 🚀 Step 9: Production Deployment (Only if Dev Sign-Off Complete)

### 9.1 Pre-Production Checklist

- [ ] Dev deployment verified and signed off
- [ ] All tests passed in dev
- [ ] Performance acceptable in dev
- [ ] No critical issues remaining
- [ ] Production OpenAI API key ready
- [ ] Production Supabase project ready

### 9.2 Link to Production Project

```bash
cd /home/ubuntu/loopgpt-backend
supabase link --project-ref <your-prod-project-ref>
```

- [ ] Successfully linked to production project

### 9.3 Set Production Environment Variables

**In Supabase Dashboard** (Production Project → Settings → Edge Functions):

- [ ] `OPENAI_API_KEY` = `sk-...` (production key)
- [ ] Other variables as needed

### 9.4 Deploy to Production

```bash
# Deploy shared module
supabase functions deploy _shared

# Deploy MCP tools
supabase functions deploy mcp-tools
```

- [ ] Both deployments successful
- [ ] No error messages

### 9.5 Production Verification

**Health Check**:
```bash
curl https://<your-prod-project>.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

- [ ] Status: healthy
- [ ] Version correct
- [ ] OpenAI configured

**Quick Test**:
```bash
curl -X POST https://<your-prod-project>.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "count": 1}' | jq '.'
```

- [ ] Returns valid recipe
- [ ] Response time acceptable

### 9.6 Production Sign-Off

**Deployed By**: `_______________________`  
**Date**: `_______________________`  
**Production URL**: `_______________________`  
**Status**: ✅ Live

---

## 📊 Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor error logs hourly
- [ ] Check performance metrics
- [ ] Track OpenAI API usage
- [ ] Verify no user-reported issues

### First Week

- [ ] Daily log review
- [ ] Performance trending
- [ ] Usage analytics
- [ ] Plan optimizations

---

## 🆘 Rollback Plan

**If critical issues found in production**:

1. **Immediate Rollback**:
   ```bash
   supabase functions list --version
   supabase functions deploy mcp-tools --version <previous-version-id>
   ```

2. **Notify Team**:
   - Document issue
   - Communicate status
   - Plan fix

3. **Fix in Dev**:
   - Reproduce issue in dev
   - Fix and test
   - Re-deploy to dev
   - Re-run this checklist

4. **Re-deploy to Production**:
   - Only after dev verification
   - Follow this checklist again

---

## 📞 Support Contacts

**For Issues**:
- OpenAI API: https://status.openai.com
- Supabase: https://status.supabase.com
- Documentation: See LOOPKITCHEN_DEPLOYMENT_GUIDE.md

---

**Checklist Version**: 1.0  
**Last Updated**: December 6, 2025  
**LoopKitchen Integration Project**
