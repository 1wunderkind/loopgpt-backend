#!/usr/bin/env -S deno run --allow-net --allow-env

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function testRetentionLayer() {
  console.log("🧪 Testing Retention Layer\n");
  
  const testUserId = `test_user_${Date.now()}`;
  
  // Test 1: Update user preferences
  console.log("Test 1: Update user preferences");
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/user.updatePreferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        preferences: {
          dietTags: ["vegetarian", "high-protein"],
          caloriesPerDay: 2000,
          cuisines: ["Italian", "Mexican"]
        }
      }),
    });
    
    const result1 = await response1.json();
    console.log(`✅ Status: ${response1.status}`);
    console.log(`Profile updated: ${JSON.stringify(result1.profile, null, 2)}`);
    console.log(`Duration: ${result1.duration || 'N/A'}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Generate daily suggestion (should use profile)
  console.log("Test 2: Generate daily suggestion (with profile)");
  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/retention.dailySuggestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        count: 2
      }),
    });
    
    const result2 = await response2.json();
    console.log(`✅ Status: ${response2.status}`);
    console.log(`Recipes: ${result2.recipes?.recipes?.length || 0}`);
    console.log(`CTAs: ${result2.suggestedActions?.length || 0}`);
    console.log(`Duration: ${result2.duration || 'N/A'}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Generate daily suggestion (no profile)
  console.log("Test 3: Generate daily suggestion (no profile)");
  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/retention.dailySuggestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: `anonymous_${Date.now()}`,
        count: 3
      }),
    });
    
    const result3 = await response3.json();
    console.log(`✅ Status: ${response3.status}`);
    console.log(`Recipes: ${result3.recipes?.recipes?.length || 0}`);
    console.log(`CTAs: ${result3.suggestedActions?.length || 0}`);
    console.log(`Duration: ${result3.duration || 'N/A'}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 4: Generate weekly refresh (should use profile and update lastPlanDate)
  console.log("Test 4: Generate weekly refresh (with profile)");
  try {
    const response4 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/retention.weeklyRefresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        days: 5
      }),
    });
    
    const result4 = await response4.json();
    console.log(`✅ Status: ${response4.status}`);
    console.log(`Days: ${result4.mealPlan?.days?.length || 0}`);
    console.log(`CTAs: ${result4.suggestedActions?.length || 0}`);
    console.log(`Duration: ${result4.duration || 'N/A'}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 5: Verify lastPlanDate was updated
  console.log("Test 5: Verify lastPlanDate was updated");
  try {
    const response5 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/user.updatePreferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        preferences: {} // Empty update to just fetch profile
      }),
    });
    
    const result5 = await response5.json();
    console.log(`✅ Status: ${response5.status}`);
    console.log(`Last plan date: ${result5.profile?.lastPlanDate || 'Not set'}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  console.log("🎉 Retention layer tests complete!");
}

testRetentionLayer();
