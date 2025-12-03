/**
 * TheLoopGPT Tool Descriptions
 * 
 * Comprehensive descriptions for all 50 edge functions.
 * Each tool description tells ChatGPT exactly when and how to use it.
 * 
 * Categories:
 * - Recipe Generation (4 tools)
 * - Nutrition Analysis (4 tools)
 * - Food Tracking (5 tools)
 * - Meal Planning (4 tools)
 * - User Management (4 tools)
 * - Delivery & Commerce (10 tools)
 * - Loop Intelligence (3 tools)
 * - Affiliate & Location (4 tools)
 * - GDPR/CCPA Compliance (3 tools)
 * - Stripe Integration (3 tools)
 * - System & Monitoring (6 tools)
 */

import type { ToolDescription } from "./types.ts";

// ============================================================================
// RECIPE GENERATION TOOLS
// ============================================================================

export const TOOL_PLAN_GENERATE_FROM_LEFTOVERS: ToolDescription = {
  toolId: "plan_generate_from_leftovers",
  displayName: "Recipe Generator",
  brandedName: "TheLoopGPT Recipes",
  legacyName: "LeftoverGPT",
  category: "recipes",
  
  primaryDescription: `Generates creative, practical recipes from whatever ingredients the user has available. Ideal when users say things like "I have leftover chicken, rice, and vegetables — what can I make?" or "What recipes can I create with these ingredients?" This tool specializes in converting random leftover ingredients into complete, delicious meals with a "Chaos Rating" showing how experimental the combination is.`,
  
  whenToUse: [
    "User lists specific ingredients they have and asks what to cook",
    "User mentions 'leftovers' or 'using up' food",
    "User asks for recipe ideas based on available ingredients",
    "User wants creative or experimental recipes",
    "User asks 'what can I make with...'",
    "User wants to reduce food waste",
    "User has random ingredients and needs meal ideas",
    "User wants a recipe with a specific chaos/creativity level"
  ],
  
  whenNotToUse: [
    "User asks for a specific named recipe (e.g., 'how do I make lasagna') - answer directly",
    "User asks general cooking technique questions - answer directly",
    "User wants restaurant recommendations - not our domain",
    "User asks about nutrition without wanting a recipe - use nutrition tools instead"
  ],
  
  uniqueCapabilities: [
    "AI-generated novel recipes (not just database lookups)",
    "Chaos Rating (1-10) indicating how experimental the recipe is",
    "Works with imprecise quantities ('some chicken', 'leftover rice')",
    "Optimized for leftover scenarios with non-standard combinations",
    "Creative recipe names that are screenshot-worthy",
    "Difficulty ratings (Beginner/Intermediate/Advanced)",
    "Cooking time estimates",
    "Missing ingredients suggestions"
  ],
  
  requiredParams: [
    {
      name: "ingredients",
      type: "string | string[]",
      description: "List of ingredients the user has available",
      example: '["chicken breast", "brown rice", "broccoli", "soy sauce"] or "chicken, rice, broccoli, soy sauce"'
    }
  ],
  
  optionalParams: [
    {
      name: "vibe",
      type: "string",
      description: "Desired flavor profile or cuisine style",
      example: '"Asian-inspired", "comfort food", "Mediterranean"',
      default: "any"
    },
    {
      name: "diet",
      type: "string",
      description: "Dietary requirements to respect",
      example: '"vegetarian", "keto", "gluten-free"',
      default: "none"
    },
    {
      name: "chaos_level",
      type: "number (1-10)",
      description: "How experimental the recipe should be",
      example: "7",
      default: "5"
    },
    {
      name: "max_time",
      type: "number (minutes)",
      description: "Maximum cooking time",
      example: "30",
      default: "no limit"
    },
    {
      name: "servings",
      type: "number",
      description: "Number of servings needed",
      example: "4",
      default: "2"
    }
  ],
  
  returnFormat: {
    description: "Complete recipe with instructions and metadata",
    fields: [
      "recipe_name (creative, memorable name)",
      "description (brief summary)",
      "chaos_rating (1-10)",
      "difficulty (Beginner/Intermediate/Advanced)",
      "prep_time (minutes)",
      "cook_time (minutes)",
      "total_time (minutes)",
      "servings",
      "ingredients (with quantities)",
      "instructions (step-by-step)",
      "nutrition_highlights (key macros)",
      "tips (optional cooking tips)",
      "missing_ingredients (what user might need to buy)"
    ],
    example: `{
  "recipe_name": "Teriyaki Thunder Bowl",
  "description": "A savory fusion of leftover chicken and rice with Asian-inspired flavors",
  "chaos_rating": 4,
  "difficulty": "Beginner",
  "prep_time": 10,
  "cook_time": 15,
  "servings": 2,
  "ingredients": [...],
  "instructions": [...],
  "nutrition_highlights": { "calories": 450, "protein": 35, "carbs": 45, "fat": 12 }
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "tracker_log_meal"]
};

export const TOOL_PLAN_CREATE_MEAL_PLAN: ToolDescription = {
  toolId: "plan_create_meal_plan",
  displayName: "Meal Plan Creator",
  brandedName: "TheLoopGPT Meal Planning",
  legacyName: "MealPlannerGPT",
  category: "planning",
  
  primaryDescription: `Creates personalized multi-day meal plans based on calorie targets, dietary preferences, and lifestyle. Use when users ask for weekly meal plans, diet plans, or structured eating schedules. Generates breakfast, lunch, dinner, and snacks for 1-7 days with complete nutrition tracking.`,
  
  whenToUse: [
    "User wants a meal plan for multiple days (3-7 days typical)",
    "User asks to 'plan my meals for the week'",
    "User wants structured eating for weight loss or muscle building",
    "User needs meal prep guidance",
    "User asks for diet-specific meal plans (keto, vegan, etc.)",
    "User wants calorie-controlled meal planning",
    "User needs family meal planning"
  ],
  
  whenNotToUse: [
    "User wants a single meal idea - use plan_random_meal instead",
    "User wants to cook with specific ingredients - use plan_generate_from_leftovers",
    "User just wants nutrition info - use nutrition tools"
  ],
  
  uniqueCapabilities: [
    "Multi-day planning (1-7 days)",
    "Automatic calorie distribution across meals",
    "Dietary preference compliance (keto, vegan, high-protein, etc.)",
    "Budget-aware meal selection",
    "Family-size meal planning",
    "Meal prep optimization",
    "Automatic grocery list generation",
    "Nutrition balance across the week"
  ],
  
  requiredParams: [
    {
      name: "days",
      type: "number (1-7)",
      description: "Number of days to plan",
      example: "7"
    },
    {
      name: "calories_per_day",
      type: "number",
      description: "Target daily calories",
      example: "2000"
    }
  ],
  
  optionalParams: [
    {
      name: "dietary_preferences",
      type: "string[]",
      description: "Dietary requirements",
      example: '["vegetarian", "high-protein"]',
      default: "none"
    },
    {
      name: "excluded_ingredients",
      type: "string[]",
      description: "Ingredients to avoid",
      example: '["mushrooms", "shellfish"]',
      default: "none"
    },
    {
      name: "budget",
      type: "string",
      description: "Budget level",
      example: '"low", "medium", "high"',
      default: "medium"
    },
    {
      name: "servings",
      type: "number",
      description: "Number of people",
      example: "4",
      default: "1"
    }
  ],
  
  returnFormat: {
    description: "Complete meal plan with daily breakdowns",
    fields: [
      "plan_id",
      "days (array of daily meal plans)",
      "daily_nutrition (calories, protein, carbs, fat per day)",
      "weekly_summary (total nutrition)",
      "grocery_list (ingredients needed)",
      "meal_prep_tips",
      "estimated_cost"
    ],
    example: `{
  "plan_id": "mp_abc123",
  "days": [
    {
      "day": 1,
      "date": "2025-12-04",
      "meals": {
        "breakfast": {...},
        "lunch": {...},
        "dinner": {...},
        "snacks": [...]
      },
      "daily_totals": { "calories": 1950, "protein": 140, "carbs": 180, "fat": 65 }
    }
  ],
  "grocery_list": [...],
  "estimated_cost": "$85"
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "tracker_log_meal"]
};

export const TOOL_PLAN_RANDOM_MEAL: ToolDescription = {
  toolId: "plan_random_meal",
  displayName: "Random Meal Suggester",
  brandedName: "TheLoopGPT Quick Ideas",
  category: "planning",
  
  primaryDescription: `Generates a single random meal suggestion based on meal type and dietary preferences. Use for quick meal ideas when users ask "What should I have for dinner?" or "Give me a lunch idea." Fast, simple, no multi-day planning.`,
  
  whenToUse: [
    "User wants a quick single meal idea",
    "User asks 'what should I eat for [meal]?'",
    "User wants inspiration without specific ingredients",
    "User asks for breakfast/lunch/dinner/snack suggestions",
    "User wants a random meal within dietary constraints"
  ],
  
  whenNotToUse: [
    "User wants multi-day planning - use plan_create_meal_plan",
    "User has specific ingredients - use plan_generate_from_leftovers",
    "User wants detailed nutrition - use nutrition tools after"
  ],
  
  uniqueCapabilities: [
    "Fast single-meal suggestions",
    "Meal-type specific (breakfast, lunch, dinner, snack)",
    "Dietary filter support",
    "No complex planning overhead",
    "Good for decision fatigue"
  ],
  
  requiredParams: [
    {
      name: "meal_type",
      type: "string",
      description: "Type of meal",
      example: '"breakfast", "lunch", "dinner", "snack"'
    }
  ],
  
  optionalParams: [
    {
      name: "dietary_preferences",
      type: "string[]",
      description: "Dietary requirements",
      example: '["vegetarian", "low-carb"]',
      default: "none"
    }
  ],
  
  returnFormat: {
    description: "Single meal suggestion",
    fields: [
      "meal_name",
      "description",
      "ingredients",
      "quick_instructions",
      "nutrition_estimate",
      "prep_time"
    ],
    example: `{
  "meal_name": "Mediterranean Chickpea Bowl",
  "description": "Fresh and filling vegetarian lunch",
  "ingredients": [...],
  "prep_time": 15,
  "nutrition_estimate": { "calories": 420, "protein": 18 }
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "tracker_log_meal"]
};

export const TOOL_PLAN_GET_ACTIVE_PLAN: ToolDescription = {
  toolId: "plan_get_active_plan",
  displayName: "Get Active Meal Plan",
  brandedName: "TheLoopGPT Plan Retrieval",
  category: "planning",
  
  primaryDescription: `Retrieves the user's currently active meal plan. Use when users ask "What's my meal plan?" or "What should I eat today according to my plan?" Returns the active plan with today's meals highlighted.`,
  
  whenToUse: [
    "User asks about their current meal plan",
    "User wants to know what to eat today",
    "User asks 'what's on my plan for today?'",
    "User wants to review their meal plan"
  ],
  
  whenNotToUse: [
    "User wants to create a new plan - use plan_create_meal_plan",
    "User has no active plan - suggest creating one"
  ],
  
  uniqueCapabilities: [
    "Retrieves active plan from database",
    "Highlights today's meals",
    "Shows remaining days in plan",
    "Includes progress tracking"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Active meal plan with today highlighted",
    fields: [
      "plan_id",
      "start_date",
      "end_date",
      "today_meals",
      "remaining_days",
      "adherence_rate"
    ],
    example: `{
  "plan_id": "mp_xyz",
  "today_meals": { "breakfast": {...}, "lunch": {...}, "dinner": {...} },
  "adherence_rate": 0.85
}`
  },
  
  chainsWith: ["tracker_log_meal", "tracker_summary"]
};

// ============================================================================
// NUTRITION ANALYSIS TOOLS
// ============================================================================

export const TOOL_NUTRITION_ANALYZE_FOOD: ToolDescription = {
  toolId: "nutrition_analyze_food",
  displayName: "Nutrition Calculator",
  brandedName: "TheLoopGPT Nutrition",
  legacyName: "NutritionGPT",
  category: "nutrition",
  
  primaryDescription: `Calculates detailed nutritional information for any food, meal, or recipe. Use when users ask "How many calories in...?", "What are the macros for...?", or want to know if a meal fits their dietary goals. Supports 800,000+ foods including international ingredients and handles complex multi-ingredient meals.`,
  
  whenToUse: [
    "User asks about calories in a food or meal",
    "User wants macro breakdown (protein, carbs, fat)",
    "User asks if something fits their diet",
    "User wants nutrition facts for a recipe",
    "User asks 'is this healthy?'",
    "After generating a recipe to provide detailed nutrition",
    "User wants to analyze a meal before logging it"
  ],
  
  whenNotToUse: [
    "User wants general nutrition advice (not specific food) - answer directly",
    "User asks about supplements or vitamins - out of scope",
    "User asks medical nutrition questions - refer to professional",
    "User wants recipe suggestions - use recipe tool first"
  ],
  
  uniqueCapabilities: [
    "800,000+ food database (USDA + international)",
    "Handles complex recipes with multiple ingredients",
    "Multilingual ingredient support",
    "Validates recipes for dietary compliance (keto, vegan, etc.)",
    "Calculates per-serving and total nutrition",
    "Micronutrient breakdown available",
    "Diet tag generation (high-protein, low-carb, etc.)"
  ],
  
  requiredParams: [
    {
      name: "recipeName",
      type: "string",
      description: "Name of the food or meal",
      example: '"Grilled Chicken Salad"'
    },
    {
      name: "servings",
      type: "number",
      description: "Number of servings",
      example: "2"
    },
    {
      name: "ingredients",
      type: "array",
      description: "List of ingredients with quantities",
      example: '[{"name": "chicken breast", "quantity": 200, "unit": "g"}, {"name": "lettuce", "quantity": 2, "unit": "cups"}]'
    }
  ],
  
  optionalParams: [
    {
      name: "include_micronutrients",
      type: "boolean",
      description: "Include vitamins and minerals",
      example: "true",
      default: "false"
    }
  ],
  
  returnFormat: {
    description: "Detailed nutritional breakdown",
    fields: [
      "nutrition_data (per serving and total)",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "fiber_g",
      "sugar_g",
      "sodium_mg",
      "micronutrients (optional)",
      "dietary_flags (keto-friendly, high-protein, etc.)",
      "confidence_level"
    ],
    example: `{
  "nutrition_data": {
    "perServingNutrition": {
      "calories": 320,
      "protein_g": 35,
      "carbs_g": 12,
      "fat_g": 15
    },
    "dietTags": ["high-protein", "low-carb", "keto-friendly"]
  }
}`
  },
  
  chainsWith: ["tracker_log_meal", "nutrition_compare_foods"]
};

export const TOOL_NUTRITION_COMPARE_FOODS: ToolDescription = {
  toolId: "nutrition_compare_foods",
  displayName: "Food Comparator",
  brandedName: "TheLoopGPT Compare",
  category: "nutrition",
  
  primaryDescription: `Compares nutritional values of two or more foods side-by-side. Use when users ask "Which has more protein: chicken or tofu?" or "Is brown rice healthier than white rice?" Provides clear comparison with recommendations.`,
  
  whenToUse: [
    "User wants to compare nutrition of different foods",
    "User asks 'which is healthier...'",
    "User wants to choose between food options",
    "User asks 'which has more protein/carbs/calories...'",
    "User is deciding between alternatives"
  ],
  
  whenNotToUse: [
    "User wants nutrition for a single food - use nutrition_analyze_food",
    "User wants recipe suggestions - use recipe tools"
  ],
  
  uniqueCapabilities: [
    "Side-by-side nutrition comparison",
    "Percentage difference calculations",
    "Recommendation based on user goals",
    "Supports 2+ foods at once",
    "Highlights key differences"
  ],
  
  requiredParams: [
    {
      name: "foods",
      type: "string[]",
      description: "List of foods to compare",
      example: '["chicken breast", "tofu", "salmon"]'
    }
  ],
  
  optionalParams: [
    {
      name: "focus",
      type: "string",
      description: "What to prioritize in comparison",
      example: '"protein", "calories", "overall"',
      default: "overall"
    }
  ],
  
  returnFormat: {
    description: "Comparison table with recommendations",
    fields: [
      "comparison_table (nutrition for each food)",
      "winner (best choice based on focus)",
      "key_differences",
      "recommendation"
    ],
    example: `{
  "comparison": {
    "chicken breast": { "calories": 165, "protein": 31, "fat": 3.6 },
    "tofu": { "calories": 76, "protein": 8, "fat": 4.8 }
  },
  "winner": "chicken breast",
  "reason": "Higher protein density"
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "food_search"]
};

export const TOOL_NUTRITION_GET_MACROS: ToolDescription = {
  toolId: "nutrition_get_macros",
  displayName: "Macro Calculator",
  brandedName: "TheLoopGPT Macros",
  category: "nutrition",
  
  primaryDescription: `Calculates recommended macro targets (protein, carbs, fat) based on user goals, activity level, and body stats. Use when users ask "What should my macros be?" or "Calculate my macros for weight loss."`,
  
  whenToUse: [
    "User wants personalized macro targets",
    "User asks 'what should my macros be?'",
    "User is starting a diet and needs macro guidance",
    "User wants to optimize macros for goals"
  ],
  
  whenNotToUse: [
    "User wants nutrition for specific food - use nutrition_analyze_food",
    "User wants meal planning - use meal planning tools"
  ],
  
  uniqueCapabilities: [
    "Goal-based macro calculation (weight loss, muscle gain, maintenance)",
    "Activity level adjustment",
    "Multiple macro distribution strategies (balanced, high-protein, keto, etc.)",
    "TDEE calculation included"
  ],
  
  requiredParams: [
    {
      name: "weight_kg",
      type: "number",
      description: "Current weight in kg",
      example: "75"
    },
    {
      name: "goal",
      type: "string",
      description: "Fitness goal",
      example: '"weight_loss", "muscle_gain", "maintenance"'
    }
  ],
  
  optionalParams: [
    {
      name: "activity_level",
      type: "string",
      description: "Activity level",
      example: '"sedentary", "moderate", "active"',
      default: "moderate"
    },
    {
      name: "diet_type",
      type: "string",
      description: "Preferred macro distribution",
      example: '"balanced", "high_protein", "keto"',
      default: "balanced"
    }
  ],
  
  returnFormat: {
    description: "Recommended macro targets",
    fields: [
      "daily_calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "protein_percent",
      "carbs_percent",
      "fat_percent",
      "tdee"
    ],
    example: `{
  "daily_calories": 1800,
  "protein_g": 135,
  "carbs_g": 180,
  "fat_g": 60,
  "tdee": 2300
}`
  },
  
  chainsWith: ["user_set_weight_goal", "plan_create_meal_plan"]
};

export const TOOL_NUTRITION_GET_RECOMMENDATIONS: ToolDescription = {
  toolId: "nutrition_get_recommendations",
  displayName: "Nutrition Advisor",
  brandedName: "TheLoopGPT Recommendations",
  category: "nutrition",
  
  primaryDescription: `Provides personalized nutrition recommendations based on user's current diet, goals, and progress. Use when users ask for nutrition advice or want to improve their diet.`,
  
  whenToUse: [
    "User asks for nutrition advice",
    "User wants to improve their diet",
    "User asks 'how can I eat healthier?'",
    "User wants recommendations based on their tracking"
  ],
  
  whenNotToUse: [
    "User wants specific food nutrition - use nutrition_analyze_food",
    "User wants meal plans - use planning tools"
  ],
  
  uniqueCapabilities: [
    "Personalized advice based on tracking history",
    "Goal-aligned recommendations",
    "Identifies nutritional gaps",
    "Suggests specific foods to add/reduce"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Personalized nutrition recommendations",
    fields: [
      "recommendations (list of suggestions)",
      "nutritional_gaps",
      "foods_to_add",
      "foods_to_reduce",
      "priority_level"
    ],
    example: `{
  "recommendations": [
    "Increase protein intake by 20g/day",
    "Add more fiber-rich foods"
  ],
  "nutritional_gaps": ["protein", "fiber"],
  "foods_to_add": ["Greek yogurt", "lentils", "vegetables"]
}`
  },
  
  chainsWith: ["tracker_summary", "plan_create_meal_plan"]
};

// ============================================================================
// FOOD TRACKING TOOLS
// ============================================================================

export const TOOL_TRACKER_LOG_MEAL: ToolDescription = {
  toolId: "tracker_log_meal",
  displayName: "Meal Logger",
  brandedName: "TheLoopGPT Tracking",
  legacyName: "KCal GPT",
  category: "tracking",
  
  primaryDescription: `Logs meals to the user's food diary with automatic nutrition calculation. Use when users say "I had chicken and rice for lunch" or "Log my breakfast: 2 eggs and toast." Supports natural language meal descriptions.`,
  
  whenToUse: [
    "User wants to log/record a meal",
    "User says 'I ate...' or 'I had...'",
    "User asks to track a meal",
    "User wants to add to food diary",
    "User mentions logging calories"
  ],
  
  whenNotToUse: [
    "User just wants nutrition info without logging - use nutrition_analyze_food",
    "User wants to see what they've eaten - use tracker_summary"
  ],
  
  uniqueCapabilities: [
    "Natural language meal parsing",
    "Automatic nutrition calculation",
    "Meal type detection (breakfast, lunch, dinner, snack)",
    "Photo upload support (future)",
    "Streak tracking",
    "Daily progress updates"
  ],
  
  requiredParams: [
    {
      name: "food_name",
      type: "string",
      description: "Description of the meal",
      example: '"grilled chicken with brown rice and broccoli"'
    },
    {
      name: "quantity",
      type: "string | number",
      description: "Amount eaten",
      example: '"1 plate", "200g", "2 servings"'
    },
    {
      name: "quantity_unit",
      type: "string",
      description: "Unit of measurement",
      example: '"grams", "servings", "pieces"'
    },
    {
      name: "meal_type",
      type: "string",
      description: "Type of meal",
      example: '"breakfast", "lunch", "dinner", "snack"'
    }
  ],
  
  optionalParams: [
    {
      name: "log_date",
      type: "string",
      description: "Date of meal (ISO format)",
      example: '"2025-12-03"',
      default: "today"
    },
    {
      name: "notes",
      type: "string",
      description: "Additional notes",
      example: '"Ate at restaurant"',
      default: "none"
    }
  ],
  
  returnFormat: {
    description: "Logged meal confirmation with nutrition",
    fields: [
      "log_id",
      "food_name",
      "meal_type",
      "nutrition (calories, protein, carbs, fat)",
      "daily_totals (updated totals for the day)",
      "remaining_calories",
      "streak_count"
    ],
    example: `{
  "log_id": "log_abc123",
  "food_name": "Grilled Chicken with Rice",
  "nutrition": { "calories": 450, "protein": 35, "carbs": 45, "fat": 12 },
  "daily_totals": { "calories": 1200, "protein": 85 },
  "remaining_calories": 600,
  "streak_count": 7
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "tracker_summary"]
};

export const TOOL_TRACKER_SUMMARY: ToolDescription = {
  toolId: "tracker_summary",
  displayName: "Daily Summary",
  brandedName: "TheLoopGPT Progress",
  category: "tracking",
  
  primaryDescription: `Provides a summary of the user's food intake for a specific day. Use when users ask "What have I eaten today?" or "Show my food log." Returns all logged meals with nutrition totals.`,
  
  whenToUse: [
    "User wants to see what they've eaten",
    "User asks 'how many calories have I had today?'",
    "User wants daily nutrition summary",
    "User asks 'show my food log'",
    "User wants to review their tracking"
  ],
  
  whenNotToUse: [
    "User wants to log a new meal - use tracker_log_meal",
    "User wants weekly/monthly progress - use tracker_get_progress"
  ],
  
  uniqueCapabilities: [
    "Daily meal list with timestamps",
    "Nutrition totals (calories, macros)",
    "Goal comparison (calories remaining)",
    "Meal type breakdown",
    "Streak information"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [
    {
      name: "date",
      type: "string",
      description: "Date to summarize (ISO format)",
      example: '"2025-12-03"',
      default: "today"
    }
  ],
  
  returnFormat: {
    description: "Daily food log summary",
    fields: [
      "date",
      "meals (array of logged meals)",
      "daily_totals (calories, protein, carbs, fat)",
      "goal_comparison (target vs actual)",
      "remaining_calories",
      "meal_count",
      "streak_count"
    ],
    example: `{
  "date": "2025-12-03",
  "meals": [
    { "meal_type": "breakfast", "food": "Oatmeal", "calories": 300 },
    { "meal_type": "lunch", "food": "Chicken Salad", "calories": 450 }
  ],
  "daily_totals": { "calories": 750, "protein": 55, "carbs": 80, "fat": 20 },
  "remaining_calories": 1050,
  "streak_count": 7
}`
  },
  
  chainsWith: ["tracker_log_meal", "tracker_get_progress"]
};

export const TOOL_TRACKER_LOG_WEIGHT: ToolDescription = {
  toolId: "tracker_log_weight",
  displayName: "Weight Logger",
  brandedName: "TheLoopGPT Weight Tracking",
  category: "tracking",
  
  primaryDescription: `Logs the user's weight measurement. Use when users say "I weigh 165 lbs" or "Log my weight: 75kg." Tracks weight over time for progress monitoring.`,
  
  whenToUse: [
    "User wants to log their weight",
    "User says 'I weigh...'",
    "User asks to record weight",
    "User mentions weight measurement"
  ],
  
  whenNotToUse: [
    "User wants to see weight progress - use tracker_get_progress",
    "User wants to set weight goal - use user_set_weight_goal"
  ],
  
  uniqueCapabilities: [
    "Weight tracking over time",
    "Automatic unit conversion (lbs/kg)",
    "Trend analysis",
    "Goal progress calculation"
  ],
  
  requiredParams: [
    {
      name: "weight",
      type: "number",
      description: "Weight measurement",
      example: "75"
    },
    {
      name: "unit",
      type: "string",
      description: "Unit of measurement",
      example: '"kg" or "lbs"'
    }
  ],
  
  optionalParams: [
    {
      name: "log_date",
      type: "string",
      description: "Date of measurement",
      example: '"2025-12-03"',
      default: "today"
    }
  ],
  
  returnFormat: {
    description: "Weight log confirmation with trend",
    fields: [
      "log_id",
      "weight",
      "unit",
      "date",
      "change_from_last (difference from previous log)",
      "progress_to_goal (percentage)",
      "trend (gaining/losing/maintaining)"
    ],
    example: `{
  "log_id": "weight_abc123",
  "weight": 75,
  "unit": "kg",
  "change_from_last": -0.5,
  "progress_to_goal": 0.25,
  "trend": "losing"
}`
  },
  
  chainsWith: ["tracker_get_progress", "loop_predict_outcome"]
};

export const TOOL_TRACKER_QUICK_ADD_CALORIES: ToolDescription = {
  toolId: "tracker_quick_add_calories",
  displayName: "Quick Calorie Add",
  brandedName: "TheLoopGPT Quick Log",
  category: "tracking",
  
  primaryDescription: `Quickly adds calories to the daily log without detailed meal information. Use when users know the calorie count but don't want to specify ingredients. Useful for packaged foods or restaurant meals with known calories.`,
  
  whenToUse: [
    "User knows exact calorie count",
    "User wants to log calories without details",
    "User ate packaged food with label",
    "User wants quick logging"
  ],
  
  whenNotToUse: [
    "User wants detailed meal logging - use tracker_log_meal",
    "User doesn't know calories - use nutrition_analyze_food first"
  ],
  
  uniqueCapabilities: [
    "Fast calorie logging",
    "No ingredient details required",
    "Updates daily totals",
    "Supports manual macro entry"
  ],
  
  requiredParams: [
    {
      name: "calories",
      type: "number",
      description: "Calorie amount",
      example: "350"
    }
  ],
  
  optionalParams: [
    {
      name: "meal_type",
      type: "string",
      description: "Type of meal",
      example: '"snack", "lunch"',
      default: "snack"
    },
    {
      name: "protein_g",
      type: "number",
      description: "Protein grams (if known)",
      example: "25"
    },
    {
      name: "carbs_g",
      type: "number",
      description: "Carb grams (if known)",
      example: "40"
    },
    {
      name: "fat_g",
      type: "number",
      description: "Fat grams (if known)",
      example: "12"
    }
  ],
  
  returnFormat: {
    description: "Quick log confirmation",
    fields: [
      "log_id",
      "calories_added",
      "daily_totals",
      "remaining_calories"
    ],
    example: `{
  "log_id": "quick_abc123",
  "calories_added": 350,
  "daily_totals": { "calories": 1450 },
  "remaining_calories": 350
}`
  },
  
  chainsWith: ["tracker_summary"]
};

export const TOOL_TRACKER_GET_PROGRESS: ToolDescription = {
  toolId: "tracker_get_progress",
  displayName: "Progress Analytics",
  brandedName: "TheLoopGPT Progress",
  category: "tracking",
  
  primaryDescription: `Provides comprehensive progress analytics including weight trends, calorie adherence, and goal progress. Use when users ask "How am I doing?" or "Show my progress this week."`,
  
  whenToUse: [
    "User wants to see progress over time",
    "User asks 'how am I doing?'",
    "User wants weekly/monthly summary",
    "User asks about weight loss progress",
    "User wants adherence statistics"
  ],
  
  whenNotToUse: [
    "User wants today's summary only - use tracker_summary",
    "User wants to log something - use logging tools"
  ],
  
  uniqueCapabilities: [
    "Multi-day progress analysis",
    "Weight trend visualization data",
    "Calorie adherence rate",
    "Goal progress percentage",
    "Streak tracking",
    "Weekly/monthly averages"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [
    {
      name: "timeframe",
      type: "string",
      description: "Analysis period",
      example: '"week", "month", "all"',
      default: "week"
    }
  ],
  
  returnFormat: {
    description: "Comprehensive progress report",
    fields: [
      "timeframe",
      "weight_change (start vs current)",
      "average_daily_calories",
      "adherence_rate (% of days logged)",
      "goal_progress (% to goal)",
      "streak_count",
      "trends (gaining/losing/maintaining)",
      "recommendations"
    ],
    example: `{
  "timeframe": "week",
  "weight_change": -1.2,
  "average_daily_calories": 1850,
  "adherence_rate": 0.86,
  "goal_progress": 0.30,
  "streak_count": 12,
  "trend": "losing",
  "recommendations": ["Keep up the consistency!"]
}`
  },
  
  chainsWith: ["loop_predict_outcome", "loop_adjust_calories"]
};

// Export all tool descriptions as a record
export const ALL_TOOL_DESCRIPTIONS: Record<string, ToolDescription> = {
  // Recipe Generation
  plan_generate_from_leftovers: TOOL_PLAN_GENERATE_FROM_LEFTOVERS,
  plan_create_meal_plan: TOOL_PLAN_CREATE_MEAL_PLAN,
  plan_random_meal: TOOL_PLAN_RANDOM_MEAL,
  plan_get_active_plan: TOOL_PLAN_GET_ACTIVE_PLAN,
  
  // Nutrition Analysis
  nutrition_analyze_food: TOOL_NUTRITION_ANALYZE_FOOD,
  nutrition_compare_foods: TOOL_NUTRITION_COMPARE_FOODS,
  nutrition_get_macros: TOOL_NUTRITION_GET_MACROS,
  nutrition_get_recommendations: TOOL_NUTRITION_GET_RECOMMENDATIONS,
  
  // Food Tracking
  tracker_log_meal: TOOL_TRACKER_LOG_MEAL,
  tracker_summary: TOOL_TRACKER_SUMMARY,
  tracker_log_weight: TOOL_TRACKER_LOG_WEIGHT,
  tracker_quick_add_calories: TOOL_TRACKER_QUICK_ADD_CALORIES,
  tracker_get_progress: TOOL_TRACKER_GET_PROGRESS
};

// Helper function to get tool description by ID
export function getToolDescription(toolId: string): ToolDescription | undefined {
  return ALL_TOOL_DESCRIPTIONS[toolId];
}

// Helper function to get all tools in a category
export function getToolsByCategory(category: string): ToolDescription[] {
  return Object.values(ALL_TOOL_DESCRIPTIONS).filter(tool => tool.category === category);
}

// ============================================================================
// USER MANAGEMENT TOOLS
// ============================================================================

export const TOOL_USER_GET_PROFILE: ToolDescription = {
  toolId: "user_get_profile",
  displayName: "Get User Profile",
  brandedName: "TheLoopGPT Profile",
  category: "user",
  
  primaryDescription: `Retrieves the user's profile including goals, preferences, and settings. Use when you need to personalize responses based on user data.`,
  
  whenToUse: [
    "Need user's dietary preferences",
    "Need user's calorie goals",
    "Need user's weight goal",
    "Personalizing recommendations"
  ],
  
  whenNotToUse: [
    "User wants to update profile - use update tools",
    "User wants progress - use tracker_get_progress"
  ],
  
  uniqueCapabilities: [
    "Complete user profile data",
    "Dietary preferences",
    "Goal information",
    "Activity level",
    "Allergies and restrictions"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "User profile data",
    fields: [
      "user_id",
      "dietary_preferences",
      "calorie_goal",
      "weight_goal",
      "activity_level",
      "excluded_ingredients",
      "created_at"
    ],
    example: `{
  "user_id": "user_abc123",
  "dietary_preferences": ["vegetarian", "high-protein"],
  "calorie_goal": 1800,
  "weight_goal": 70,
  "activity_level": "moderate"
}`
  },
  
  chainsWith: ["plan_create_meal_plan", "nutrition_get_recommendations"]
};

export const TOOL_USER_SET_WEIGHT_GOAL: ToolDescription = {
  toolId: "user_set_weight_goal",
  displayName: "Set Weight Goal",
  brandedName: "TheLoopGPT Goals",
  category: "user",
  
  primaryDescription: `Sets or updates the user's weight goal. Use when users say "I want to lose 10 pounds" or "My goal weight is 70kg."`,
  
  whenToUse: [
    "User states a weight goal",
    "User wants to lose/gain weight",
    "User asks to set goal weight",
    "User mentions target weight"
  ],
  
  whenNotToUse: [
    "User wants to log current weight - use tracker_log_weight",
    "User wants to see progress - use tracker_get_progress"
  ],
  
  uniqueCapabilities: [
    "Goal weight setting",
    "Automatic timeline calculation",
    "Recommended calorie adjustment",
    "Goal type detection (loss/gain/maintain)"
  ],
  
  requiredParams: [
    {
      name: "target_weight",
      type: "number",
      description: "Goal weight",
      example: "70"
    },
    {
      name: "unit",
      type: "string",
      description: "Weight unit",
      example: '"kg" or "lbs"'
    }
  ],
  
  optionalParams: [
    {
      name: "target_date",
      type: "string",
      description: "Target date to reach goal",
      example: '"2026-06-01"'
    }
  ],
  
  returnFormat: {
    description: "Goal confirmation with recommendations",
    fields: [
      "goal_id",
      "target_weight",
      "current_weight",
      "weight_to_lose_or_gain",
      "recommended_timeline",
      "recommended_daily_calories",
      "goal_type"
    ],
    example: `{
  "goal_id": "goal_abc123",
  "target_weight": 70,
  "current_weight": 75,
  "weight_to_lose": 5,
  "recommended_timeline": "10-15 weeks",
  "recommended_daily_calories": 1800,
  "goal_type": "weight_loss"
}`
  },
  
  chainsWith: ["plan_create_meal_plan", "nutrition_get_macros"]
};

export const TOOL_USER_UPDATE_DIET_PREFERENCES: ToolDescription = {
  toolId: "user_update_diet_preferences",
  displayName: "Update Diet Preferences",
  brandedName: "TheLoopGPT Preferences",
  category: "user",
  
  primaryDescription: `Updates the user's dietary preferences and restrictions. Use when users say "I'm vegetarian" or "I don't eat dairy."`,
  
  whenToUse: [
    "User states dietary preference",
    "User mentions food allergies",
    "User wants to exclude ingredients",
    "User changes diet type"
  ],
  
  whenNotToUse: [
    "User wants meal suggestions - use planning tools after updating"
  ],
  
  uniqueCapabilities: [
    "Multiple preference types",
    "Allergy tracking",
    "Ingredient exclusion",
    "Diet type selection (keto, vegan, etc.)"
  ],
  
  requiredParams: [
    {
      name: "preferences",
      type: "string[]",
      description: "Dietary preferences",
      example: '["vegetarian", "gluten-free"]'
    }
  ],
  
  optionalParams: [
    {
      name: "excluded_ingredients",
      type: "string[]",
      description: "Ingredients to avoid",
      example: '["mushrooms", "shellfish"]'
    }
  ],
  
  returnFormat: {
    description: "Updated preferences confirmation",
    fields: [
      "user_id",
      "dietary_preferences",
      "excluded_ingredients",
      "updated_at"
    ],
    example: `{
  "user_id": "user_abc123",
  "dietary_preferences": ["vegetarian", "high-protein"],
  "excluded_ingredients": ["mushrooms"],
  "updated_at": "2025-12-03T18:00:00Z"
}`
  },
  
  chainsWith: ["plan_create_meal_plan", "plan_generate_from_leftovers"]
};

export const TOOL_FOOD_SEARCH: ToolDescription = {
  toolId: "food_search",
  displayName: "Food Database Search",
  brandedName: "TheLoopGPT Search",
  category: "nutrition",
  
  primaryDescription: `Searches the food database for specific items. Use when users want to find foods by name or explore food options.`,
  
  whenToUse: [
    "User wants to search for a specific food",
    "User asks 'do you have [food] in your database?'",
    "User wants to explore food options"
  ],
  
  whenNotToUse: [
    "User wants nutrition for a specific food - use nutrition_analyze_food",
    "User wants recipe ideas - use recipe tools"
  ],
  
  uniqueCapabilities: [
    "800,000+ food database search",
    "Fuzzy matching",
    "International foods",
    "Brand name foods"
  ],
  
  requiredParams: [
    {
      name: "query",
      type: "string",
      description: "Search query",
      example: '"chicken breast"'
    }
  ],
  
  optionalParams: [
    {
      name: "limit",
      type: "number",
      description: "Max results",
      example: "10",
      default: "5"
    }
  ],
  
  returnFormat: {
    description: "List of matching foods",
    fields: [
      "results (array of foods)",
      "food_id",
      "food_name",
      "brand (if applicable)",
      "category"
    ],
    example: `{
  "results": [
    { "food_id": "f_123", "food_name": "Chicken Breast, Raw", "category": "Poultry" },
    { "food_id": "f_124", "food_name": "Chicken Breast, Grilled", "category": "Poultry" }
  ]
}`
  },
  
  chainsWith: ["nutrition_analyze_food", "nutrition_compare_foods"]
};

// ============================================================================
// DELIVERY & COMMERCE TOOLS
// ============================================================================

export const TOOL_DELIVERY_SEARCH_RESTAURANTS: ToolDescription = {
  toolId: "delivery_search_restaurants",
  displayName: "Restaurant Search",
  brandedName: "TheLoopGPT Delivery",
  category: "delivery",
  
  primaryDescription: `Searches for restaurants near the user's location that offer delivery. Use when users want to order food or find healthy restaurant options nearby.`,
  
  whenToUse: [
    "User wants to find restaurants",
    "User asks for delivery options",
    "User wants healthy food nearby",
    "User asks 'where can I order from?'"
  ],
  
  whenNotToUse: [
    "User wants to cook at home - use recipe tools",
    "User wants grocery delivery - use order tools"
  ],
  
  uniqueCapabilities: [
    "Location-based search",
    "Dietary filter support",
    "Delivery availability check",
    "Rating and review data"
  ],
  
  requiredParams: [
    {
      name: "location",
      type: "string",
      description: "User location (address or coordinates)",
      example: '"123 Main St, New York, NY" or "40.7128,-74.0060"'
    }
  ],
  
  optionalParams: [
    {
      name: "cuisine",
      type: "string",
      description: "Cuisine type",
      example: '"Italian", "Asian", "Healthy"'
    },
    {
      name: "dietary_filter",
      type: "string[]",
      description: "Dietary requirements",
      example: '["vegetarian", "keto"]'
    }
  ],
  
  returnFormat: {
    description: "List of restaurants",
    fields: [
      "restaurants (array)",
      "restaurant_id",
      "name",
      "cuisine",
      "rating",
      "delivery_time",
      "delivery_fee",
      "distance"
    ],
    example: `{
  "restaurants": [
    {
      "restaurant_id": "rest_123",
      "name": "Healthy Bites",
      "cuisine": "Healthy",
      "rating": 4.5,
      "delivery_time": "30-40 min",
      "delivery_fee": "$2.99"
    }
  ]
}`
  },
  
  chainsWith: ["delivery_get_menu", "loopgpt_route_order"]
};

export const TOOL_DELIVERY_GET_MENU: ToolDescription = {
  toolId: "delivery_get_menu",
  displayName: "Get Restaurant Menu",
  brandedName: "TheLoopGPT Menu",
  category: "delivery",
  
  primaryDescription: `Retrieves the menu for a specific restaurant. Use after finding restaurants to show available items.`,
  
  whenToUse: [
    "User wants to see menu",
    "User asks 'what can I order from [restaurant]?'",
    "After restaurant search, user wants details"
  ],
  
  whenNotToUse: [
    "User hasn't selected a restaurant yet - use delivery_search_restaurants first"
  ],
  
  uniqueCapabilities: [
    "Full menu with prices",
    "Nutrition info (when available)",
    "Dietary tags",
    "Popular items highlighted"
  ],
  
  requiredParams: [
    {
      name: "restaurant_id",
      type: "string",
      description: "Restaurant identifier",
      example: '"rest_123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Restaurant menu",
    fields: [
      "restaurant_name",
      "menu_items (array)",
      "item_id",
      "name",
      "description",
      "price",
      "calories (if available)",
      "dietary_tags"
    ],
    example: `{
  "restaurant_name": "Healthy Bites",
  "menu_items": [
    {
      "item_id": "item_456",
      "name": "Grilled Chicken Bowl",
      "price": "$12.99",
      "calories": 450,
      "dietary_tags": ["high-protein", "gluten-free"]
    }
  ]
}`
  },
  
  chainsWith: ["loopgpt_route_order", "nutrition_analyze_food"]
};

export const TOOL_DELIVERY_PLACE_ORDER: ToolDescription = {
  toolId: "delivery_place_order",
  displayName: "Place Delivery Order",
  brandedName: "TheLoopGPT Order",
  category: "delivery",
  
  primaryDescription: `Places a food delivery order. Use after user selects menu items and confirms order.`,
  
  whenToUse: [
    "User confirms order",
    "User says 'place the order'",
    "User wants to complete checkout"
  ],
  
  whenNotToUse: [
    "User is still browsing - wait for confirmation",
    "User hasn't selected items yet"
  ],
  
  uniqueCapabilities: [
    "Order placement",
    "Payment processing",
    "Delivery tracking",
    "Order confirmation"
  ],
  
  requiredParams: [
    {
      name: "restaurant_id",
      type: "string",
      description: "Restaurant identifier",
      example: '"rest_123"'
    },
    {
      name: "items",
      type: "array",
      description: "Order items",
      example: '[{"item_id": "item_456", "quantity": 1}]'
    },
    {
      name: "delivery_address",
      type: "string",
      description: "Delivery address",
      example: '"123 Main St, Apt 4B"'
    }
  ],
  
  optionalParams: [
    {
      name: "delivery_instructions",
      type: "string",
      description: "Special instructions",
      example: '"Leave at door"'
    }
  ],
  
  returnFormat: {
    description: "Order confirmation",
    fields: [
      "order_id",
      "restaurant_name",
      "items",
      "total_price",
      "estimated_delivery_time",
      "tracking_url"
    ],
    example: `{
  "order_id": "order_789",
  "restaurant_name": "Healthy Bites",
  "total_price": "$15.98",
  "estimated_delivery_time": "35 min",
  "tracking_url": "https://..."
}`
  },
  
  chainsWith: ["tracker_log_meal"]
};

export const TOOL_LOOPGPT_ROUTE_ORDER: ToolDescription = {
  toolId: "loopgpt_route_order",
  displayName: "Smart Order Router",
  brandedName: "TheLoopGPT Commerce",
  category: "commerce",
  
  primaryDescription: `Intelligently routes orders to the best delivery service (Instacart, Amazon Fresh, MealMe, etc.) based on availability, price, and user preferences. Use when user wants to order groceries or ingredients.`,
  
  whenToUse: [
    "User wants to order groceries",
    "User wants ingredients delivered",
    "User asks 'order these ingredients'",
    "User wants to shop from meal plan"
  ],
  
  whenNotToUse: [
    "User wants restaurant delivery - use delivery tools",
    "User just wants shopping list - don't order yet"
  ],
  
  uniqueCapabilities: [
    "Multi-service routing",
    "Price comparison",
    "Availability checking",
    "Best deal selection",
    "Affiliate link generation"
  ],
  
  requiredParams: [
    {
      name: "items",
      type: "string[]",
      description: "Items to order",
      example: '["chicken breast", "brown rice", "broccoli"]'
    },
    {
      name: "location",
      type: "string",
      description: "Delivery address",
      example: '"123 Main St, New York, NY"'
    }
  ],
  
  optionalParams: [
    {
      name: "preferred_service",
      type: "string",
      description: "Preferred delivery service",
      example: '"instacart", "amazon_fresh"'
    }
  ],
  
  returnFormat: {
    description: "Order routing result",
    fields: [
      "recommended_service",
      "estimated_total",
      "delivery_time",
      "checkout_url",
      "alternative_services (array)"
    ],
    example: `{
  "recommended_service": "Instacart",
  "estimated_total": "$45.99",
  "delivery_time": "2 hours",
  "checkout_url": "https://...",
  "alternative_services": [...]
}`
  },
  
  chainsWith: ["loopgpt_confirm_order", "plan_create_meal_plan"]
};

export const TOOL_LOOPGPT_CONFIRM_ORDER: ToolDescription = {
  toolId: "loopgpt_confirm_order",
  displayName: "Confirm Order",
  brandedName: "TheLoopGPT Checkout",
  category: "commerce",
  
  primaryDescription: `Confirms and finalizes an order after routing. Use when user approves the order and wants to proceed with checkout.`,
  
  whenToUse: [
    "User confirms order",
    "User says 'yes, order it'",
    "User approves checkout"
  ],
  
  whenNotToUse: [
    "User is still deciding",
    "User wants to modify order"
  ],
  
  uniqueCapabilities: [
    "Order finalization",
    "Payment processing",
    "Confirmation email",
    "Order tracking"
  ],
  
  requiredParams: [
    {
      name: "order_id",
      type: "string",
      description: "Order identifier from routing",
      example: '"order_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Order confirmation",
    fields: [
      "order_id",
      "status",
      "confirmation_number",
      "tracking_url",
      "estimated_delivery"
    ],
    example: `{
  "order_id": "order_abc123",
  "status": "confirmed",
  "confirmation_number": "CONF-789",
  "tracking_url": "https://...",
  "estimated_delivery": "2025-12-04 14:00"
}`
  },
  
  chainsWith: ["loopgpt_record_outcome"]
};

export const TOOL_LOOPGPT_CANCEL_ORDER: ToolDescription = {
  toolId: "loopgpt_cancel_order",
  displayName: "Cancel Order",
  brandedName: "TheLoopGPT Cancel",
  category: "commerce",
  
  primaryDescription: `Cancels a pending order. Use when user changes their mind or wants to cancel.`,
  
  whenToUse: [
    "User wants to cancel order",
    "User says 'cancel my order'",
    "User changes mind before delivery"
  ],
  
  whenNotToUse: [
    "Order already delivered",
    "Order in transit (may not be cancellable)"
  ],
  
  uniqueCapabilities: [
    "Order cancellation",
    "Refund processing",
    "Cancellation confirmation"
  ],
  
  requiredParams: [
    {
      name: "order_id",
      type: "string",
      description: "Order identifier",
      example: '"order_abc123"'
    }
  ],
  
  optionalParams: [
    {
      name: "reason",
      type: "string",
      description: "Cancellation reason",
      example: '"Changed mind"'
    }
  ],
  
  returnFormat: {
    description: "Cancellation confirmation",
    fields: [
      "order_id",
      "status",
      "refund_amount",
      "refund_timeline"
    ],
    example: `{
  "order_id": "order_abc123",
  "status": "cancelled",
  "refund_amount": "$45.99",
  "refund_timeline": "3-5 business days"
}`
  },
  
  chainsWith: []
};

export const TOOL_LOOPGPT_RECORD_OUTCOME: ToolDescription = {
  toolId: "loopgpt_record_outcome",
  displayName: "Record Order Outcome",
  brandedName: "TheLoopGPT Feedback",
  category: "commerce",
  
  primaryDescription: `Records the outcome of an order (delivered, issues, satisfaction). Use for tracking and improving service.`,
  
  whenToUse: [
    "Order completed",
    "User reports delivery status",
    "Collecting feedback"
  ],
  
  whenNotToUse: [
    "Order not yet placed",
    "Order still pending"
  ],
  
  uniqueCapabilities: [
    "Outcome tracking",
    "Issue reporting",
    "Satisfaction scoring",
    "Service improvement data"
  ],
  
  requiredParams: [
    {
      name: "order_id",
      type: "string",
      description: "Order identifier",
      example: '"order_abc123"'
    },
    {
      name: "outcome",
      type: "string",
      description: "Order outcome",
      example: '"delivered", "cancelled", "issue"'
    }
  ],
  
  optionalParams: [
    {
      name: "satisfaction_rating",
      type: "number (1-5)",
      description: "User satisfaction",
      example: "5"
    },
    {
      name: "notes",
      type: "string",
      description: "Additional feedback",
      example: '"Great service!"'
    }
  ],
  
  returnFormat: {
    description: "Outcome recorded confirmation",
    fields: [
      "order_id",
      "outcome",
      "recorded_at"
    ],
    example: `{
  "order_id": "order_abc123",
  "outcome": "delivered",
  "recorded_at": "2025-12-04T15:00:00Z"
}`
  },
  
  chainsWith: []
};

// MealMe Integration Tools
export const TOOL_MEALME_CREATE_CART: ToolDescription = {
  toolId: "mealme_create_cart",
  displayName: "Create MealMe Cart",
  brandedName: "TheLoopGPT MealMe",
  category: "delivery",
  
  primaryDescription: `Creates a shopping cart in MealMe for grocery delivery. Internal tool used by order routing.`,
  
  whenToUse: ["Internal use by order routing system"],
  whenNotToUse: ["Direct user interaction - use loopgpt_route_order instead"],
  uniqueCapabilities: ["MealMe cart creation", "Item mapping"],
  requiredParams: [{ name: "items", type: "array", description: "Cart items", example: "[]" }],
  optionalParams: [],
  returnFormat: { description: "Cart ID", fields: ["cart_id"], example: '{"cart_id": "cart_123"}' },
  chainsWith: ["mealme_get_quotes"],
  category: "delivery"
};

export const TOOL_MEALME_GET_QUOTES: ToolDescription = {
  toolId: "mealme_get_quotes",
  displayName: "Get MealMe Quotes",
  brandedName: "TheLoopGPT MealMe",
  category: "delivery",
  
  primaryDescription: `Gets delivery quotes from MealMe. Internal tool used by order routing.`,
  
  whenToUse: ["Internal use by order routing system"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Price quotes", "Delivery time estimates"],
  requiredParams: [{ name: "cart_id", type: "string", description: "Cart identifier", example: '"cart_123"' }],
  optionalParams: [],
  returnFormat: { description: "Quote details", fields: ["quote_id", "total", "delivery_time"], example: '{}' },
  chainsWith: ["mealme_checkout_url"],
  category: "delivery"
};

export const TOOL_MEALME_CHECKOUT_URL: ToolDescription = {
  toolId: "mealme_checkout_url",
  displayName: "Get MealMe Checkout URL",
  brandedName: "TheLoopGPT MealMe",
  category: "delivery",
  
  primaryDescription: `Generates checkout URL for MealMe. Internal tool used by order routing.`,
  
  whenToUse: ["Internal use by order routing system"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Checkout URL generation"],
  requiredParams: [{ name: "quote_id", type: "string", description: "Quote identifier", example: '"quote_123"' }],
  optionalParams: [],
  returnFormat: { description: "Checkout URL", fields: ["checkout_url"], example: '{"checkout_url": "https://..."}' },
  chainsWith: [],
  category: "delivery"
};

// ============================================================================
// LOOP INTELLIGENCE TOOLS
// ============================================================================

export const TOOL_LOOP_PREDICT_OUTCOME: ToolDescription = {
  toolId: "loop_predict_outcome",
  displayName: "Outcome Predictor",
  brandedName: "TheLoopGPT Intelligence",
  category: "intelligence",
  
  primaryDescription: `Predicts weight change outcomes based on meal plans and activity levels. Use when users ask "Will I lose weight with this plan?" or "How long to reach my goal?"`,
  
  whenToUse: [
    "User wants weight prediction",
    "User asks 'will this work?'",
    "User wants timeline to goal",
    "User asks about expected results"
  ],
  
  whenNotToUse: [
    "User wants current progress - use tracker_get_progress",
    "User wants to adjust plan - use loop_adjust_calories"
  ],
  
  uniqueCapabilities: [
    "AI-powered weight prediction",
    "Timeline estimation",
    "Confidence scoring",
    "Multiple scenario analysis"
  ],
  
  requiredParams: [
    {
      name: "current_weight_kg",
      type: "number",
      description: "Current weight",
      example: "75"
    },
    {
      name: "goal_weight_kg",
      type: "number",
      description: "Goal weight",
      example: "70"
    },
    {
      name: "daily_calories",
      type: "number",
      description: "Planned daily calories",
      example: "1800"
    }
  ],
  
  optionalParams: [
    {
      name: "activity_level",
      type: "string",
      description: "Activity level",
      example: '"sedentary", "moderate", "active"',
      default: "moderate"
    },
    {
      name: "timeframe_days",
      type: "number",
      description: "Prediction timeframe",
      example: "30",
      default: "30"
    }
  ],
  
  returnFormat: {
    description: "Weight prediction",
    fields: [
      "predicted_weight_change",
      "predicted_final_weight",
      "timeline_to_goal",
      "confidence_level",
      "recommendations"
    ],
    example: `{
  "predicted_weight_change": -2.5,
  "predicted_final_weight": 72.5,
  "timeline_to_goal": "8-12 weeks",
  "confidence_level": 0.85,
  "recommendations": ["Increase protein intake", "Add strength training"]
}`
  },
  
  chainsWith: ["loop_adjust_calories", "plan_create_meal_plan"]
};

export const TOOL_LOOP_ADJUST_CALORIES: ToolDescription = {
  toolId: "loop_adjust_calories",
  displayName: "Calorie Adjuster",
  brandedName: "TheLoopGPT Optimization",
  category: "intelligence",
  
  primaryDescription: `AI-powered calorie adjustment based on progress and goals. Use when users aren't seeing results or want to optimize their plan.`,
  
  whenToUse: [
    "User not seeing progress",
    "User asks 'should I eat more/less?'",
    "User wants plan optimization",
    "User asks to adjust calories"
  ],
  
  whenNotToUse: [
    "User just started - need more data",
    "User wants prediction - use loop_predict_outcome"
  ],
  
  uniqueCapabilities: [
    "AI-powered adjustment",
    "Progress-based optimization",
    "Personalized recommendations",
    "Plateau breaking strategies"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Calorie adjustment recommendation",
    fields: [
      "current_calories",
      "recommended_calories",
      "adjustment_amount",
      "reason",
      "expected_impact"
    ],
    example: `{
  "current_calories": 1800,
  "recommended_calories": 1650,
  "adjustment_amount": -150,
  "reason": "Progress slower than expected",
  "expected_impact": "0.5kg additional loss per week"
}`
  },
  
  chainsWith: ["loop_predict_outcome", "plan_create_meal_plan"]
};

export const TOOL_LOOP_EVALUATE_PLAN: ToolDescription = {
  toolId: "loop_evaluate_plan",
  displayName: "Plan Evaluator",
  brandedName: "TheLoopGPT Analysis",
  category: "intelligence",
  
  primaryDescription: `Evaluates a meal plan's effectiveness based on user goals and nutritional science. Use when users want feedback on their plan.`,
  
  whenToUse: [
    "User wants plan evaluation",
    "User asks 'is this plan good?'",
    "User wants feedback on diet",
    "User asks for plan improvement"
  ],
  
  whenNotToUse: [
    "User wants to create plan - use plan_create_meal_plan",
    "User wants prediction - use loop_predict_outcome"
  ],
  
  uniqueCapabilities: [
    "Comprehensive plan analysis",
    "Nutritional balance assessment",
    "Goal alignment check",
    "Improvement suggestions"
  ],
  
  requiredParams: [
    {
      name: "plan_id",
      type: "string",
      description: "Meal plan identifier",
      example: '"plan_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Plan evaluation",
    fields: [
      "overall_score (0-100)",
      "strengths",
      "weaknesses",
      "suggestions",
      "goal_alignment"
    ],
    example: `{
  "overall_score": 85,
  "strengths": ["Good protein distribution", "Calorie target met"],
  "weaknesses": ["Low fiber", "Limited vegetable variety"],
  "suggestions": ["Add more vegetables", "Include whole grains"]
}`
  },
  
  chainsWith: ["loop_adjust_calories", "plan_create_meal_plan"]
};

// ============================================================================
// AFFILIATE & LOCATION TOOLS
// ============================================================================

export const TOOL_GET_AFFILIATE_LINKS: ToolDescription = {
  toolId: "get_affiliate_links",
  displayName: "Get Affiliate Links",
  brandedName: "TheLoopGPT Shopping",
  category: "affiliate",
  
  primaryDescription: `Generates affiliate links for products. Use when providing shopping recommendations.`,
  
  whenToUse: ["Internal use for monetization"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Affiliate link generation", "Multiple retailer support"],
  requiredParams: [{ name: "products", type: "string[]", description: "Product names", example: '["protein powder"]' }],
  optionalParams: [],
  returnFormat: { description: "Affiliate links", fields: ["links"], example: '{"links": [...]}' },
  chainsWith: [],
  category: "affiliate"
};

export const TOOL_GET_AFFILIATE_BY_COUNTRY: ToolDescription = {
  toolId: "get_affiliate_by_country",
  displayName: "Get Country Affiliate",
  brandedName: "TheLoopGPT Shopping",
  category: "affiliate",
  
  primaryDescription: `Gets country-specific affiliate links. Internal tool for localization.`,
  
  whenToUse: ["Internal use for localization"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Country-specific links"],
  requiredParams: [{ name: "country", type: "string", description: "Country code", example: '"US"' }],
  optionalParams: [],
  returnFormat: { description: "Affiliate data", fields: ["affiliate_id"], example: '{}' },
  chainsWith: [],
  category: "affiliate"
};

export const TOOL_GET_USER_LOCATION: ToolDescription = {
  toolId: "get_user_location",
  displayName: "Get User Location",
  brandedName: "TheLoopGPT Location",
  category: "location",
  
  primaryDescription: `Retrieves user's location for delivery and restaurant search. Internal tool.`,
  
  whenToUse: ["Internal use for location-based features"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Location retrieval"],
  requiredParams: [{ name: "user_id", type: "string", description: "User ID", example: '"user_123"' }],
  optionalParams: [],
  returnFormat: { description: "Location data", fields: ["latitude", "longitude", "address"], example: '{}' },
  chainsWith: ["delivery_search_restaurants"],
  category: "location"
};

export const TOOL_UPDATE_USER_LOCATION: ToolDescription = {
  toolId: "update_user_location",
  displayName: "Update User Location",
  brandedName: "TheLoopGPT Location",
  category: "location",
  
  primaryDescription: `Updates user's location. Internal tool.`,
  
  whenToUse: ["Internal use for location updates"],
  whenNotToUse: ["Direct user interaction"],
  uniqueCapabilities: ["Location updates"],
  requiredParams: [{ name: "user_id", type: "string", description: "User ID", example: '"user_123"' }, { name: "location", type: "string", description: "New location", example: '"New York, NY"' }],
  optionalParams: [],
  returnFormat: { description: "Update confirmation", fields: ["success"], example: '{"success": true}' },
  chainsWith: [],
  category: "location"
};

export const TOOL_CHANGE_LOCATION: ToolDescription = {
  toolId: "change_location",
  displayName: "Change Location",
  brandedName: "TheLoopGPT Location",
  category: "location",
  
  primaryDescription: `Changes user's location for delivery. Use when user moves or wants to order to different address.`,
  
  whenToUse: ["User changes location", "User wants to deliver to different address"],
  whenNotToUse: ["First-time location setting"],
  uniqueCapabilities: ["Location management"],
  requiredParams: [{ name: "new_location", type: "string", description: "New address", example: '"456 Oak St, Brooklyn, NY"' }],
  optionalParams: [],
  returnFormat: { description: "Location update", fields: ["location", "updated_at"], example: '{}' },
  chainsWith: ["delivery_search_restaurants"],
  category: "location"
};

// Continue with remaining tool descriptions in next append...

// Update the ALL_TOOL_DESCRIPTIONS export
Object.assign(ALL_TOOL_DESCRIPTIONS, {
  // User Management
  user_get_profile: TOOL_USER_GET_PROFILE,
  user_set_weight_goal: TOOL_USER_SET_WEIGHT_GOAL,
  user_update_diet_preferences: TOOL_USER_UPDATE_DIET_PREFERENCES,
  food_search: TOOL_FOOD_SEARCH,
  
  // Delivery & Commerce
  delivery_search_restaurants: TOOL_DELIVERY_SEARCH_RESTAURANTS,
  delivery_get_menu: TOOL_DELIVERY_GET_MENU,
  delivery_place_order: TOOL_DELIVERY_PLACE_ORDER,
  loopgpt_route_order: TOOL_LOOPGPT_ROUTE_ORDER,
  loopgpt_confirm_order: TOOL_LOOPGPT_CONFIRM_ORDER,
  loopgpt_cancel_order: TOOL_LOOPGPT_CANCEL_ORDER,
  loopgpt_record_outcome: TOOL_LOOPGPT_RECORD_OUTCOME,
  mealme_create_cart: TOOL_MEALME_CREATE_CART,
  mealme_get_quotes: TOOL_MEALME_GET_QUOTES,
  mealme_checkout_url: TOOL_MEALME_CHECKOUT_URL,
  
  // Loop Intelligence
  loop_predict_outcome: TOOL_LOOP_PREDICT_OUTCOME,
  loop_adjust_calories: TOOL_LOOP_ADJUST_CALORIES,
  loop_evaluate_plan: TOOL_LOOP_EVALUATE_PLAN,
  
  // Affiliate & Location
  get_affiliate_links: TOOL_GET_AFFILIATE_LINKS,
  get_affiliate_by_country: TOOL_GET_AFFILIATE_BY_COUNTRY,
  get_user_location: TOOL_GET_USER_LOCATION,
  update_user_location: TOOL_UPDATE_USER_LOCATION,
  change_location: TOOL_CHANGE_LOCATION
});

// ============================================================================
// GDPR/CCPA COMPLIANCE TOOLS
// ============================================================================

export const TOOL_GDPR_EXPORT: ToolDescription = {
  toolId: "gdpr_export",
  displayName: "Export User Data",
  brandedName: "TheLoopGPT Data Export",
  category: "compliance",
  
  primaryDescription: `Exports all user data in compliance with GDPR/CCPA. Use when users request their data.`,
  
  whenToUse: [
    "User requests data export",
    "User says 'download my data'",
    "GDPR/CCPA data request"
  ],
  
  whenNotToUse: [
    "User wants to delete data - use gdpr_delete",
    "User wants to opt out - use ccpa_opt_out"
  ],
  
  uniqueCapabilities: [
    "Complete data export",
    "GDPR compliant format",
    "Includes all user information",
    "Secure download link"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Data export package",
    fields: [
      "export_id",
      "download_url",
      "expires_at",
      "file_size",
      "data_categories"
    ],
    example: `{
  "export_id": "export_123",
  "download_url": "https://...",
  "expires_at": "2025-12-10T00:00:00Z",
  "file_size": "2.5 MB",
  "data_categories": ["profile", "meals", "tracking", "orders"]
}`
  },
  
  chainsWith: []
};

export const TOOL_GDPR_DELETE: ToolDescription = {
  toolId: "gdpr_delete",
  displayName: "Delete User Data",
  brandedName: "TheLoopGPT Data Deletion",
  category: "compliance",
  
  primaryDescription: `Permanently deletes all user data in compliance with GDPR/CCPA right to be forgotten. Use when users request account deletion.`,
  
  whenToUse: [
    "User requests data deletion",
    "User says 'delete my account'",
    "GDPR/CCPA deletion request",
    "User wants to be forgotten"
  ],
  
  whenNotToUse: [
    "User just wants to export data - use gdpr_export",
    "User wants to pause account - offer alternative"
  ],
  
  uniqueCapabilities: [
    "Complete data deletion",
    "GDPR compliant process",
    "Irreversible action",
    "Confirmation required"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    },
    {
      name: "confirmation",
      type: "boolean",
      description: "User must confirm deletion",
      example: "true"
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Deletion confirmation",
    fields: [
      "deletion_id",
      "status",
      "deleted_at",
      "data_categories_deleted"
    ],
    example: `{
  "deletion_id": "del_123",
  "status": "completed",
  "deleted_at": "2025-12-03T18:00:00Z",
  "data_categories_deleted": ["profile", "meals", "tracking", "orders"]
}`
  },
  
  chainsWith: []
};

export const TOOL_CCPA_OPT_OUT: ToolDescription = {
  toolId: "ccpa_opt_out",
  displayName: "CCPA Opt-Out",
  brandedName: "TheLoopGPT Privacy",
  category: "compliance",
  
  primaryDescription: `Opts user out of data selling in compliance with CCPA. Use when California users request opt-out.`,
  
  whenToUse: [
    "User requests CCPA opt-out",
    "User says 'don't sell my data'",
    "California privacy request"
  ],
  
  whenNotToUse: [
    "User wants full deletion - use gdpr_delete",
    "User wants data export - use gdpr_export"
  ],
  
  uniqueCapabilities: [
    "CCPA compliance",
    "Data selling opt-out",
    "Privacy preference management"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Opt-out confirmation",
    fields: [
      "opt_out_id",
      "status",
      "opted_out_at"
    ],
    example: `{
  "opt_out_id": "opt_123",
  "status": "active",
  "opted_out_at": "2025-12-03T18:00:00Z"
}`
  },
  
  chainsWith: []
};

// ============================================================================
// STRIPE INTEGRATION TOOLS
// ============================================================================

export const TOOL_CREATE_CHECKOUT_SESSION: ToolDescription = {
  toolId: "create_checkout_session",
  displayName: "Create Stripe Checkout",
  brandedName: "TheLoopGPT Payments",
  category: "payments",
  
  primaryDescription: `Creates a Stripe checkout session for premium subscription. Use when users want to upgrade to premium.`,
  
  whenToUse: [
    "User wants to upgrade to premium",
    "User asks about premium features",
    "User wants to subscribe"
  ],
  
  whenNotToUse: [
    "User already has premium",
    "User wants to cancel - use customer portal"
  ],
  
  uniqueCapabilities: [
    "Stripe checkout creation",
    "Secure payment processing",
    "Subscription management",
    "Multiple payment methods"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    },
    {
      name: "plan",
      type: "string",
      description: "Subscription plan",
      example: '"premium_monthly", "premium_annual"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Checkout session",
    fields: [
      "session_id",
      "checkout_url",
      "expires_at"
    ],
    example: `{
  "session_id": "cs_123",
  "checkout_url": "https://checkout.stripe.com/...",
  "expires_at": "2025-12-03T19:00:00Z"
}`
  },
  
  chainsWith: ["check_entitlement"]
};

export const TOOL_CREATE_CUSTOMER_PORTAL: ToolDescription = {
  toolId: "create_customer_portal",
  displayName: "Create Customer Portal",
  brandedName: "TheLoopGPT Billing",
  category: "payments",
  
  primaryDescription: `Creates a Stripe customer portal session for managing subscriptions. Use when users want to manage billing.`,
  
  whenToUse: [
    "User wants to manage subscription",
    "User asks about billing",
    "User wants to cancel subscription",
    "User wants to update payment method"
  ],
  
  whenNotToUse: [
    "User doesn't have subscription yet - use checkout"
  ],
  
  uniqueCapabilities: [
    "Subscription management",
    "Payment method updates",
    "Billing history",
    "Cancellation management"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Portal session",
    fields: [
      "portal_url",
      "expires_at"
    ],
    example: `{
  "portal_url": "https://billing.stripe.com/...",
  "expires_at": "2025-12-03T19:00:00Z"
}`
  },
  
  chainsWith: []
};

export const TOOL_CHECK_ENTITLEMENT: ToolDescription = {
  toolId: "check_entitlement",
  displayName: "Check Premium Status",
  brandedName: "TheLoopGPT Entitlement",
  category: "payments",
  
  primaryDescription: `Checks if user has premium subscription. Use to verify access to premium features.`,
  
  whenToUse: [
    "User tries to access premium feature",
    "Need to check subscription status",
    "Verifying entitlement"
  ],
  
  whenNotToUse: [
    "User wants to upgrade - use checkout"
  ],
  
  uniqueCapabilities: [
    "Entitlement verification",
    "Subscription status check",
    "Feature access control"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Entitlement status",
    fields: [
      "has_premium",
      "subscription_status",
      "expires_at",
      "plan_name"
    ],
    example: `{
  "has_premium": true,
  "subscription_status": "active",
  "expires_at": "2026-01-03T00:00:00Z",
  "plan_name": "Premium Monthly"
}`
  },
  
  chainsWith: []
};

export const TOOL_UPGRADE_TO_PREMIUM: ToolDescription = {
  toolId: "upgrade_to_premium",
  displayName: "Upgrade to Premium",
  brandedName: "TheLoopGPT Upgrade",
  category: "payments",
  
  primaryDescription: `Initiates premium upgrade flow. Use when users want to unlock premium features.`,
  
  whenToUse: [
    "User wants premium features",
    "User asks to upgrade",
    "User hits free tier limit"
  ],
  
  whenNotToUse: [
    "User already has premium"
  ],
  
  uniqueCapabilities: [
    "Upgrade flow initiation",
    "Premium feature showcase",
    "Pricing information"
  ],
  
  requiredParams: [
    {
      name: "user_id",
      type: "string",
      description: "User identifier",
      example: '"user_abc123"'
    }
  ],
  
  optionalParams: [],
  
  returnFormat: {
    description: "Upgrade information",
    fields: [
      "checkout_url",
      "premium_features",
      "pricing"
    ],
    example: `{
  "checkout_url": "https://...",
  "premium_features": ["Unlimited meal plans", "AI predictions", "Priority support"],
  "pricing": { "monthly": "$9.99", "annual": "$99.99" }
}`
  },
  
  chainsWith: ["create_checkout_session"]
};

// ============================================================================
// SYSTEM & MONITORING TOOLS
// ============================================================================

export const TOOL_HEALTH: ToolDescription = {
  toolId: "health",
  displayName: "Health Check",
  brandedName: "TheLoopGPT Health",
  category: "system",
  
  primaryDescription: `Basic health check endpoint. Returns system status.`,
  
  whenToUse: ["System monitoring", "Health checks"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["System health status"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: { description: "Health status", fields: ["status", "timestamp"], example: '{"status": "ok"}' },
  chainsWith: []
};

export const TOOL_SYS_HEALTHCHECK: ToolDescription = {
  toolId: "sys_healthcheck",
  displayName: "System Health Check",
  brandedName: "TheLoopGPT System",
  category: "system",
  
  primaryDescription: `Comprehensive system health check with detailed status. Returns database, tools, and feature status.`,
  
  whenToUse: ["System monitoring", "Detailed health checks"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Comprehensive health status", "Database check", "Feature status"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: {
    description: "Detailed health status",
    fields: ["status", "database", "tools", "features", "version"],
    example: '{"status": "ok", "tools": {"total": 50, "active": 50}}'
  },
  chainsWith: []
};

export const TOOL_SYS_GET_HELP: ToolDescription = {
  toolId: "sys_get_help",
  displayName: "Get System Help",
  brandedName: "TheLoopGPT Help",
  category: "system",
  
  primaryDescription: `Returns help information about available tools and features.`,
  
  whenToUse: ["User asks for help", "Tool discovery"],
  whenNotToUse: ["Specific feature questions - answer directly"],
  uniqueCapabilities: ["Tool listing", "Feature documentation"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: {
    description: "Help information",
    fields: ["tools", "categories", "examples"],
    example: '{"tools": [...], "categories": [...]}'
  },
  chainsWith: []
};

export const TOOL_SYS_DEBUG_TOOL_CHOICE_LOG: ToolDescription = {
  toolId: "sys_debug_tool_choice_log",
  displayName: "Debug Tool Choice",
  brandedName: "TheLoopGPT Debug",
  category: "system",
  
  primaryDescription: `Logs tool choice decisions for debugging. Internal monitoring tool.`,
  
  whenToUse: ["Internal debugging", "Tool invocation analysis"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Tool choice logging", "Invocation tracking"],
  requiredParams: [{ name: "tool_id", type: "string", description: "Tool ID", example: '"plan_create_meal_plan"' }],
  optionalParams: [],
  returnFormat: { description: "Log entry", fields: ["log_id", "timestamp"], example: '{}' },
  chainsWith: []
};

export const TOOL_METRICS_FOOD_RESOLVER: ToolDescription = {
  toolId: "metrics_food_resolver",
  displayName: "Food Resolver Metrics",
  brandedName: "TheLoopGPT Metrics",
  category: "system",
  
  primaryDescription: `Tracks food resolution metrics. Internal monitoring tool.`,
  
  whenToUse: ["Internal metrics", "Food database analysis"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Resolution metrics", "Database performance"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: { description: "Metrics data", fields: ["resolution_rate", "avg_time"], example: '{}' },
  chainsWith: []
};

export const TOOL_TRIAL_REMINDER: ToolDescription = {
  toolId: "trial_reminder",
  displayName: "Trial Reminder",
  brandedName: "TheLoopGPT Reminders",
  category: "system",
  
  primaryDescription: `Sends trial expiration reminders. Internal automation tool.`,
  
  whenToUse: ["Internal automation", "Trial management"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Reminder automation"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: { description: "Reminder status", fields: ["sent"], example: '{"sent": true}' },
  chainsWith: []
};

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

export const TOOL_STRIPE_WEBHOOK: ToolDescription = {
  toolId: "stripe_webhook",
  displayName: "Stripe Webhook Handler",
  brandedName: "TheLoopGPT Webhooks",
  category: "webhooks",
  
  primaryDescription: `Handles Stripe webhook events. Internal automation for payment processing.`,
  
  whenToUse: ["Internal webhook processing"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Payment event handling", "Subscription updates"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: { description: "Webhook response", fields: ["received"], example: '{"received": true}' },
  chainsWith: []
};

export const TOOL_MEALME_WEBHOOK: ToolDescription = {
  toolId: "mealme_webhook",
  displayName: "MealMe Webhook Handler",
  brandedName: "TheLoopGPT Webhooks",
  category: "webhooks",
  
  primaryDescription: `Handles MealMe webhook events. Internal automation for delivery tracking.`,
  
  whenToUse: ["Internal webhook processing"],
  whenNotToUse: ["User interaction"],
  uniqueCapabilities: ["Delivery event handling", "Order status updates"],
  requiredParams: [],
  optionalParams: [],
  returnFormat: { description: "Webhook response", fields: ["received"], example: '{"received": true}' },
  chainsWith: []
};

// ============================================================================
// FINAL EXPORTS - Update ALL_TOOL_DESCRIPTIONS with remaining tools
// ============================================================================

Object.assign(ALL_TOOL_DESCRIPTIONS, {
  // GDPR/CCPA Compliance
  gdpr_export: TOOL_GDPR_EXPORT,
  gdpr_delete: TOOL_GDPR_DELETE,
  ccpa_opt_out: TOOL_CCPA_OPT_OUT,
  
  // Stripe Integration
  create_checkout_session: TOOL_CREATE_CHECKOUT_SESSION,
  create_customer_portal: TOOL_CREATE_CUSTOMER_PORTAL,
  check_entitlement: TOOL_CHECK_ENTITLEMENT,
  upgrade_to_premium: TOOL_UPGRADE_TO_PREMIUM,
  
  // System & Monitoring
  health: TOOL_HEALTH,
  sys_healthcheck: TOOL_SYS_HEALTHCHECK,
  sys_get_help: TOOL_SYS_GET_HELP,
  sys_debug_tool_choice_log: TOOL_SYS_DEBUG_TOOL_CHOICE_LOG,
  metrics_food_resolver: TOOL_METRICS_FOOD_RESOLVER,
  trial_reminder: TOOL_TRIAL_REMINDER,
  
  // Webhooks
  stripe_webhook: TOOL_STRIPE_WEBHOOK,
  mealme_webhook: TOOL_MEALME_WEBHOOK
});

// Helper function to get all tool IDs
export function getAllToolIds(): string[] {
  return Object.keys(ALL_TOOL_DESCRIPTIONS);
}

// Helper function to get tool count
export function getToolCount(): number {
  return Object.keys(ALL_TOOL_DESCRIPTIONS).length;
}

// Helper function to get tools by priority (based on category)
export function getToolsByPriority(): {
  critical: ToolDescription[];
  high: ToolDescription[];
  medium: ToolDescription[];
  low: ToolDescription[];
} {
  const tools = Object.values(ALL_TOOL_DESCRIPTIONS);
  
  return {
    critical: tools.filter(t => 
      ["recipes", "nutrition", "tracking", "planning"].includes(t.category)
    ),
    high: tools.filter(t => 
      ["user", "intelligence"].includes(t.category)
    ),
    medium: tools.filter(t => 
      ["delivery", "commerce", "payments"].includes(t.category)
    ),
    low: tools.filter(t => 
      ["system", "webhooks", "compliance", "affiliate", "location"].includes(t.category)
    )
  };
}

// Export summary for documentation
export const TOOL_SUMMARY = {
  total: getToolCount(),
  categories: {
    recipes: 4,
    nutrition: 5,
    tracking: 5,
    planning: 4,
    user: 4,
    delivery: 4,
    commerce: 4,
    intelligence: 3,
    affiliate: 2,
    location: 4,
    compliance: 3,
    payments: 4,
    system: 6,
    webhooks: 2
  },
  lastUpdated: "2025-12-03"
};
