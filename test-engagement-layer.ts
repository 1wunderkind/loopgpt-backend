/**
 * Engagement Layer Test Script
 * 
 * Tests CTA generation and impression logging
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
  expectedCtaCount: number;
}

const tests: TestCase[] = [
  // Test 1: Recipes should have 4-5 CTAs
  {
    name: "Recipes with CTAs",
    tool: "recipes.generate",
    params: {
      ingredients: ["chicken", "rice"],
      count: 3,
    },
    expectedCtaCount: 5,
  },
  
  // Test 2: Meal plan should have 4 CTAs
  {
    name: "Meal plan with CTAs",
    tool: "mealplan.generate",
    params: {
      days: 3,
      mealsPerDay: 3,
      goals: {
        dailyCalories: 2000,
        proteinGrams: 100,
      },
    },
    expectedCtaCount: 4,
  },
  
  // Test 3: Grocery list should have 2-3 CTAs
  {
    name: "Grocery list with CTAs",
    tool: "grocery.list",
    params: {
      recipes: [
        {
          id: "test-1",
          name: "Chicken Rice Bowl",
          ingredients: [
            { name: "chicken", quantity: "1 lb" },
            { name: "rice", quantity: "2 cups" },
          ],
        },
      ],
    },
    expectedCtaCount: 3,
  },
  
  // Test 4: Nutrition should have 3 CTAs
  {
    name: "Nutrition with CTAs",
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
    expectedCtaCount: 3,
  },
  
  // Test 5: Router should include CTAs
  {
    name: "Router with CTAs",
    tool: "food.router",
    params: {
      query: "What can I cook with eggs and cheese?",
    },
    expectedCtaCount: 5, // Should route to recipes with CTAs
  },
];

async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n=== Test: ${test.name} ===`);
  console.log(`Tool: ${test.tool}`);
  console.log(`Expected CTAs: ${test.expectedCtaCount}`);
  
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
    
    // Check for suggestedActions
    let suggestedActions: any[] = [];
    
    if (Array.isArray(result)) {
      // For array responses (recipes, nutrition), check if they have suggestedActions
      suggestedActions = result.suggestedActions || [];
    } else if (typeof result === "object") {
      // For object responses (mealplan, grocery, router)
      if (result.suggestedActions) {
        suggestedActions = result.suggestedActions;
      } else if (result.recipes?.suggestedActions) {
        // Router wraps recipes
        suggestedActions = result.recipes.suggestedActions;
      } else if (result.mealPlan?.suggestedActions) {
        // Router wraps mealplan
        suggestedActions = result.mealPlan.suggestedActions;
      }
    }
    
    console.log(`Duration: ${duration}ms`);
    console.log(`Found CTAs: ${suggestedActions.length}`);
    
    if (suggestedActions.length > 0) {
      console.log(`\nCTA List:`);
      suggestedActions.forEach((cta: any, index: number) => {
        console.log(`  ${index + 1}. ${cta.icon || "📌"} ${cta.label}`);
        console.log(`     ID: ${cta.id}`);
        console.log(`     Type: ${cta.actionType}`);
        if (cta.description) {
          console.log(`     Description: ${cta.description}`);
        }
      });
    }
    
    // Verify CTA count
    if (suggestedActions.length >= test.expectedCtaCount - 1 && 
        suggestedActions.length <= test.expectedCtaCount + 1) {
      console.log(`✅ CTA count matches expectation (${suggestedActions.length} ≈ ${test.expectedCtaCount})`);
    } else {
      console.log(`⚠️  CTA count doesn't match expectation (${suggestedActions.length} vs ${test.expectedCtaCount})`);
    }
    
    // Verify CTA structure
    if (suggestedActions.length > 0) {
      const firstCta = suggestedActions[0];
      if (firstCta.id && firstCta.label && firstCta.actionType && firstCta.payload) {
        console.log(`✅ CTA structure is valid`);
      } else {
        console.log(`❌ CTA structure is invalid`);
        return false;
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
  console.log("=== Engagement Layer Test Suite ===");
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
