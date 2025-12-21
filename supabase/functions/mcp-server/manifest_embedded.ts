export const MANIFEST = {
  "name": "LeftoverGPT",
  "description":
    "A comprehensive AI-powered meal planning and nutrition platform powered by LooptOS. LeftoverGPT provides personalized meal plans, weight tracking with adaptive feedback loops, restaurant ordering via MealMe, and multi-country grocery affiliate links. Built on a robust microservices architecture with support for 100+ languages across 25 countries.",
  "version": "2.1.0",
  "schema_version": "v1",
  "namespace": "loopgpt",
  "contact_email": "support@looptos.com",
  "api": {
    "type": "openai-mcp",
    "url": "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server",
  },
  "authentication": { "type": "none" },
  "tools": [{
    "name": "generate_week_plan",
    "category": "Meal Planning",
    "description":
      "Generates a personalized 7-day meal plan based on user dietary preferences, calorie targets, allergies, and cuisine preferences. Returns a complete week of breakfast, lunch, and dinner with recipes and shopping lists.",
    "input_schema": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "diet": {
          "type": "string",
          "description":
            "Diet type (e.g., vegetarian, vegan, keto, paleo, pescatarian, omnivore)",
        },
        "calories_per_day": {
          "type": "number",
          "description": "Target daily calorie intake",
        },
        "meals_per_day": {
          "type": "integer",
          "description": "Number of meals per day (typically 2-4)",
          "default": 3,
        },
        "allergies": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of food allergies or ingredients to exclude",
        },
        "cuisine_preferences": {
          "type": "array",
          "items": { "type": "string" },
          "description":
            "Preferred cuisines (e.g., Italian, Mexican, Asian, Mediterranean)",
        },
        "language": {
          "type": "string",
          "description": "Language code for meal plan (e.g., en, es, fr, de)",
          "default": "en",
        },
      },
      "required": ["user_id", "diet", "calories_per_day"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "plan_id": {
          "type": "string",
          "description": "Unique identifier for this meal plan",
        },
        "week_start": {
          "type": "string",
          "description": "Start date of the week (ISO 8601)",
        },
        "meals": {
          "type": "array",
          "description": "Array of meals for the week",
        },
        "shopping_list": {
          "type": "array",
          "description": "Aggregated shopping list for the week",
        },
        "total_calories": {
          "type": "number",
          "description": "Total calories for the week",
        },
      },
    },
  }, {
    "name": "log_meal_plan",
    "category": "Meal Planning",
    "description":
      "Saves a generated meal plan to the user's account for tracking and future reference. This creates a permanent record that can be used for outcome evaluation and plan adaptation.",
    "input_schema": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "plan_id": {
          "type": "string",
          "description": "Meal plan identifier from generate_week_plan",
        },
        "plan_data": {
          "type": "object",
          "description": "Complete meal plan data to store",
        },
        "start_date": {
          "type": "string",
          "description": "When the user will start this plan (ISO 8601)",
        },
      },
      "required": ["user_id", "plan_id", "plan_data"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "message": { "type": "string" },
        "stored_plan_id": { "type": "string" },
      },
    },
  }, {
    "name": "get_affiliate_links",
    "category": "Meal Planning",
    "description":
      "Generates country-specific grocery affiliate links for ingredients in a meal plan. Supports 25 countries with localized grocery delivery services and affiliate partnerships.",
    "input_schema": {
      "type": "object",
      "properties": {
        "ingredients": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of ingredient names",
        },
        "country_code": {
          "type": "string",
          "description":
            "ISO 3166-1 alpha-2 country code (e.g., US, GB, DE, FR)",
        },
        "user_id": {
          "type": "string",
          "description": "User ID for tracking affiliate conversions",
        },
      },
      "required": ["ingredients", "country_code"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "links": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "ingredient": { "type": "string" },
              "url": { "type": "string" },
              "provider": { "type": "string" },
              "estimated_price": { "type": "number" },
            },
          },
        },
        "total_estimated_cost": { "type": "number" },
      },
    },
  }, {
    "name": "log_weight",
    "category": "Weight Tracking",
    "description":
      "Records a daily weight entry for a user. This is a core component of the feedback loop that enables plan adaptation based on actual results.",
    "input_schema": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "weight_kg": { "type": "number", "description": "Weight in kilograms" },
        "date": {
          "type": "string",
          "description": "Date of measurement (ISO 8601)",
          "default": "today",
        },
        "notes": {
          "type": "string",
          "description": "Optional notes about the measurement",
        },
      },
      "required": ["user_id", "weight_kg"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "message": { "type": "string" },
        "log_id": { "type": "string" },
        "bmi": {
          "type": "number",
          "description": "Calculated BMI if height is available",
        },
      },
    },
  }, {
    "name": "weekly_trend",
    "category": "Weight Tracking",
    "description":
      "Calculates weekly weight trends and statistics for a user. Shows average weight, change from previous week, and trend direction (increasing, decreasing, stable).",
    "input_schema": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "week_start": {
          "type": "string",
          "description": "Start date of the week to analyze (ISO 8601)",
        },
        "include_graph_data": {
          "type": "boolean",
          "description": "Whether to include daily data points for graphing",
          "default": false,
        },
      },
      "required": ["user_id", "week_start"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "average_weight": { "type": "number" },
        "weight_change": {
          "type": "number",
          "description": "Change from previous week in kg",
        },
        "trend": {
          "type": "string",
          "enum": ["increasing", "decreasing", "stable"],
        },
        "data_points": {
          "type": "integer",
          "description": "Number of measurements in the week",
        },
        "daily_data": {
          "type": "array",
          "description": "Daily weight measurements if requested",
        },
      },
    },
  }, {
    "name": "evaluate_plan_outcome",
    "category": "Weight Tracking",
    "description":
      "Evaluates the effectiveness of a meal plan by comparing actual weight results against goals. This drives the adaptive feedback loop that improves future meal plans.",
    "input_schema": {
      "type": "object",
      "properties": {
        "plan_id": {
          "type": "string",
          "description": "Meal plan identifier to evaluate",
        },
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "end_weight": {
          "type": "number",
          "description": "Weight at end of plan period (kg)",
        },
        "adherence_score": {
          "type": "number",
          "description": "How closely user followed the plan (0-100)",
          "default": 100,
        },
      },
      "required": ["plan_id", "user_id", "end_weight"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "outcome": {
          "type": "string",
          "enum": [
            "exceeded_goal",
            "met_goal",
            "partial_progress",
            "no_progress",
            "opposite_direction",
          ],
        },
        "weight_change": { "type": "number" },
        "goal_achievement_percentage": { "type": "number" },
        "recommendations": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Suggestions for next meal plan",
        },
      },
    },
  }, {
    "name": "push_plan_feedback",
    "category": "Weight Tracking",
    "description":
      "Submits user feedback on a meal plan including ratings, comments, and specific meal preferences. This qualitative data complements quantitative weight tracking for plan optimization.",
    "input_schema": {
      "type": "object",
      "properties": {
        "plan_id": { "type": "string", "description": "Meal plan identifier" },
        "user_id": {
          "type": "string",
          "description": "Unique user identifier",
        },
        "rating": {
          "type": "integer",
          "description": "1-5 star rating",
          "minimum": 1,
          "maximum": 5,
        },
        "comments": { "type": "string", "description": "General feedback" },
        "liked_recipes": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of recipe IDs user enjoyed",
        },
        "disliked_recipes": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of recipe IDs user did not enjoy",
        },
      },
      "required": ["plan_id", "user_id", "rating"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "message": { "type": "string" },
      },
    },
  }, {
    "name": "search_restaurants",
    "category": "Delivery",
    "description":
      "Searches for restaurants available for delivery via MealMe API. Supports filtering by cuisine, price, rating, and dietary options.",
    "input_schema": {
      "type": "object",
      "properties": {
        "latitude": { "type": "number" },
        "longitude": { "type": "number" },
        "query": {
          "type": "string",
          "description": "Search term (e.g., 'sushi', 'pizza')",
        },
        "budget": {
          "type": "number",
          "description": "Max price level (1-4)",
        },
        "sort": {
          "type": "string",
          "enum": ["relevance", "rating", "delivery_time", "distance"],
          "default": "relevance",
        },
      },
      "required": ["latitude", "longitude"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "restaurants": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "rating": { "type": "number" },
              "delivery_time_minutes": { "type": "integer" },
              "cuisines": { "type": "array", "items": { "type": "string" } },
            },
          },
        },
      },
    },
  }, {
    "name": "get_restaurant_menu",
    "category": "Delivery",
    "description":
      "Retrieves the full menu for a specific restaurant. Includes item descriptions, prices, and customization options.",
    "input_schema": {
      "type": "object",
      "properties": {
        "restaurant_id": { "type": "string" },
      },
      "required": ["restaurant_id"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "categories": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "items": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "price": { "type": "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, {
    "name": "create_cart",
    "category": "Delivery",
    "description":
      "Creates a shopping cart for a specific restaurant order. This is the first step in the ordering process.",
    "input_schema": {
      "type": "object",
      "properties": {
        "restaurant_id": { "type": "string" },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "item_id": { "type": "string" },
              "quantity": { "type": "integer" },
              "options": {
                "type": "object",
                "description": "Selected customization options",
              },
            },
          },
        },
        "user_id": { "type": "string" },
      },
      "required": ["restaurant_id", "items", "user_id"],
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "cart_id": { "type": "string" },
        "subtotal": { "type": "number" },
        "tax": { "type": "number" },
        "total": { "type": "number" },
        "checkout_url": { "type": "string" },
      },
    },
  }],
};
