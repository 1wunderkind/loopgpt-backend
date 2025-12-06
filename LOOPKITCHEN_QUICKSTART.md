# LoopKitchen Quick Start Guide

**For**: Dev/Staging Environment Testing  
**Time**: ~15 minutes  
**Prerequisites**: Supabase CLI, OpenAI API key

---

## 🚀 Quick Deploy to Dev (5 Steps)

### Step 1: Link to Your Dev Project (2 min)

```bash
cd /home/ubuntu/loopgpt-backend
supabase link --project-ref YOUR_DEV_PROJECT_REF
```

**Get your project ref**: Supabase Dashboard → Project Settings → General

---

### Step 2: Set Environment Variables (3 min)

**Go to**: Supabase Dashboard → Project Settings → Edge Functions

**Add**:
- `OPENAI_API_KEY` = `sk-...` (your OpenAI key)

**Click**: Save

---

### Step 3: Deploy Functions (5 min)

```bash
# Deploy shared module
supabase functions deploy _shared

# Deploy MCP tools
supabase functions deploy mcp-tools
```

**Wait for**: "Deployed successfully" messages

---

### Step 4: Verify Deployment (2 min)

```bash
# Get your function URL
supabase functions list

# Test health endpoint (replace URL)
curl https://YOUR_PROJECT.supabase.co/functions/v1/mcp-tools/health | jq '.'
```

**Expected**:
```json
{
  "status": "healthy",
  "version": "1.8.0-loopkitchen-phase4"
}
```

---

### Step 5: Run Integration Tests (3 min)

```bash
cd /home/ubuntu/loopgpt-backend
./tests/loopkitchen_integration_tests.sh https://YOUR_PROJECT.supabase.co/functions/v1/mcp-tools
```

**Expected**: "✓ ALL TESTS PASSED!"

---

## ✅ Success!

If all tests passed, your dev environment is ready!

**Next**: Review test results and proceed to production deployment using `LOOPKITCHEN_DEPLOYMENT_CHECKLIST.md`

---

## 🧪 Quick Manual Test

Try generating a recipe:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick"],
    "count": 1
  }' | jq '.'
```

**Expected**: A JSON recipe with title, ingredients, and instructions

---

## 🐛 Troubleshooting

### "OpenAI API error"
- Check `OPENAI_API_KEY` is set correctly
- Verify API key has quota
- Check OpenAI status: https://status.openai.com

### "Function not found"
- Ensure both `_shared` and `mcp-tools` deployed
- Check `supabase functions list`

### "Timeout"
- First request may be slow (cold start)
- Try again - should be faster

### Tests fail
- Check logs: `supabase functions logs mcp-tools --tail`
- Review error messages
- See `LOOPKITCHEN_DEPLOYMENT_CHECKLIST.md` for detailed debugging

---

## 📚 Full Documentation

- **Deployment Checklist**: `LOOPKITCHEN_DEPLOYMENT_CHECKLIST.md`
- **API Docs**: `LOOPKITCHEN_API_DOCS.md`
- **Deployment Guide**: `LOOPKITCHEN_DEPLOYMENT_GUIDE.md`

---

*Quick Start Guide - LoopKitchen Integration*
