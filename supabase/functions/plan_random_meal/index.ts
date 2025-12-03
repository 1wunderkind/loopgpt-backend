import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FoodResolver } from "../lib/food_resolver.ts";
import { withHeavyOperation } from "../_shared/security/applyMiddleware.ts";


// Simple meal templates by type
const MEAL_TEMPLATES = {
  breakfast: [
    { name: "Oatmeal Bowl", base: "oatmeal", additions: ["banana", "almonds", "honey"] },
    { name: "Scrambled Eggs", base: "eggs", additions: ["spinach", "cheese", "toast"] },
    { name: "Greek Yogurt Parfait", base: "yogurt", additions: ["berries", "granola", "honey"] },
    { name: "Avocado Toast", base: "bread", additions: ["avocado", "eggs", "tomato"] }
  ],
  lunch: [
    { name: "Chicken Salad", base: "chicken breast", additions: ["lettuce", "tomato", "olive oil"] },
    { name: "Tuna Sandwich", base: "tuna", additions: ["bread", "lettuce", "mayo"] },
    { name: "Quinoa Bowl", base: "quinoa", additions: ["chickpeas", "vegetables", "tahini"] },
    { name: "Turkey Wrap", base: "turkey", additions: ["tortilla", "lettuce", "cheese"] }
  ],
  dinner: [
    { name: "Grilled Salmon", base: "salmon", additions: ["broccoli", "brown rice", "lemon"] },
    { name: "Chicken Stir-Fry", base: "chicken breast", additions: ["vegetables", "rice", "soy sauce"] },
    { name: "Beef Tacos", base: "ground beef", additions: ["tortilla", "lettuce", "cheese", "salsa"] },
    { name: "Pasta Primavera", base: "pasta", additions: ["vegetables", "olive oil", "parmesan"] }
  ],
  snack: [
    { name: "Apple & Peanut Butter", base: "apple", additions: ["peanut butter"] },
    { name: "Protein Shake", base: "protein powder", additions: ["banana", "milk", "oats"] },
    { name: "Trail Mix", base: "almonds", additions: ["walnuts", "raisins", "dark chocolate"] },
    { name: "Hummus & Veggies", base: "chickpeas", additions: ["carrots", "celery", "olive oil"] }
  ]
};

const handler = async (req) => {
  try {
    const { user_id, meal_type } = await req.json();
    
    if (!user_id || !meal_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing user_id or meal_type" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get random template for meal type
    const templates = MEAL_TEMPLATES[meal_type as keyof typeof MEAL_TEMPLATES] || MEAL_TEMPLATES.lunch;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Load food resolver to get nutrition data
    const resolver = FoodResolver.getInstance();
    await resolver.load();
    
    // Get nutrition for each ingredient
    const ingredients = [template.base, ...template.additions];
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    for (const ingredient of ingredients) {
      const food = resolver.findFuzzy(ingredient)[0];
      if (food) {
        nutrition.calories += food.calories || 0;
        nutrition.protein += food.protein || 0;
        nutrition.carbs += food.carbs || 0;
        nutrition.fat += food.fat || 0;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        meal: {
          name: template.name,
          type: meal_type,
          ingredients,
          nutrition,
          user_id
        }
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
serve(withHeavyOperation(handler));

