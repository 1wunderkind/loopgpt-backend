/**
 * Journey 5: Nutrition Analysis
 * 
 * Edge Function for logging food through photos, barcodes, or search.
 * Tracks calories/macros and monitors plan adherence.
 * 
 * Features:
 * - Photo-based food logging
 * - Barcode scanning (UPC/EAN)
 * - Manual food search
 * - Calorie/macro tracking
 * - Plan adherence monitoring
 * - Complete analytics tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
interface RequestBody {
  chatgpt_user_id: string;
  method: "photo" | "barcode" | "search";
  photo_url?: string;
  barcode?: string;
  search_query?: string;
  serving_size?: number;
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
}

interface FoodItem {
  name: string;
  brand?: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  serving_size: string;
  confidence?: number;
}

interface PlanAdherence {
  daily_target: number;
  consumed_today: number;
  remaining: number;
  percentage: number;
}

// Mock food recognition (will integrate with real API)
async function recognizeFood(photoUrl: string): Promise<FoodItem> {
  // TODO: Integrate with food recognition API
  // For now, return mock data
  return {
    name: "Grilled Chicken Breast",
    calories: 165,
    macros: { protein: 31, carbs: 0, fat: 3.6 },
    serving_size: "100g",
    confidence: 0.85,
  };
}

// Mock barcode lookup (will integrate with nutrition database)
async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  // TODO: Integrate with Open Food Facts or USDA database
  // For now, return mock data for common barcodes
  
  const mockDatabase: Record<string, FoodItem> = {
    "012345678901": {
      name: "Greek Yogurt",
      brand: "Chobani",
      calories: 100,
      macros: { protein: 17, carbs: 6, fat: 0 },
      serving_size: "150g",
    },
    "098765432109": {
      name: "Protein Bar",
      brand: "Quest",
      calories: 200,
      macros: { protein: 20, carbs: 21, fat: 9 },
      serving_size: "60g",
    },
  };

  return mockDatabase[barcode] || null;
}

// Mock food search (will integrate with nutrition API)
async function searchFood(query: string): Promise<FoodItem[]> {
  // TODO: Integrate with nutrition database API
  // For now, return mock results
  
  const mockResults: Record<string, FoodItem[]> = {
    "chicken": [
      {
        name: "Grilled Chicken Breast",
        calories: 165,
        macros: { protein: 31, carbs: 0, fat: 3.6 },
        serving_size: "100g",
      },
      {
        name: "Chicken Thigh",
        calories: 209,
        macros: { protein: 26, carbs: 0, fat: 11 },
        serving_size: "100g",
      },
    ],
    "rice": [
      {
        name: "White Rice (cooked)",
        calories: 130,
        macros: { protein: 2.7, carbs: 28, fat: 0.3 },
        serving_size: "100g",
      },
      {
        name: "Brown Rice (cooked)",
        calories: 112,
        macros: { protein: 2.6, carbs: 24, fat: 0.9 },
        serving_size: "100g",
      },
    ],
  };

  const lowerQuery = query.toLowerCase();
  for (const [key, results] of Object.entries(mockResults)) {
    if (lowerQuery.includes(key)) {
      return results;
    }
  }

  // Default result if no match
  return [
    {
      name: query,
      calories: 200,
      macros: { protein: 10, carbs: 25, fat: 8 },
      serving_size: "100g",
    },
  ];
}

// Calculate plan adherence
async function calculateAdherence(
  supabase: any,
  userId: string,
  newCalories: number
): Promise<PlanAdherence> {
  // Get user's daily calorie target from active meal plan
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("daily_calorie_target")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  const dailyTarget = plan?.daily_calorie_target || 2000;

  // Get today's consumed calories from meal_logs
  const today = new Date().toISOString().split("T")[0];
  const { data: logs } = await supabase
    .from("meal_logs")
    .select("calories")
    .eq("user_id", userId)
    .gte("logged_at", `${today}T00:00:00`)
    .lt("logged_at", `${today}T23:59:59`);

  const consumedToday = (logs || []).reduce((sum: number, log: any) => sum + (log.calories || 0), 0);
  const totalWithNew = consumedToday + newCalories;
  const remaining = Math.max(0, dailyTarget - totalWithNew);
  const percentage = Math.round((totalWithNew / dailyTarget) * 100);

  return {
    daily_target: dailyTarget,
    consumed_today: totalWithNew,
    remaining,
    percentage,
  };
}

// Response Formatting
function formatResponse(
  foodItem: FoodItem,
  adherence: PlanAdherence,
  method: string
): string {
  const sections: string[] = [];

  sections.push("# 🍎 Food Logged Successfully");
  sections.push("");

  // Food details
  sections.push("## What You Ate");
  sections.push("");
  if (foodItem.brand) {
    sections.push(`**${foodItem.name}** by ${foodItem.brand}`);
  } else {
    sections.push(`**${foodItem.name}**`);
  }
  sections.push("");
  sections.push(`**Serving Size:** ${foodItem.serving_size}`);
  sections.push("");

  // Nutrition
  sections.push("### Nutrition");
  sections.push(`- **Calories:** ${foodItem.calories} kcal`);
  sections.push(`- **Protein:** ${foodItem.macros.protein}g`);
  sections.push(`- **Carbs:** ${foodItem.macros.carbs}g`);
  sections.push(`- **Fat:** ${foodItem.macros.fat}g`);
  sections.push("");

  // Confidence (for photo recognition)
  if (method === "photo" && foodItem.confidence) {
    const confidencePercent = Math.round(foodItem.confidence * 100);
    sections.push(`*Recognition confidence: ${confidencePercent}%*`);
    sections.push("");
  }

  sections.push("---");
  sections.push("");

  // Plan adherence
  sections.push("## 📊 Today's Progress");
  sections.push("");
  sections.push(`**Daily Target:** ${adherence.daily_target} kcal`);
  sections.push(`**Consumed:** ${adherence.consumed_today} kcal (${adherence.percentage}%)`);
  sections.push(`**Remaining:** ${adherence.remaining} kcal`);
  sections.push("");

  // Progress bar
  const barLength = 20;
  const filled = Math.round((adherence.consumed_today / adherence.daily_target) * barLength);
  const bar = "█".repeat(Math.min(filled, barLength)) + "░".repeat(Math.max(0, barLength - filled));
  sections.push(`\`${bar}\``);
  sections.push("");

  // Motivational message
  if (adherence.percentage < 80) {
    sections.push("💡 **Tip:** You're doing great! Keep tracking to stay on target.");
  } else if (adherence.percentage <= 100) {
    sections.push("🎯 **Nice!** You're right on track with your plan.");
  } else if (adherence.percentage <= 110) {
    sections.push("⚠️ **Heads up:** You're slightly over target, but that's okay! Tomorrow is a new day.");
  } else {
    sections.push("⚠️ **Over target:** Consider lighter meals for the rest of the day.");
  }

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
      method,
      photo_url,
      barcode,
      search_query,
      serving_size = 1,
      meal_type = "snack",
    } = body;

    // Validate
    if (!chatgpt_user_id || !method) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: chatgpt_user_id and method",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get food item based on method
    let foodItem: FoodItem;
    let searchResults: FoodItem[] = [];

    switch (method) {
      case "photo":
        if (!photo_url) {
          throw new Error("photo_url is required for photo method");
        }
        foodItem = await recognizeFood(photo_url);
        break;

      case "barcode":
        if (!barcode) {
          throw new Error("barcode is required for barcode method");
        }
        const barcodeResult = await lookupBarcode(barcode);
        if (!barcodeResult) {
          throw new Error(`Product not found for barcode: ${barcode}`);
        }
        foodItem = barcodeResult;
        break;

      case "search":
        if (!search_query) {
          throw new Error("search_query is required for search method");
        }
        searchResults = await searchFood(search_query);
        if (searchResults.length === 0) {
          throw new Error(`No results found for: ${search_query}`);
        }
        foodItem = searchResults[0]; // Use first result
        break;

      default:
        throw new Error(`Invalid method: ${method}`);
    }

    // Adjust for serving size
    if (serving_size !== 1) {
      foodItem.calories = Math.round(foodItem.calories * serving_size);
      foodItem.macros.protein = Math.round(foodItem.macros.protein * serving_size * 10) / 10;
      foodItem.macros.carbs = Math.round(foodItem.macros.carbs * serving_size * 10) / 10;
      foodItem.macros.fat = Math.round(foodItem.macros.fat * serving_size * 10) / 10;
    }

    // Calculate plan adherence
    const adherence = await calculateAdherence(supabase, chatgpt_user_id, foodItem.calories);

    // Log meal to database
    await supabase.from("meal_logs").insert({
      user_id: chatgpt_user_id,
      meal_type,
      food_name: foodItem.name,
      brand: foodItem.brand,
      calories: foodItem.calories,
      protein: foodItem.macros.protein,
      carbs: foodItem.macros.carbs,
      fat: foodItem.macros.fat,
      serving_size: foodItem.serving_size,
      source: method,
      confidence: foodItem.confidence,
    });

    // Format response
    const formattedResponse = formatResponse(foodItem, adherence, method);

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Log analytics
    const toolCallId = crypto.randomUUID();

    await supabase.from("tool_calls").insert({
      tool_call_id: toolCallId,
      tool_name: "journey_5_nutrition_analysis",
      user_id: chatgpt_user_id,
      input_params: {
        method,
        meal_type,
        has_photo: !!photo_url,
        has_barcode: !!barcode,
        has_search: !!search_query,
      },
      success: true,
      duration_ms: durationMs,
    });

    await supabase.from("user_events").insert({
      user_id: chatgpt_user_id,
      event_type: "meal_logged",
      event_data: {
        method,
        meal_type,
        calories: foodItem.calories,
        adherence_percentage: adherence.percentage,
      },
    });

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        food_item: foodItem,
        plan_adherence: adherence,
        search_results: searchResults.length > 1 ? searchResults : undefined,
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
    console.error("Error in journey_5_nutrition_analysis:", error);

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
