import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FoodResolver } from "../lib/food_resolver.ts";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";


const handler = async (req) => {
  try {
    const { food_a, food_b } = await req.json();
    
    if (!food_a || !food_b) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing food_a or food_b" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Load food resolver
    const resolver = FoodResolver.getInstance();
    await resolver.load();
    
    // Find both foods
    const resultsA = resolver.findFuzzy(food_a);
    const resultsB = resolver.findFuzzy(food_b);
    
    if (resultsA.length === 0 || resultsB.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "One or both foods not found in database",
          found_a: resultsA.length > 0,
          found_b: resultsB.length > 0
        }),
        { headers: { "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    const foodA = resultsA[0];
    const foodB = resultsB[0];
    
    // Calculate differences
    const comparison = {
      food_a: {
        name: foodA.name,
        calories: foodA.calories,
        protein: foodA.protein,
        carbs: foodA.carbs,
        fat: foodA.fat,
        fiber: foodA.fiber
      },
      food_b: {
        name: foodB.name,
        calories: foodB.calories,
        protein: foodB.protein,
        carbs: foodB.carbs,
        fat: foodB.fat,
        fiber: foodB.fiber
      },
      differences: {
        calories: foodA.calories - foodB.calories,
        protein: foodA.protein - foodB.protein,
        carbs: foodA.carbs - foodB.carbs,
        fat: foodA.fat - foodB.fat,
        fiber: (foodA.fiber || 0) - (foodB.fiber || 0)
      },
      winner: {
        higher_protein: foodA.protein > foodB.protein ? food_a : food_b,
        lower_calories: foodA.calories < foodB.calories ? food_a : food_b,
        higher_fiber: (foodA.fiber || 0) > (foodB.fiber || 0) ? food_a : food_b
      }
    };
    
    return new Response(
      JSON.stringify({
        success: true,
        comparison
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withStandardAPI(handler));

