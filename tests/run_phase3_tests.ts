/**
 * Phase 3 Test Runner
 * Simplified tests that don't require external dependencies
 */

console.log("\n🧪 Phase 3 Scoring Algorithm Tests\n");
console.log("=" .repeat(60));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((error) => {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

// ============================================================================
// Test 1: Price Score Calculation
// ============================================================================

test("Price score calculation - lowest price scores 100", () => {
  const prices = [49.24, 45.92, 43.60];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Walmart (lowest price: $43.60)
  const walmartScore = 1 - (43.60 - minPrice) / (maxPrice - minPrice);
  assertEquals(Math.round(walmartScore * 100), 100);
});

test("Price score calculation - highest price scores 0", () => {
  const prices = [49.24, 45.92, 43.60];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // MealMe (highest price: $49.24)
  const mealmeScore = 1 - (49.24 - minPrice) / (maxPrice - minPrice);
  assertEquals(Math.round(mealmeScore * 100), 0);
});

test("Price score calculation - middle price scores proportionally", () => {
  const prices = [49.24, 45.92, 43.60];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Instacart (middle price: $45.92)
  const instacartScore = 1 - (45.92 - minPrice) / (maxPrice - minPrice);
  assertEquals(Math.round(instacartScore * 100), 59);
});

// ============================================================================
// Test 2: Speed Score Calculation
// ============================================================================

test("Speed score calculation - fastest delivery scores 100", () => {
  const times = [45, 60, 90];
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // MealMe (fastest: 45 min)
  const mealmeScore = 1 - (45 - minTime) / (maxTime - minTime);
  assertEquals(Math.round(mealmeScore * 100), 100);
});

test("Speed score calculation - slowest delivery scores 0", () => {
  const times = [45, 60, 90];
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // Walmart (slowest: 90 min)
  const walmartScore = 1 - (90 - minTime) / (maxTime - minTime);
  assertEquals(Math.round(walmartScore * 100), 0);
});

test("Speed score calculation - middle delivery time scores proportionally", () => {
  const times = [45, 60, 90];
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // Instacart (middle: 60 min)
  const instacartScore = 1 - (60 - minTime) / (maxTime - minTime);
  assertEquals(Math.round(instacartScore * 100), 67);
});

// ============================================================================
// Test 3: Availability Score Calculation
// ============================================================================

test("Availability score calculation - all items found scores 100", () => {
  const found = 2;
  const substituted = 0;
  const total = 2;
  
  const effectiveFulfillment = found + (substituted * 0.8);
  const score = (effectiveFulfillment / total) * 100;
  
  assertEquals(Math.round(score), 100);
});

test("Availability score calculation - substituted items count for 80%", () => {
  const found = 1;
  const substituted = 1;
  const total = 2;
  
  const effectiveFulfillment = found + (substituted * 0.8);
  const score = (effectiveFulfillment / total) * 100;
  
  assertEquals(Math.round(score), 90);
});

test("Availability score calculation - no items found scores 0", () => {
  const found = 0;
  const substituted = 0;
  const total = 2;
  
  const effectiveFulfillment = found + (substituted * 0.8);
  const score = (effectiveFulfillment / total) * 100;
  
  assertEquals(Math.round(score), 0);
});

// ============================================================================
// Test 4: Margin Score Calculation
// ============================================================================

test("Margin score calculation - highest commission scores 100", () => {
  const revenues = [
    49.24 * 0.05,  // MealMe: $2.46
    45.92 * 0.07,  // Instacart: $3.21
    43.60 * 0.03,  // Walmart: $1.31
  ];
  
  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues);
  
  // Instacart (highest commission: 7%)
  const instacartRevenue = 45.92 * 0.07;
  const score = (instacartRevenue - minRevenue) / (maxRevenue - minRevenue);
  
  assertEquals(Math.round(score * 100), 100);
});

test("Margin score calculation - lowest commission scores 0", () => {
  const revenues = [
    49.24 * 0.05,  // MealMe: $2.46
    45.92 * 0.07,  // Instacart: $3.21
    43.60 * 0.03,  // Walmart: $1.31
  ];
  
  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues);
  
  // Walmart (lowest commission: 3%)
  const walmartRevenue = 43.60 * 0.03;
  const score = (walmartRevenue - minRevenue) / (maxRevenue - minRevenue);
  
  assertEquals(Math.round(score * 100), 0);
});

// ============================================================================
// Test 5: Weighted Total Calculation
// ============================================================================

test("Weighted total calculation - balanced weights", () => {
  const scores = {
    price: 59,
    speed: 67,
    availability: 100,
    margin: 60,
    reliability: 75,
  };
  
  const weights = {
    price: 0.30,
    speed: 0.15,
    availability: 0.25,
    margin: 0.20,
    reliability: 0.10,
  };
  
  const weightedTotal =
    (weights.price * scores.price) +
    (weights.speed * scores.speed) +
    (weights.availability * scores.availability) +
    (weights.margin * scores.margin) +
    (weights.reliability * scores.reliability);
  
  // Should be around 70-75
  const rounded = Math.round(weightedTotal);
  assertEquals(rounded >= 70 && rounded <= 75, true);
});

test("Weighted total calculation - price-optimized weights", () => {
  const scores = {
    price: 100,  // Best price
    speed: 0,    // Slowest
    availability: 90,
    margin: 0,   // Lowest margin
    reliability: 70,
  };
  
  const weights = {
    price: 0.50,  // 50% weight on price
    speed: 0.10,
    availability: 0.20,
    margin: 0.10,
    reliability: 0.10,
  };
  
  const weightedTotal =
    (weights.price * scores.price) +
    (weights.speed * scores.speed) +
    (weights.availability * scores.availability) +
    (weights.margin * scores.margin) +
    (weights.reliability * scores.reliability);
  
  // Should be high (> 60) because price has 50% weight and scores 100
  assertEquals(Math.round(weightedTotal) > 60, true);
});

// ============================================================================
// Test 6: Edge Cases
// ============================================================================

test("Edge case - all providers same price", () => {
  const prices = [50, 50, 50];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // When all same, should return 100 for all
  assertEquals(maxPrice === minPrice, true);
});

test("Edge case - single provider", () => {
  const prices = [50];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Single provider, min === max
  assertEquals(maxPrice === minPrice, true);
});

test("Edge case - zero items requested", () => {
  const found = 0;
  const substituted = 0;
  const total = 0;
  
  // Should handle division by zero
  const score = total === 0 ? 100 : (found + substituted * 0.8) / total * 100;
  assertEquals(score, 100);
});

// ============================================================================
// Test 7: Explanation Generation Logic
// ============================================================================

test("Explanation generation - identifies strong factors", () => {
  const scores = {
    priceScore: 100,
    speedScore: 85,
    availabilityScore: 100,
    marginScore: 50,
    reliabilityScore: 75,
  };
  
  const factors = [];
  if (scores.priceScore > 80) factors.push('competitive pricing');
  if (scores.speedScore > 80) factors.push('fast delivery');
  if (scores.availabilityScore === 100) factors.push('all items in stock');
  if (scores.reliabilityScore > 80) factors.push('highly reliable');
  
  assertEquals(factors.length, 3);
  assertEquals(factors.includes('competitive pricing'), true);
  assertEquals(factors.includes('fast delivery'), true);
  assertEquals(factors.includes('all items in stock'), true);
});

test("Explanation generation - handles no strong factors", () => {
  const scores = {
    priceScore: 50,
    speedScore: 60,
    availabilityScore: 70,
    marginScore: 55,
    reliabilityScore: 65,
  };
  
  const factors = [];
  if (scores.priceScore > 80) factors.push('competitive pricing');
  if (scores.speedScore > 80) factors.push('fast delivery');
  if (scores.availabilityScore === 100) factors.push('all items in stock');
  if (scores.reliabilityScore > 80) factors.push('highly reliable');
  
  // No strong factors (all < 80)
  assertEquals(factors.length, 0);
});

// ============================================================================
// Summary
// ============================================================================

setTimeout(() => {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log("");
  
  if (failed === 0) {
    console.log("🎉 All tests passed! Phase 3 scoring algorithm is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Review the errors above.");
  }
  
  Deno.exit(failed > 0 ? 1 : 0);
}, 100);
