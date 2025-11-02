/**
 * Journey 4: Food Ordering with MealMe
 * 
 * Edge Function for searching restaurants and filtering menu items
 * by nutrition goals. Enables users to order meals that fit their plan
 * while generating affiliate revenue.
 * 
 * Features:
 * - Restaurant search by location
 * - Menu filtering by calories/macros
 * - Goal alignment scoring
 * - Affiliate link generation (MealMe)
 * - Complete analytics tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface RequestBody {
  chatgpt_user_id: string;
  location?: string; // "New York, NY" or will use user's stored location
  latitude?: number;
  longitude?: number;
  calorie_target?: number;
  macro_targets?: {
    protein_min?: number;
    carbs_max?: number;
    fat_max?: number;
  };
  cuisine_preference?: string;
  price_range?: "budget" | "moderate" | "premium";
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
  goal_type?: "weight_loss" | "muscle_gain" | "maintenance";
}

interface MenuItem {
  item_name: string;
  description: string;
  price: number;
  calories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface FilteredMenuItem extends MenuItem {
  goal_alignment_score: number;
  alignment_reasons: string[];
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  cuisine_type: string;
  rating: number;
  estimated_delivery_time: number;
  menu_items: FilteredMenuItem[];
  order_link: string;
}

// Menu Filtering Functions
function calculateGoalAlignment(
  item: MenuItem,
  calorieTarget?: number,
  macroTargets?: any
): number {
  if (!item.calories) return 20; // Low score for items without nutrition data

  let score = 100;

  // Calorie alignment (40% weight)
  if (calorieTarget) {
    const tolerance = 0.20; // 20% tolerance
    const maxDeviation = calorieTarget * tolerance;
    const calorieDeviation = Math.abs(item.calories - calorieTarget);
    
    if (calorieDeviation <= maxDeviation) {
      const calorieScore = 40 * (1 - calorieDeviation / maxDeviation);
      score -= (40 - calorieScore);
    } else {
      score -= 40;
    }
  }

  // Macro alignment (60% weight total)
  if (item.macros && macroTargets) {
    // Protein (30% weight)
    if (macroTargets.protein_min && item.macros.protein) {
      if (item.macros.protein >= macroTargets.protein_min) {
        const proteinScore = Math.min(item.macros.protein / macroTargets.protein_min, 1.5) * 20;
        score -= (30 - Math.min(proteinScore, 30));
      } else {
        const deficit = (macroTargets.protein_min - item.macros.protein) / macroTargets.protein_min;
        score -= 30 * deficit;
      }
    }

    // Carbs (20% weight)
    if (macroTargets.carbs_max && item.macros.carbs) {
      if (item.macros.carbs <= macroTargets.carbs_max) {
        score -= 0;
      } else {
        const excess = (item.macros.carbs - macroTargets.carbs_max) / macroTargets.carbs_max;
        score -= 20 * Math.min(excess, 1);
      }
    }

    // Fat (10% weight)
    if (macroTargets.fat_max && item.macros.fat) {
      if (item.macros.fat <= macroTargets.fat_max) {
        score -= 0;
      } else {
        const excess = (item.macros.fat - macroTargets.fat_max) / macroTargets.fat_max;
        score -= 10 * Math.min(excess, 1);
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getAlignmentReasons(
  item: MenuItem,
  calorieTarget?: number,
  macroTargets?: any,
  score?: number
): string[] {
  const reasons: string[] = [];

  if (!item.calories) {
    reasons.push("Nutrition data not available");
    return reasons;
  }

  // Calorie alignment
  if (calorieTarget) {
    const deviation = Math.abs(item.calories - calorieTarget);
    const percentDev = (deviation / calorieTarget) * 100;
    
    if (percentDev <= 10) {
      reasons.push("Perfect calorie match");
    } else if (percentDev <= 20) {
      reasons.push("Close to target");
    }
  }

  // Protein
  if (item.macros?.protein && macroTargets?.protein_min) {
    if (item.macros.protein >= macroTargets.protein_min * 1.2) {
      reasons.push("High protein");
    } else if (item.macros.protein >= macroTargets.protein_min) {
      reasons.push("Good protein");
    }
  }

  // Overall
  if (score && score >= 90) {
    reasons.unshift("Excellent fit");
  } else if (score && score >= 75) {
    reasons.unshift("Good fit");
  }

  return reasons;
}

// Mock restaurant search (will integrate with real MealMe API)
async function searchRestaurants(
  latitude: number,
  longitude: number,
  cuisine?: string
): Promise<any[]> {
  // TODO: Integrate with delivery_search_restaurants function
  // For now, return mock data
  
  const mockRestaurants = [
    {
      id: "rest-1",
      name: "Healthy Bowl Co",
      cuisine: "healthy",
      rating: 4.5,
      delivery_time: 25,
    },
    {
      id: "rest-2",
      name: "Protein Kitchen",
      cuisine: "american",
      rating: 4.7,
      delivery_time: 30,
    },
    {
      id: "rest-3",
      name: "Fresh Greens",
      cuisine: "salads",
      rating: 4.3,
      delivery_time: 20,
    },
  ];

  return mockRestaurants;
}

// Mock menu items (will integrate with real MealMe API)
function getMockMenuItems(restaurantId: string): MenuItem[] {
  const menus: Record<string, MenuItem[]> = {
    "rest-1": [
      {
        item_name: "Grilled Chicken Bowl",
        description: "Grilled chicken with quinoa, vegetables, and tahini",
        price: 12.99,
        calories: 520,
        macros: { protein: 45, carbs: 48, fat: 15 },
      },
      {
        item_name: "Salmon Power Bowl",
        description: "Atlantic salmon with brown rice and greens",
        price: 15.99,
        calories: 580,
        macros: { protein: 42, carbs: 52, fat: 20 },
      },
    ],
    "rest-2": [
      {
        item_name: "Protein Burger",
        description: "Lean beef patty with sweet potato fries",
        price: 13.99,
        calories: 650,
        macros: { protein: 48, carbs: 55, fat: 25 },
      },
      {
        item_name: "Chicken Caesar Salad",
        description: "Grilled chicken, romaine, parmesan, light dressing",
        price: 11.99,
        calories: 420,
        macros: { protein: 38, carbs: 25, fat: 18 },
      },
    ],
    "rest-3": [
      {
        item_name: "Mediterranean Salad",
        description: "Mixed greens, feta, olives, grilled chicken",
        price: 10.99,
        calories: 380,
        macros: { protein: 32, carbs: 28, fat: 16 },
      },
      {
        item_name: "Cobb Salad",
        description: "Chicken, bacon, egg, avocado, blue cheese",
        price: 12.99,
        calories: 550,
        macros: { protein: 40, carbs: 22, fat: 35 },
      },
    ],
  };

  return menus[restaurantId] || [];
}

// Generate affiliate link
function generateAffiliateLink(restaurantId: string, itemName: string): string {
  // TODO: Use real MealMe affiliate link generation
  return `https://mealme.ai/order/${restaurantId}?item=${encodeURIComponent(itemName)}&ref=loopgpt`;
}

// Response Formatting
function formatResponse(
  recommendations: Restaurant[],
  summary: any
): string {
  const sections: string[] = [];

  sections.push("# 🍽️ Restaurants That Fit Your Plan");
  sections.push("");
  sections.push(`Based on your nutrition goals, here are your best options:`);
  sections.push("");
  sections.push("---");
  sections.push("");

  // Show top 3 restaurants
  recommendations.slice(0, 3).forEach((rest, index) => {
    if (index === 0) {
      sections.push(`## 🏆 Best Match: ${rest.restaurant_name}`);
    } else {
      sections.push(`## ${index === 1 ? '🥗' : '🍴'} ${rest.restaurant_name}`);
    }
    
    sections.push("");
    sections.push(`**Rating:** ${"⭐".repeat(Math.floor(rest.rating))} ${rest.rating}/5 | **Cuisine:** ${rest.cuisine_type} | **Delivery:** ${rest.estimated_delivery_time} min`);
    sections.push("");
    sections.push("### Recommended Items:");
    sections.push("");

    // Show top items
    rest.menu_items.slice(0, 3).forEach((item, itemIndex) => {
      sections.push(`#### ${itemIndex + 1}. ${item.item_name} - ${item.goal_alignment_score}% Match`);
      sections.push(`- **Calories:** ${item.calories} kcal`);
      if (item.macros) {
        sections.push(`- **Protein:** ${item.macros.protein}g | **Carbs:** ${item.macros.carbs}g | **Fat:** ${item.macros.fat}g`);
      }
      sections.push(`- **Price:** $${item.price.toFixed(2)}`);
      if (item.alignment_reasons.length > 0) {
        sections.push(`- **Why it fits:** ${item.alignment_reasons.join(", ")}`);
      }
      sections.push("");
      sections.push(`[Order this meal →](${rest.order_link})`);
      sections.push("");
    });

    sections.push("---");
    sections.push("");
  });

  // Summary
  sections.push("## 📊 Summary");
  sections.push("");
  sections.push(`- **Restaurants found:** ${summary.total_restaurants}`);
  sections.push(`- **Matching items:** ${summary.total_matching_items}`);
  sections.push(`- **Best match:** ${summary.best_match}`);
  sections.push("");
  sections.push("💡 **Tip:** Ordering out doesn't mean giving up on your goals! These meals fit perfectly into your plan.");
  sections.push("");
  sections.push("🛒 **Powered by MealMe** - Real-time menus from DoorDash, Uber Eats, Grubhub, and more.");

  return sections.join("\n");
}

// Main Handler
serve(async (req) => {
  const startTime = Date.now();

  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Parse request
    const body: RequestBody = await req.json();
    const {
      chatgpt_user_id,
      latitude = 40.7128, // Default to NYC
      longitude = -74.0060,
      calorie_target,
      macro_targets,
      cuisine_preference,
      goal_type = "weight_loss",
    } = body;

    // Validate
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required field: chatgpt_user_id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search restaurants
    const restaurants = await searchRestaurants(latitude, longitude, cuisine_preference);

    // Process each restaurant's menu
    const recommendations: Restaurant[] = [];
    let totalMatchingItems = 0;

    for (const rest of restaurants) {
      const menuItems = getMockMenuItems(rest.id);
      const filteredItems: FilteredMenuItem[] = [];

      for (const item of menuItems) {
        const score = calculateGoalAlignment(item, calorie_target, macro_targets);
        
        if (score >= 60) { // Only include reasonable matches
          filteredItems.push({
            ...item,
            goal_alignment_score: score,
            alignment_reasons: getAlignmentReasons(item, calorie_target, macro_targets, score),
          });
        }
      }

      if (filteredItems.length > 0) {
        // Sort by score
        filteredItems.sort((a, b) => b.goal_alignment_score - a.goal_alignment_score);
        
        totalMatchingItems += filteredItems.length;

        recommendations.push({
          restaurant_id: rest.id,
          restaurant_name: rest.name,
          cuisine_type: rest.cuisine,
          rating: rest.rating,
          estimated_delivery_time: rest.delivery_time,
          menu_items: filteredItems,
          order_link: generateAffiliateLink(rest.id, filteredItems[0].item_name),
        });
      }
    }

    // Sort restaurants by best item score
    recommendations.sort((a, b) => 
      b.menu_items[0].goal_alignment_score - a.menu_items[0].goal_alignment_score
    );

    // Summary
    const summary = {
      total_restaurants: recommendations.length,
      total_matching_items: totalMatchingItems,
      best_match: recommendations[0]?.restaurant_name || "None",
    };

    // Format response
    const formattedResponse = formatResponse(recommendations, summary);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Log analytics
    const toolCallId = crypto.randomUUID();
    
    await supabase.from("tool_calls").insert({
      tool_call_id: toolCallId,
      tool_name: "journey_4_food_ordering",
      user_id: chatgpt_user_id,
      input_params: {
        calorie_target,
        has_macro_targets: !!macro_targets,
        cuisine_preference,
        goal_type,
        restaurant_count: recommendations.length,
        item_count: totalMatchingItems,
      },
      success: true,
      duration_ms: durationMs,
    });

    await supabase.from("user_events").insert({
      user_id: chatgpt_user_id,
      event_type: "food_ordering_search",
      event_data: {
        restaurants_found: recommendations.length,
        items_matched: totalMatchingItems,
        best_match_score: recommendations[0]?.menu_items[0]?.goal_alignment_score || 0,
      },
    });

    // Log affiliate performance
    if (recommendations.length > 0) {
      await supabase.from("affiliate_performance").insert({
        user_id: chatgpt_user_id,
        partner_id: "mealme",
        journey_name: "journey_4_food_ordering",
        impression_count: recommendations.length,
        click_count: 0,
        conversion_count: 0,
        revenue_usd: 0,
      });
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        summary,
        formatted_response: formattedResponse,
        analytics: {
          tool_call_id: toolCallId,
          duration_ms: durationMs,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("Error in journey_4_food_ordering:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: durationMs,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
