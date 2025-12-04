/**
 * Multi-Layer Cache Performance Test
 * 
 * Tests the performance improvements from L1 (memory) + L2 (Postgres) caching
 * 
 * Expected results:
 * - L1 hit: ~5-50ms (memory access)
 * - L2 hit: ~500-650ms (Postgres query)
 * - Miss: ~8-12s (OpenAI API)
 */

const MCP_TOOLS_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  Deno.exit(1);
}

interface TestResult {
  test: string;
  attempt: number;
  durationMs: number;
  source?: string;
  success: boolean;
}

/**
 * Test recipes.generate with same input multiple times
 */
async function testRecipesCache(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  const testInput = {
    ingredients: ["chicken", "rice", "broccoli"],
    dietary_restrictions: [],
    count: 3,
  };

  console.log("\n=== Testing recipes.generate Cache ===");
  console.log("Input:", JSON.stringify(testInput));
  console.log();

  // Run 3 times to test L1, L2, and repeated L1
  for (let i = 1; i <= 3; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${MCP_TOOLS_URL}/tools/recipes.generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(testInput),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      const testResult: TestResult = {
        test: "recipes.generate",
        attempt: i,
        durationMs: duration,
        source: "unknown", // We'll infer from duration
        success: true,
      };

      // Infer source from duration
      if (duration < 100) {
        testResult.source = "L1 (memory)";
      } else if (duration < 1000) {
        testResult.source = "L2 (Postgres)";
      } else {
        testResult.source = "compute (OpenAI)";
      }

      results.push(testResult);

      console.log(`Attempt ${i}: ${duration}ms - ${testResult.source}`);
      console.log(`  Recipes returned: ${result.length || result.recipes?.length || 0}`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      results.push({
        test: "recipes.generate",
        attempt: i,
        durationMs: duration,
        success: false,
      });
      console.error(`Attempt ${i}: ERROR - ${error.message}`);
    }

    // Small delay between attempts
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Test different tools to verify all are using multi-layer cache
 */
async function testAllToolsCache(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("\n=== Testing All Tools Cache ===\n");

  // Test nutrition.analyze
  console.log("Testing nutrition.analyze...");
  const nutritionInput = {
    recipes: [
      {
        id: "test-recipe-1",
        name: "Grilled Chicken",
        ingredients: [
          { name: "chicken breast", quantity: "200g" },
          { name: "olive oil", quantity: "1 tbsp" },
        ],
        servings: 2,
      },
    ],
  };

  for (let i = 1; i <= 2; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${MCP_TOOLS_URL}/tools/nutrition.analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(nutritionInput),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await response.json();
      
      const source = duration < 100 ? "L1" : duration < 1000 ? "L2" : "compute";
      results.push({
        test: "nutrition.analyze",
        attempt: i,
        durationMs: duration,
        source,
        success: true,
      });

      console.log(`  Attempt ${i}: ${duration}ms - ${source}`);
      
    } catch (error: any) {
      console.error(`  Attempt ${i}: ERROR - ${error.message}`);
    }

    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Test mealplan.generate
  console.log("\nTesting mealplan.generate...");
  const mealplanInput = {
    goals: {
      dailyCalories: 2000,
      proteinGrams: 100,
    },
    days: 3,
    mealsPerDay: 3,
  };

  for (let i = 1; i <= 2; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${MCP_TOOLS_URL}/tools/mealplan.generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(mealplanInput),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await response.json();
      
      const source = duration < 100 ? "L1" : duration < 1000 ? "L2" : "compute";
      results.push({
        test: "mealplan.generate",
        attempt: i,
        durationMs: duration,
        source,
        success: true,
      });

      console.log(`  Attempt ${i}: ${duration}ms - ${source}`);
      
    } catch (error: any) {
      console.error(`  Attempt ${i}: ERROR - ${error.message}`);
    }

    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Calculate and display performance summary
 */
function displaySummary(results: TestResult[]) {
  console.log("\n=== Performance Summary ===\n");

  // Group by test
  const byTest = new Map<string, TestResult[]>();
  results.forEach(r => {
    if (!byTest.has(r.test)) {
      byTest.set(r.test, []);
    }
    byTest.get(r.test)!.push(r);
  });

  byTest.forEach((testResults, testName) => {
    console.log(`${testName}:`);
    
    const successful = testResults.filter(r => r.success);
    if (successful.length === 0) {
      console.log("  No successful attempts");
      return;
    }

    const l1Results = successful.filter(r => r.source?.includes("L1"));
    const l2Results = successful.filter(r => r.source?.includes("L2"));
    const computeResults = successful.filter(r => r.source?.includes("compute"));

    if (l1Results.length > 0) {
      const avgL1 = l1Results.reduce((sum, r) => sum + r.durationMs, 0) / l1Results.length;
      console.log(`  L1 (memory) hits: ${l1Results.length} - avg ${avgL1.toFixed(0)}ms`);
    }

    if (l2Results.length > 0) {
      const avgL2 = l2Results.reduce((sum, r) => sum + r.durationMs, 0) / l2Results.length;
      console.log(`  L2 (Postgres) hits: ${l2Results.length} - avg ${avgL2.toFixed(0)}ms`);
    }

    if (computeResults.length > 0) {
      const avgCompute = computeResults.reduce((sum, r) => sum + r.durationMs, 0) / computeResults.length;
      console.log(`  Compute (OpenAI) calls: ${computeResults.length} - avg ${avgCompute.toFixed(0)}ms`);
    }

    // Calculate speedup
    if (l1Results.length > 0 && computeResults.length > 0) {
      const l1Avg = l1Results.reduce((sum, r) => sum + r.durationMs, 0) / l1Results.length;
      const computeAvg = computeResults.reduce((sum, r) => sum + r.durationMs, 0) / computeResults.length;
      const speedup = computeAvg / l1Avg;
      console.log(`  Speedup (L1 vs compute): ${speedup.toFixed(1)}x faster`);
    }

    console.log();
  });

  // Overall stats
  const allSuccessful = results.filter(r => r.success);
  const avgDuration = allSuccessful.reduce((sum, r) => sum + r.durationMs, 0) / allSuccessful.length;
  console.log(`Overall average response time: ${avgDuration.toFixed(0)}ms`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${allSuccessful.length}`);
  console.log(`Failed: ${results.length - allSuccessful.length}`);
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log("=== Multi-Layer Cache Performance Test ===");
  console.log(`Testing: ${MCP_TOOLS_URL}`);
  console.log();

  const allResults: TestResult[] = [];

  // Test 1: Recipes cache (3 attempts to test L1, L2, L1 again)
  const recipesResults = await testRecipesCache();
  allResults.push(...recipesResults);

  // Wait a bit before next test
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: All tools (2 attempts each to test cache)
  const allToolsResults = await testAllToolsCache();
  allResults.push(...allToolsResults);

  // Display summary
  displaySummary(allResults);

  console.log("\n✅ Performance tests complete!");
}

// Run tests
runPerformanceTests()
  .then(() => Deno.exit(0))
  .catch((error) => {
    console.error("Test suite failed:", error);
    Deno.exit(1);
  });
