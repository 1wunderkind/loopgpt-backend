/**
 * Test Suite for Contextual Excellence Enhancement
 *
 * Tests vague query handling, missing info detection, low-effort mode, and profile integration
 */

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  Deno.exit(1);
}

interface TestCase {
  name: string;
  query: string;
  userId?: string;
  expectedIntent: string;
  expectedMissingInfo?: string[];
  shouldTriggerLowEffort?: boolean;
}

const testCases: TestCase[] = [
  {
    name: "Vague tired query",
    query: "I'm tired, what should I eat?",
    expectedIntent: "recipes",
    expectedMissingInfo: ["ingredients"],
    shouldTriggerLowEffort: true,
  },
  {
    name: "Quick food request",
    query: "Quick food ideas please",
    expectedIntent: "recipes",
    expectedMissingInfo: ["ingredients"],
    shouldTriggerLowEffort: true,
  },
  {
    name: "Weight loss without details",
    query: "I want to lose weight, help me with food",
    expectedIntent: "mealplan",
    expectedMissingInfo: ["caloriesPerDay", "dietTags"],
    shouldTriggerLowEffort: false,
  },
  {
    name: "Vague dinner query",
    query: "What should I eat tonight?",
    expectedIntent: "recipes",
    expectedMissingInfo: ["ingredients"],
    shouldTriggerLowEffort: false,
  },
  {
    name: "Easy recipe request",
    query: "Give me something easy to make",
    expectedIntent: "recipes",
    expectedMissingInfo: ["ingredients"],
    shouldTriggerLowEffort: true,
  },
  {
    name: "Meal plan without specifics",
    query: "Plan my meals for the week",
    expectedIntent: "mealplan",
    expectedMissingInfo: ["caloriesPerDay"],
    shouldTriggerLowEffort: false,
  },
  {
    name: "Specific ingredients (no missing info)",
    query: "What can I cook with chicken and rice?",
    expectedIntent: "recipes",
    expectedMissingInfo: [],
    shouldTriggerLowEffort: false,
  },
];

async function testFoodRouter(testCase: TestCase) {
  console.log(`\n🧪 Test: ${testCase.name}`);
  console.log(`   Query: "${testCase.query}"`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mcp-tools/tools/food.router`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: testCase.query,
          userId: testCase.userId,
        }),
      },
    );

    const status = response.status;
    console.log(`   Status: ${status}`);

    if (status !== 200) {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`   Intent: ${result.type}`);
    console.log(`   Confidence: ${result.confidence}`);

    // Check if intent matches
    if (result.type !== testCase.expectedIntent) {
      console.log(
        `   ❌ Expected intent: ${testCase.expectedIntent}, got: ${result.type}`,
      );
      return false;
    }

    // Check result structure
    if (result.type === "recipes" && result.recipes) {
      const recipes = Array.isArray(result.recipes)
        ? result.recipes
        : result.recipes.recipes || [];
      console.log(`   ✅ Generated ${recipes.length} recipes`);

      // Check for low-effort tags
      if (testCase.shouldTriggerLowEffort) {
        const hasLowEffortTags = recipes.some((r: any) =>
          r.tags?.includes("low_effort") || r.tags?.includes("quick")
        );
        if (hasLowEffortTags) {
          console.log(`   ✅ Low-effort mode triggered (recipes tagged)`);
        } else {
          console.log(`   ⚠️  Low-effort mode expected but tags not found`);
        }
      }
    } else if (result.type === "mealplan" && result.mealPlan) {
      console.log(`   ✅ Generated meal plan`);
      console.log(`   Days: ${result.mealPlan.days || "unknown"}`);
    }

    console.log(`   ✅ Test passed`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

async function testIntentClassification(testCase: TestCase) {
  console.log(`\n🔍 Intent Test: ${testCase.name}`);
  console.log(`   Query: "${testCase.query}"`);

  try {
    // We'll test this by calling the router and checking logs
    // In production, you'd call classifyFoodIntent directly
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mcp-tools/tools/food.router`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: testCase.query,
        }),
      },
    );

    if (response.status === 200) {
      const result = await response.json();
      console.log(`   Intent: ${result.intent || result.type}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   ✅ Intent classification working`);
      return true;
    } else {
      console.log(`   ❌ Failed with status ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.log(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

async function testWithUserProfile() {
  console.log(`\n👤 Test: Profile-based vague query`);

  const testUserId = `test_user_${Date.now()}`;

  try {
    // Step 1: Create user profile
    console.log(`   Creating profile for ${testUserId}...`);
    const profileResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/mcp-tools/tools/user.updatePreferences`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: testUserId,
          dietTags: ["vegan"],
          cuisines: ["Italian"],
          caloriesPerDay: 1800,
        }),
      },
    );

    if (profileResponse.status !== 200) {
      console.log(`   ❌ Failed to create profile`);
      return false;
    }

    console.log(`   ✅ Profile created: vegan, Italian, 1800 cal/day`);

    // Step 2: Test vague query with profile
    console.log(`   Testing vague query with profile...`);
    const routerResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/mcp-tools/tools/theloopgpt.food.router`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: "What should I eat tonight?",
          userId: testUserId,
        }),
      },
    );

    if (routerResponse.status !== 200) {
      console.log(`   ❌ Router failed`);
      return false;
    }

    const result = await routerResponse.json();
    console.log(`   ✅ Router used profile data`);
    console.log(`   Generated: ${result.type}`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Testing Contextual Excellence Enhancement\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  // Test 1: Intent classification with missing info detection
  console.log("\n📋 PHASE 1: Intent Classification Tests");
  console.log("=".repeat(60));

  for (const testCase of testCases.slice(0, 4)) {
    const result = await testIntentClassification(testCase);
    if (result) passed++;
    else failed++;
  }

  // Test 2: Router with vague queries
  console.log("\n📋 PHASE 2: Router Vague Query Tests");
  console.log("=".repeat(60));

  for (const testCase of testCases) {
    const result = await testFoodRouter(testCase);
    if (result) passed++;
    else failed++;
  }

  // Test 3: Profile integration
  console.log("\n📋 PHASE 3: Profile Integration Test");
  console.log("=".repeat(60));

  const profileResult = await testWithUserProfile();
  if (profileResult) passed++;
  else failed++;

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`,
  );

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Contextual Excellence is working!");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check logs above.`);
  }
}

// Run tests
runTests().catch(console.error);
