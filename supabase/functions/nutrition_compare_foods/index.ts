import { serve } from "std@0.168.0/http/server.ts";
import { FoodResolver } from "../_lib/food_resolver.ts";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";


const handler = async (req: Request) => {
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
        calories: foodA.nutrition.calories,
        protein: foodA.nutrition.protein_g,
        carbs: foodA.nutrition.carbs_g,
        fat: foodA.nutrition.fat_g,
        fiber: foodA.nutrition.fiber_g
      },
      food_b: {
        name: foodB.name,
        calories: foodB.nutrition.calories,
        protein: foodB.nutrition.protein_g,
        carbs: foodB.nutrition.carbs_g,
        fat: foodB.nutrition.fat_g,
        fiber: foodB.nutrition.fiber_g
      },
      differences: {
        calories: foodA.nutrition.calories - foodB.nutrition.calories,
        protein: foodA.nutrition.protein_g - foodB.nutrition.protein_g,
        carbs: foodA.nutrition.carbs_g - foodB.nutrition.carbs_g,
        fat: foodA.nutrition.fat_g - foodB.nutrition.fat_g,
        fiber: (foodA.nutrition.fiber_g || 0) - (foodB.nutrition.fiber_g || 0)
      },
      winner: {
        higher_protein: foodA.nutrition.protein_g > foodB.nutrition.protein_g ? food_a : food_b,
        lower_calories: foodA.nutrition.calories < foodB.nutrition.calories ? food_a : food_b,
        higher_fiber: (foodA.nutrition.fiber_g || 0) > (foodB.nutrition.fiber_g || 0) ? food_a : food_b
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withStandardAPI(handler));

