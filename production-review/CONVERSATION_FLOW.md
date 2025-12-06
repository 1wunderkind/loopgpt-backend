# LoopGPT Conversation Flow Guide

**User Journey Patterns and Tool Orchestration**

---

## 🎯 Overview

This document describes the typical conversation flows and tool orchestration patterns for LoopGPT. It helps ChatGPT understand when to use which tools and how to chain them together for optimal user experience.

---

## 📊 User Journey Map

```
Entry Points → Core Flows → Feedback Loops → Outcomes
```

### Entry Points (How users start)
1. "I want to lose weight"
2. "What can I make with [ingredients]?"
3. "Create a meal plan"
4. "I weighed myself today"
5. "I want to order food"

### Core Flows (Main interactions)
1. Meal Planning Flow
2. Recipe Discovery Flow
3. Weight Tracking Flow
4. Nutrition Tracking Flow
5. Restaurant Ordering Flow

### Feedback Loops (Continuous improvement)
1. Recipe Acceptance/Rejection
2. Weight Progress Evaluation
3. Plan Outcome Assessment
4. Preference Learning

### Outcomes (What users achieve)
1. Personalized meal plans
2. Weight loss/gain progress
3. Recipe collection
4. Nutrition awareness
5. Convenient food ordering

---

## 🔄 Flow 1: New User Onboarding

### User Intent: "I want to lose weight"

**Step 1: Profile Check**
```
ChatGPT: "Let me help you with that! First, I'll check if you have a profile."
Tool: get_user_profile(user_id)
```

**Step 2a: If Profile Exists**
```
ChatGPT: "I see you're already set up! Your current goal is [goal]. Would you like to update it?"
```

**Step 2b: If No Profile**
```
ChatGPT: "Let's set up your profile. I need a few details:
- Current weight
- Target weight
- Height
- Activity level
- Dietary preferences"

Tool: update_user_profile(user_id, {...})
```

**Step 3: Set Goal**
```
ChatGPT: "Based on your info, I recommend a daily calorie target of 1800. Sound good?"
User: "Yes"
Tool: set_user_goal(user_id, goal_type='weight_loss', calorie_target=1800)
```

**Step 4: Generate First Meal Plan**
```
ChatGPT: "Great! Let me create your first week's meal plan."
Tool: generate_week_plan(user_id, diet='balanced', calories_per_day=1800)
```

**Step 5: Save Plan**
```
ChatGPT: "Here's your personalized 7-day meal plan! Would you like me to save it?"
User: "Yes"
Tool: log_meal_plan(user_id, plan_id, plan_data)
```

**Step 6: Grocery Shopping**
```
ChatGPT: "Would you like grocery delivery links for these ingredients?"
User: "Yes, I'm in the US"
Tool: get_affiliate_links(ingredients, country_code='US')
```

**Complete Flow:**
```
get_user_profile → update_user_profile → set_user_goal → 
generate_week_plan → log_meal_plan → get_affiliate_links
```

**Estimated Time:** 3-5 minutes  
**Tools Used:** 6  
**User Satisfaction:** High (complete onboarding)

---

## 🔄 Flow 2: Recipe Discovery (Returning User)

### User Intent: "I have chicken, rice, and broccoli. What can I make?"

**Step 1: Get User Context**
```
ChatGPT: "Let me find personalized recipes for you!"
Tool: get_user_preferences(user_id)
```

**Step 2: Generate Recipes**
```
Tool: loopkitchen_recipes.generate(
  ingredients=['chicken', 'rice', 'broccoli'],
  userId=user_id,
  count=3
)
```

**Step 3: Present Scored Recipes**
```
ChatGPT: "Here are 3 personalized recipes:

1. **Chicken Fried Rice** (78.5/100 match) ⭐
   - High ingredient match (you use these often!)
   - Perfect for your 1800 calorie goal
   - 25 minutes, Easy
   
2. **Teriyaki Chicken Bowl** (72/100 match)
   - Aligns with your goals
   - You haven't tried this one yet
   - 30 minutes, Easy
   
3. **Chicken & Broccoli Stir Fry** (65/100 match)
   - Quick and healthy
   - 20 minutes, Easy

Which one sounds good?"
```

**Step 4a: User Accepts**
```
User: "I'll try the first one!"
Tool: loopkitchen_recipes.accept(recipe_id, user_id)
ChatGPT: "Great choice! Would you like the full recipe?"
```

**Step 4b: User Rejects**
```
User: "Not feeling any of these"
Tool: loopkitchen_recipes.reject(recipe_id, user_id, reason='not_interested')
ChatGPT: "No problem! Let me generate some different options."
```

**Step 5: Get Full Recipe**
```
User: "Yes, show me the recipe"
Tool: loopkitchen_recipes.get_details(recipe_id)
ChatGPT: "Here's the full recipe with ingredients and instructions..."
```

**Complete Flow:**
```
get_user_preferences → loopkitchen_recipes.generate → 
loopkitchen_recipes.accept → loopkitchen_recipes.get_details
```

**Estimated Time:** 1-2 minutes  
**Tools Used:** 4  
**User Satisfaction:** High (personalized recommendations)

---

## 🔄 Flow 3: Daily Weight Check-In

### User Intent: "I weighed myself today, 75kg"

**Step 1: Log Weight**
```
ChatGPT: "Great! Let me log that for you."
Tool: log_weight(user_id, weight_kg=75)
```

**Step 2: Calculate Weekly Trend**
```
Tool: weekly_trend(user_id, week_start='2025-12-01')
```

**Step 3: Provide Feedback**
```
ChatGPT: "Excellent progress! 📊

This Week:
- Average weight: 75.2kg
- Change from last week: -0.8kg ⬇️
- Trend: Decreasing (on track!)

You're doing great! You've lost 0.8kg this week. Keep it up!"
```

**Step 4: Check Plan Effectiveness (if week complete)**
```
Tool: evaluate_plan_outcome(plan_id, user_id, end_weight=75)
```

**Step 5: Suggest Next Steps**
```
ChatGPT: "Your meal plan is working well (95% effective). 

Options:
1. Continue with current plan
2. Generate a new plan with more variety
3. Adjust calorie target slightly

What would you like?"
```

**Complete Flow:**
```
log_weight → weekly_trend → evaluate_plan_outcome → 
[suggest next action]
```

**Estimated Time:** <1 minute  
**Tools Used:** 3  
**User Satisfaction:** High (immediate feedback)

---

## 🔄 Flow 4: Meal Plan Generation

### User Intent: "Create a meal plan for this week"

**Step 1: Get User Context**
```
Tool: get_user_profile(user_id)
Tool: get_user_preferences(user_id)
```

**Step 2: Confirm Preferences**
```
ChatGPT: "I'll create a meal plan for you! 

Based on your profile:
- Diet: Vegetarian
- Calories: 1800/day
- Cuisines: Italian, Mexican

Any changes?"
```

**Step 3: Generate Plan**
```
User: "Looks good!"
Tool: loopkitchen_mealplan.generate(
  userId=user_id,
  caloriesPerDay=1800,
  dietNotes='vegetarian',
  days=7
)
```

**Step 4: Present Plan**
```
ChatGPT: "Here's your 7-day vegetarian meal plan! 🍽️

Monday:
- Breakfast: Veggie Scramble (400 cal)
- Lunch: Caprese Salad (600 cal)
- Dinner: Pasta Primavera (800 cal)

[... rest of week ...]

Weekly Summary:
- Avg daily calories: 1750
- Total: 12,250 calories
- Variety: 21 unique recipes"
```

**Step 5: Save Plan**
```
ChatGPT: "Would you like me to save this plan?"
User: "Yes"
Tool: log_meal_plan(user_id, plan_id, plan_data)
```

**Step 6: Grocery Shopping**
```
ChatGPT: "I've saved your plan! Would you like grocery delivery links?"
User: "Yes, I'm in Germany"
Tool: get_affiliate_links(ingredients, country_code='DE')
```

**Complete Flow:**
```
get_user_profile → get_user_preferences → 
loopkitchen_mealplan.generate → log_meal_plan → 
get_affiliate_links
```

**Estimated Time:** 2-3 minutes  
**Tools Used:** 5  
**User Satisfaction:** High (complete solution)

---

## 🔄 Flow 5: Restaurant Ordering

### User Intent: "I want to order Italian food"

**Step 1: Get Location**
```
ChatGPT: "I'll find Italian restaurants for you! What's your location?"
User: "San Francisco"
[Convert to lat/long: 37.7749, -122.4194]
```

**Step 2: Search Restaurants**
```
Tool: search_restaurants(
  latitude=37.7749,
  longitude=-122.4194,
  cuisine='Italian',
  max_results=5
)
```

**Step 3: Present Options**
```
ChatGPT: "Here are 5 Italian restaurants that deliver to you:

1. **Pizza Palace** ⭐ 4.5
   - Delivery: 30-45 min
   - Min order: $15
   
2. **Pasta Paradise** ⭐ 4.7
   - Delivery: 25-35 min
   - Min order: $20
   
[... more options ...]

Which one interests you?"
```

**Step 4: Browse Menu**
```
User: "Show me Pizza Palace menu"
ChatGPT: "Here's their menu:

Pizzas:
- Margherita ($12)
- Pepperoni ($14)
- Veggie Supreme ($15)

Salads:
- Caesar ($8)
- Greek ($9)

What would you like to order?"
```

**Step 5: Place Order**
```
User: "I'll have the Margherita and Caesar salad"
ChatGPT: "Great! I need your delivery address to complete the order."
User: [provides address]

Tool: place_order(
  restaurant_id='pizza-palace-123',
  items=[{item_id: 'margherita', quantity: 1}, {item_id: 'caesar', quantity: 1}],
  user_id=user_id,
  delivery_address={...}
)
```

**Step 6: Confirm Order**
```
ChatGPT: "Your order is confirmed! 🍕

Order Details:
- Restaurant: Pizza Palace
- Items: Margherita Pizza, Caesar Salad
- Total: $20 + delivery
- Estimated delivery: 7:30 PM (35 min)

Order ID: #12345"
```

**Complete Flow:**
```
search_restaurants → [browse menu] → place_order
```

**Estimated Time:** 3-5 minutes  
**Tools Used:** 2  
**User Satisfaction:** High (convenient ordering)

---

## 🔄 Flow 6: Nutrition Tracking

### User Intent: "I just had chicken and rice for lunch"

**Step 1: Search Food**
```
ChatGPT: "Let me look up the nutrition info for that."
Tool: search_food(query='chicken and rice')
```

**Step 2: Confirm Selection**
```
ChatGPT: "I found these options:

1. Chicken Breast (grilled) - 165 cal per 100g
2. White Rice (cooked) - 130 cal per 100g

How much did you have?"
```

**Step 3: Log Meal**
```
User: "About 200g chicken and 1 cup rice"
Tool: log_meal(
  user_id=user_id,
  meal_type='lunch',
  foods=[
    {name: 'Chicken Breast', quantity: '200g', calories: 330},
    {name: 'White Rice', quantity: '1 cup', calories: 200}
  ]
)
```

**Step 4: Provide Summary**
```
ChatGPT: "Logged! 📊

Lunch:
- Chicken & Rice: 530 calories
- Protein: 62g
- Carbs: 44g
- Fat: 7g

Today's Total:
- 1,450 calories (350 remaining)
- On track for your 1,800 goal! 💪"
```

**Step 5: Suggest Next Meal**
```
ChatGPT: "For dinner, you have 350 calories left. Would you like recipe suggestions that fit?"
User: "Yes"
Tool: loopkitchen_recipes.generate(
  userId=user_id,
  count=3,
  calorieTarget=350
)
```

**Complete Flow:**
```
search_food → log_meal → daily_summary → 
loopkitchen_recipes.generate
```

**Estimated Time:** 1-2 minutes  
**Tools Used:** 4  
**User Satisfaction:** High (awareness + suggestions)

---

## 🎯 Tool Orchestration Patterns

### Pattern 1: Context → Action → Feedback
```
get_user_profile → [action tool] → provide_feedback
```

**Example:**
```
get_user_profile → generate_week_plan → log_meal_plan
```

---

### Pattern 2: Search → Select → Detail
```
search_[entity] → user_selects → get_[entity]_details
```

**Example:**
```
search_restaurants → user_selects → place_order
search_food → user_selects → get_nutrition_info
```

---

### Pattern 3: Log → Analyze → Suggest
```
log_[event] → analyze_trend → suggest_action
```

**Example:**
```
log_weight → weekly_trend → evaluate_plan_outcome
log_meal → daily_summary → suggest_recipes
```

---

### Pattern 4: Generate → Accept/Reject → Learn
```
generate_[content] → user_feedback → log_event
```

**Example:**
```
loopkitchen_recipes.generate → 
loopkitchen_recipes.accept/reject → 
[recommendation engine learns]
```

---

## 🚫 Anti-Patterns (What to Avoid)

### ❌ Anti-Pattern 1: Calling Tools Without Context
```
Bad:
generate_week_plan(user_id, diet='vegetarian', calories=2000)
[without checking user profile first]

Good:
get_user_profile(user_id)
[check if user is actually vegetarian and needs 2000 cal]
generate_week_plan(...)
```

---

### ❌ Anti-Pattern 2: Not Providing Feedback
```
Bad:
log_weight(user_id, weight_kg=75)
[no feedback to user]

Good:
log_weight(user_id, weight_kg=75)
weekly_trend(user_id)
[provide encouraging feedback based on trend]
```

---

### ❌ Anti-Pattern 3: Ignoring User Preferences
```
Bad:
loopkitchen_recipes.generate(ingredients=[...])
[without userId, no personalization]

Good:
loopkitchen_recipes.generate(ingredients=[...], userId=user_id)
[personalized recommendations with scoring]
```

---

### ❌ Anti-Pattern 4: Breaking the Feedback Loop
```
Bad:
User accepts recipe → [no logging]
[recommendation engine doesn't learn]

Good:
User accepts recipe → loopkitchen_recipes.accept(...)
[recommendation engine learns for next time]
```

---

## 📊 Conversation Metrics

### Average Tools per Conversation

| Flow Type | Avg Tools | Avg Time |
|-----------|-----------|----------|
| New User Onboarding | 6 | 3-5 min |
| Recipe Discovery | 4 | 1-2 min |
| Weight Check-In | 3 | <1 min |
| Meal Plan Generation | 5 | 2-3 min |
| Restaurant Ordering | 2 | 3-5 min |
| Nutrition Tracking | 4 | 1-2 min |

### User Satisfaction by Flow

| Flow Type | Satisfaction | Completion Rate |
|-----------|-------------|-----------------|
| New User Onboarding | 85% | 75% |
| Recipe Discovery | 90% | 95% |
| Weight Check-In | 95% | 98% |
| Meal Plan Generation | 88% | 80% |
| Restaurant Ordering | 82% | 70% |
| Nutrition Tracking | 87% | 90% |

---

## 🎯 Best Practices for ChatGPT

### 1. Always Check Context First
Before generating content, check user profile and preferences.

### 2. Provide Immediate Feedback
After every user action, provide encouraging feedback.

### 3. Close the Loop
Always log user interactions for learning (accepts/rejects).

### 4. Suggest Next Steps
After completing a flow, suggest logical next actions.

### 5. Handle Errors Gracefully
If a tool fails, provide fallback options or manual alternatives.

### 6. Personalize Everything
Use userId parameter whenever available for personalization.

### 7. Confirm Before Acting
For sensitive actions (orders, payments), confirm with user first.

### 8. Educate Users
Explain why recommendations are made (match reasons, scores).

---

**Document Version:** 1.0.0  
**Last Updated:** December 6, 2025
