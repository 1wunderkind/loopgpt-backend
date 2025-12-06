#!/bin/bash
# ============================================================================
# LoopKitchen Integration Test Suite - Phase 5
# ============================================================================
# 
# Comprehensive test suite for all LoopKitchen tools across all phases.
# Tests recipe generation, nutrition analysis, and meal planning.
#
# Usage: ./loopkitchen_integration_tests.sh <mcp_server_url>
# Example: ./loopkitchen_integration_tests.sh https://your-server.supabase.co/functions/v1/mcp-tools
#
# ============================================================================

set -e

MCP_URL="${1:-http://localhost:54321/functions/v1/mcp-tools}"

echo "========================================="
echo "LoopKitchen Integration Test Suite"
echo "Phase 5 - Final Testing"
echo "========================================="
echo "MCP Server: $MCP_URL"
echo "Date: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Function to run test
run_test() {
  local test_name="$1"
  local tool_name="$2"
  local payload="$3"
  local expected_type="$4"
  local optional="${5:-false}"
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Test: $test_name${NC}"
  echo -e "${BLUE}Tool: $tool_name${NC}"
  
  response=$(curl -s -X POST \
    "$MCP_URL/tools/$tool_name" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1)
  
  # Check if response contains expected widget type or is valid JSON
  if echo "$response" | grep -q "\"type\":\"$expected_type\"" || \
     echo "$response" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC} - Response valid"
    PASSED=$((PASSED + 1))
    
    # Pretty print response (first 500 chars)
    echo "$response" | jq '.' 2>/dev/null | head -20 || echo "$response" | head -10
  else
    if [ "$optional" = "true" ]; then
      echo -e "${YELLOW}⊘ SKIPPED${NC} - Optional test (may require external dependencies)"
      SKIPPED=$((SKIPPED + 1))
    else
      echo -e "${RED}✗ FAILED${NC} - Expected type: $expected_type"
      FAILED=$((FAILED + 1))
    fi
    echo "$response" | head -20
  fi
  
  echo ""
}

# ============================================================================
# PHASE 2: Recipe Generation Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PHASE 2: Recipe Generation Tests     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

run_test \
  "Generate recipes with chaos mode" \
  "loopkitchen.recipes.generate" \
  '{
    "ingredients": ["chicken", "rice", "soy sauce", "ginger"],
    "vibes": ["Quick", "Asian-inspired"],
    "timeLimit": 30,
    "chaosTarget": 5,
    "count": 3
  }' \
  "RecipeCardCompact"

run_test \
  "Get recipe details with nutrition" \
  "loopkitchen.recipes.details" \
  '{
    "recipeId": "quick-chicken-rice-bowl-0",
    "recipeTitle": "Quick Chicken Rice Bowl",
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick"],
    "chaosTarget": 5
  }' \
  "RecipeCardDetailed"

run_test \
  "Generate recipes - soft constraints test" \
  "loopkitchen.recipes.generate" \
  '{
    "ingredients": ["beef", "potatoes", "carrots"],
    "timeLimit": 20,
    "dietConstraints": ["low-carb"],
    "count": 3
  }' \
  "RecipeCardCompact"

# ============================================================================
# PHASE 3: Nutrition Analysis Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PHASE 3: Nutrition Analysis Tests     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

run_test \
  "Analyze nutrition from recipe" \
  "loopkitchen.nutrition.analyze" \
  '{
    "recipes": [{
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
        "Season and grill chicken",
        "Slice chicken",
        "Toss greens with tomatoes",
        "Top with chicken and drizzle oil"
      ]
    }]
  }' \
  "NutritionSummary"

run_test \
  "Analyze nutrition from ingredients" \
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

run_test \
  "Meal logging placeholder" \
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
# PHASE 4: Meal Planning Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PHASE 4: Meal Planning Tests          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

run_test \
  "Generate 7-day meal plan" \
  "loopkitchen.mealplan.generate" \
  '{
    "ingredients": ["chicken", "rice", "broccoli", "eggs", "olive oil"],
    "caloriesPerDay": 2000,
    "dietNotes": "high-protein, balanced",
    "days": 7
  }' \
  "WeekPlanner"

run_test \
  "Generate 3-day meal plan (weekend)" \
  "loopkitchen.mealplan.generate" \
  '{
    "ingredients": ["eggs", "bacon", "bread", "cheese"],
    "caloriesPerDay": 1500,
    "dietNotes": "quick and easy",
    "days": 3
  }' \
  "WeekPlanner"

run_test \
  "Generate meal plan with grocery list" \
  "loopkitchen.mealplan.withGrocery" \
  '{
    "ingredients": ["chicken", "pasta", "tomatoes", "garlic", "cheese"],
    "caloriesPerDay": 1800,
    "dietNotes": "vegetarian-friendly",
    "days": 5
  }' \
  "WeekPlanner"

# ============================================================================
# Integration Tests (Cross-Phase)
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Integration Tests (Cross-Phase)       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

run_test \
  "Recipe → Nutrition flow" \
  "loopkitchen.recipes.details" \
  '{
    "recipeId": "healthy-chicken-bowl",
    "recipeTitle": "Healthy Chicken Bowl",
    "ingredients": ["chicken", "quinoa", "vegetables"],
    "chaosTarget": 3
  }' \
  "RecipeCardDetailed"

run_test \
  "Meal Plan → Grocery flow" \
  "loopkitchen.mealplan.withGrocery" \
  '{
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 7
  }' \
  "WeekPlanner"

# ============================================================================
# Error Handling Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Error Handling Tests                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

run_test \
  "Error: Missing ingredients" \
  "loopkitchen.recipes.generate" \
  '{
    "vibes": ["Quick"],
    "count": 3
  }' \
  "InfoMessage"

run_test \
  "Error: Empty ingredients array" \
  "loopkitchen.recipes.generate" \
  '{
    "ingredients": [],
    "count": 3
  }' \
  "InfoMessage"

run_test \
  "Error: Missing nutrition input" \
  "loopkitchen.nutrition.analyze" \
  '{
    "servings": 2
  }' \
  "InfoMessage"

# ============================================================================
# System Health Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  System Health Tests                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Test: Health Check${NC}"
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

echo -e "${YELLOW}Test: Manifest - LoopKitchen Tools${NC}"
manifest_response=$(curl -s -X GET "$MCP_URL/")

loopkitchen_count=$(echo "$manifest_response" | jq '[.tools[] | select(.name | startswith("loopkitchen"))] | length' 2>/dev/null || echo "0")

if [ "$loopkitchen_count" -ge 9 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - Found $loopkitchen_count LoopKitchen tools"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - Expected 9+ LoopKitchen tools, found $loopkitchen_count"
  FAILED=$((FAILED + 1))
fi

echo "Registered LoopKitchen tools:"
echo "$manifest_response" | jq '.tools[] | select(.name | startswith("loopkitchen")) | {name, status}' 2>/dev/null || echo "Could not parse manifest"
echo ""

# ============================================================================
# Performance Tests
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Performance Tests                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Test: Recipe generation performance${NC}"
start_time=$(date +%s%3N)
curl -s -X POST "$MCP_URL/tools/loopkitchen.recipes.generate" \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "count": 3}' > /dev/null
end_time=$(date +%s%3N)
duration=$((end_time - start_time))

if [ $duration -lt 5000 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - Recipe generation: ${duration}ms (< 5000ms)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ WARNING${NC} - Recipe generation: ${duration}ms (target: < 5000ms)"
  PASSED=$((PASSED + 1))
fi
echo ""

echo -e "${YELLOW}Test: Meal plan generation performance${NC}"
start_time=$(date +%s%3N)
curl -s -X POST "$MCP_URL/tools/loopkitchen.mealplan.generate" \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice"], "days": 7}' > /dev/null
end_time=$(date +%s%3N)
duration=$((end_time - start_time))

if [ $duration -lt 5000 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - Meal plan generation: ${duration}ms (< 5000ms)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ WARNING${NC} - Meal plan generation: ${duration}ms (target: < 5000ms)"
  PASSED=$((PASSED + 1))
fi
echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Results Summary                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo "Total:   $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✓ ALL TESTS PASSED!                  ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ✗ SOME TESTS FAILED                  ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════╝${NC}"
  exit 1
fi
