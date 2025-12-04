#!/usr/bin/env -S deno run --allow-net --allow-env

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function testSentimentLayer() {
  console.log("🧪 Testing Sentiment Layer\n");
  
  const testUserId = `test_user_${Date.now()}`;
  const testRecipeId = `recipe_${Date.now()}`;
  
  // Test 1: Record "Helpful" feedback
  console.log("Test 1: Record 'Helpful' feedback");
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "HELPFUL"
      }),
    });
    
    const result1 = await response1.json();
    console.log(`✅ Status: ${response1.status}`);
    console.log(`Response: ${JSON.stringify(result1, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Record "Not Helpful" feedback
  console.log("Test 2: Record 'Not Helpful' feedback");
  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: `${testUserId}_2`,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "NOT_HELPFUL"
      }),
    });
    
    const result2 = await response2.json();
    console.log(`✅ Status: ${response2.status}`);
    console.log(`Response: ${JSON.stringify(result2, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Record star rating
  console.log("Test 3: Record 5-star rating");
  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "RATED",
        rating: 5
      }),
    });
    
    const result3 = await response3.json();
    console.log(`✅ Status: ${response3.status}`);
    console.log(`Response: ${JSON.stringify(result3, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 4: Add to favorites
  console.log("Test 4: Add to favorites");
  try {
    const response4 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "FAVORITED",
        contentName: "Test Amazing Pasta Recipe",
        contentData: {
          prepTime: "30 min",
          difficulty: "easy"
        }
      }),
    });
    
    const result4 = await response4.json();
    console.log(`✅ Status: ${response4.status}`);
    console.log(`Response: ${JSON.stringify(result4, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 5: Get user's favorites
  console.log("Test 5: Get user's favorites");
  try {
    const response5 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.getFavorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId
      }),
    });
    
    const result5 = await response5.json();
    console.log(`✅ Status: ${response5.status}`);
    console.log(`Favorites count: ${result5.count || 0}`);
    console.log(`Favorites: ${JSON.stringify(result5.favorites || [], null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 6: Get content stats
  console.log("Test 6: Get content stats");
  try {
    const response6 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.getStats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        contentType: "recipe",
        contentId: testRecipeId
      }),
    });
    
    const result6 = await response6.json();
    console.log(`✅ Status: ${response6.status}`);
    console.log(`Stats: ${JSON.stringify(result6.stats || {}, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 7: Remove from favorites
  console.log("Test 7: Remove from favorites");
  try {
    const response7 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "UNFAVORITED"
      }),
    });
    
    const result7 = await response7.json();
    console.log(`✅ Status: ${response7.status}`);
    console.log(`Response: ${JSON.stringify(result7, null, 2)}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 8: Verify favorites removed
  console.log("Test 8: Verify favorites removed");
  try {
    const response8 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.getFavorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId
      }),
    });
    
    const result8 = await response8.json();
    console.log(`✅ Status: ${response8.status}`);
    console.log(`Favorites count: ${result8.count || 0}`);
    console.log(`Should be 0 after unfavoriting\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
  
  // Test 9: Invalid rating (should fail)
  console.log("Test 9: Invalid rating (should fail validation)");
  try {
    const response9 = await fetch(`${SUPABASE_URL}/functions/v1/mcp-tools/tools/feedback.sentiment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        contentType: "recipe",
        contentId: testRecipeId,
        eventType: "RATED",
        rating: 10 // Invalid - should be 1-5
      }),
    });
    
    const result9 = await response9.json();
    console.log(`Status: ${response9.status}`);
    console.log(`Expected error: ${JSON.stringify(result9, null, 2)}\n`);
  } catch (error) {
    console.error(`✅ Correctly failed: ${error.message}\n`);
  }
  
  console.log("🎉 Sentiment layer tests complete!");
}

testSentimentLayer();
