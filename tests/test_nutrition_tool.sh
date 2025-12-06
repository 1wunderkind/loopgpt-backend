#!/bin/bash
# ============================================================================
# LoopKitchen Nutrition Tool - Quick Test Script
# ============================================================================
# 
# Usage: ./test_nutrition_tool.sh <mcp_server_url>
# Example: ./test_nutrition_tool.sh https://your-mcp-server.supabase.co/functions/v1/mcp-tools
#
# ============================================================================

set -e

MCP_URL="${1:-http://localhost:54321/functions/v1/mcp-tools}"

echo "========================================="
echo "LoopKitchen Nutrition Tool Test Suite"
echo "========================================="
echo "MCP Server: $MCP_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to run test
run_test() {
  local test_name="$1"
  local tool_name="$2"
  local payload="$3"
  local expected_type="$4"
  
  echo -e "${YELLOW}Testing: $test_name${NC}"
  
  response=$(curl -s -X POST \
    "$MCP_URL/tools/$tool_name" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  # Check if response contains expected widget type
  if echo "$response" | grep -q "\"type\":\"$expected_type\""; then
    echo -e "${GREEN}✓ PASSED${NC} - Widget type: $expected_type"
    PASSED=$((PASSED + 1))
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ FAILED${NC} - Expected widget type: $expected_type"
    FAILED=$((FAILED + 1))
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  fi
  
  echo ""
}

# ============================================================================
# Test 1: Recipe-Based Nutrition Analysis
# ============================================================================

run_test \
  "Recipe-Based Nutrition Analysis" \
  "loopkitchen.nutrition.analyze" \
  '{
    "recipes": [
      {
        "title": "Grilled Chicken Salad",
        "servings": 2,
        "prepTime": 10,
        "cookTime": 15,
        "ingredients": [
          { "name": "chicken breast", "quantity": "2", "unit": "pieces" },
          { "name": "mixed greens", "quantity": "4", "unit": "cups" },
          { "name": "cherry tomatoes", "quantity": "1", "unit": "cup" },
          { "name": "olive oil", "quantity": "2", "unit": "tbsp" }
        ],
        "instructions": [
          "Season and grill chicken breast",
          "Slice grilled chicken",
          "Toss greens with tomatoes",
          "Top with chicken and drizzle with oil"
        ]
      }
    ]
  }' \
  "NutritionSummary"

# ============================================================================
# Test 2: Ingredient-Based Nutrition Analysis
# ============================================================================

run_test \
  "Ingredient-Based Nutrition Analysis" \
  "loopkitchen.nutrition.analyze" \
  '{
    "ingredients": [
      { "name": "oats", "quantity": "1", "unit": "cup" },
      { "name": "banana", "quantity": "1", "unit": "piece" },
      { "name": "almond milk", "quantity": "1", "unit": "cup" },
      { "name": "honey", "quantity": "1", "unit": "tbsp" }
    ],
    "servings": 1
  }' \
  "NutritionSummary"

# ============================================================================
# Test 3: Error Handling - Missing Required Fields
# ============================================================================

run_test \
  "Error Handling - Missing Required Fields" \
  "loopkitchen.nutrition.analyze" \
  '{
    "servings": 2
  }' \
  "InfoMessage"

# ============================================================================
# Test 4: Error Handling - Empty Arrays
# ============================================================================

run_test \
  "Error Handling - Empty Arrays" \
  "loopkitchen.nutrition.analyze" \
  '{
    "recipes": []
  }' \
  "InfoMessage"

# ============================================================================
# Test 5: Meal Logging (Placeholder)
# ============================================================================

run_test \
  "Meal Logging Placeholder" \
  "loopkitchen.nutrition.logMeal" \
  '{
    "userId": "test_user_123",
    "mealType": "lunch",
    "mealDate": "2025-12-06",
    "recipeTitle": "Grilled Chicken Salad",
    "nutrition": {
      "calories": 420,
      "protein": 35,
      "carbs": 25,
      "fat": 18,
      "fiber": 6,
      "sugar": 8,
      "sodium": 450
    },
    "servings": 1,
    "healthScore": 85,
    "tags": ["high-protein", "low-carb"]
  }' \
  "InfoMessage"

# ============================================================================
# Test 6: Daily Nutrition Summary (Placeholder)
# ============================================================================

run_test \
  "Daily Nutrition Summary Placeholder" \
  "loopkitchen.nutrition.daily" \
  '{
    "userId": "test_user_123",
    "date": "2025-12-06"
  }' \
  "InfoMessage"

# ============================================================================
# Test 7: Health Check
# ============================================================================

echo -e "${YELLOW}Testing: Health Check${NC}"
health_response=$(curl -s -X GET "$MCP_URL/health")

if echo "$health_response" | grep -q '"status":"healthy"'; then
  echo -e "${GREEN}✓ PASSED${NC} - MCP Server is healthy"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - MCP Server health check failed"
  FAILED=$((FAILED + 1))
fi

echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
echo ""

# ============================================================================
# Test 8: Manifest Check
# ============================================================================

echo -e "${YELLOW}Testing: Manifest - LoopKitchen Tools Registered${NC}"
manifest_response=$(curl -s -X GET "$MCP_URL/")

if echo "$manifest_response" | grep -q "loopkitchen.nutrition.analyze"; then
  echo -e "${GREEN}✓ PASSED${NC} - LoopKitchen tools are registered"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - LoopKitchen tools not found in manifest"
  FAILED=$((FAILED + 1))
fi

echo "Registered LoopKitchen tools:"
echo "$manifest_response" | jq '.tools[] | select(.name | startswith("loopkitchen"))' 2>/dev/null || echo "Could not parse manifest"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "========================================="
echo "Test Results"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
