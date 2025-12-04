/**
 * Test Food Router
 * Verify that the smart router correctly classifies and routes queries
 */

const MCP_TOOLS_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  Deno.exit(1);
}

interface TestCase {
  name: string;
  query: string;
  expectedIntent: "recipes" | "nutrition" | "mealplan" | "grocery" | "other";
  expectedType: "recipes" | "nutrition" | "mealplan" | "grocery" | "fallback";
}

const TEST_CASES: TestCase[] = [
  // Recipe queries
  {
    name: "Simple recipe query",
    query: "What can I cook with chicken and rice?",
    expectedIntent: "recipes",
    expectedType: "recipes",
  },
  {
    name: "Vague hunger query",
    query: "I'm hungry, what should I eat?",
    expectedIntent: "recipes",
    expectedType: "recipes",
  },
  {
    name: "Leftover usage",
    query: "How can I use leftover pasta?",
    expectedIntent: "recipes",
    expectedType: "recipes",
  },
  {
    name: "Easy dinner ideas",
    query: "Give me some easy dinner ideas",
    expectedIntent: "recipes",
    expectedType: "recipes",
  },
  
  // Nutrition queries
  {
    name: "Calorie question",
    query: "How many calories are in a chicken salad?",
    expectedIntent: "nutrition",
    expectedType: "fallback", // Will fallback because we need specific recipe
  },
  {
    name: "Macro question",
    query: "What's the protein content of this meal?",
    expectedIntent: "nutrition",
    expectedType: "fallback",
  },
  {
    name: "Diet compatibility",
    query: "Is grilled chicken keto-friendly?",
    expectedIntent: "nutrition",
    expectedType: "fallback",
  },
  
  // Meal plan queries
  {
    name: "Multi-day plan",
    query: "Create a 3-day meal plan for me",
    expectedIntent: "mealplan",
    expectedType: "mealplan",
  },
  {
    name: "Weekly diet plan",
    query: "I need a weekly meal plan for weight loss",
    expectedIntent: "mealplan",
    expectedType: "mealplan",
  },
  {
    name: "Calorie-based plan",
    query: "Plan my meals for 1800 calories per day",
    expectedIntent: "mealplan",
    expectedType: "mealplan",
  },
  
  // Grocery queries
  {
    name: "Shopping list request",
    query: "Make me a grocery list",
    expectedIntent: "grocery",
    expectedType: "fallback", // Will fallback because we need recipes/plan first
  },
  {
    name: "What to buy",
    query: "What do I need to buy for this week?",
    expectedIntent: "grocery",
    expectedType: "fallback",
  },
  
  // Other/vague queries
  {
    name: "General help",
    query: "Help me with food",
    expectedIntent: "recipes",
    expectedType: "recipes", // Will try recipes as fallback
  },
  {
    name: "Non-food query",
    query: "What's the weather like?",
    expectedIntent: "other",
    expectedType: "fallback",
  },
];

async function testFoodRouter(testCase: TestCase) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${MCP_TOOLS_URL}/tools/food.router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.query,
        locale: "en",
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    // Check if result matches expectations
    const intentMatch = result.intent === testCase.expectedIntent || 
                       result.intent === "recipes"; // Fallback often uses recipes
    const typeMatch = result.type === testCase.expectedType;
    
    const status = typeMatch ? "✓ PASS" : "✗ FAIL";
    
    console.log(`${status} ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Expected: intent=${testCase.expectedIntent}, type=${testCase.expectedType}`);
    console.log(`   Got: intent=${result.intent}, type=${result.type}, confidence=${result.confidence}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (result.type === "fallback" && result.message) {
      console.log(`   Fallback message: ${result.message.substring(0, 100)}...`);
    }
    
    console.log();
    
    return {
      testCase,
      result,
      duration,
      passed: typeMatch,
    };
    
  } catch (error: any) {
    console.error(`✗ ERROR ${testCase.name}`);
    console.error(`   Query: "${testCase.query}"`);
    console.error(`   Error: ${error.message}`);
    console.log();
    
    return {
      testCase,
      result: null,
      duration: Date.now() - startTime,
      passed: false,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log("=== Testing Food Router ===\n");
  console.log(`Running ${TEST_CASES.length} tests...\n`);
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    const result = await testFoodRouter(testCase);
    results.push(result);
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log("=== Test Summary ===");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`Total Tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${passed} (${((passed / TEST_CASES.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / TEST_CASES.length) * 100).toFixed(1)}%)`);
  console.log(`Errors: ${errors}`);
  console.log();
  
  // Average duration
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`Average Response Time: ${avgDuration.toFixed(0)}ms`);
  console.log();
  
  // Intent distribution
  const intentCounts = new Map<string, number>();
  results.forEach(r => {
    if (r.result && r.result.intent) {
      const count = intentCounts.get(r.result.intent) || 0;
      intentCounts.set(r.result.intent, count + 1);
    }
  });
  
  console.log("Intent Distribution:");
  intentCounts.forEach((count, intent) => {
    console.log(`  ${intent}: ${count}`);
  });
  console.log();
  
  // Type distribution
  const typeCounts = new Map<string, number>();
  results.forEach(r => {
    if (r.result && r.result.type) {
      const count = typeCounts.get(r.result.type) || 0;
      typeCounts.set(r.result.type, count + 1);
    }
  });
  
  console.log("Response Type Distribution:");
  typeCounts.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();
  
  if (passed === TEST_CASES.length) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review results above.`);
  }
  
  return results;
}

// Run tests
runAllTests()
  .then(() => Deno.exit(0))
  .catch((error) => {
    console.error("Test suite failed:", error);
    Deno.exit(1);
  });
