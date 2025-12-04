/**
 * Reliability Layer Test Script
 * 
 * Tests graceful degradation and error handling
 */

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  Deno.exit(1);
}

interface TestCase {
  name: string;
  tool: string;
  params: any;
  expectFallback?: boolean;
}

const tests: TestCase[] = [
  // Test 1: Valid recipe request (should work)
  {
    name: "Valid recipe request",
    tool: "recipes.generate",
    params: {
      ingredients: ["chicken", "rice"],
      count: 2,
    },
    expectFallback: false,
  },
  
  // Test 2: Invalid recipe request (should use fallback)
  {
    name: "Invalid recipe request (missing ingredients)",
    tool: "recipes.generate",
    params: {
      count: 2,
      // Missing ingredients - should trigger validation error → fallback
    },
    expectFallback: true,
  },
  
  // Test 3: Valid router request (should work)
  {
    name: "Valid router request",
    tool: "food.router",
    params: {
      query: "What can I cook with eggs and cheese?",
    },
    expectFallback: false,
  },
  
  // Test 4: Invalid router request (should use fallback)
  {
    name: "Invalid router request (empty query)",
    tool: "food.router",
    params: {
      query: "",
      // Empty query - should trigger validation error → fallback
    },
    expectFallback: true,
  },
  
  // Test 5: Valid nutrition request (should work)
  {
    name: "Valid nutrition request",
    tool: "nutrition.analyze",
    params: {
      recipes: [
        {
          id: "test-1",
          name: "Scrambled Eggs",
          ingredients: [
            { name: "eggs", quantity: "3" },
            { name: "butter", quantity: "1 tbsp" },
          ],
          servings: 2,
        },
      ],
    },
    expectFallback: false,
  },
];

async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n=== Test: ${test.name} ===`);
  console.log(`Tool: ${test.tool}`);
  console.log(`Params:`, JSON.stringify(test.params, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/tools/${test.tool}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(test.params),
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ HTTP error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response: ${text}`);
      return false;
    }
    
    const result = await response.json();
    
    // Check if fallback was used
    const hasFallbackTag = JSON.stringify(result).includes("fallback");
    const usedFallback = hasFallbackTag || result.metadata?.fallback === true;
    
    console.log(`Duration: ${duration}ms`);
    console.log(`Used fallback: ${usedFallback}`);
    console.log(`Expected fallback: ${test.expectFallback || false}`);
    
    // Verify result structure
    if (Array.isArray(result)) {
      console.log(`✅ Returned array with ${result.length} items`);
    } else if (typeof result === "object") {
      console.log(`✅ Returned object with keys: ${Object.keys(result).join(", ")}`);
    }
    
    // Check if fallback expectation matches
    if (test.expectFallback !== undefined) {
      if (usedFallback === test.expectFallback) {
        console.log(`✅ Fallback behavior matches expectation`);
      } else {
        console.log(`⚠️  Fallback behavior doesn't match expectation`);
      }
    }
    
    return true;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Test failed: ${error.message}`);
    console.error(`Duration: ${duration}ms`);
    return false;
  }
}

async function main() {
  console.log("=== Reliability Layer Test Suite ===");
  console.log(`Testing: ${SUPABASE_URL}`);
  console.log(`Total tests: ${tests.length}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n=== Test Summary ===");
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log("\n✅ All tests passed!");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`);
  }
}

main();
