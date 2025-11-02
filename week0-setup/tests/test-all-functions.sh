#!/bin/bash
# ============================================================================
# Test All Edge Functions
# Purpose: Verify all 19 existing Edge Functions are working
# Usage: ./test-all-functions.sh
# ============================================================================

set -e

echo "================================"
echo "Testing All LoopGPT Edge Functions"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for results
TOTAL=0
PASSED=0
FAILED=0

# Function to test an edge function
test_function() {
    local func_name=$1
    local test_payload=$2
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing ${func_name}... "
    
    # Call the function
    response=$(supabase functions invoke "$func_name" --body "$test_payload" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Error: $response"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "📋 Testing Meal Planning Functions..."
echo "-----------------------------------"

test_function "plan_create_meal_plan" '{
  "user_id": "test-user-1",
  "goal_type": "weight_loss",
  "current_weight_lbs": 185,
  "target_weight_lbs": 170,
  "activity_level": "moderate"
}'

test_function "plan_get_active_plan" '{
  "user_id": "test-user-1"
}'

test_function "plan_random_meal" '{}'

echo ""
echo "🔄 Testing Loop/Tracking Functions..."
echo "-----------------------------------"

test_function "loop_adjust_calories" '{
  "user_id": "test-user-1",
  "current_weight_lbs": 183
}'

test_function "loop_evaluate_plan" '{
  "user_id": "test-user-1"
}'

test_function "loop_predict_outcome" '{
  "user_id": "test-user-1"
}'

echo ""
echo "🥗 Testing Nutrition Functions..."
echo "-----------------------------------"

test_function "nutrition_analyze_food" '{
  "food_name": "chicken breast"
}'

test_function "nutrition_compare_foods" '{
  "food1": "chicken breast",
  "food2": "salmon"
}'

test_function "nutrition_get_macros" '{
  "food_name": "brown rice",
  "serving_size": "1 cup"
}'

test_function "nutrition_get_recommendations" '{
  "user_id": "test-user-1"
}'

echo ""
echo "🔍 Testing Food Search..."
echo "-----------------------------------"

test_function "food_search" '{
  "query": "chicken"
}'

echo ""
echo "🚚 Testing Delivery Functions..."
echo "-----------------------------------"

test_function "delivery_search_restaurants" '{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "cuisine": "italian"
}'

echo ""
echo "📍 Testing Location Functions..."
echo "-----------------------------------"

test_function "get_user_location" '{}'

test_function "get_affiliate_by_country" '{
  "country_code": "US",
  "category": "grocery"
}'

test_function "get_affiliate_links" '{
  "country_code": "US",
  "category": "grocery"
}'

echo ""
echo "💳 Testing Billing Functions..."
echo "-----------------------------------"

test_function "check_entitlement" '{
  "user_id": "test-user-1"
}'

echo ""
echo "================================"
echo "Test Results Summary"
echo "================================"
echo "Total tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
