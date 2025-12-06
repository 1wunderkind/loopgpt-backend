# LoopKitchen Debugging Guide

**Version**: 1.0  
**Last Updated**: December 6, 2025  
**Purpose**: Troubleshoot and debug LoopKitchen integration issues

---

## 📋 Table of Contents

1. [Common Issues](#common-issues)
2. [Debugging Tools](#debugging-tools)
3. [Error Messages](#error-messages)
4. [Performance Issues](#performance-issues)
5. [Data Quality Issues](#data-quality-issues)
6. [Issue Tracking Template](#issue-tracking-template)

---

## 🐛 Common Issues

### Issue 1: "OpenAI API error"

**Symptoms**:
- Tools return InfoMessage with "OpenAI API error"
- Logs show "401 Unauthorized" or "429 Too Many Requests"

**Causes**:
1. Invalid API key
2. API key quota exceeded
3. API key not set in environment

**Solutions**:

**Check API key is set**:
```bash
# In Supabase Dashboard
Project Settings → Edge Functions → Environment Variables
# Verify OPENAI_API_KEY exists
```

**Verify API key**:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Check quota**:
- Visit: https://platform.openai.com/usage
- Verify you have remaining quota
- Check rate limits for your tier

**Fix**:
1. Set correct API key in Supabase Dashboard
2. Add credits to OpenAI account
3. Wait if rate limited (retry after 60s)

---

### Issue 2: "Function not found" or 404

**Symptoms**:
- `curl` returns 404
- "Function not found" error

**Causes**:
1. Functions not deployed
2. Wrong function name
3. Wrong project URL

**Solutions**:

**List deployed functions**:
```bash
supabase functions list
```

**Verify mcp-tools is deployed**:
- Should show `mcp-tools` in list
- Note the version

**Re-deploy if missing**:
```bash
supabase functions deploy _shared
supabase functions deploy mcp-tools
```

**Check URL format**:
```
https://<project-ref>.supabase.co/functions/v1/mcp-tools/health
                                              ^^^^^^^^^^^^
                                              Must match function name
```

---

### Issue 3: Timeout / Slow Response

**Symptoms**:
- Requests take > 30 seconds
- Timeout errors
- "Function execution timed out"

**Causes**:
1. Cold start (first request)
2. OpenAI API slow
3. Too many parallel GPT calls
4. Large input data

**Solutions**:

**Cold start** (expected for first request):
- Wait 10-15 seconds for first request
- Subsequent requests should be faster
- No action needed

**Check OpenAI status**:
- Visit: https://status.openai.com
- Verify no outages

**Optimize request**:
- Reduce `count` parameter (e.g., 3 instead of 10)
- Reduce `days` parameter (e.g., 3 instead of 14)
- Use smaller ingredient lists

**Monitor logs**:
```bash
supabase functions logs mcp-tools --tail
```
- Look for GPT call durations
- Identify slow operations

---

### Issue 4: Invalid Widget Structure

**Symptoms**:
- Widget missing expected fields
- Frontend rendering errors
- Type errors in UI

**Causes**:
1. GPT returned invalid JSON
2. Schema validation failed
3. Widget type mismatch

**Solutions**:

**Check response structure**:
```bash
curl -X POST <mcp-url>/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken"], "count": 1}' | jq '.'
```

**Verify widget type**:
- Should have `type` field
- Should have `data` field
- Should have `meta` field

**Example valid widget**:
```json
{
  "type": "RecipeCardCompact",
  "data": {
    "recipeId": "...",
    "title": "...",
    "ingredients": [...]
  },
  "meta": {
    "generatedAt": "...",
    "durationMs": 3200
  }
}
```

**Check logs for schema errors**:
```bash
supabase functions logs mcp-tools | grep "schema"
```

**Fix**:
- GPT schema validation is strict mode
- If schema errors persist, check prompts in `_shared/loopkitchen/prompts.ts`
- May need to adjust GPT temperature or retry logic

---

### Issue 5: Nutrition Analysis Inaccurate

**Symptoms**:
- Calorie counts seem wrong
- Macros don't add up
- Health score doesn't make sense

**Causes**:
1. GPT estimation error
2. Ingredient quantity parsing issue
3. Serving size mismatch

**Solutions**:

**Check confidence level**:
```json
{
  "confidence": "low"  // ← GPT is uncertain
}
```

**Verify input**:
- Ingredient quantities should be specific: "200g", "1 cup", "2 pieces"
- Avoid vague quantities: "some", "a bit", "handful"

**Cross-check**:
- Compare with known nutrition databases (USDA, etc.)
- Verify serving size matches

**Improve accuracy**:
- Use more specific ingredient names: "chicken breast" not "chicken"
- Include preparation method: "grilled chicken breast"
- Specify quantities with units

---

### Issue 6: Meal Plan Doesn't Meet Calorie Target

**Symptoms**:
- Daily calories far from target
- Meals too high/low calorie

**Causes**:
1. GPT optimization challenge
2. Ingredient constraints
3. Calorie target unrealistic

**Solutions**:

**Check flexibility**:
- MealPlannerGPT allows ±15% variance
- 2000 cal target → 1700-2300 acceptable

**Review weekly summary**:
```json
{
  "weeklySummary": {
    "avgDailyCalories": 1950,  // ← Check this
    "notes": "..."
  }
}
```

**Adjust request**:
- Provide more ingredients for flexibility
- Remove strict diet constraints
- Adjust calorie target to realistic range

---

## 🔧 Debugging Tools

### Tool 1: Health Check

**Purpose**: Verify service is running and configured

```bash
curl https://<project>.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

**Check**:
- `status: "healthy"`
- `hasOpenAI: true`
- Version matches deployed code

---

### Tool 2: Manifest Check

**Purpose**: Verify all tools registered

```bash
curl https://<project>.supabase.co/functions/v1/mcp-tools/ | jq '.tools'
```

**Check**:
- 9 LoopKitchen tools listed
- Each has `name`, `description`, `inputSchema`

---

### Tool 3: Function Logs

**Purpose**: View real-time logs

```bash
supabase functions logs mcp-tools --tail
```

**Look for**:
- `[loopkitchen.recipes]` - Recipe generation logs
- `[loopkitchen.nutrition]` - Nutrition analysis logs
- `[loopkitchen.mealplan]` - Meal planning logs
- Error messages
- Performance timings

---

### Tool 4: Integration Test Suite

**Purpose**: Comprehensive testing

```bash
./tests/loopkitchen_integration_tests.sh <mcp-url>
```

**Provides**:
- Pass/fail for each test
- Performance measurements
- Error details

---

### Tool 5: Manual cURL Testing

**Purpose**: Test specific scenarios

**Recipe Generation**:
```bash
curl -X POST <mcp-url>/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice"],
    "vibes": ["Quick"],
    "count": 1
  }' | jq '.'
```

**Nutrition Analysis**:
```bash
curl -X POST <mcp-url>/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "chicken breast", "quantity": "200g"}
    ],
    "servings": 1
  }' | jq '.'
```

**Meal Planning**:
```bash
curl -X POST <mcp-url>/tools/loopkitchen.mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 3
  }' | jq '.'
```

---

## 📝 Error Messages

### "ingredients is required"

**Cause**: Missing `ingredients` parameter

**Fix**: Add `ingredients` array to request
```json
{
  "ingredients": ["chicken", "rice"]
}
```

---

### "recipeId is required"

**Cause**: Missing `recipeId` for recipe details

**Fix**: Get `recipeId` from recipe generation first
```json
{
  "recipeId": "quick-chicken-rice-bowl-0",
  "recipeTitle": "Quick Chicken Rice Bowl",
  "ingredients": ["chicken", "rice"]
}
```

---

### "Must provide either recipes or ingredients"

**Cause**: Nutrition analysis needs input

**Fix**: Provide one of:
```json
// Option 1: From recipes
{
  "recipes": [{
    "title": "...",
    "servings": 2,
    "ingredients": [...]
  }]
}

// Option 2: From ingredients
{
  "ingredients": [
    {"name": "chicken", "quantity": "200g"}
  ],
  "servings": 1
}
```

---

### "OpenAI API error: ..."

**Cause**: OpenAI API issue

**Fix**: See [Issue 1: OpenAI API error](#issue-1-openai-api-error)

---

### "Database not configured"

**Cause**: Meal logging requires database (Phase 5 feature)

**Status**: Expected for Phase 4 deployment

**Fix**: 
- For now, meal logging returns placeholder
- To enable: Run database migration (see `LOOPKITCHEN_DEPLOYMENT_GUIDE.md`)

---

## ⚡ Performance Issues

### Slow Recipe Generation (> 5s)

**Debug**:
1. Check logs for GPT call duration
2. Verify OpenAI API status
3. Reduce `count` parameter

**Optimize**:
- Use `count: 3` instead of `count: 10`
- Reduce ingredient list size
- Lower `chaosTarget` (less creative = faster)

---

### Slow Meal Planning (> 5s)

**Debug**:
1. Check `days` parameter
2. Verify calorie optimization complexity
3. Check logs for GPT retries

**Optimize**:
- Use `days: 3` for testing instead of `days: 14`
- Remove strict diet constraints
- Simplify ingredient list

---

### Slow Nutrition Analysis (> 3s)

**Debug**:
1. Check number of ingredients
2. Verify serving size calculations

**Optimize**:
- Reduce number of ingredients
- Use simpler ingredient names
- Avoid complex recipes

---

## 📊 Data Quality Issues

### Recipes Don't Match Ingredients

**Cause**: GPT creativity too high

**Fix**: Lower `chaosTarget`
```json
{
  "chaosTarget": 3  // More conservative
}
```

---

### Nutrition Seems Inaccurate

**Cause**: GPT estimation

**Fix**:
- Check `confidence` field
- Use more specific ingredients
- Verify quantities have units

---

### Meal Plan Not Balanced

**Cause**: Optimization challenge

**Fix**:
- Provide more ingredients
- Relax calorie target
- Check `weeklySummary.notes` for GPT explanation

---

## 🎫 Issue Tracking Template

Use this template to track issues:

```markdown
## Issue #XXX: [Short Title]

**Date**: YYYY-MM-DD
**Reporter**: [Name]
**Environment**: Dev / Staging / Production
**Severity**: Critical / Major / Minor

### Description
[What happened?]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen?]

### Actual Behavior
[What actually happened?]

### Request
```json
{
  "tool": "loopkitchen.xxx",
  "input": {...}
}
```

### Response
```json
{
  "error": "..."
}
```

### Logs
```
[Relevant log entries]
```

### Environment
- MCP URL: https://...
- Function Version: 1.8.0-loopkitchen-phaseX
- OpenAI Model: gpt-4o-mini
- Timestamp: YYYY-MM-DD HH:MM:SS

### Investigation
[What was checked?]
- [ ] Health check
- [ ] Logs reviewed
- [ ] Manual test performed
- [ ] Integration tests run

### Root Cause
[What caused the issue?]

### Solution
[How was it fixed?]

### Prevention
[How to prevent in future?]

### Status
- [ ] Reported
- [ ] Investigating
- [ ] Fix in progress
- [ ] Fixed in dev
- [ ] Deployed to production
- [ ] Verified
- [ ] Closed
```

---

## 📞 Escalation

### When to Escalate

**Critical** (escalate immediately):
- Service completely down
- Data corruption
- Security issue

**Major** (escalate within 4 hours):
- Feature not working
- Performance severely degraded
- Multiple users affected

**Minor** (track and fix):
- Edge case bug
- Minor data quality issue
- Documentation error

### Escalation Checklist

Before escalating:
- [ ] Checked health endpoint
- [ ] Reviewed logs
- [ ] Attempted manual test
- [ ] Checked OpenAI status
- [ ] Checked Supabase status
- [ ] Documented issue with template above

### External Resources

- **OpenAI Status**: https://status.openai.com
- **Supabase Status**: https://status.supabase.com
- **OpenAI Support**: https://help.openai.com
- **Supabase Support**: https://supabase.com/support

---

## 🔍 Advanced Debugging

### Enable Verbose Logging

**In code** (`_shared/loopkitchen/callModel.ts`):
```typescript
// Uncomment debug logs
console.log('[DEBUG] GPT Request:', JSON.stringify(request, null, 2));
console.log('[DEBUG] GPT Response:', JSON.stringify(response, null, 2));
```

**Re-deploy**:
```bash
supabase functions deploy mcp-tools
```

---

### Test GPT Prompts Directly

**Extract prompt** from `_shared/loopkitchen/prompts.ts`

**Test in OpenAI Playground**:
1. Go to: https://platform.openai.com/playground
2. Paste prompt
3. Set model: `gpt-4o-mini`
4. Set response format: JSON
5. Test with sample input

---

### Validate Widget Schemas

**Use TypeScript**:
```typescript
import { RecipeCardCompact } from './_shared/loopkitchen/types';

// Type-check response
const widget: RecipeCardCompact = response;
```

**Runtime validation**:
```typescript
if (!widget.type || !widget.data || !widget.meta) {
  throw new Error('Invalid widget structure');
}
```

---

## 📚 Related Documentation

- **API Docs**: `LOOPKITCHEN_API_DOCS.md`
- **Deployment Guide**: `LOOPKITCHEN_DEPLOYMENT_GUIDE.md`
- **Deployment Checklist**: `LOOPKITCHEN_DEPLOYMENT_CHECKLIST.md`
- **Test Validation**: `tests/loopkitchen_*_validation.md`

---

*Debugging Guide - LoopKitchen Integration*  
*Version 1.0 - December 6, 2025*
