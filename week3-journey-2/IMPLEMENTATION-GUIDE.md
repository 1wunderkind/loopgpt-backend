# Journey 2: Weight Tracking & Adaptation - Implementation Guide

## Overview

Journey 2 is the **core "Loop" feature** that makes LoopGPT unique. It automatically evaluates user progress and adjusts meal plans based on real results.

**User says:** "I weighed 165 lbs today"  
**System does:** Log weight → Evaluate progress → Adjust plan if needed → Explain changes

---

## What Was Built

### 1. Edge Function: `journey_2_tracking`

**Location:** `supabase/functions/journey_2_tracking/index.ts`

**Features:**
- ✅ Weight logging (supports kg and lbs)
- ✅ Progress evaluation (on track / too fast / too slow)
- ✅ Automatic calorie adjustment
- ✅ Professional response formatting
- ✅ Analytics tracking
- ✅ Error handling

**Logic:**

```typescript
// Weight Loss Goals
if (weekly_change >= -0.3 kg) → Status: too_slow → Decrease 150 cal
if (weekly_change <= -1.2 kg) → Status: too_fast → Increase 150 cal
else → Status: on_track → No change

// Muscle Gain Goals
if (weekly_change <= +0.1 kg) → Status: too_slow → Increase 200 cal
if (weekly_change >= +0.7 kg) → Status: too_fast → Decrease 150 cal
else → Status: on_track → No change

// Maintenance Goals
if (abs(weekly_change) > 0.3 kg) → Status: fluctuating → Adjust
else → Status: on_track → No change
```

### 2. MCP Tool Description

**Location:** `week3-journey-2/mcp-tool-journey-2.json`

**Optimized for ChatGPT to recognize:**
- "I weighed X lbs today"
- "My weight is X kg"
- "Progress update"
- "Lost X pounds this week"
- And 15+ more variations

### 3. Database Dependencies

**Required Tables:**
- `weight_logs` - Stores weight entries
- `meal_plans` - Active meal plans to adjust
- `user_events` - Analytics
- `tool_calls` - Performance tracking

**Schema:**
```sql
-- weight_logs table (should already exist)
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- meal_plans table (should already exist)
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  calories_target INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Deployment

### Step 1: Deploy Edge Function

```bash
cd /home/ubuntu/loopgpt-backend
export SUPABASE_ACCESS_TOKEN="your_token"
supabase functions deploy journey_2_tracking --project-ref qmagnwxeijctkksqbcqz
```

### Step 2: Update MCP Server

Add to your MCP server's tool list:

```typescript
// In supabase/functions/mcp-server/index.ts
const tools = [
  // ... existing tools
  {
    name: "journey_2_tracking",
    description: "Log user's weight and automatically evaluate progress to adjust their meal plan...",
    inputSchema: {
      type: "object",
      properties: {
        chatgpt_user_id: { type: "string" },
        weight_kg: { type: "number" },
        weight_unit: { type: "string", enum: ["kg", "lbs"] },
        notes: { type: "string" }
      },
      required: ["chatgpt_user_id", "weight_kg"]
    }
  }
];
```

### Step 3: Test

```bash
curl -X POST "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/journey_2_tracking" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chatgpt_user_id": "test_user",
    "weight_kg": 75,
    "weight_unit": "kg"
  }'
```

---

## Testing Scenarios

### Scenario 1: First Weight Log (No Active Plan)
**Input:**
```json
{
  "chatgpt_user_id": "new_user",
  "weight_kg": 80,
  "weight_unit": "kg"
}
```

**Expected:**
- Weight logged ✅
- Message: "You don't have an active plan yet"
- Prompt to start onboarding

### Scenario 2: Weight Loss - On Track
**Setup:**
- User has active weight loss plan (1800 cal/day)
- Previous weight: 80 kg (1 week ago)
- Current weight: 79.3 kg (-0.7 kg/week)

**Input:**
```json
{
  "chatgpt_user_id": "user_1",
  "weight_kg": 79.3,
  "weight_unit": "kg"
}
```

**Expected:**
- Status: "on_track"
- No calorie adjustment
- Message: "Perfect progress! You're right on track."

### Scenario 3: Weight Loss - Too Slow
**Setup:**
- User has active weight loss plan (1800 cal/day)
- Previous weight: 80 kg (2 weeks ago)
- Current weight: 79.8 kg (-0.1 kg/week)

**Input:**
```json
{
  "chatgpt_user_id": "user_2",
  "weight_kg": 79.8,
  "weight_unit": "kg"
}
```

**Expected:**
- Status: "too_slow"
- Calorie adjustment: 1800 → 1650 (-150 cal)
- Message: "Progress is slower than expected. Let's adjust your plan."
- Explanation of why adjustment was made

### Scenario 4: Weight Loss - Too Fast
**Setup:**
- User has active weight loss plan (1800 cal/day)
- Previous weight: 80 kg (1 week ago)
- Current weight: 78.5 kg (-1.5 kg/week)

**Input:**
```json
{
  "chatgpt_user_id": "user_3",
  "weight_kg": 78.5,
  "weight_unit": "kg"
}
```

**Expected:**
- Status: "too_fast"
- Calorie adjustment: 1800 → 1950 (+150 cal)
- Message: "You're losing weight too quickly! Let's slow down for sustainable results."

### Scenario 5: Muscle Gain - Too Slow
**Setup:**
- User has active muscle gain plan (2400 cal/day)
- Previous weight: 70 kg (2 weeks ago)
- Current weight: 70.1 kg (+0.05 kg/week)

**Input:**
```json
{
  "chatgpt_user_id": "user_4",
  "weight_kg": 70.1,
  "weight_unit": "kg"
}
```

**Expected:**
- Status: "too_slow"
- Calorie adjustment: 2400 → 2600 (+200 cal)
- Message: "Muscle gain is slower than expected. Let's increase calories."

---

## Success Metrics

### Tool Call Success Rate
**Target:** 80%+

**Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate
FROM tool_calls
WHERE tool_name = 'journey_2_tracking'
AND called_at > NOW() - INTERVAL '7 days';
```

### Response Time
**Target:** <2000ms

**Query:**
```sql
SELECT 
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  MIN(duration_ms) as min_duration
FROM tool_calls
WHERE tool_name = 'journey_2_tracking'
AND called_at > NOW() - INTERVAL '7 days';
```

### Plan Adjustment Accuracy
**Target:** 90%+

**Query:**
```sql
SELECT 
  event_data->>'progress_status' as status,
  event_data->>'plan_adjusted' as adjusted,
  COUNT(*) as occurrences
FROM user_events
WHERE event_name = 'journey_2_tracking'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY status, adjusted;
```

### User Retention After Tracking
**Target:** 70%+ return for Week 2 weigh-in

**Query:**
```sql
WITH first_tracking AS (
  SELECT user_id, MIN(created_at) as first_tracked
  FROM user_events
  WHERE event_name = 'journey_2_tracking'
  GROUP BY user_id
),
second_tracking AS (
  SELECT DISTINCT user_id
  FROM user_events
  WHERE event_name = 'journey_2_tracking'
  AND created_at > (SELECT first_tracked FROM first_tracking WHERE first_tracking.user_id = user_events.user_id) + INTERVAL '5 days'
)
SELECT 
  COUNT(DISTINCT first_tracking.user_id) as total_users,
  COUNT(DISTINCT second_tracking.user_id) as returned_users,
  COUNT(DISTINCT second_tracking.user_id) * 100.0 / COUNT(DISTINCT first_tracking.user_id) as retention_rate
FROM first_tracking
LEFT JOIN second_tracking ON first_tracking.user_id = second_tracking.user_id;
```

---

## Integration with Other Journeys

### Journey 1 → Journey 2
After onboarding, users should be prompted to weigh in weekly:
```
"Remember to weigh yourself every Monday morning and tell me your weight. 
I'll automatically adjust your plan based on your results!"
```

### Journey 2 → Journey 1
If plan is adjusted, optionally regenerate meal plan:
```
"Your calories changed from 1800 to 1650. 
Would you like me to create an updated meal plan with new recipes?"
```

### Journey 2 → Journey 6
After multiple weigh-ins, offer progress visualization:
```
"You've been tracking for 4 weeks! Want to see your progress chart?"
```

---

## Common Issues & Solutions

### Issue 1: User provides weight in lbs but tool expects kg
**Solution:** Use `weight_unit` parameter and convert automatically

### Issue 2: Insufficient data to evaluate progress
**Solution:** Encourage continued tracking, don't adjust plan yet

### Issue 3: Weight fluctuations (water retention, etc.)
**Solution:** Use weekly averages, not single data points

### Issue 4: User hasn't started a plan yet
**Solution:** Prompt to complete Journey 1 (onboarding) first

---

## Next Steps

After Journey 2 is deployed and tested:

1. **Week 4:** Journey 3 (Chef Personas & Recipes)
2. **Week 5:** Journey 4 (Food Ordering)
3. **Week 6:** Polish & integrate all journeys
4. **Week 7:** Beta testing
5. **Week 8:** Launch prep

---

## Notes

- Journey 2 is the **most critical feature** for retention
- Users who track weight weekly have 3x higher retention
- Automatic adjustments create "magic moment" that builds trust
- Clear explanations of WHY adjustments were made are essential
- Celebrate progress, encourage through plateaus

**The Loop is what makes LoopGPT unique. This journey is the heart of the product.**
