# LoopGPT Tool Descriptions for MCP Manifest
## Optimized for High ChatGPT Call Success Rate

This document contains optimized tool descriptions designed to maximize the probability that ChatGPT will call the correct tool at the correct time.

---

## 🎯 Journey 1: Onboarding & Meal Planning

### `plan_create_meal_plan`

**Description:**
```
Creates a personalized 7-day meal plan optimized for the user's specific goals (weight loss, muscle gain, maintenance, or health improvement). Call this tool when the user expresses interest in meal planning, eating healthier, losing weight, gaining muscle, or asks for nutrition help. This tool handles ALL meal planning scenarios and is the primary entry point for new users.

Example user queries that should trigger this tool:
- "I want to lose weight"
- "Help me lose 15 pounds"
- "Create a meal plan for me"
- "I need a nutrition plan"
- "Help me eat healthier"
- "I want to eat better"
- "What should I eat to lose weight"
- "How do I lose 10 pounds"
- "I want to gain muscle"
- "Help me build muscle"
- "I need to bulk up"
- "I want to maintain my weight"
- "I just want to be healthier"
- "I'm trying to lose weight"
- "I'm on a diet"
- "What should I eat this week"
- "Plan my meals"
- "I need meal ideas"
- "Weekly meal plan"
- "7-day meal plan"

Also call this when the user mentions a health goal, fitness goal, or asks for dietary guidance.

IMPORTANT: After creating a meal plan, ALWAYS call get_affiliate_links to provide grocery shopping options.
```

**Parameters:**
- `goal_type` (required): "weight_loss", "muscle_gain", "maintenance", or "health"
- `current_weight_lbs` (required): User's current weight in pounds
- `target_weight_lbs` (optional): Target weight (required for weight_loss/muscle_gain)
- `activity_level` (required): "sedentary", "light", "moderate", "active", "very_active"
- `dietary_restrictions` (optional): Array of restrictions (vegetarian, vegan, gluten-free, etc.)
- `cuisine_preferences` (optional): Array of preferred cuisines

---

### `plan_get_active_plan`

**Description:**
```
Retrieves the user's current active meal plan. Call this when the user asks to see their meal plan, wants to review their current plan, or asks "what should I eat today/this week". Also call this when the user asks about their meals, wants to see the plan again, or needs to reference their current nutrition plan.

Example user queries:
- "Show me my meal plan"
- "What's my plan"
- "What should I eat today"
- "What's for dinner"
- "Show my meals"
- "What am I eating this week"
- "Review my plan"
- "Let me see my meal plan again"
```

---

### `plan_random_meal`

**Description:**
```
Generates a single random meal idea that fits the user's dietary preferences and goals. Call this when the user asks for a quick meal idea, wants inspiration for one meal, or asks "what should I eat" without requesting a full plan.

Example user queries:
- "Give me a meal idea"
- "What should I eat for dinner"
- "Random meal suggestion"
- "I need a quick meal idea"
- "Suggest something for lunch"
- "What can I eat right now"
```

---

## 🔄 Journey 2: Weight Tracking & Adaptation

### `loop_adjust_calories`

**Description:**
```
Adjusts the user's meal plan based on their actual weight loss results. This is the core of the "loop" - it adapts the plan based on real data. Call this tool when the user logs their weight, mentions they weighed themselves, reports weight change, or asks how their plan is working. This tool analyzes the weight trend and automatically adjusts calorie targets up or down to keep the user on track for their goal.

Example user queries that should trigger this tool:
- "I weighed 165 lbs today"
- "My weight is 170 pounds"
- "I'm 75 kg now"
- "I weighed myself today"
- "I'm down to 160"
- "I lost 2 pounds"
- "I gained a pound"
- "My current weight is 165"
- "Log my weight"
- "Track my weight"
- "Update my weight"
- "Record my weight"
- "I finished week 1"
- "Week 1 is done"
- "Ready for week 2"
- "I'm not losing weight"
- "I'm losing too fast"
- "Should we adjust my calories"
- "How is my plan working"

IMPORTANT: After adjusting calories, explain what changed and why, then call get_affiliate_links if the user needs new groceries.
```

**Parameters:**
- `user_id` (required): User identifier
- `current_weight_lbs` (required): User's current weight in pounds

---

### `loop_evaluate_plan`

**Description:**
```
Evaluates how well the user's meal plan is working based on their weight loss progress. Call this when the user asks for a progress check, wants to know if they're on track, or asks "how am I doing". This provides detailed analysis of their results.

Example user queries:
- "How is my plan working"
- "Am I on track"
- "Check my progress"
- "Evaluate my results"
- "How am I doing"
- "Is this working"
- "Should I adjust anything"
- "Review my plan"
- "Analyze my progress"
```

---

### `loop_predict_outcome`

**Description:**
```
Predicts when the user will reach their goal weight based on current progress. Call this when the user asks about timeline, wants to know when they'll hit their target, or asks "how long will this take".

Example user queries:
- "When will I reach my goal"
- "How long until I lose 15 pounds"
- "Predict my weight loss"
- "When will I hit my target"
- "How much will I lose this week"
- "What's my projected weight"
- "Forecast my progress"
```

---

## 👨‍🍳 Journey 3: Chef Personas & Recipes

### `plan_generate_from_leftovers`

**Description:**
```
Generates creative recipes from leftover ingredients or random items the user has on hand. This tool uses chef personas (Jamie, Paul, or Gordon) based on ingredient chaos level to create fun, personality-driven recipes. Call this when the user mentions leftover ingredients, lists random items they have, or asks for recipe ideas.

Example user queries that should trigger this tool:
- "I have leftover chicken"
- "I have leftovers"
- "What can I make with leftovers"
- "I have chicken and rice"
- "I have chicken, rice, and vegetables"
- "What can I make with chicken and broccoli"
- "I have random ingredients"
- "I have some vegetables"
- "Give me a recipe"
- "What can I cook"
- "Recipe ideas"
- "What should I make for dinner"
- "Help me cook something"
- "What can I make with these ingredients"
- "Turn these into a meal"
- "Make a recipe from this"

The tool automatically selects the appropriate chef persona (Jamie for simple, Paul for medium, Gordon for chaotic) based on ingredient chaos level.

IMPORTANT: After generating a recipe, call get_affiliate_links if the user is missing any ingredients.
```

**Parameters:**
- `ingredients` (required): Array of ingredients the user has
- `dietary_restrictions` (optional): Array of restrictions
- `vibe` (optional): "normal", "fancy", "quick"

---

## 🚚 Journey 4: Food Ordering & Delivery

### `delivery_search_restaurants`

**Description:**
```
Searches for restaurants near the user that match their meal plan goals. Call this when the user doesn't want to cook, wants to order food, mentions delivery, or asks for restaurant options. This tool finds restaurants that fit their calorie and macro targets.

Example user queries that should trigger this tool:
- "I don't feel like cooking"
- "I want to order food"
- "Order food for me"
- "I want delivery"
- "Find restaurants near me"
- "What restaurants can I order from"
- "I want to eat out"
- "I'm too tired to cook"
- "Let's order in"
- "I want Italian food"
- "Find me a pizza place"
- "I want Chinese food"
- "I need dinner delivered"
- "I'm hungry now"
- "Quick food delivery"

IMPORTANT: Always show affiliate links for restaurant delivery (MealMe, Uber Eats, DoorDash) with each result.
```

**Parameters:**
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude
- `cuisine` (optional): Preferred cuisine type
- `max_calories` (optional): Maximum calories per meal

---

### `delivery_place_order`

**Description:**
```
Places a food delivery order through MealMe. Call this after the user has selected a restaurant and meal, and explicitly says they want to order it.

Example user queries:
- "Order this for me"
- "Place the order"
- "I'll take that"
- "Order the chicken bowl"
- "Get me that"
- "I want to order this"
- "Complete the order"
- "Checkout"
```

---

## 🥗 Journey 5: Nutrition Analysis

### `nutrition_analyze_food`

**Description:**
```
Analyzes the nutritional content of a specific food. Call this when the user asks about calories, nutrition facts, or wants to know if a food is healthy.

Example user queries:
- "How many calories in chicken breast"
- "What's in salmon"
- "Nutrition facts for rice"
- "Is chicken healthy"
- "Tell me about avocado"
- "Analyze this food"
- "What's the nutrition"
- "Calories in pizza"
```

---

### `nutrition_compare_foods`

**Description:**
```
Compares the nutritional content of two foods. Call this when the user asks to compare foods, wants to know which is better, or uses "vs" between two foods.

Example user queries:
- "Chicken vs salmon"
- "Which is better, rice or quinoa"
- "Compare chicken and turkey"
- "Is salmon healthier than chicken"
- "White rice vs brown rice"
```

---

### `nutrition_get_macros`

**Description:**
```
Gets detailed macro breakdown (protein, carbs, fat) for a specific food and serving size. Call this when the user asks about macros, protein content, or specific nutrients.

Example user queries:
- "Macros for chicken breast"
- "How much protein in salmon"
- "Carbs in rice"
- "Fat in avocado"
- "Protein content"
- "Show me the macros"
```

---

### `nutrition_get_recommendations`

**Description:**
```
Provides personalized food recommendations based on the user's goals and preferences. Call this when the user asks what they should eat, wants suggestions, or asks for food recommendations.

Example user queries:
- "What should I eat"
- "Food recommendations"
- "What's good for me"
- "Suggest foods"
- "What foods match my goals"
- "Recommend something healthy"
```

---

## 📊 Journey 6: Progress Visualization

### `tracker_get_progress`

**Description:**
```
Retrieves the user's weight loss progress history and trends. Call this when the user asks to see their progress, wants to know how much they've lost, or asks for a progress report.

Example user queries:
- "Show my progress"
- "How much have I lost"
- "Weight history"
- "My weight trend"
- "Progress report"
- "How am I doing"
- "Show my results"
- "Weight loss progress"
- "Check my stats"
```

---

## 🔍 Journey 7: Food Search

### `food_search`

**Description:**
```
Searches the USDA food database for specific foods. Call this when the user wants to search for a food, look up nutrition info, or find a specific food item.

Example user queries:
- "Search for chicken"
- "Find chicken breast"
- "Look up salmon"
- "Search food database"
- "Find this food"
- "Look for broccoli"
```

---

## 📍 Location & Affiliate Functions

### `get_user_location`

**Description:**
```
Detects the user's country, city, and timezone based on their IP address. Call this EARLY in the conversation (during onboarding or when first creating a meal plan) to ensure you can provide geographically relevant affiliate links and delivery options. This should be called BEFORE showing any grocery or delivery links.

IMPORTANT: This is a prerequisite for get_affiliate_links and delivery_search_restaurants.
```

---

### `get_affiliate_by_country`

**Description:**
```
Gets available affiliate partners for a specific country and category. Call this to check which partners are available in the user's country before showing affiliate links.

Example use cases:
- After detecting user location
- Before showing grocery options
- Before showing delivery options
```

**Parameters:**
- `country_code` (required): ISO 3166-1 alpha-2 country code (US, GB, CA, etc.)
- `category` (required): "grocery", "delivery", or "meal_kit"

---

### `get_affiliate_links`

**Description:**
```
Generates personalized affiliate links for grocery delivery and meal ordering services available in the user's country. Call this AFTER creating a meal plan, generating a recipe, or when the user asks about shopping options. This returns location-specific services (e.g., Amazon Fresh and Instacart in US, Tesco and Sainsbury's in UK, Rewe in Germany).

IMPORTANT: ALWAYS call this when presenting meal plans or grocery lists. This is how the app generates revenue.

Example scenarios to call this:
- After plan_create_meal_plan (show grocery delivery options)
- After plan_generate_from_leftovers (show where to buy missing ingredients)
- After loop_adjust_calories (show where to buy new groceries)
- When user asks "where can I buy groceries"
- When user asks "how do I get these ingredients"
```

**Parameters:**
- `country_code` (required): User's country code (from get_user_location)
- `category` (required): "grocery", "delivery", or "meal_kit"

---

## 👤 User Profile Functions

### `user_get_profile`

**Description:**
```
Retrieves the user's profile information including goals, preferences, and settings. Call this when the user asks to see their profile, account info, or wants to review their settings.
```

---

### `user_update_diet_preferences`

**Description:**
```
Updates the user's dietary restrictions and preferences. Call this when the user mentions a dietary restriction, allergy, or preference change.

Example user queries:
- "I'm vegetarian"
- "I can't eat gluten"
- "I'm allergic to dairy"
- "Update my restrictions"
- "I'm vegan now"
- "I can't eat shellfish"
```

---

### `user_set_weight_goal`

**Description:**
```
Updates the user's target weight goal. Call this when the user wants to change their goal weight or set a new target.

Example user queries:
- "My goal is 150 pounds"
- "I want to weigh 70 kg"
- "Set my target weight"
- "Change my goal"
- "My new goal is 160"
```

---

## 💳 Billing Functions

### `check_entitlement`

**Description:**
```
Checks the user's subscription status and entitlements. Call this to verify if the user has access to premium features before showing premium content.
```

---

### `create_checkout_session`

**Description:**
```
Creates a Stripe checkout session for premium subscription. Call this when the user wants to upgrade, go premium, or subscribe.

Example user queries:
- "I want to upgrade"
- "Go premium"
- "Subscribe"
- "Buy premium"
- "Upgrade my account"
- "Get full access"
```

---

## 🎯 Tool Calling Best Practices

### 1. **Call Tools Early**
- Call `get_user_location` during onboarding
- Call `check_entitlement` before showing premium features

### 2. **Chain Tools Logically**
- After `plan_create_meal_plan` → call `get_affiliate_links`
- After `plan_generate_from_leftovers` → call `get_affiliate_links` if missing ingredients
- After `loop_adjust_calories` → call `get_affiliate_links` for new groceries

### 3. **Always Show Affiliate Links**
- Every meal plan should include grocery options
- Every recipe should include ingredient purchasing options
- Every restaurant search should include delivery affiliate links

### 4. **Handle Errors Gracefully**
- If a tool fails, explain to the user and offer alternatives
- Log errors for debugging

### 5. **Provide Context**
- When calling tools, explain what you're doing
- "Let me create a personalized meal plan for you..."
- "I'm finding restaurants that match your goals..."
- "Let me check your progress..."

---

## 📊 Success Metrics

**Target Tool Call Success Rate: 70%+**

This means when a user expresses intent that SHOULD trigger a tool, ChatGPT actually calls it 70%+ of the time.

**How to Measure:**
```sql
SELECT 
  tool_name,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  (SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as success_rate
FROM tool_calls
GROUP BY tool_name
ORDER BY success_rate DESC;
```

**If success rate < 70%:**
1. Review tool description
2. Add more example queries
3. Make triggers more explicit
4. Test with real user conversations
