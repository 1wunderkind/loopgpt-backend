# LoopGPT Testing Framework
## Week 0, Day 5: Testing Strategy & Implementation

---

## 🎯 Testing Philosophy

**Goal:** Ensure 70%+ tool call success rate and smooth user experience

**What We Test:**
1. **Tool Descriptions** - Does ChatGPT call the right tool?
2. **Conversation Flows** - Do responses make sense?
3. **Affiliate Integration** - Are links shown at the right times?
4. **Error Handling** - Do failures degrade gracefully?
5. **Edge Cases** - What happens with weird inputs?

---

## 📋 Test Categories

### **Category 1: Tool Call Success Rate**
**Objective:** Verify ChatGPT calls the correct tool for user intents

**Method:**
1. Send test queries to ChatGPT
2. Monitor which tools get called
3. Calculate success rate per tool

**Success Criteria:** 70%+ success rate per tool

**Test Cases:**

```typescript
// Test: plan_create_meal_plan
const testCases = [
  { query: "I want to lose weight", expectedTool: "plan_create_meal_plan", shouldCall: true },
  { query: "Help me lose 15 pounds", expectedTool: "plan_create_meal_plan", shouldCall: true },
  { query: "Create a meal plan for me", expectedTool: "plan_create_meal_plan", shouldCall: true },
  { query: "What is a meal plan", expectedTool: "plan_create_meal_plan", shouldCall: false }, // Informational, not action
  { query: "I'm thinking about losing weight", expectedTool: "plan_create_meal_plan", shouldCall: false }, // Not committed
];

// Test: loop_adjust_calories
const trackingTests = [
  { query: "I weighed 165 lbs today", expectedTool: "loop_adjust_calories", shouldCall: true },
  { query: "My weight is 170", expectedTool: "loop_adjust_calories", shouldCall: true },
  { query: "What should I weigh", expectedTool: "loop_adjust_calories", shouldCall: false }, // Question, not log
];

// Test: plan_generate_from_leftovers
const recipeTests = [
  { query: "I have leftover chicken", expectedTool: "plan_generate_from_leftovers", shouldCall: true },
  { query: "What can I make with chicken and rice", expectedTool: "plan_generate_from_leftovers", shouldCall: true },
  { query: "Give me a recipe", expectedTool: "plan_generate_from_leftovers", shouldCall: true },
  { query: "What is a recipe", expectedTool: "plan_generate_from_leftovers", shouldCall: false },
];
```

**How to Run:**
```bash
# Manual testing through ChatGPT interface
1. Open ChatGPT with LoopGPT MCP connected
2. Send each test query
3. Observe which tool gets called
4. Record results in spreadsheet

# Automated testing (future)
npm run test:tool-calls
```

---

### **Category 2: Conversation Flow Testing**
**Objective:** Verify responses are coherent, helpful, and on-brand

**Method:**
1. Complete full user journeys
2. Evaluate response quality
3. Check for personality consistency

**Success Criteria:**
- Responses use emojis appropriately
- Affiliate links appear at correct times
- Tone is friendly and supportive
- Next steps are always clear

**Test Scenarios:**

#### **Scenario 1: Complete Onboarding**
```
User: "I want to lose weight"
Expected: 
- ChatGPT calls plan_create_meal_plan
- Asks for: goal, weight, activity level, restrictions
- Creates plan
- Shows grocery affiliate links
- Explains The Loop
- Provides clear next steps

✅ Pass Criteria:
- All info collected
- Plan created
- Affiliate links shown
- User knows what to do next
```

#### **Scenario 2: Weight Logging & Adaptation**
```
User: "I weighed 165 lbs today"
Expected:
- ChatGPT calls loop_adjust_calories
- Acknowledges weight log
- Analyzes progress
- Adjusts plan if needed
- Explains why/why not
- Shows next week preview

✅ Pass Criteria:
- Weight logged successfully
- Analysis makes sense
- Adjustment logic is sound
- User understands changes
```

#### **Scenario 3: Recipe Generation**
```
User: "I have leftover chicken and rice"
Expected:
- ChatGPT calculates chaos level
- Assigns appropriate chef
- Calls plan_generate_from_leftovers
- Presents recipe with chef personality
- Shows affiliate links for missing ingredients

✅ Pass Criteria:
- Correct chef assigned
- Recipe is creative and fits chaos level
- Affiliate links shown
- Chef personality is consistent
```

---

### **Category 3: Affiliate Integration Testing**
**Objective:** Ensure affiliate links appear at the right times

**Success Criteria:**
- Affiliate links shown in 90%+ of relevant interactions
- Links are geo-appropriate
- Benefits are highlighted
- Non-affiliate alternative offered

**Test Matrix:**

| Journey | Trigger | Expected Affiliates | Pass/Fail |
|---------|---------|---------------------|-----------|
| Journey 1 | Meal plan created | Grocery delivery (Amazon Fresh, Instacart, Walmart) | |
| Journey 2 | Weight logged, plan adjusted | Grocery delivery (reorder) | |
| Journey 3 | Recipe generated, missing ingredients | Grocery delivery (quick delivery) | |
| Journey 4 | User wants to order food | Restaurant delivery (MealMe, Uber Eats, DoorDash) | |
| Journey 5 | User asks about food | None (informational) | |
| Journey 6 | Milestone reached | Meal kit reward offers | |

**Test Procedure:**
```bash
1. Complete each journey
2. Check if affiliate links appear
3. Verify links are correct for user's country
4. Confirm benefits are highlighted
5. Ensure non-affiliate option exists
```

---

### **Category 4: Error Handling Testing**
**Objective:** Verify graceful degradation when things fail

**Error Scenarios:**

#### **1. Tool Call Fails**
```
Trigger: Backend function returns error
Expected Behavior:
- ChatGPT acknowledges issue
- Explains what happened (simple terms)
- Offers alternative approach
- Doesn't panic or over-apologize

Example:
"I'm having trouble creating your meal plan right now. Let me try a different approach, or you can try again in a moment."
```

#### **2. Missing User Data**
```
Trigger: User hasn't provided required info
Expected Behavior:
- ChatGPT asks clarifying questions
- Explains why info is needed
- Doesn't proceed without required data

Example:
"To create the best plan for you, I need to know your current weight and activity level. This helps me calculate the right calorie target."
```

#### **3. No Affiliate Partners Available**
```
Trigger: User is in unsupported country
Expected Behavior:
- Honest but helpful
- Offers alternative (PDF grocery list)
- Doesn't show broken links

Example:
"I don't have delivery partners in [Country] yet, but I've prepared a detailed grocery list you can use at your local stores. [Download PDF]"
```

#### **4. Conflicting User Input**
```
Trigger: User says "I want to lose weight and gain muscle"
Expected Behavior:
- Points out conflict gently
- Helps prioritize
- Explains trade-offs

Example:
"I notice you want to lose weight AND gain muscle. These are both possible, but we'll need to prioritize one. Which is more important to you right now?"
```

---

### **Category 5: Edge Case Testing**
**Objective:** Handle unusual inputs gracefully

**Edge Cases:**

```typescript
const edgeCases = [
  // Extreme values
  { input: "I weigh 500 lbs", expected: "Handle sensitively, create appropriate plan" },
  { input: "I want to lose 100 pounds", expected: "Set realistic timeline, break into milestones" },
  { input: "I weigh 90 lbs", expected: "Concern for underweight, suggest maintenance" },
  
  // Unclear intent
  { input: "food", expected: "Ask clarifying question" },
  { input: "help", expected: "Show help menu" },
  { input: "I don't know", expected: "Guide with questions" },
  
  // Multi-intent
  { input: "I weighed 165 and I don't want to cook", expected: "Handle both: log weight, then offer ordering" },
  
  // Typos/Misspellings
  { input: "I wiegh 165 punds", expected: "Understand intent, log weight" },
  { input: "crete a meel plan", expected: "Understand intent, create plan" },
  
  // Non-English
  { input: "Je veux perdre du poids", expected: "Respond in English or ask for clarification" },
  
  // Inappropriate
  { input: "[offensive content]", expected: "Politely decline, redirect to nutrition" },
  
  // Out of scope
  { input: "What's the weather", expected: "Politely redirect to nutrition focus" },
  { input: "Tell me a joke", expected: "Light response, then redirect" }
];
```

---

## 🛠️ Testing Tools

### **1. Manual Testing Checklist**

```markdown
# Journey 1: Onboarding
- [ ] User says "I want to lose weight"
- [ ] ChatGPT calls plan_create_meal_plan
- [ ] All required info collected
- [ ] Plan created successfully
- [ ] Grocery affiliate links shown
- [ ] User understands next steps

# Journey 2: Tracking
- [ ] User logs weight
- [ ] ChatGPT calls loop_adjust_calories
- [ ] Progress analyzed correctly
- [ ] Plan adjusted if needed
- [ ] Explanation makes sense

# Journey 3: Recipes
- [ ] User provides ingredients
- [ ] Chaos level calculated
- [ ] Correct chef assigned
- [ ] Recipe generated
- [ ] Affiliate links for missing items

# Journey 4: Ordering
- [ ] User wants to order food
- [ ] Restaurants searched
- [ ] Affiliate links shown
- [ ] Order placed successfully

# Journey 5: Nutrition
- [ ] User asks nutrition question
- [ ] Accurate info provided
- [ ] Explanation is clear
- [ ] No affiliate links (informational)

# Journey 6: Progress
- [ ] User asks for progress
- [ ] Stats displayed correctly
- [ ] Trends analyzed
- [ ] Encouragement provided

# Journey 7: Misc
- [ ] Help command works
- [ ] Profile displays correctly
- [ ] Subscription check works
```

### **2. Analytics Queries**

```sql
-- Tool call success rate
SELECT 
  tool_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as success_rate
FROM tool_calls
WHERE called_at > NOW() - INTERVAL '7 days'
GROUP BY tool_name
ORDER BY success_rate DESC;

-- Affiliate click-through rate
SELECT 
  journey_name,
  partner_name,
  COUNT(*) as shown,
  SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END) as clicks,
  ROUND((SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as ctr
FROM affiliate_performance
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY journey_name, partner_name
ORDER BY ctr DESC;

-- Error frequency
SELECT 
  tool_name,
  error_message,
  COUNT(*) as occurrences
FROM error_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY tool_name, error_message
ORDER BY occurrences DESC
LIMIT 20;

-- User journey completion
SELECT 
  event_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_events
FROM user_events
WHERE event_name LIKE 'journey_%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY unique_users DESC;
```

### **3. Automated Test Script**

```bash
#!/bin/bash
# test-journeys.sh

echo "Testing LoopGPT Journeys..."

# Test Journey 1: Onboarding
echo "Testing Journey 1: Onboarding"
# TODO: Implement automated testing via ChatGPT API when available

# Test Journey 2: Tracking
echo "Testing Journey 2: Weight Tracking"
# TODO: Implement

# Check analytics
echo "Checking analytics..."
psql $DATABASE_URL -c "SELECT * FROM tool_success_rates;"

echo "Testing complete!"
```

---

## 📊 Success Metrics

### **Week 1 Targets:**
- ✅ 70%+ tool call success rate
- ✅ 90%+ affiliate link appearance rate
- ✅ 0 critical errors
- ✅ All 7 journeys manually tested

### **Month 1 Targets:**
- ✅ 80%+ tool call success rate
- ✅ 95%+ affiliate link appearance rate
- ✅ <1% error rate
- ✅ 60%+ user retention (Week 2)

### **Month 3 Targets:**
- ✅ 85%+ tool call success rate
- ✅ 40%+ affiliate click-through rate
- ✅ 15%+ affiliate conversion rate
- ✅ 70%+ user retention (Week 2)

---

## 🚀 Testing Schedule

### **Week 0 (Now):**
- [x] Create testing framework
- [ ] Manual test all 7 journeys
- [ ] Document findings
- [ ] Fix critical issues

### **Week 1-2:**
- [ ] Test Journey 1 extensively
- [ ] Monitor tool call success rate
- [ ] Optimize tool descriptions if needed
- [ ] Test affiliate integration

### **Week 3-6:**
- [ ] Test remaining journeys
- [ ] Monitor analytics daily
- [ ] Iterate based on data
- [ ] Conduct user testing (beta)

### **Week 7-8:**
- [ ] Final testing round
- [ ] Load testing
- [ ] Edge case testing
- [ ] Launch readiness review

---

## 📝 Test Results Template

```markdown
# Test Results: [Date]

## Journey Tested: [Journey Name]

### Test Cases:
1. [Test case description]
   - Expected: [expected behavior]
   - Actual: [actual behavior]
   - Status: ✅ Pass / ❌ Fail
   - Notes: [any observations]

### Tool Call Success Rate:
- [Tool name]: X/Y calls successful (Z%)

### Affiliate Integration:
- Links shown: Yes/No
- Correct for geo: Yes/No
- Benefits highlighted: Yes/No

### Issues Found:
1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce: [steps]
   - Suggested fix: [fix]

### Overall Assessment:
[Summary of test results and recommendations]
```

---

## ✅ Week 0 Testing Checklist

- [x] Testing framework documented
- [ ] Test all 7 journeys manually
- [ ] Run analytics queries
- [ ] Document findings
- [ ] Create bug tracker
- [ ] Prioritize fixes
- [ ] Retest after fixes

---

## 🎯 Next Steps

After Week 0 testing:
1. Fix any critical issues
2. Optimize tool descriptions based on results
3. Refine prompts based on conversation quality
4. Prepare for Week 1 implementation
5. Set up monitoring dashboard
