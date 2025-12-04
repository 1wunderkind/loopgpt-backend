/**
 * Commerce Layer Test Script
 * 
 * Tests pantry management, missing ingredient detection,
 * cart preparation, and integration with commerce router.
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
  expectedFields?: string[];
}

const tests: TestCase[] = [
  // Test 1: Grocery list without pantry (baseline)
  {
    name: "Grocery list without pantry",
    tool: "grocery.list",
    params: {
      recipes: [
        {
          id: "test-1",
          name: "Chicken Rice Bowl",
          ingredients: [
            { name: "chicken breast", quantity: "1 lb" },
            { name: "white rice", quantity: "2 cups" },
            { name: "soy sauce", quantity: "2 tbsp" },
          ],
        },
      ],
    },
    expectedFields: ["totalItems", "categories"],
  },
  
  // Test 2: Grocery list with pantry (missing ingredient detection)
  {
    name: "Grocery list with pantry - detect missing ingredients",
    tool: "grocery.list",
    params: {
      recipes: [
        {
          id: "test-2",
          name: "Pasta with Tomato Sauce",
          ingredients: [
            { name: "pasta", quantity: "1 lb" },
            { name: "tomatoes", quantity: "4" },
            { name: "garlic", quantity: "3 cloves" },
            { name: "olive oil", quantity: "2 tbsp" },
            { name: "basil", quantity: "1/4 cup" },
          ],
        },
      ],
      pantry: [
        { name: "pasta", quantity: "2 lbs" },
        { name: "garlic", quantity: "1 bulb" },
        { name: "olive oil", quantity: "1 bottle" },
      ],
    },
    expectedFields: ["totalItems", "categories", "missingSummary", "missingCount", "availableCount"],
  },
  
  // Test 3: Prepare cart from grocery list (mock commerce router)
  {
    name: "Prepare cart from grocery list",
    tool: "commerce.prepareCart",
    params: {
      userId: "test_user_123",
      groceryList: {
        id: "grocery-test-1",
        totalItems: 5,
        categories: [
          {
            name: "Produce",
            items: [
              { name: "tomatoes", quantity: "4", category: "Produce" },
              { name: "basil", quantity: "1/4 cup", category: "Produce" },
            ],
          },
        ],
        missingCount: 2,
      },
      location: {
        street: "123 Test St",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
      },
      preferences: {
        optimizeFor: "balanced",
      },
    },
    expectedFields: ["success", "provider", "quote", "scoreBreakdown", "confirmationToken"],
  },
  
  // Test 4: Prepare cart from recipes (no grocery list)
  {
    name: "Prepare cart from recipes directly",
    tool: "commerce.prepareCart",
    params: {
      userId: "test_user_456",
      recipes: [
        {
          id: "recipe-1",
          name: "Scrambled Eggs",
          ingredients: [
            { name: "eggs", quantity: "3" },
            { name: "butter", quantity: "1 tbsp" },
            { name: "milk", quantity: "2 tbsp" },
          ],
        },
      ],
      location: {
        street: "456 Test Ave",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
      },
      preferences: {
        optimizeFor: "price",
      },
    },
    expectedFields: ["success", "provider", "quote", "scoreBreakdown", "confirmationToken"],
  },
];

async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n=== Test: ${test.name} ===`);
  console.log(`Tool: ${test.tool}`);
  
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
    
    console.log(`Duration: ${duration}ms`);
    console.log(`Response keys: ${Object.keys(result).join(", ")}`);
    
    // Check expected fields
    if (test.expectedFields) {
      const missingFields = test.expectedFields.filter(field => !(field in result));
      if (missingFields.length > 0) {
        console.error(`❌ Missing expected fields: ${missingFields.join(", ")}`);
        return false;
      }
      console.log(`✅ All expected fields present`);
    }
    
    // Test-specific validations
    if (test.tool === "grocery.list" && test.params.pantry) {
      console.log(`\nMissing Ingredient Detection:`);
      console.log(`  Missing Summary: ${result.missingSummary || "N/A"}`);
      console.log(`  Missing Count: ${result.missingCount || 0}`);
      console.log(`  Available Count: ${result.availableCount || 0}`);
      
      if (result.missingCount !== undefined && result.availableCount !== undefined) {
        console.log(`✅ Missing ingredient detection working`);
      } else {
        console.log(`⚠️  Missing ingredient detection not working`);
      }
    }
    
    if (test.tool === "commerce.prepareCart") {
      console.log(`\nCommerce Router Response:`);
      console.log(`  Provider: ${result.provider || "N/A"}`);
      console.log(`  Total: $${result.quote?.total || "N/A"}`);
      console.log(`  Score: ${result.scoreBreakdown?.weightedTotal || "N/A"}`);
      console.log(`  Explanation: ${result.scoreBreakdown?.explanation || "N/A"}`);
      
      if (result.provider && result.quote && result.scoreBreakdown) {
        console.log(`✅ Commerce router integration working`);
      } else {
        console.log(`⚠️  Commerce router integration not working`);
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
  console.log("=== Commerce Layer Test Suite ===");
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
    await new Promise(resolve => setTimeout(resolve, 2000));
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
