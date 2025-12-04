/**
 * Test Cache Matching
 * Verify that smart cache matching works with ingredient variations
 */

const MCP_TOOLS_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  Deno.exit(1);
}

// Test cases: variations that should match cached entries
const TEST_CASES = [
  {
    name: "Exact match",
    ingredients: ["chicken"],
    expectedCacheHit: true,
  },
  {
    name: "Chicken breast variation",
    ingredients: ["chicken breast"],
    expectedCacheHit: true,
  },
  {
    name: "Chicken thigh variation",
    ingredients: ["chicken thigh"],
    expectedCacheHit: true,
  },
  {
    name: "Fresh chicken variation",
    ingredients: ["fresh chicken"],
    expectedCacheHit: true,
  },
  {
    name: "Order variation (rice, chicken)",
    ingredients: ["rice", "chicken"],
    expectedCacheHit: true,
  },
  {
    name: "Order variation (chicken, rice)",
    ingredients: ["chicken", "rice"],
    expectedCacheHit: true,
  },
  {
    name: "Beef steak variation",
    ingredients: ["beef steak"],
    expectedCacheHit: true,
  },
  {
    name: "Ground beef variation",
    ingredients: ["ground beef"],
    expectedCacheHit: true,
  },
  {
    name: "Salmon fillet variation",
    ingredients: ["salmon fillet"],
    expectedCacheHit: true,
  },
  {
    name: "Fresh salmon variation",
    ingredients: ["fresh salmon"],
    expectedCacheHit: true,
  },
  {
    name: "Cherry tomatoes variation",
    ingredients: ["pasta", "cherry tomatoes", "basil"],
    expectedCacheHit: true,
  },
  {
    name: "Roma tomatoes variation",
    ingredients: ["pasta", "roma tomatoes", "basil"],
    expectedCacheHit: true,
  },
  {
    name: "White rice variation",
    ingredients: ["chicken", "white rice", "broccoli"],
    expectedCacheHit: true,
  },
  {
    name: "Brown rice variation",
    ingredients: ["chicken", "brown rice", "broccoli"],
    expectedCacheHit: true,
  },
  {
    name: "Uncached combination",
    ingredients: ["dragon fruit", "unicorn meat"],
    expectedCacheHit: false,
  },
];

async function callRecipesTool(ingredients: string[]) {
  const startTime = Date.now();
  
  const response = await fetch(`${MCP_TOOLS_URL}/tools/recipes.generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      ingredients,
      count: 3,
      dietary_restrictions: [],
    }),
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  
  // Cache hit if response is very fast (< 2 seconds)
  const wasCacheHit = duration < 2000;
  
  return { result, duration, wasCacheHit };
}

async function runTests() {
  console.log("=== Testing Smart Cache Matching ===\n");
  
  let totalTests = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let correctPredictions = 0;
  
  for (const testCase of TEST_CASES) {
    totalTests++;
    
    try {
      const { duration, wasCacheHit } = await callRecipesTool(testCase.ingredients);
      
      const status = wasCacheHit ? "✓ CACHE HIT" : "✗ CACHE MISS";
      const prediction = testCase.expectedCacheHit === wasCacheHit ? "✓" : "✗";
      
      if (wasCacheHit) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      
      if (testCase.expectedCacheHit === wasCacheHit) {
        correctPredictions++;
      }
      
      console.log(`${prediction} ${testCase.name}`);
      console.log(`   Ingredients: ${testCase.ingredients.join(", ")}`);
      console.log(`   ${status} (${duration}ms)`);
      console.log(`   Expected: ${testCase.expectedCacheHit ? "HIT" : "MISS"}, Got: ${wasCacheHit ? "HIT" : "MISS"}`);
      console.log();
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`✗ ${testCase.name}: ${error.message}\n`);
    }
  }
  
  console.log("=== Test Summary ===");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Cache Hits: ${cacheHits} (${((cacheHits / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Cache Misses: ${cacheMisses} (${((cacheMisses / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Correct Predictions: ${correctPredictions}/${totalTests} (${((correctPredictions / totalTests) * 100).toFixed(1)}%)`);
  console.log();
  
  if (correctPredictions === totalTests) {
    console.log("🎉 All tests passed! Smart cache matching is working perfectly.");
  } else {
    console.log("⚠️  Some tests failed. Review the results above.");
  }
}

runTests()
  .then(() => Deno.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    Deno.exit(1);
  });
