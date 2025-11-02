# Journey 1 Testing Guide

## Overview

This guide provides comprehensive testing procedures for Journey 1 (Onboarding & First Meal Plan) using Approach B (Backend Orchestration).

---

## Pre-Testing Checklist

Before testing, ensure:

- ✅ Migrations applied (analytics tables, affiliate partner map)
- ✅ Affiliate partners seeded (US, UK, CA)
- ✅ `journey_1_onboarding` Edge Function deployed
- ✅ MCP server updated with new tool description
- ✅ Supabase credentials configured

---

## Test Scenarios

### Scenario 1: Basic Weight Loss Onboarding

**Objective**: Verify complete onboarding flow for weight loss goal

**User Input**: "I want to lose 15 pounds"

**Expected ChatGPT Behavior**:
1. Recognizes weight loss intent
2. Calls `journey_1_onboarding` with:
   ```json
   {
     "chatgpt_user_id": "user_123",
     "goal_type": "weight_loss"
   }
   ```

**Expected Tool Response**:
```json
{
  "success": true,
  "formatted_response": "# 🎯 Your Weight Loss Journey\n\n...",
  "meal_plan_id": "plan_abc123",
  "country_code": "US",
  "calories_target": 1800,
  "duration_ms": 1500
}
```

**Success Criteria**:
- ✅ Tool call completes in <3000ms
- ✅ Formatted response includes:
  - Meal plan with 7 days
  - Demo Loop section
  - 3-5 affiliate partners
- ✅ Analytics logged in `tool_calls` table
- ✅ User event logged in `user_events` table
- ✅ Affiliate partners are from correct country

**How to Test**:
```bash
# Manual API test
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_1",
    "goal_type": "weight_loss"
  }'
```

---

### Scenario 2: Muscle Gain with Details

**Objective**: Verify calorie calculation with user stats

**User Input**: "I'm a 30-year-old male, 180cm, 75kg. I want to build muscle."

**Expected ChatGPT Behavior**:
1. Extracts user stats from conversation
2. Calls `journey_1_onboarding` with:
   ```json
   {
     "chatgpt_user_id": "user_456",
     "goal_type": "muscle_gain",
     "age": 30,
     "gender": "male",
     "height_cm": 180,
     "current_weight": 75,
     "activity_level": "moderate"
   }
   ```

**Expected Tool Response**:
- Calculated calories: ~2600 (TDEE + 300 for muscle gain)
- Meal plan optimized for muscle gain (higher protein)

**Success Criteria**:
- ✅ Calories calculated correctly using Mifflin-St Jeor
- ✅ Macros appropriate for muscle gain (high protein)
- ✅ Response time <3000ms

**How to Test**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_2",
    "goal_type": "muscle_gain",
    "age": 30,
    "gender": "male",
    "height_cm": 180,
    "current_weight": 75,
    "activity_level": "moderate"
  }'
```

---

### Scenario 3: Vegetarian with Restrictions

**Objective**: Verify dietary restrictions are respected

**User Input**: "Create a vegetarian meal plan for weight loss"

**Expected ChatGPT Behavior**:
```json
{
  "chatgpt_user_id": "user_789",
  "goal_type": "weight_loss",
  "dietary_restrictions": ["vegetarian"]
}
```

**Success Criteria**:
- ✅ All meals are vegetarian
- ✅ Protein sources are plant-based
- ✅ Meal plan still meets calorie/macro targets

**How to Test**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_3",
    "goal_type": "weight_loss",
    "dietary_restrictions": ["vegetarian"]
  }'
```

---

### Scenario 4: UK User (Geo-Routing)

**Objective**: Verify affiliate partners are geo-routed correctly

**User Input**: "I'm in London and want to lose weight"

**Expected Behavior**:
- Country detected as "GB"
- Affiliate partners shown: Tesco, Sainsbury's, Ocado, etc. (NOT US partners)

**Success Criteria**:
- ✅ Country code = "GB"
- ✅ Affiliate partners are UK-specific
- ✅ No US partners shown (Amazon Fresh US, Instacart, etc.)

**How to Test**:
```bash
# Simulate UK IP or explicitly set country
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_4",
    "goal_type": "weight_loss",
    "ip_address": "81.2.69.142"
  }'
```

---

### Scenario 5: Error Handling

**Objective**: Verify graceful error handling

**Test Cases**:

#### 5a: Missing Required Field
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_5"
  }'
```

**Expected**:
- Status: 500
- Error message: "Missing required fields: goal_type"
- Analytics logged with success=false

#### 5b: Invalid Goal Type
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatgpt_user_id": "test_user_6",
    "goal_type": "invalid_goal"
  }'
```

**Expected**:
- Graceful error handling
- Error logged in analytics

---

## Performance Testing

### Load Test

**Objective**: Verify performance under load

**Tool**: Apache Bench or similar

```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 -p test_payload.json -T 'application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding
```

**Success Criteria**:
- ✅ Average response time <3000ms
- ✅ P95 response time <5000ms
- ✅ 0% error rate
- ✅ All requests complete successfully

---

## Analytics Verification

After running tests, verify analytics are being logged correctly:

### 1. Tool Call Success Rate

```sql
SELECT 
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as success_rate,
  AVG(duration_ms) as avg_duration_ms
FROM tool_calls
WHERE tool_name = 'journey_1_onboarding'
  AND called_at >= NOW() - INTERVAL '1 hour';
```

**Expected**:
- Success rate: 100% (for valid requests)
- Average duration: <3000ms

### 2. User Events Logged

```sql
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  AVG((event_data->>'duration_ms')::numeric) as avg_duration
FROM user_events
WHERE event_name = 'journey_1_onboarding'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**Expected**:
- Event count matches tool call count
- All test users appear

### 3. Affiliate Partner Appearance

```sql
SELECT 
  event_data->>'country_code' as country,
  AVG((event_data->>'affiliate_partners_shown')::numeric) as avg_partners_shown,
  COUNT(*) as onboardings
FROM user_events
WHERE event_name = 'journey_1_onboarding'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_data->>'country_code';
```

**Expected**:
- US: 3-5 partners
- GB: 3-5 partners
- CA: 3 partners
- 100% of onboardings show affiliate partners

---

## Integration Testing with ChatGPT

### Test in ChatGPT Custom GPT (Recommended)

1. **Create Custom GPT** with your MCP server
2. **Test Conversations**:

#### Test 1: Simple Intent
```
User: I want to lose weight
Expected: ChatGPT calls journey_1_onboarding, shows formatted response
```

#### Test 2: Detailed Intent
```
User: I'm 30 years old, 180cm, 80kg. I want to lose 10kg. I'm vegetarian.
Expected: ChatGPT extracts details, calls with full parameters
```

#### Test 3: Follow-up Questions
```
User: I want to lose weight
ChatGPT: [shows meal plan]
User: Where can I buy these ingredients?
Expected: Affiliate links already shown in initial response
```

### Success Criteria for ChatGPT Integration

- ✅ ChatGPT recognizes weight loss/health intents
- ✅ ChatGPT calls `journey_1_onboarding` (not multiple tools)
- ✅ ChatGPT presents formatted response as-is
- ✅ Affiliate links visible and clickable
- ✅ Demo Loop section is clear and engaging
- ✅ User understands next steps

---

## Troubleshooting

### Issue: Tool not being called

**Diagnosis**:
```sql
-- Check if MCP server is returning the tool
SELECT * FROM mcp_tools WHERE tool_name = 'journey_1_onboarding';
```

**Solutions**:
1. Verify MCP server deployed with updated tool list
2. Check tool description includes trigger phrases
3. Test with explicit command: "Call journey_1_onboarding"

### Issue: Affiliate partners not showing

**Diagnosis**:
```sql
-- Check if partners exist for country
SELECT * FROM affiliate_partner_map WHERE country = 'US' AND partner_type = 'grocery';
```

**Solutions**:
1. Verify affiliate_partner_map seeded
2. Check country code detection
3. Verify is_active = true for partners

### Issue: Slow response times

**Diagnosis**:
```sql
-- Check duration distribution
SELECT 
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
  MAX(duration_ms) as max
FROM tool_calls
WHERE tool_name = 'journey_1_onboarding';
```

**Solutions**:
1. Check if meal plan creation is slow
2. Optimize database queries
3. Add caching for affiliate partners

### Issue: Formatting inconsistent

**Diagnosis**:
- Check if `formatted_response` field is being used
- Verify response formatter is working

**Solutions**:
1. Ensure Edge Function returns `formatted_response`
2. Tell ChatGPT to use formatted_response as-is
3. Check for markdown rendering issues

---

## Success Checklist

Before moving to Week 3, ensure:

- ✅ All 5 test scenarios pass
- ✅ Performance meets targets (<3000ms avg)
- ✅ Analytics logging correctly
- ✅ ChatGPT integration works smoothly
- ✅ Affiliate links appear 100% of time
- ✅ Formatting is consistent and professional
- ✅ Error handling is graceful
- ✅ Geo-routing works for US, UK, CA

If all items checked, Journey 1 is ready for production! 🚀

---

## Next Steps

After Journey 1 passes all tests:

1. **Monitor for 2-3 days** with real users
2. **Collect feedback** on meal plans and formatting
3. **Optimize** based on analytics
4. **Proceed to Week 3**: Journey 2 (Weight Tracking & Adaptation)
