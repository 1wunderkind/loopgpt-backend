#!/bin/bash

# TheLoopGPT Metadata Deployment Verification Script
# Run this after deploying to verify all endpoints are working

echo "================================================================================"
echo "TheLoopGPT Metadata Deployment Verification"
echo "================================================================================"
echo ""

BASE_URL="https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server"
PASSED=0
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="$4"
  local expected="$5"
  
  echo -n "Testing $name... "
  
  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data" 2>&1)
  else
    response=$(curl -s "$url" 2>&1)
  fi
  
  if echo "$response" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "   Expected: $expected"
    echo "   Got: $(echo $response | head -c 100)..."
    ((FAILED++))
  fi
}

echo "📡 Testing MCP Server Endpoints..."
echo ""

# Test 1: Main manifest endpoint
test_endpoint "Main Manifest" "$BASE_URL/" "GET" "" "tools"

# Test 2: Complete metadata package
test_endpoint "Complete Metadata" "$BASE_URL/metadata" "GET" "" "toolCount"

# Test 3: Tool-specific metadata
test_endpoint "Tool Metadata" "$BASE_URL/metadata/tool/plan_generate_from_leftovers" "GET" "" "Recipe Generator"

# Test 4: Tool recommendation
test_endpoint "Tool Recommendation" "$BASE_URL/metadata/recommend" "POST" '{"query":"What can I make with chicken?"}' "plan_generate_from_leftovers"

# Test 5: Routing hints
test_endpoint "Routing Hints" "$BASE_URL/metadata/routing" "GET" "" "triggerHints"

# Test 6: App metadata
test_endpoint "App Metadata" "$BASE_URL/metadata/app" "GET" "" "TheLoopGPT"

# Test 7: Health check
test_endpoint "Health Check" "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/health" "GET" "" "status"

echo ""
echo "================================================================================"
echo "Verification Summary"
echo "================================================================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "================================================================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Deployment successful!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
  exit 1
fi
