import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSystemAPI } from "../_shared/security/applyMiddleware.ts";

// Hardcoded tool categories and examples
const TOOL_CATEGORIES = {
  "User Profile": [
    { name: "user_set_weight_goal", description: "Set weight loss or gain goal" },
    { name: "user_set_calorie_goal", description: "Set daily calorie target" },
    { name: "user_set_preferences", description: "Set dietary preferences and restrictions" },
  ],
  "Meal Planning": [
    { name: "plan_create_meal_plan", description: "Generate a personalized meal plan" },
    { name: "plan_get_active_plan", description: "Retrieve current active meal plan" },
    { name: "plan_random_meal", description: "Get a random meal suggestion" },
  ],
  "Food Tracking": [
    { name: "tracker_log_meal", description: "Log a meal with nutrition info" },
    { name: "tracker_summary", description: "Get daily nutrition summary" },
    { name: "tracker_get_history", description: "View meal history" },
  ],
  "Nutrition": [
    { name: "nutrition_analyze_food", description: "Analyze nutrition for any food" },
    { name: "nutrition_get_macros", description: "Get macros for ingredients" },
  ],
  "Commerce": [
    { name: "loopgpt_route_order", description: "Route order to best provider" },
    { name: "loopgpt_confirm_order", description: "Confirm and place order" },
    { name: "loopgpt_cancel_order", description: "Cancel an existing order" },
  ],
  "Delivery": [
    { name: "delivery_search_restaurants", description: "Search for nearby restaurants" },
    { name: "delivery_get_menu", description: "Get restaurant menu" },
  ],
  "Loop Intelligence": [
    { name: "loop_predict_outcome", description: "Predict weight change outcome" },
    { name: "loop_adjust_calories", description: "Adjust calories based on progress" },
  ],
  "System": [
    { name: "sys_healthcheck", description: "Check system health" },
    { name: "sys_get_help", description: "Get help and available tools" },
  ],
};

const handler = async (req: Request) => {
  try {
    // Count total tools
    let totalTools = 0;
    for (const category in TOOL_CATEGORIES) {
      totalTools += TOOL_CATEGORIES[category].length;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        version: "2.0.0",
        total_tools: totalTools,
        categories: Object.keys(TOOL_CATEGORIES).length,
        tools_by_category: TOOL_CATEGORIES,
        examples: [
          { query: "I want to lose 5 kg", tool: "user_set_weight_goal" },
          { query: "Make me a 7-day plan", tool: "plan_create_meal_plan" },
          { query: "I ate oatmeal for breakfast", tool: "tracker_log_meal" },
          { query: "How many calories in chicken?", tool: "nutrition_analyze_food" },
          { query: "How am I doing?", tool: "tracker_summary" }
        ]
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withSystemAPI(handler));
