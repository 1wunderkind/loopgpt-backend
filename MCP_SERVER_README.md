# TheLoopGPT.ai MCP Server Documentation

## Overview

This is the Model Context Protocol (MCP) server for TheLoopGPT.ai, designed for integration with the upcoming ChatGPT App Store. The MCP server acts as a service layer that exposes 19 specialized meal planning, weight tracking, delivery, and geolocation tools to ChatGPT.

**Architecture:** Service Layer Pattern  
**Protocol:** Model Context Protocol (MCP)  
**Platform:** Supabase Edge Functions (Deno runtime)  
**Deployment:** Automated via GitHub Actions

---

## Quick Start

### Accessing the MCP Server

**Base URL:** `https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server`

**Get Manifest:**
```bash
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server
```

**Execute a Tool:**
```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server/tools/generate_week_plan \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "diet": "vegetarian",
    "calories_per_day": 2000
  }'
```

---

## Architecture

### Service Layer Pattern

The MCP server follows the **Service Layer Pattern** for clean separation of concerns:

```
ChatGPT App Store
       ↓
   MCP Server (Entry Point)
       ↓
   [Validation & Routing]
       ↓
   Specialized Edge Functions (Business Logic)
       ↓
   Supabase Database
```

**Benefits:**
- ✅ Single entry point for ChatGPT
- ✅ Centralized validation and error handling
- ✅ Business logic remains in specialized, maintainable functions
- ✅ Easy to add new tools without changing the MCP server
- ✅ Scalable and testable

---

## Available Tools (19 Total)

### 🍽️ Meal Planning (3 tools)

| Tool | Description |
|------|-------------|
| `generate_week_plan` | Generate personalized 7-day meal plans |
| `log_meal_plan` | Save meal plans to user account |
| `get_affiliate_links` | Get country-specific grocery affiliate links |

### ⚖️ Weight Tracking (6 tools)

| Tool | Description |
|------|-------------|
| `log_weight` | Record daily weight entry |
| `weekly_trend` | Calculate weekly weight trends |
| `evaluate_plan_outcome` | Evaluate meal plan effectiveness |
| `push_plan_feedback` | Submit user feedback on meal plans |
| `get_weight_prefs` | Get user weight goals and preferences |
| `update_weight_prefs` | Update weight goals and preferences |

### 🚚 Delivery Integration (1 tool)

| Tool | Description |
|------|-------------|
| `get_delivery_recommendations` | Get personalized meal delivery recommendations |

### 🍔 MealMe Integration (7 tools)

| Tool | Description |
|------|-------------|
| `mealme_search` | Search restaurants via MealMe API |
| `mealme_create_cart` | Create shopping cart |
| `mealme_get_quotes` | Get delivery quotes |
| `mealme_checkout_url` | Generate checkout URL |
| `mealme_webhook` | Handle MealMe webhooks (internal) |
| `mealme_order_plan` | Order entire meal plan |
| `normalize_ingredients` | Normalize ingredient names |

### 🌍 Geolocation (4 tools)

| Tool | Description |
|------|-------------|
| `get_user_location` | Detect user location from IP |
| `update_user_location` | Update user location preferences |
| `get_affiliate_by_country` | Get country-specific affiliates |
| `change_location` | Change user's active country/region |

---

## API Reference

### GET /

Returns the complete MCP manifest with all tool definitions.

**Response:**
```json
{
  "name": "TheLoopGPT.ai",
  "version": "1.0.0",
  "tools": [...]
}
```

### POST /tools/{tool_name}

Executes a specific tool.

**Request:**
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

**Success Response (200):**
```json
{
  "type": "mcp_result",
  "tool": "tool_name",
  "result": {...},
  "timestamp": "2025-11-01T12:00:00.000Z",
  "duration_ms": 123.45
}
```

**Error Response (400/404/500):**
```json
{
  "type": "mcp_error",
  "tool": "tool_name",
  "error": "Error message",
  "details": {...},
  "timestamp": "2025-11-01T12:00:00.000Z",
  "duration_ms": 45.67
}
```

---

## Authentication

### Current Mode: None

The MCP server is currently configured with `"authentication": { "type": "none" }` for development and testing.

### Enabling Bearer Token Authentication

To enable production authentication:

1. **Open** `supabase/functions/mcp-server/index.ts`

2. **Find** the commented authentication block (around line 260):
```typescript
// Optional: Check for Bearer token authentication
// Uncomment this block to enable authentication
/*
const authHeader = req.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  ...
}
*/
```

3. **Uncomment** the entire block

4. **Update** `supabase/manifest.json`:
```json
"authentication": {
  "type": "bearer"
}
```

5. **Redeploy:**
```bash
supabase functions deploy mcp-server
```

### Using Bearer Tokens

Once enabled, all requests must include:
```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server/tools/generate_week_plan \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Error Handling

The MCP server provides comprehensive error handling with helpful messages:

### Validation Errors (400)

**Missing Required Field:**
```json
{
  "type": "mcp_error",
  "tool": "generate_week_plan",
  "error": "Input validation failed",
  "details": {
    "validation_errors": [
      "Missing required field: user_id"
    ]
  }
}
```

**Invalid JSON:**
```json
{
  "type": "mcp_error",
  "tool": "generate_week_plan",
  "error": "Invalid JSON in request body",
  "details": {
    "hint": "Ensure request body is valid JSON"
  }
}
```

### Not Found Errors (404)

**Tool Not Found:**
```json
{
  "type": "mcp_error",
  "tool": "invalid_tool",
  "error": "Tool 'invalid_tool' not found",
  "details": {
    "available_tools": ["generate_week_plan", "log_weight", ...]
  }
}
```

### Server Errors (500)

**Function Invocation Failed:**
```json
{
  "type": "mcp_error",
  "tool": "generate_week_plan",
  "error": "Tool invocation failed",
  "details": {
    "error_details": {...},
    "invocation_duration_ms": 123.45
  }
}
```

---

## Logging

The MCP server logs all requests in structured JSON format:

```json
{
  "timestamp": "2025-11-01T12:00:00.000Z",
  "tool": "generate_week_plan",
  "duration_ms": 234.56,
  "status": "success",
  "service": "mcp-server",
  "version": "1.0.0"
}
```

**View Logs:**
1. Go to Supabase Dashboard → Functions → mcp-server → Logs
2. Or use Supabase CLI: `supabase functions logs mcp-server`

---

## Deployment

### Via GitHub Actions (Recommended)

The MCP server is automatically deployed when you push to the `master` branch:

```bash
git add supabase/functions/mcp-server/
git commit -m "Update MCP server"
git push origin master
```

GitHub Actions will:
1. Deploy all Edge Functions in parallel
2. Update environment variables
3. Verify deployment

### Manual Deployment via Supabase CLI

```bash
# Deploy MCP server only
supabase functions deploy mcp-server --project-ref qmagnwxeijctkksqbcqz

# Deploy all functions
supabase functions deploy --project-ref qmagnwxeijctkksqbcqz
```

---

## Testing

### Test the Manifest Endpoint

```bash
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server | jq
```

Expected: Full manifest JSON with 19 tools

### Test a Tool Execution

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server/tools/get_user_location \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8"}' | jq
```

Expected: MCP result with location data

### Test Validation

```bash
# Missing required field
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server/tools/generate_week_plan \
  -H "Content-Type: application/json" \
  -d '{"diet": "vegan"}' | jq
```

Expected: 400 error with validation details

---

## Environment Variables

Set these in Supabase Dashboard → Project Settings → Edge Functions:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Public API key | ✅ Yes |
| `SERVICE_ROLE_KEY` | Service role key (for elevated privileges) | ⚠️ Optional |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) | ⚠️ Optional |

---

## Performance

**Typical Response Times:**
- Manifest serving: < 50ms
- Simple tools (log_weight): 100-300ms
- Complex tools (generate_week_plan): 2-5 seconds (AI generation)
- MealMe tools: 500-1500ms (external API calls)

**Optimization:**
- Manifest is cached in memory
- Validation is lightweight
- Delegation uses Supabase's internal network (fast)

---

## Troubleshooting

### "Manifest file not found"

**Cause:** `manifest.json` is not in the correct location.

**Fix:** Ensure `supabase/manifest.json` exists and is committed to the repository.

### "Tool invocation failed"

**Cause:** The underlying Edge Function returned an error.

**Fix:** Check the specific function's logs in Supabase Dashboard.

### "CORS error" in browser

**Cause:** CORS headers not properly configured.

**Fix:** The MCP server already includes CORS headers. Ensure you're using the correct URL.

---

## ChatGPT App Store Integration

### Registering Your MCP Server

When the ChatGPT App Store launches:

1. **Go to** OpenAI Developer Portal
2. **Create New App**
3. **Enter MCP Server URL:** `https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server`
4. **Submit for Review**

OpenAI will:
- Fetch your manifest
- Validate tool definitions
- Test a few tool executions
- Approve your app for the store

### What ChatGPT Will Do

When a user interacts with your app:

1. User asks: "Create a vegetarian meal plan for me"
2. ChatGPT reads your manifest and identifies `generate_week_plan`
3. ChatGPT calls: `POST /tools/generate_week_plan` with appropriate parameters
4. Your MCP server validates and delegates to the Edge Function
5. The result is returned to ChatGPT
6. ChatGPT presents the meal plan to the user

---

## Support & Resources

**Supabase Dashboard:** https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz  
**GitHub Repository:** https://github.com/1wunderkind/loopgpt-backend  
**OpenAI Apps SDK Docs:** https://developers.openai.com/apps-sdk/  
**MCP Specification:** https://modelcontextprotocol.io/

---

## Version History

**v1.0.0** (November 1, 2025)
- Initial MCP server implementation
- 19 tools across 5 categories
- Comprehensive validation and error handling
- Production-ready with optional authentication
- Full logging and monitoring

---

*Built with ❤️ for the ChatGPT App Store*

