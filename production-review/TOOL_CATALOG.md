# LoopGPT Tool Catalog

**Complete Reference for All 28 MCP Tools**

---

## 📋 Table of Contents

1. [Meal Planning Tools](#meal-planning-tools) (3 tools)
2. [Weight Tracking Tools](#weight-tracking-tools) (3 tools)
3. [Restaurant Ordering Tools](#restaurant-ordering-tools) (2 tools)
4. [Nutrition Tracking Tools](#nutrition-tracking-tools) (4 tools)
5. [LoopKitchen Recipe Tools](#loopkitchen-recipe-tools) (12 tools)
6. [User Management Tools](#user-management-tools) (4 tools)

---

## 1. Meal Planning Tools

### 1.1 `generate_week_plan`

**Description:** Generates a personalized 7-day meal plan based on user dietary preferences, calorie targets, allergies, and cuisine preferences.

**When to Use:**
- User asks for a meal plan
- User wants to lose/gain weight
- User has specific dietary requirements
- User wants variety in their meals

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "diet": "string (required) - vegetarian, vegan, keto, paleo, pescatarian, omnivore",
  "calories_per_day": "number (required) - target daily calories",
  "meals_per_day": "integer (optional, default: 3) - 2-4 meals",
  "allergies": "array of strings (optional) - food allergies to exclude",
  "cuisine_preferences": "array of strings (optional) - Italian, Mexican, Asian, etc.",
  "language": "string (optional, default: en) - language code"
}
```

**Output:**
```json
{
  "plan_id": "unique-plan-id",
  "week_start": "2025-12-06",
  "meals": [
    {
      "day": "Monday",
      "breakfast": { "title": "...", "calories": 400 },
      "lunch": { "title": "...", "calories": 600 },
      "dinner": { "title": "...", "calories": 700 }
    }
  ],
  "shopping_list": ["chicken breast", "rice", "broccoli", ...],
  "total_calories": 14000
}
```

**Example Conversation:**
```
User: "I want to lose weight, create a meal plan for me"
ChatGPT: "I'll create a personalized meal plan for you. What's your target daily calorie intake?"
User: "1800 calories, I'm vegetarian"
ChatGPT: [calls generate_week_plan with diet=vegetarian, calories_per_day=1800]
ChatGPT: "Here's your 7-day vegetarian meal plan with 1800 calories per day..."
```

---

### 1.2 `log_meal_plan`

**Description:** Saves a generated meal plan to the user's account for tracking and future reference.

**When to Use:**
- After generating a meal plan
- User wants to save the plan
- Need to track plan adherence
- For outcome evaluation later

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "plan_id": "string (required) - from generate_week_plan",
  "plan_data": "object (required) - complete meal plan data",
  "start_date": "string (optional) - when user will start (ISO 8601)"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Meal plan saved successfully",
  "stored_plan_id": "db-plan-id-123"
}
```

**Example Conversation:**
```
ChatGPT: "Would you like me to save this meal plan to your account?"
User: "Yes please"
ChatGPT: [calls log_meal_plan]
ChatGPT: "Great! I've saved your meal plan. You can start it on Monday."
```

---

### 1.3 `get_affiliate_links`

**Description:** Generates country-specific grocery affiliate links for ingredients in a meal plan. Supports 25 countries.

**When to Use:**
- After generating a meal plan
- User asks "where can I buy these ingredients?"
- User wants grocery delivery
- Need to monetize through affiliates

**Input Parameters:**
```json
{
  "ingredients": "array of strings (required) - ingredient names",
  "country_code": "string (required) - ISO 3166-1 alpha-2 (US, GB, DE, FR, etc.)",
  "user_id": "string (optional) - for tracking conversions"
}
```

**Output:**
```json
{
  "links": [
    {
      "ingredient": "chicken breast",
      "url": "https://instacart.com/...",
      "provider": "Instacart",
      "estimated_price": 12.99
    }
  ],
  "total_estimated_cost": 87.50
}
```

**Supported Countries:** US, GB, DE, FR, ES, IT, NL, BE, AT, CH, SE, NO, DK, FI, IE, PT, PL, CZ, AU, NZ, CA, MX, BR, AR, CL

**Example Conversation:**
```
User: "Where can I buy these ingredients?"
ChatGPT: "What country are you in?"
User: "United States"
ChatGPT: [calls get_affiliate_links with country_code=US]
ChatGPT: "Here are grocery delivery options for your ingredients..."
```

---

## 2. Weight Tracking Tools

### 2.1 `log_weight`

**Description:** Records a daily weight entry for a user. Core component of the feedback loop.

**When to Use:**
- User says "I weighed myself"
- User reports their weight
- Daily check-in
- Progress tracking

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "weight_kg": "number (required) - weight in kilograms",
  "date": "string (optional, default: today) - ISO 8601",
  "notes": "string (optional) - measurement notes"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Weight logged successfully",
  "log_id": "weight-log-123",
  "bmi": 24.5
}
```

**Example Conversation:**
```
User: "I weighed myself today, 75kg"
ChatGPT: [calls log_weight with weight_kg=75]
ChatGPT: "Great! I've logged your weight at 75kg. Your BMI is 24.5 (healthy range)."
```

---

### 2.2 `weekly_trend`

**Description:** Calculates weekly weight trends and statistics for a user.

**When to Use:**
- User asks "how am I doing?"
- Weekly progress check
- Before generating new meal plan
- After completing a week

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "week_start": "string (required) - start date (ISO 8601)",
  "include_graph_data": "boolean (optional, default: false)"
}
```

**Output:**
```json
{
  "average_weight": 74.8,
  "weight_change": -0.5,
  "trend": "decreasing",
  "data_points": 6,
  "daily_data": [...]
}
```

**Example Conversation:**
```
User: "How's my progress this week?"
ChatGPT: [calls weekly_trend]
ChatGPT: "You're doing great! You've lost 0.5kg this week. Your average weight is 74.8kg."
```

---

### 2.3 `evaluate_plan_outcome`

**Description:** Evaluates the effectiveness of a meal plan by comparing actual weight results against goals.

**When to Use:**
- At end of meal plan period
- User completed a week
- Need to adjust future plans
- Feedback loop optimization

**Input Parameters:**
```json
{
  "plan_id": "string (required)",
  "user_id": "string (required)",
  "end_weight": "number (required) - weight at end (kg)",
  "adherence_score": "number (optional, default: 100) - 0-100"
}
```

**Output:**
```json
{
  "outcome": "met_goal",
  "expected_change": -1.0,
  "actual_change": -1.2,
  "effectiveness_score": 95,
  "recommendations": ["Continue current plan", "Increase protein slightly"]
}
```

**Example Conversation:**
```
User: "I finished the meal plan, I'm now 73.8kg"
ChatGPT: [calls evaluate_plan_outcome]
ChatGPT: "Excellent! You exceeded your goal by 0.2kg. Your plan was 95% effective. Let's continue with a similar approach."
```

---

## 3. Restaurant Ordering Tools

### 3.1 `search_restaurants`

**Description:** Searches for restaurants near a location using MealMe API.

**When to Use:**
- User wants to order food
- User asks "what restaurants deliver here?"
- User wants to eat out
- Need restaurant recommendations

**Input Parameters:**
```json
{
  "latitude": "number (required)",
  "longitude": "number (required)",
  "cuisine": "string (optional) - Italian, Mexican, Asian, etc.",
  "max_results": "integer (optional, default: 10)"
}
```

**Output:**
```json
{
  "restaurants": [
    {
      "id": "rest-123",
      "name": "Pizza Palace",
      "cuisine": "Italian",
      "rating": 4.5,
      "delivery_time": "30-45 min",
      "min_order": 15.00
    }
  ]
}
```

**Example Conversation:**
```
User: "I want to order Italian food"
ChatGPT: "What's your location?"
User: "San Francisco"
ChatGPT: [calls search_restaurants with cuisine=Italian]
ChatGPT: "Here are 5 Italian restaurants that deliver to you..."
```

---

### 3.2 `place_order`

**Description:** Places a restaurant order via MealMe API.

**When to Use:**
- User selected a restaurant
- User wants to order specific items
- After browsing menu
- Ready to checkout

**Input Parameters:**
```json
{
  "restaurant_id": "string (required)",
  "items": "array of objects (required) - [{item_id, quantity}]",
  "user_id": "string (required)",
  "delivery_address": "object (required) - {street, city, zip}",
  "payment_method": "string (required) - card, cash, etc."
}
```

**Output:**
```json
{
  "order_id": "order-789",
  "status": "confirmed",
  "estimated_delivery": "2025-12-06T19:30:00Z",
  "total": 32.50
}
```

**Example Conversation:**
```
User: "Order the Margherita pizza and Caesar salad"
ChatGPT: [calls place_order]
ChatGPT: "Your order is confirmed! Estimated delivery: 7:30 PM. Total: $32.50"
```

---

## 4. Nutrition Tracking Tools

### 4.1 `log_meal`

**Description:** Logs a meal with nutrition information for tracking.

**When to Use:**
- User ate something
- User wants to track calories
- After meal completion
- Daily food logging

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "meal_type": "string (required) - breakfast, lunch, dinner, snack",
  "foods": "array of objects (required) - [{name, quantity, calories}]",
  "date": "string (optional, default: today)",
  "notes": "string (optional)"
}
```

**Output:**
```json
{
  "success": true,
  "log_id": "meal-log-456",
  "total_calories": 650,
  "daily_total": 1450
}
```

**Example Conversation:**
```
User: "I just had chicken and rice for lunch"
ChatGPT: [calls log_meal]
ChatGPT: "Logged! That's 650 calories. You've had 1450 calories today."
```

---

### 4.2 `search_food`

**Description:** Searches for food nutrition information in database.

**When to Use:**
- User asks "how many calories in X?"
- Need nutrition info
- Before logging meal
- Food database lookup

**Input Parameters:**
```json
{
  "query": "string (required) - food name",
  "max_results": "integer (optional, default: 10)"
}
```

**Output:**
```json
{
  "foods": [
    {
      "name": "Chicken Breast",
      "calories": 165,
      "protein_g": 31,
      "carbs_g": 0,
      "fat_g": 3.6,
      "serving_size": "100g"
    }
  ]
}
```

---

### 4.3 `get_nutrition_info`

**Description:** Gets detailed nutrition information for a specific food.

**When to Use:**
- User wants detailed macros
- Need micronutrient info
- Detailed food analysis
- Nutrition education

**Input Parameters:**
```json
{
  "food_id": "string (required) - from search_food",
  "quantity": "number (optional, default: 1) - serving multiplier"
}
```

**Output:**
```json
{
  "name": "Chicken Breast",
  "calories": 165,
  "macros": {
    "protein_g": 31,
    "carbs_g": 0,
    "fat_g": 3.6
  },
  "micros": {
    "vitamin_a": "2% DV",
    "iron": "4% DV"
  }
}
```

---

### 4.4 `daily_summary`

**Description:** Gets daily nutrition summary for a user.

**When to Use:**
- End of day check-in
- User asks "how did I do today?"
- Progress tracking
- Goal comparison

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "date": "string (optional, default: today)"
}
```

**Output:**
```json
{
  "date": "2025-12-06",
  "total_calories": 1850,
  "goal_calories": 2000,
  "macros": {
    "protein_g": 120,
    "carbs_g": 180,
    "fat_g": 60
  },
  "meals_logged": 3
}
```

---

## 5. LoopKitchen Recipe Tools

### 5.1 `loopkitchen_recipes.generate`

**Description:** Generates personalized recipes from ingredients using LeftoverGPT with recommendation engine scoring.

**When to Use:**
- User has ingredients and wants recipes
- "What can I make with X?"
- Leftover ingredients
- Recipe inspiration

**Input Parameters:**
```json
{
  "ingredients": "array of strings (required) - ingredient names",
  "count": "integer (optional, default: 3) - number of recipes",
  "dietConstraints": "array of strings (optional) - vegetarian, vegan, etc.",
  "timeLimit": "integer (optional) - max cooking time in minutes",
  "userId": "string (optional) - for personalization"
}
```

**Output:**
```json
{
  "widgets": [
    {
      "type": "RecipeCardCompact",
      "id": "recipe-001",
      "title": "Chicken Fried Rice",
      "shortDescription": "Quick and easy fried rice",
      "chaosRating": 35,
      "timeMinutes": 25,
      "difficulty": "easy",
      "recommendationScore": 78.5,
      "matchReason": "High ingredient match. Perfect calorie match.",
      "confidence": "high"
    }
  ]
}
```

**Recommendation Engine Features:**
- ✅ Scores recipes 0-100 points
- ✅ Learns from user behavior (accepts/rejects)
- ✅ Respects dietary restrictions
- ✅ Prevents repetitive suggestions
- ✅ Aligns with calorie goals

**Example Conversation:**
```
User: "I have chicken, rice, and soy sauce. What can I make?"
ChatGPT: [calls loopkitchen_recipes.generate]
ChatGPT: "Here are 3 personalized recipes for you:
1. Chicken Fried Rice (78.5/100 match) - High ingredient match!
2. Soy Glazed Chicken (72/100 match) - Aligns with your goals
3. Chicken Teriyaki Bowl (65/100 match) - New recipe for you"
```

---

### 5.2 `loopkitchen_mealplan.generate`

**Description:** Generates a 7-day meal plan using MealPlannerGPT with user context enrichment.

**When to Use:**
- User wants a weekly meal plan
- Meal prep planning
- Diet planning
- Variety in meals

**Input Parameters:**
```json
{
  "ingredients": "array of strings (optional) - pantry items",
  "caloriesPerDay": "number (optional) - target calories",
  "dietNotes": "string (optional) - diet style notes",
  "days": "integer (optional, default: 7) - 1-14 days",
  "startDate": "string (optional, default: today)",
  "userId": "string (optional) - for personalization"
}
```

**Output:**
```json
{
  "type": "WeekPlanner",
  "data": {
    "startDate": "2025-12-06",
    "days": [
      {
        "date": "2025-12-06",
        "dayName": "Monday",
        "meals": {
          "breakfast": { "recipeId": "...", "title": "...", "approxCalories": 400 },
          "lunch": { "recipeId": "...", "title": "...", "approxCalories": 600 },
          "dinner": { "recipeId": "...", "title": "...", "approxCalories": 700 }
        },
        "dayTotalCalories": 1700
      }
    ],
    "weeklySummary": {
      "avgDailyCalories": 1750,
      "totalCalories": 12250,
      "notes": "Balanced week with variety"
    }
  }
}
```

**Context Enrichment Features:**
- ✅ Fetches user's ingredient profile (top 10 frequently used)
- ✅ Fetches user's recipe preferences (acceptance rate, preferred persona)
- ✅ Appends context to GPT prompt for better personalization

---

### 5.3 `loopkitchen_recipes.accept`

**Description:** Logs when a user accepts/likes a recipe (for behavioral learning).

**When to Use:**
- User says "I like this recipe"
- User clicks "save recipe"
- User cooks the recipe
- Positive feedback

**Input Parameters:**
```json
{
  "recipeId": "string (required)",
  "userId": "string (required)",
  "sessionId": "string (optional)"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Recipe acceptance logged"
}
```

---

### 5.4 `loopkitchen_recipes.reject`

**Description:** Logs when a user rejects/dislikes a recipe (for behavioral learning).

**When to Use:**
- User says "I don't like this"
- User skips recipe
- Negative feedback
- "Show me something else"

**Input Parameters:**
```json
{
  "recipeId": "string (required)",
  "userId": "string (required)",
  "reason": "string (optional) - why rejected"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Recipe rejection logged"
}
```

---

### 5.5 `loopkitchen_recipes.get_details`

**Description:** Gets full recipe details (ingredients, instructions, nutrition).

**When to Use:**
- User wants full recipe
- User selected a recipe
- Need cooking instructions
- Detailed view

**Input Parameters:**
```json
{
  "recipeId": "string (required)"
}
```

**Output:**
```json
{
  "id": "recipe-001",
  "title": "Chicken Fried Rice",
  "ingredients": [
    { "name": "chicken breast", "quantity": "200g" },
    { "name": "rice", "quantity": "2 cups" }
  ],
  "instructions": [
    "1. Cook rice according to package",
    "2. Dice chicken and cook in wok",
    "3. Add rice and soy sauce, stir fry 5 min"
  ],
  "nutrition": {
    "calories": 520,
    "protein_g": 35,
    "carbs_g": 60,
    "fat_g": 12
  },
  "prepTime": 15,
  "cookTime": 20,
  "servings": 2
}
```

---

### 5.6-5.12 Additional LoopKitchen Tools

**Other tools in this category:**
- `loopkitchen_recipes.search` - Search recipe database
- `loopkitchen_recipes.filter` - Filter by diet/cuisine/time
- `loopkitchen_recipes.save` - Save recipe to favorites
- `loopkitchen_recipes.get_saved` - Get user's saved recipes
- `loopkitchen_recipes.rate` - Rate a recipe 1-5 stars
- `loopkitchen_recipes.comment` - Add comment to recipe
- `loopkitchen_recipes.share` - Share recipe with others

---

## 6. User Management Tools

### 6.1 `get_user_profile`

**Description:** Gets user profile information (goals, preferences, dietary restrictions).

**When to Use:**
- First interaction with user
- Need to check user settings
- Personalization context
- Profile lookup

**Input Parameters:**
```json
{
  "user_id": "string (required)"
}
```

**Output:**
```json
{
  "user_id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "goals": {
    "type": "weight_loss",
    "target_weight_kg": 75,
    "current_weight_kg": 80,
    "calorie_target": 1800
  },
  "dietary_restrictions": ["vegetarian", "gluten-free"],
  "preferences": {
    "cuisines": ["Italian", "Mexican"],
    "cooking_skill": "intermediate"
  }
}
```

---

### 6.2 `update_user_profile`

**Description:** Updates user profile information.

**When to Use:**
- User changes goals
- User updates preferences
- Profile editing
- Settings change

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "updates": "object (required) - fields to update"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

### 6.3 `set_user_goal`

**Description:** Sets or updates user's health/fitness goal.

**When to Use:**
- User sets new goal
- Goal change
- Initial setup
- Goal tracking

**Input Parameters:**
```json
{
  "user_id": "string (required)",
  "goal_type": "string (required) - weight_loss, muscle_gain, maintenance, performance",
  "target_weight_kg": "number (optional)",
  "target_date": "string (optional)",
  "calorie_target": "number (optional)"
}
```

**Output:**
```json
{
  "success": true,
  "goal_id": "goal-789",
  "message": "Goal set successfully"
}
```

---

### 6.4 `get_user_preferences`

**Description:** Gets user's recipe and meal preferences.

**When to Use:**
- Need personalization context
- Before generating recipes
- Preference lookup
- Recommendation engine input

**Input Parameters:**
```json
{
  "user_id": "string (required)"
}
```

**Output:**
```json
{
  "dietary_restrictions": ["vegetarian"],
  "favorite_cuisines": ["Italian", "Mexican"],
  "disliked_ingredients": ["mushrooms", "olives"],
  "cooking_skill": "intermediate",
  "preferred_cooking_time": 30
}
```

---

## 📊 Tool Usage Statistics

### Most Frequently Used Tools

1. `loopkitchen_recipes.generate` - 45% of all tool calls
2. `generate_week_plan` - 20% of all tool calls
3. `log_weight` - 15% of all tool calls
4. `search_food` - 10% of all tool calls
5. `get_user_profile` - 5% of all tool calls
6. Other tools - 5% of all tool calls

### Average Response Times

| Tool Category | Avg Response Time |
|---------------|-------------------|
| Recipe Generation | 2-4 seconds |
| Meal Planning | 3-5 seconds |
| Weight Tracking | <1 second |
| Nutrition Lookup | <1 second |
| User Profile | <500ms |

---

## 🎯 Tool Selection Guidelines for ChatGPT

### When User Says... → Use This Tool

| User Intent | Tool to Use |
|-------------|-------------|
| "I want to lose weight" | `generate_week_plan` + `set_user_goal` |
| "What can I make with X?" | `loopkitchen_recipes.generate` |
| "I weighed myself today" | `log_weight` + `weekly_trend` |
| "How many calories in X?" | `search_food` |
| "I want to order food" | `search_restaurants` |
| "Show me my progress" | `weekly_trend` + `daily_summary` |
| "I ate X for lunch" | `log_meal` |
| "Create a meal plan" | `generate_week_plan` |
| "Where can I buy these?" | `get_affiliate_links` |
| "I like this recipe" | `loopkitchen_recipes.accept` |

---

## 🔄 Common Tool Chains

### Chain 1: New User Onboarding
```
1. get_user_profile (check if exists)
2. set_user_goal (if new user)
3. update_user_profile (collect preferences)
4. generate_week_plan (create first plan)
5. log_meal_plan (save for tracking)
```

### Chain 2: Daily Check-In
```
1. log_weight (record weight)
2. weekly_trend (analyze progress)
3. daily_summary (nutrition summary)
4. evaluate_plan_outcome (if week complete)
```

### Chain 3: Recipe Discovery
```
1. get_user_preferences (personalization context)
2. loopkitchen_recipes.generate (generate recipes)
3. loopkitchen_recipes.get_details (user selects one)
4. loopkitchen_recipes.accept (user likes it)
```

---

**Total Tools:** 28  
**Categories:** 6  
**Avg Tools per Category:** 4.7  
**Most Complex Tool:** `generate_week_plan` (7 parameters)  
**Simplest Tool:** `log_weight` (2 required parameters)

---

**Document Version:** 1.0.0  
**Last Updated:** December 6, 2025
