#!/bin/bash
#
# Test Runner for LoopGPT Commerce Layer
# Runs all unit and integration tests
#

set -e

echo "🧪 Running LoopGPT Commerce Layer Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
export LOOPGPT_KROGER_MOCK=true
export LOOPGPT_WALMART_MOCK=true
export LOOPGPT_ENABLE_KROGER=true
export LOOPGPT_ENABLE_WALMART=true

# Mock Supabase for tests
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="test-key"

# Track results
PASSED=0
FAILED=0
SKIPPED=0

# Function to run test file
run_test() {
  local test_file=$1
  local test_name=$(basename "$test_file" .test.ts)
  
  echo -n "Running $test_name... "
  
  if deno test --allow-all --quiet "$test_file" 2>&1 | tee /tmp/test_output.log | grep -q "ok"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
  elif grep -q "⏭️" /tmp/test_output.log; then
    echo -e "${YELLOW}⏭ SKIPPED${NC}"
    SKIPPED=$((SKIPPED + 1))
  else
    echo -e "${RED}✗ FAILED${NC}"
    cat /tmp/test_output.log
    FAILED=$((FAILED + 1))
  fi
}

# Run provider tests
echo "📦 Provider Tests"
echo "----------------"
run_test "commerce/providers/kroger.test.ts"
run_test "commerce/providers/walmart.test.ts"
echo ""

# Run router tests
echo "🔀 Router Tests"
echo "---------------"
run_test "commerce/router/router.test.ts"
echo ""

# Run E2E tests (only in staging)
if [ "$LOOPGPT_ENV" = "staging" ]; then
  echo "🌐 E2E Integration Tests"
  echo "------------------------"
  run_test "commerce/integration/e2e.test.ts"
  echo ""
else
  echo "⏭️  Skipping E2E tests (not in staging)"
  echo "   Set LOOPGPT_ENV=staging to run E2E tests"
  echo ""
fi

# Summary
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
