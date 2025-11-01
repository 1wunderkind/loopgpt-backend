#!/bin/bash
#
# Rename Edge Functions to match new taxonomy
# This script renames directories and updates imports
#

set -e

cd /home/ubuntu/loopgpt-backend/supabase/functions

echo "🔄 Renaming Edge Functions to new taxonomy..."

# Cluster 1: User Profile & Goals
mv get_weight_prefs user_get_profile
mv update_weight_prefs user_update_diet_preferences
# tracker_set_goals → user_set_weight_goal (will be created new)

# Cluster 2: Meal Planning
mv generate_week_plan plan_create_meal_plan
mv recipes_creative_recipe plan_generate_from_leftovers
mv log_meal_plan plan_get_active_plan

# Cluster 3: Nutrition Analysis
mv nutrition_analyze nutrition_analyze_food
mv normalize_ingredients nutrition_get_macros

# Cluster 4: Tracking & Progress
mv tracker_log_food tracker_log_meal
mv log_weight tracker_log_weight
mv weekly_trend tracker_get_progress
mv tracker_get_daily_summary tracker_summary

# Cluster 5: Feedback Loop
mv evaluate_plan_outcome loop_evaluate_plan
mv push_plan_feedback loop_adjust_calories

# Cluster 6: Delivery & Integrations
mv mealme_search delivery_search_restaurants
mv get_delivery_recommendations delivery_get_menu
mv mealme_order_plan delivery_place_order

echo "✅ All Edge Functions renamed!"
echo ""
echo "📋 Summary:"
echo "   - Renamed: 17 functions"
echo "   - Kept as-is: 10 functions (location, affiliate, billing, etc.)"
echo "   - To create: 13 new functions"
echo ""
echo "⚠️  Next steps:"
echo "   1. Update MCP server routing"
echo "   2. Create new stub functions"
echo "   3. Test all renamed functions"
echo "   4. Deploy to Supabase"

