import { serve } from "std@0.168.0/http/server.ts";
import { FoodResolver } from "../_lib/food_resolver.ts";
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

const handler = async (req: Request) => {
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
    // Access private foods array via public method or property if available, otherwise use any cast for internal access
    const allFoods = (resolver as any).foods;
    
    // Map field names to nutrition object properties
    const nutritionFieldMap: Record<string, string> = {
      'protein': 'protein_g',
      'carbs': 'carbs_g',
      'fat': 'fat_g',
      'fiber': 'fiber_g',
      'calories': 'calories'
    };
    
    const nutritionField = nutritionFieldMap[field];
    
    const sorted = allFoods
      .filter((food: any) => food.nutrition[nutritionField] && food.nutrition[nutritionField] > 0)
      .sort((a: any, b: any) => (b.nutrition[nutritionField] || 0) - (a.nutrition[nutritionField] || 0))
      .slice(0, 20); // Top 20
    
    const recommendations = sorted.map((food: any) => ({
      name: food.name,
      [field]: food.nutrition[nutritionField],
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

