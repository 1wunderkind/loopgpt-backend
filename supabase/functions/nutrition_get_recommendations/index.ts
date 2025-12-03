import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FoodResolver } from "../lib/food_resolver.ts";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";


// Nutrient mappings
const NUTRIENT_FIELDS: Record<string, string> = {
  "protein": "protein",
  "carbs": "carbs",
  "carbohydrates": "carbs",
  "fat": "fat",
  "fiber": "fiber",
  "calories": "calories",
  "energy": "calories"
};

const handler = async (req) => {
  try {
    const { nutrient_name } = await req.json();
    
    if (!nutrient_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing nutrient_name" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Normalize nutrient name
    const normalizedNutrient = nutrient_name.toLowerCase().trim();
    const field = NUTRIENT_FIELDS[normalizedNutrient];
    
    if (!field) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown nutrient: ${nutrient_name}. Try: protein, carbs, fat, fiber, calories`,
          supported_nutrients: Object.keys(NUTRIENT_FIELDS)
        }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Load food resolver
    const resolver = FoodResolver.getInstance();
    await resolver.load();
    
    // Get all foods and sort by nutrient content
    const allFoods = Array.from(resolver['foodsById'].values());
    const sorted = allFoods
      .filter(food => food[field] && food[field] > 0)
      .sort((a, b) => (b[field] || 0) - (a[field] || 0))
      .slice(0, 20); // Top 20
    
    const recommendations = sorted.map(food => ({
      name: food.name,
      [field]: food[field],
      group: food.group,
      serving: "100g"
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        nutrient: nutrient_name,
        field,
        count: recommendations.length,
        recommendations
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
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withStandardAPI(handler));

