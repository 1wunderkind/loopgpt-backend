# Journey 1 Implementation Guide

## Overview

This guide explains how to integrate Journey 1 (Onboarding & First Meal Plan) into the existing MCP server.

---

## Files Created

1. **`mcp-tools-journey-1.json`** - Updated tool descriptions optimized for ChatGPT
2. **`response-formatter.ts`** - Formats raw data into user-friendly responses
3. **`journey-1-orchestrator.ts`** - Coordinates multiple tool calls
4. **`IMPLEMENTATION-GUIDE.md`** - This file

---

## Integration Steps

### Step 1: Update MCP Server Tool Descriptions

The MCP server needs to expose tools with descriptions that help ChatGPT understand when to call them.

**File to modify**: `supabase/functions/mcp-server/index.ts`

**What to do**:
1. Import the tool descriptions from `mcp-tools-journey-1.json`
2. Update the `listTools()` handler to return these descriptions
3. Ensure the tool names match your existing Edge Functions

**Example**:
```typescript
// In mcp-server/index.ts
import toolDescriptions from './tools/journey-1-tools.json';

// In the listTools handler:
case 'tools/list':
  return {
    tools: toolDescriptions.tools
  };
```

### Step 2: Add Orchestration Logic (Optional)

The orchestrator (`journey-1-orchestrator.ts`) combines multiple tool calls into a single flow.

**Two approaches**:

#### Approach A: Let ChatGPT Orchestrate (Simpler)
- Don't use the orchestrator
- Let ChatGPT call tools sequentially
- ChatGPT will:
  1. Call `get_user_location`
  2. Call `plan_create_meal_plan`
  3. Call `get_affiliate_partners`
  4. Format the response itself

**Pros**: Simpler, less code
**Cons**: ChatGPT might forget steps, inconsistent formatting

#### Approach B: Use Orchestrator (Recommended)
- Create a new Edge Function: `journey_1_onboarding`
- This function calls the orchestrator
- ChatGPT only needs to call ONE tool
- Guaranteed consistent experience

**Pros**: Consistent, reliable, better UX
**Cons**: More code, another Edge Function

**Recommendation**: Start with Approach A (simpler), move to Approach B if ChatGPT is inconsistent.

### Step 3: Deploy Response Formatters

The response formatters ensure consistent, engaging output.

**File to create**: `supabase/functions/_shared/formatters/journey-1.ts`

**What to do**:
1. Copy `response-formatter.ts` to `supabase/functions/_shared/formatters/`
2. Import formatters in your Edge Functions
3. Use them to format responses before returning to ChatGPT

**Example**:
```typescript
// In plan_create_meal_plan Edge Function
import { formatMealPlan, formatDemoLoop } from '../_shared/formatters/journey-1.ts';

// After creating meal plan:
const formattedPlan = formatMealPlan(mealPlanData);
const demoLoop = formatDemoLoop(mealPlanData);

return new Response(
  JSON.stringify({
    meal_plan: mealPlanData,
    formatted_response: formattedPlan + '\n\n' + demoLoop
  }),
  { headers: { 'Content-Type': 'application/json' } }
);
```

### Step 4: Add Analytics Tracking

Every tool call should log analytics for monitoring.

**What to do**:
1. Import error logger: `import { logError, logToolCall } from '../_shared/error-logger.ts';`
2. Wrap tool execution in try/catch
3. Log success/failure

**Example**:
```typescript
// In any Edge Function
import { logToolCall } from '../_shared/error-logger.ts';

try {
  const startTime = Date.now();
  
  // Your tool logic here
  const result = await createMealPlan(params);
  
  // Log success
  await logToolCall({
    user_id: chatgpt_user_id,
    tool_name: 'plan_create_meal_plan',
    parameters: params,
    success: true,
    duration_ms: Date.now() - startTime
  });
  
  return result;
  
} catch (error) {
  // Log failure
  await logToolCall({
    user_id: chatgpt_user_id,
    tool_name: 'plan_create_meal_plan',
    parameters: params,
    success: false,
    error_message: error.message,
    duration_ms: Date.now() - startTime
  });
  
  throw error;
}
```

---

## Testing Journey 1

### Test Scenarios

#### Scenario 1: Basic Onboarding
**User says**: "I want to lose 15 pounds"

**Expected flow**:
1. ChatGPT calls `get_user_location`
2. ChatGPT calls `plan_create_meal_plan` with goal_type='weight_loss'
3. ChatGPT calls `get_affiliate_partners` with country_code from step 1
4. ChatGPT presents formatted meal plan + demo loop + affiliate links

**Success criteria**:
- ✅ All 3 tools called in correct order
- ✅ Meal plan includes 7 days of meals
- ✅ Demo loop explains adaptation
- ✅ 3-5 affiliate partners shown
- ✅ Analytics logged

#### Scenario 2: With Dietary Restrictions
**User says**: "Create a vegetarian meal plan for muscle gain"

**Expected flow**:
1. Same as Scenario 1, but with dietary_restrictions=['vegetarian']

**Success criteria**:
- ✅ All meals are vegetarian
- ✅ Higher protein target for muscle gain
- ✅ Appropriate affiliate partners (might include meal kits)

#### Scenario 3: Grocery List Request
**User says**: "What groceries do I need?"

**Expected flow**:
1. ChatGPT calls `plan_get_active_plan`
2. ChatGPT extracts ingredients and formats as list
3. ChatGPT calls `get_affiliate_partners` for grocery delivery

**Success criteria**:
- ✅ Complete ingredient list shown
- ✅ Affiliate links for grocery delivery
- ✅ User can click and order

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Tool Call Success Rate**
```sql
SELECT 
  tool_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as success_rate
FROM tool_calls
WHERE tool_name IN ('plan_create_meal_plan', 'get_user_location', 'get_affiliate_partners')
  AND called_at >= NOW() - INTERVAL '7 days'
GROUP BY tool_name;
```

**Target**: 80%+ success rate for each tool

2. **Journey Completion Rate**
```sql
SELECT 
  COUNT(DISTINCT user_id) as users_started,
  COUNT(DISTINCT CASE WHEN event_name = 'journey_1_onboarding' THEN user_id END) as users_completed,
  ROUND((COUNT(DISTINCT CASE WHEN event_name = 'journey_1_onboarding' THEN user_id END)::numeric / COUNT(DISTINCT user_id)) * 100, 2) as completion_rate
FROM user_events
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Target**: 80%+ completion rate

3. **Affiliate Link Appearance Rate**
```sql
SELECT 
  COUNT(*) as total_onboardings,
  SUM(CASE WHEN (event_data->>'affiliate_partners_shown')::int > 0 THEN 1 ELSE 0 END) as with_affiliates,
  ROUND((SUM(CASE WHEN (event_data->>'affiliate_partners_shown')::int > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as affiliate_appearance_rate
FROM user_events
WHERE event_name = 'journey_1_onboarding'
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Target**: 90%+ (affiliates should appear in almost every onboarding)

4. **Average Duration**
```sql
SELECT 
  AVG((event_data->>'duration_ms')::numeric) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (event_data->>'duration_ms')::numeric) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (event_data->>'duration_ms')::numeric) as p95_duration_ms
FROM user_events
WHERE event_name = 'journey_1_onboarding'
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Target**: <3000ms average, <5000ms p95

---

## Troubleshooting

### Issue: ChatGPT doesn't call tools

**Possible causes**:
1. Tool descriptions not clear enough
2. User query doesn't match trigger phrases
3. MCP server not returning tools correctly

**Solution**:
1. Check MCP server logs: `supabase functions logs mcp-server`
2. Verify tool descriptions are loaded
3. Add more trigger phrases to tool descriptions
4. Test with explicit commands: "Call plan_create_meal_plan"

### Issue: Tools called in wrong order

**Possible causes**:
1. ChatGPT doesn't understand dependencies
2. Tool descriptions don't explain sequencing

**Solution**:
1. Add sequencing hints to tool descriptions
2. Use orchestrator (Approach B) to enforce order
3. Add "Call this AFTER..." notes in descriptions

### Issue: Affiliate links not showing

**Possible causes**:
1. `get_affiliate_partners` not called
2. No partners for user's country
3. Database not seeded

**Solution**:
1. Check if `get_affiliate_partners` was called in logs
2. Verify affiliate_partner_map has data for user's country
3. Run seed migration if needed
4. Add fallback to US partners if country not found

### Issue: Inconsistent formatting

**Possible causes**:
1. ChatGPT formatting responses itself
2. Response formatters not being used

**Solution**:
1. Use response formatters in Edge Functions
2. Return `formatted_response` field in tool output
3. Tell ChatGPT to use the formatted_response as-is

---

## Next Steps

After Journey 1 is working:

1. **Week 3**: Implement Journey 2 (Weight Tracking & Adaptation)
2. **Week 4**: Implement Journey 3 (Chef Personas & Recipes)
3. **Week 5**: Implement Journey 4 (Food Ordering)
4. **Week 6**: Polish and implement remaining journeys

---

## Success Criteria for Journey 1

Before moving to Journey 2, ensure:

- ✅ 80%+ tool call success rate
- ✅ 80%+ onboarding completion rate
- ✅ 90%+ affiliate link appearance rate
- ✅ <3000ms average response time
- ✅ Formatted responses are consistent and engaging
- ✅ Analytics are being logged correctly
- ✅ Users understand the "Demo Loop" concept

If all criteria are met, Journey 1 is ready for production! 🚀
