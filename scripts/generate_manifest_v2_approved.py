#!/usr/bin/env python3
"""
Generate manifest.json v2 with APPROVED tweaks from user feedback
"""
import json

# Tool definitions with intent-first descriptions (APPROVED VERSION)
TOOLS = {
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 1: USER PROFILE & GOALS (user_*)
    # ═══════════════════════════════════════════════════════════════
    "user_get_profile": {
        "category": "User Profile & Goals",
        "description": "Use when you need to retrieve the active user's diet preferences, allergies, current goals, or profile information. This is a read-only setup tool that provides context for meal planning and tracking.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"}
            },
            "required": ["user_id"]
        }
    },
    "user_set_weight_goal": {
        "category": "User Profile & Goals",
        "description": "Use when a user expresses a weight goal such as 'I want to lose 5 kg', 'gain muscle', or 'maintain my current weight'. This sets the active goal used by planning and tracking tools. Call this BEFORE creating meal plans.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "target_weight_kg": {"type": "number", "description": "Target weight in kilograms"},
                "goal_type": {"type": "string", "enum": ["loss", "gain", "maintain"], "description": "Type of weight goal"},
                "target_date": {"type": "string", "description": "Optional target date (ISO 8601)"}
            },
            "required": ["user_id", "target_weight_kg", "goal_type"]
        }
    },
    "user_update_diet_preferences": {
        "category": "User Profile & Goals",
        "description": "Use when the user specifies diet restrictions or macro preferences such as 'I'm vegan', 'no dairy', 'high protein', or 'keto diet'. This updates their nutrition profile and affects future meal plan generation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "diet_tags": {"type": "array", "items": {"type": "string"}, "description": "Diet types (vegan, keto, etc.)"},
                "allergies": {"type": "array", "items": {"type": "string"}, "description": "Food allergies or exclusions"}
            },
            "required": ["user_id"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 2: MEAL PLANNING (plan_*)
    # ═══════════════════════════════════════════════════════════════
    "plan_create_meal_plan": {
        "category": "Meal Planning",
        "description": "Use when a user asks for a daily or weekly meal plan such as 'Make me a 7-day plan', 'I need a meal plan for this week', or 'Create a diet plan for me'. This generates a complete plan aligned with the user's active goals. Use only after user_set_weight_goal or when an explicit calorie target is provided.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "duration_days": {"type": "integer", "default": 7, "description": "Number of days (1-30)"},
                "calorie_target": {"type": "number", "description": "Daily calorie target"},
                "diet": {"type": "string", "description": "Diet type (vegan, keto, etc.)"},
                "meals_per_day": {"type": "integer", "default": 3, "description": "Number of meals per day"},
                "allergies": {"type": "array", "items": {"type": "string"}, "description": "Food allergies"},
                "cuisine_preferences": {"type": "array", "items": {"type": "string"}, "description": "Preferred cuisines"}
            },
            "required": ["user_id", "calorie_target"]
        }
    },
    "plan_generate_from_leftovers": {
        "category": "Meal Planning",
        "description": "Use when the user lists ingredients on hand and asks 'What can I make?', 'I have eggs and spinach', or 'Use up my leftovers'. This creates one or more meals from available ingredients using the nutrition database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "ingredients": {"type": "array", "items": {"type": "string"}, "description": "Available ingredients"}
            },
            "required": ["user_id", "ingredients"]
        }
    },
    "plan_random_meal": {
        "category": "Meal Planning",
        "description": "Use when the user asks for a quick meal suggestion such as 'Give me a healthy dinner idea', 'Suggest a breakfast', or 'Random meal for lunch'. This is a lightweight generator for single meal ideas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "meal_type": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"], "description": "Type of meal"}
            },
            "required": ["user_id", "meal_type"]
        }
    },
    "plan_get_active_plan": {
        "category": "Meal Planning",
        "description": "Use when you need to fetch the user's current active meal plan for review, reuse, or reference. This is a read-only tool that retrieves stored plans.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "plan_id": {"type": "string", "description": "Optional specific plan ID"}
            },
            "required": ["user_id"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 3: NUTRITION ANALYSIS (nutrition_*)
    # ═══════════════════════════════════════════════════════════════
    "nutrition_analyze_food": {
        "category": "Nutrition Analysis",
        "description": "Use when the user lists foods or recipes and asks 'What's in this?', 'How many calories?', 'Analyze this smoothie', or 'Nutrition facts for...'. This returns detailed macros and micros per serving using the 1,000-food database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ingredients": {"type": "array", "items": {"type": "string"}, "description": "List of ingredients"},
                "quantity": {"type": "number", "description": "Serving quantity"},
                "unit": {"type": "string", "description": "Unit of measurement"}
            },
            "required": ["ingredients"]
        }
    },
    "nutrition_get_macros": {
        "category": "Nutrition Analysis",
        "description": "Use when you need to summarize total macros from an existing plan or tracker entry. This aggregates calories, protein, carbs, and fat from multiple sources.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string", "description": "Plan ID or tracker ID"},
                "source_type": {"type": "string", "enum": ["plan", "tracker"], "description": "Type of source"}
            },
            "required": ["source_id", "source_type"]
        }
    },
    "nutrition_compare_foods": {
        "category": "Nutrition Analysis",
        "description": "Use when the user asks to compare two foods such as 'Chicken vs Tofu', 'Which has more protein?', or 'Compare brown rice and quinoa'. This returns nutritional differences side-by-side.",
        "input_schema": {
            "type": "object",
            "properties": {
                "food_a": {"type": "string", "description": "First food name"},
                "food_b": {"type": "string", "description": "Second food name"}
            },
            "required": ["food_a", "food_b"]
        }
    },
    "nutrition_get_recommendations": {
        "category": "Nutrition Analysis",
        "description": "Use when the user asks 'What foods are high in iron/protein/fiber?', 'Best sources of vitamin C?', or 'Foods rich in...'. This is a discovery tool that lists foods by nutrient content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "nutrient_name": {"type": "string", "description": "Nutrient to search for (e.g., 'protein', 'iron', 'vitamin C')"}
            },
            "required": ["nutrient_name"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 4: TRACKING & PROGRESS (tracker_*)
    # ═══════════════════════════════════════════════════════════════
    "tracker_log_meal": {
        "category": "Tracking & Progress",
        "description": "Use when the user records a meal or snack manually such as 'I ate oatmeal for breakfast', 'Log my lunch', or 'I had a protein shake'. This creates a tracker entry for adherence monitoring.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "meal_name": {"type": "string", "description": "Name of the meal"},
                "ingredients": {"type": "array", "items": {"type": "string"}, "description": "List of ingredients"},
                "time": {"type": "string", "description": "Time of meal (ISO 8601)"},
                "calories": {"type": "number", "description": "Optional manual calorie entry"}
            },
            "required": ["user_id", "meal_name"]
        }
    },
    "tracker_log_weight": {
        "category": "Tracking & Progress",
        "description": "Use when the user provides current weight such as 'I weigh 72 kg today', 'My weight is 160 lbs', or 'Log my weight'. This updates the weight trend used by the feedback loop.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "weight_kg": {"type": "number", "description": "Weight in kilograms"},
                "date": {"type": "string", "description": "Date of measurement (ISO 8601)"},
                "notes": {"type": "string", "description": "Optional notes"}
            },
            "required": ["user_id", "weight_kg"]
        }
    },
    "tracker_get_progress": {
        "category": "Tracking & Progress",
        "description": "Use when you need to retrieve historical weight and macro trends for charts or summaries. This returns time-series data for visualization.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "timespan_days": {"type": "integer", "description": "Number of days to retrieve (7, 30, 90)"}
            },
            "required": ["user_id", "timespan_days"]
        }
    },
    "tracker_summary": {
        "category": "Tracking & Progress",
        "description": "Use when the user asks 'How am I doing?', 'Show my progress', or 'Weekly summary'. This aggregates macros, adherence, and goal progress for a specified period. Prefer tracker_summary for 'How am I doing?'; use loop_evaluate_plan only when the user mentions comparing plan vs actuals.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "period": {"type": "string", "enum": ["day", "week", "month"], "description": "Summary period"}
            },
            "required": ["user_id", "period"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 5: FEEDBACK LOOP & OPTIMIZATION (loop_*)
    # ═══════════════════════════════════════════════════════════════
    "loop_evaluate_plan": {
        "category": "Feedback Loop",
        "description": "Use when the user asks 'Did I follow the plan?', 'How well did I do?', or 'Evaluate my adherence'. This compares the active plan versus actual tracking data to measure compliance. Use only when the user mentions comparing plan vs actuals.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "plan_id": {"type": "string", "description": "Plan identifier to evaluate"},
                "tracker_range": {"type": "string", "description": "Date range for tracker data"}
            },
            "required": ["user_id", "plan_id"]
        }
    },
    "loop_adjust_calories": {
        "category": "Feedback Loop",
        "description": "Use when the user says 'Adjust my meals', 'I didn't lose enough weight', or 'Increase my calories'. This modifies the calorie target or macros for future plans based on results. Use after loop_evaluate_plan or when the user explicitly asks to change targets.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "adjustment_factor": {"type": "number", "description": "Multiplier for adjustment (0.9 = -10%, 1.1 = +10%)"},
                "new_target": {"type": "number", "description": "Optional explicit new calorie target"}
            },
            "required": ["user_id"]
        }
    },
    "loop_predict_outcome": {
        "category": "Feedback Loop",
        "description": "Use when the user asks 'What will I weigh in 2 weeks?', 'Predict my progress', or 'When will I reach my goal?'. This forecasts future progress based on current trend.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "days_ahead": {"type": "integer", "description": "Number of days to forecast"}
            },
            "required": ["user_id", "days_ahead"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 6: DELIVERY & INTEGRATIONS (delivery_*)
    # ═══════════════════════════════════════════════════════════════
    "delivery_search_restaurants": {
        "category": "Delivery & Integrations",
        "description": "Use when the user asks for nearby delivery options matching their diet plan such as 'Find vegan restaurants', 'Delivery near me', or 'Where can I order keto food?'. This uses MealMe / DoorDash API.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "Address or coordinates"},
                "diet_tags": {"type": "array", "items": {"type": "string"}, "description": "Diet filters (vegan, keto, etc.)"}
            },
            "required": ["location"]
        }
    },
    "delivery_get_menu": {
        "category": "Delivery & Integrations",
        "description": "Supporting tool. Only call when another tool's output requests a menu fetch. Use to fetch the menu for a given restaurant ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "restaurant_id": {"type": "string", "description": "Restaurant identifier from search"}
            },
            "required": ["restaurant_id"]
        }
    },
    "delivery_place_order": {
        "category": "Delivery & Integrations",
        "description": "Use when the user says 'Order my lunch', 'Place this order', or 'Checkout'. This places a food order through partner APIs (Premium feature).",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Unique user identifier"},
                "restaurant_id": {"type": "string", "description": "Restaurant identifier"},
                "menu_item_id": {"type": "string", "description": "Menu item to order"}
            },
            "required": ["user_id", "restaurant_id", "menu_item_id"]
        }
    },
    
    # ═══════════════════════════════════════════════════════════════
    # CLUSTER 7: SYSTEM & SUPPORT (sys_*)
    # ═══════════════════════════════════════════════════════════════
    "sys_get_help": {
        "category": "System & Support",
        "description": "Developer-only; do not call in normal user flows. Use when the user asks 'What can you do?', 'List all tools', or 'Help me understand your features'. This provides a developer-facing tool list with usage examples.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    "sys_healthcheck": {
        "category": "System & Support",
        "description": "Developer-only; do not call in normal user flows. Use for monitoring or debugging. Returns system status, active manifest version, and database checksum.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    "sys_debug_tool_choice_log": {
        "category": "System & Support",
        "description": "Developer-only; do not call in normal user flows. Use to log tool-selection context for QA and routing accuracy analysis. This is a dev-only tool that tracks which tool was chosen and why.",
        "input_schema": {
            "type": "object",
            "properties": {
                "input": {"type": "string", "description": "User's original query"},
                "chosen_tool": {"type": "string", "description": "Tool that was selected"},
                "confidence": {"type": "number", "description": "Confidence score (0-1)"}
            },
            "required": ["input", "chosen_tool"]
        }
    }
}

# Deprecated aliases for backward compatibility (REDUCED TO 12)
DEPRECATED_ALIASES = {
    "set_weight_goal": {
        "redirect_to": "user_set_weight_goal",
        "description": "[DEPRECATED] Alias for user_set_weight_goal. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "tracker_set_goals": {
        "redirect_to": "user_set_weight_goal",
        "description": "[DEPRECATED] Alias for user_set_weight_goal. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "get_user_profile": {
        "redirect_to": "user_get_profile",
        "description": "[DEPRECATED] Alias for user_get_profile. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "update_diet_preferences": {
        "redirect_to": "user_update_diet_preferences",
        "description": "[DEPRECATED] Alias for user_update_diet_preferences. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "create_meal_plan": {
        "redirect_to": "plan_create_meal_plan",
        "description": "[DEPRECATED] Alias for plan_create_meal_plan. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "generate_recipes": {
        "redirect_to": "plan_generate_from_leftovers",
        "description": "[DEPRECATED] Alias for plan_generate_from_leftovers. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "random_meal": {
        "redirect_to": "plan_random_meal",
        "description": "[DEPRECATED] Alias for plan_random_meal. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "nutrition_analyze": {
        "redirect_to": "nutrition_analyze_food",
        "description": "[DEPRECATED] Alias for nutrition_analyze_food. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "get_weight_history": {
        "redirect_to": "tracker_get_progress",
        "description": "[DEPRECATED] Alias for tracker_get_progress. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "get_weight_trend": {
        "redirect_to": "tracker_get_progress",
        "description": "[DEPRECATED] Alias for tracker_get_progress. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "order_meal_delivery": {
        "redirect_to": "delivery_place_order",
        "description": "[DEPRECATED] Alias for delivery_place_order. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    },
    "mealme_search": {
        "redirect_to": "delivery_search_restaurants",
        "description": "[DEPRECATED] Alias for delivery_search_restaurants. Use only if legacy code still calls this name. Will be removed in v2.1.0.",
        "category": "Deprecated"
    }
}

def generate_manifest():
    """Generate complete manifest.json v2 with approved tweaks"""
    manifest = {
        "name": "TheLoopGPT.ai",
        "description": "A comprehensive AI-powered nutrition and wellness platform with adaptive feedback loops. TheLoopGPT.ai provides personalized meal planning, weight tracking, nutrition analysis, and delivery integration across 100+ languages and 25 countries.",
        "version": "2.0.0",
        "schema_version": "v1",
        "namespace": "loopgpt",
        "contact_email": "support@theloopgpt.ai",
        "api": {
            "type": "openai-mcp",
            "url": "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server"
        },
        "authentication": {
            "type": "none"
        },
        "tools": []
    }
    
    # Add all active tools
    for name, spec in TOOLS.items():
        tool = {
            "name": name,
            "category": spec["category"],
            "description": spec["description"],
            "input_schema": spec["input_schema"]
        }
        manifest["tools"].append(tool)
    
    # Add deprecated aliases (REDUCED TO 12)
    for name, spec in DEPRECATED_ALIASES.items():
        tool = {
            "name": name,
            "category": spec["category"],
            "description": spec["description"],
            "redirect_to": spec["redirect_to"],
            "deprecated": True,
            "input_schema": {
                "type": "object",
                "properties": {}
            }
        }
        manifest["tools"].append(tool)
    
    return manifest

if __name__ == "__main__":
    manifest = generate_manifest()
    
    # Write to file
    with open("/home/ubuntu/loopgpt-backend/supabase/manifest_v2.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"✅ Generated manifest_v2.json with {len(manifest['tools'])} tools")
    print(f"   - Active tools: {len(TOOLS)}")
    print(f"   - Deprecated aliases: {len(DEPRECATED_ALIASES)}")
    print(f"   - Total: {len(manifest['tools'])}")
    print("")
    print("📋 Approved tweaks applied:")
    print("   ✅ plan_create_meal_plan: Added sequential hint")
    print("   ✅ tracker_summary: Added disambiguation hint")
    print("   ✅ loop_adjust_calories: Added 'call after' hint")
    print("   ✅ delivery_get_menu: Marked as supporting tool")
    print("   ✅ sys_*: Marked as developer-only")
    print("   ✅ Reduced aliases from 18 → 12")

