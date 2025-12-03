/**
 * TheLoopGPT Routing Hints Configuration
 * 
 * This is the MOST CRITICAL section for ChatGPT tool invocation success.
 * Routing hints tell ChatGPT WHEN to invoke TheLoopGPT tools vs. answering generically.
 * 
 * Target Metrics:
 * - Tool invocation rate: >90% of food-related queries
 * - Correct tool selection: >95% accuracy
 * - False positive rate: <5%
 */

import type { RoutingMetadata } from "./types.ts";

export const ROUTING_METADATA: RoutingMetadata = {
  triggerHints: {
    // ========================================================================
    // RECIPE GENERATION
    // ========================================================================
    
    cooking_from_ingredients: {
      description: "User wants to cook something using specific ingredients they have",
      examples: [
        "What can I make with chicken, rice, and broccoli?",
        "I have eggs, cheese, and spinach — what should I cook?",
        "Recipe ideas for ground beef and pasta",
        "What can I do with these leftovers: salmon, quinoa, lemon?",
        "I only have canned beans, tortillas, and salsa",
        "Help me use up this leftover roast chicken",
        "What's a good recipe with ingredients I already have?",
        "Surprise me with a meal from: tofu, mushrooms, soy sauce",
        "Got some random stuff in my fridge — what can I make?",
        "I have potatoes, onions, and ground turkey"
      ],
      priority: "critical",
      confidence: 0.95,
      relatedTools: ["plan_generate_from_leftovers", "nutrition_analyze_food"]
    },
    
    creative_cooking: {
      description: "User wants creative or unusual recipe suggestions",
      examples: [
        "Give me a weird but tasty recipe",
        "What's a creative way to use peanut butter in dinner?",
        "Chaos level 8 recipe please",
        "Make something unexpected from my fridge",
        "I want to experiment — surprise me",
        "What's the craziest thing I can make with these ingredients?",
        "Give me a fusion recipe",
        "Something adventurous for dinner tonight"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["plan_generate_from_leftovers"]
    },

    // ========================================================================
    // NUTRITION ANALYSIS
    // ========================================================================
    
    calorie_query: {
      description: "User wants to know calorie or macro content of food",
      examples: [
        "How many calories in a chicken breast?",
        "What are the macros for this burrito?",
        "Calories in 2 eggs and toast",
        "Is this meal high in protein?",
        "Nutrition facts for Greek yogurt with honey",
        "How much protein is in salmon?",
        "Carbs in a banana?",
        "What's the calorie count for my lunch: salad with grilled chicken?",
        "Macro breakdown for oatmeal with berries",
        "How many calories in a slice of pizza?"
      ],
      priority: "critical",
      confidence: 0.95,
      relatedTools: ["nutrition_analyze_food", "food_search"]
    },
    
    recipe_nutrition: {
      description: "User wants nutrition info for a recipe or meal they're planning",
      examples: [
        "What are the macros for this pasta recipe?",
        "Calculate nutrition for: 200g chicken, 1 cup rice, vegetables",
        "How many calories if I make this stir fry?",
        "Is this recipe keto-friendly?",
        "Does this meal fit my protein goals?",
        "Nutrition for my homemade smoothie",
        "Will this recipe help me lose weight?"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["nutrition_analyze_food", "plan_generate_from_leftovers"]
    },
    
    food_comparison: {
      description: "User wants to compare nutritional values of different foods",
      examples: [
        "Which has more protein: chicken or tofu?",
        "Compare calories in brown rice vs white rice",
        "Is salmon or tuna better for protein?",
        "What's healthier: sweet potato or regular potato?",
        "Compare macros: Greek yogurt vs regular yogurt",
        "Which is lower carb: quinoa or cauliflower rice?"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["nutrition_compare_foods", "food_search"]
    },

    // ========================================================================
    // MEAL PLANNING
    // ========================================================================
    
    weekly_planning: {
      description: "User wants to plan meals for multiple days",
      examples: [
        "Plan my meals for the week",
        "Create a 7-day meal plan under 1800 calories",
        "What should I eat this week to lose weight?",
        "Make me a high-protein meal plan for 5 days",
        "I need a keto meal plan for the week",
        "Plan breakfast, lunch, and dinner for Monday through Friday",
        "Help me meal prep for the week",
        "Budget-friendly meal plan for a family of 4",
        "3-day meal plan for muscle building",
        "Weekly meal ideas under 2000 calories"
      ],
      priority: "critical",
      confidence: 0.95,
      relatedTools: ["plan_create_meal_plan", "nutrition_analyze_food"]
    },
    
    diet_specific_planning: {
      description: "User wants meal plans for specific dietary requirements",
      examples: [
        "Vegan meal plan with 100g protein per day",
        "Keto recipes for the week",
        "Gluten-free meal ideas",
        "Dairy-free dinner options",
        "Low-carb meals under 30g carbs",
        "Mediterranean diet meal plan",
        "Whole30 compliant recipes",
        "Paleo meal ideas",
        "High-protein vegetarian meals"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["plan_create_meal_plan", "plan_generate_from_leftovers"]
    },
    
    random_meal_suggestion: {
      description: "User wants a quick meal idea without specific constraints",
      examples: [
        "What should I have for dinner?",
        "Give me a lunch idea",
        "Random meal suggestion",
        "What's for breakfast?",
        "Quick dinner idea please",
        "Healthy snack suggestion"
      ],
      priority: "medium",
      confidence: 0.85,
      relatedTools: ["plan_random_meal"]
    },

    // ========================================================================
    // FOOD TRACKING
    // ========================================================================
    
    log_meal: {
      description: "User wants to log or record what they ate",
      examples: [
        "Log my breakfast: 2 eggs and toast",
        "I just had a chicken salad for lunch",
        "Track this meal for me",
        "Add to my food diary: protein shake, 300 calories",
        "Record dinner: steak, mashed potatoes, green beans",
        "I ate a slice of pizza, log it",
        "Track my snack: apple with peanut butter",
        "Log 200g grilled chicken and brown rice",
        "Add this to my calorie count",
        "I had a burrito bowl for lunch, track it"
      ],
      priority: "critical",
      confidence: 0.95,
      relatedTools: ["tracker_log_meal", "nutrition_analyze_food"]
    },
    
    progress_check: {
      description: "User wants to see their tracking progress or daily summary",
      examples: [
        "How many calories have I eaten today?",
        "What's my macro breakdown so far?",
        "Am I on track with my goals?",
        "Show me my food log for today",
        "How much protein have I had?",
        "Calories remaining for the day?",
        "What's my weekly average?",
        "Did I hit my protein goal today?",
        "Show my progress this week",
        "How am I doing with my diet?"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["tracker_summary", "tracker_get_progress"]
    },
    
    weight_tracking: {
      description: "User wants to log weight or check weight progress",
      examples: [
        "Log my weight: 165 lbs",
        "I weigh 75kg today",
        "Track my weight",
        "Record my current weight",
        "How much weight have I lost?",
        "Show my weight progress",
        "What's my weight trend?"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["tracker_log_weight", "tracker_get_progress"]
    },

    // ========================================================================
    // GROCERY & SHOPPING
    // ========================================================================
    
    grocery_list: {
      description: "User wants to create a shopping list",
      examples: [
        "Make a grocery list for this meal plan",
        "What ingredients do I need to buy?",
        "Shopping list for the week",
        "Turn these recipes into a grocery list",
        "What should I buy at the store?",
        "Create a shopping list under $100",
        "Ingredients I need for meal prep",
        "Generate shopping list from my meal plan"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["plan_create_meal_plan"]
    },
    
    food_ordering: {
      description: "User wants to order food or groceries for delivery",
      examples: [
        "Order these ingredients from Instacart",
        "Can you help me order groceries?",
        "Add this to my Amazon Fresh cart",
        "Order dinner delivery",
        "Find restaurants that deliver healthy meals",
        "Order ingredients for this recipe",
        "Get groceries delivered",
        "Find nearby restaurants"
      ],
      priority: "medium",
      confidence: 0.85,
      relatedTools: ["loopgpt_route_order", "delivery_search_restaurants"]
    },
    
    restaurant_search: {
      description: "User wants to find restaurants with specific criteria",
      examples: [
        "Find healthy restaurants near me",
        "Where can I get a high-protein meal nearby?",
        "Restaurants with keto options",
        "Find vegan places that deliver",
        "Healthy food delivery options"
      ],
      priority: "medium",
      confidence: 0.85,
      relatedTools: ["delivery_search_restaurants", "delivery_get_menu"]
    },

    // ========================================================================
    // GOALS & SETTINGS
    // ========================================================================
    
    set_goals: {
      description: "User wants to set or adjust nutrition/fitness goals",
      examples: [
        "Set my daily calories to 1800",
        "I want to lose 10 pounds",
        "My goal is to build muscle",
        "Change my protein target to 150g",
        "I'm doing a 1500 calorie diet",
        "Help me calculate my TDEE",
        "What should my macros be for weight loss?",
        "Set my weight goal to 160 lbs",
        "I want to gain weight healthily"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["user_set_weight_goal", "user_update_diet_preferences"]
    },
    
    diet_preferences: {
      description: "User wants to set dietary preferences or restrictions",
      examples: [
        "I'm vegetarian",
        "Set my diet to keto",
        "I'm allergic to shellfish",
        "I don't eat dairy",
        "Make me vegan meals",
        "I'm gluten intolerant",
        "Exclude nuts from my meals"
      ],
      priority: "high",
      confidence: 0.90,
      relatedTools: ["user_update_diet_preferences", "user_get_profile"]
    },

    // ========================================================================
    // LEFTOVER SPECIFIC
    // ========================================================================
    
    leftover_management: {
      description: "User specifically mentions leftovers or food waste",
      examples: [
        "I have leftover chicken from last night",
        "What can I do with these leftovers?",
        "Help me use up food before it goes bad",
        "I don't want to waste this — recipe ideas?",
        "Leftover rice recipes",
        "Creative ways to use leftover vegetables",
        "My fridge is full of random stuff — help!",
        "Leftover turkey ideas",
        "What to do with extra pasta?",
        "Use up leftovers before they spoil"
      ],
      priority: "critical",
      confidence: 0.95,
      relatedTools: ["plan_generate_from_leftovers"]
    },

    // ========================================================================
    // PREDICTIVE & INTELLIGENCE
    // ========================================================================
    
    outcome_prediction: {
      description: "User wants to predict weight change or diet outcomes",
      examples: [
        "Will I lose weight with this meal plan?",
        "Predict my weight in 30 days",
        "How long to reach my goal weight?",
        "Will this diet work for me?",
        "Estimate my weight loss timeline",
        "Can I lose 10 pounds in 2 months with this plan?"
      ],
      priority: "medium",
      confidence: 0.85,
      relatedTools: ["loop_predict_outcome", "loop_evaluate_plan"]
    },
    
    calorie_adjustment: {
      description: "User wants AI to adjust their calorie targets",
      examples: [
        "Should I eat more or less calories?",
        "Adjust my calories based on my progress",
        "I'm not losing weight — what should I change?",
        "Optimize my calorie intake",
        "Am I eating enough for my goals?"
      ],
      priority: "medium",
      confidence: 0.85,
      relatedTools: ["loop_adjust_calories", "loop_evaluate_plan"]
    }
  },

  // ==========================================================================
  // NEGATIVE ROUTING HINTS (When NOT to Invoke)
  // ==========================================================================
  
  negativeHints: [
    {
      description: "General cooking knowledge questions",
      examples: [
        "What temperature should I cook chicken to?",
        "How long do I boil eggs?",
        "What's the difference between baking and roasting?",
        "How do I know when pasta is done?",
        "What does 'sauté' mean?",
        "How to properly season cast iron?",
        "What's the best way to chop onions?"
      ],
      reason: "These are general knowledge questions that ChatGPT can answer directly without tool invocation"
    },
    {
      description: "Restaurant recommendations (non-delivery)",
      examples: [
        "What's a good Italian restaurant near me?",
        "Best sushi in New York",
        "Where should I eat tonight?",
        "Restaurant recommendations for date night",
        "Top-rated steakhouses",
        "Romantic dinner spots"
      ],
      reason: "TheLoopGPT focuses on home cooking and meal planning, not general restaurant discovery (unless ordering/delivery)"
    },
    {
      description: "Food science or history questions",
      examples: [
        "Why does bread rise?",
        "History of pizza",
        "How is cheese made?",
        "Why do onions make you cry?",
        "What is the Maillard reaction?",
        "Origin of sushi"
      ],
      reason: "Educational questions about food don't require tool invocation"
    },
    {
      description: "Non-food nutrition questions",
      examples: [
        "What supplements should I take?",
        "Is creatine safe?",
        "Best vitamins for energy",
        "Protein powder recommendations",
        "Should I take fish oil?",
        "Vitamin D dosage"
      ],
      reason: "TheLoopGPT focuses on food-based nutrition, not supplements"
    },
    {
      description: "Medical or allergy advice",
      examples: [
        "I'm allergic to nuts — is this safe?",
        "Can I eat this if I have diabetes?",
        "Food to avoid with high blood pressure",
        "What should I eat after surgery?",
        "Is this safe during pregnancy?",
        "Foods for kidney disease"
      ],
      reason: "Medical nutrition advice requires professional consultation, not AI tools"
    },
    {
      description: "Non-actionable food chat",
      examples: [
        "What's your favorite food?",
        "Do you like pizza?",
        "What's the best cuisine?",
        "Is pineapple on pizza good?",
        "What do you think of sushi?",
        "Do you prefer sweet or savory?"
      ],
      reason: "Casual conversation about food preferences doesn't require tool invocation"
    },
    {
      description: "Specific recipe lookups",
      examples: [
        "Give me a recipe for lasagna",
        "How do I make pad thai?",
        "Classic carbonara recipe",
        "Traditional beef stew recipe",
        "Authentic tikka masala"
      ],
      reason: "Specific named recipes can be answered directly without tools (unless user wants nutrition analysis or tracking)"
    },
    {
      description: "Kitchen equipment questions",
      examples: [
        "What's the best blender?",
        "Should I buy an air fryer?",
        "Knife recommendations",
        "Best stand mixer",
        "Do I need a food processor?"
      ],
      reason: "Equipment recommendations don't require TheLoopGPT tools"
    }
  ],

  // ==========================================================================
  // TOOL CHAINS (Multi-Tool Sequences)
  // ==========================================================================
  
  toolChains: [
    {
      name: "complete_meal_planning",
      description: "Full workflow from planning to shopping",
      sequence: [
        "plan_create_meal_plan",
        "nutrition_analyze_food"
      ],
      trigger: "User asks for a complete meal plan with shopping list"
    },
    {
      name: "recipe_to_tracking",
      description: "Generate recipe, get nutrition, log the meal",
      sequence: [
        "plan_generate_from_leftovers",
        "nutrition_analyze_food",
        "tracker_log_meal"
      ],
      trigger: "User wants to cook something AND track it"
    },
    {
      name: "leftover_rescue",
      description: "Turn leftovers into a proper meal with nutrition info",
      sequence: [
        "plan_generate_from_leftovers",
        "nutrition_analyze_food"
      ],
      trigger: "User has random ingredients and wants options"
    },
    {
      name: "goal_based_planning",
      description: "Set goals then create matching meal plan",
      sequence: [
        "user_set_weight_goal",
        "plan_create_meal_plan"
      ],
      trigger: "User wants to start a diet or change eating habits"
    },
    {
      name: "daily_check_in",
      description: "Log meal and see daily progress",
      sequence: [
        "tracker_log_meal",
        "tracker_summary"
      ],
      trigger: "User logs a meal and wants to know where they stand"
    },
    {
      name: "order_workflow",
      description: "Find restaurants, view menu, place order",
      sequence: [
        "delivery_search_restaurants",
        "delivery_get_menu",
        "loopgpt_route_order"
      ],
      trigger: "User wants to order food delivery"
    },
    {
      name: "progress_analysis",
      description: "Check progress and adjust plan",
      sequence: [
        "tracker_get_progress",
        "loop_evaluate_plan",
        "loop_adjust_calories"
      ],
      trigger: "User wants to review progress and optimize their plan"
    },
    {
      name: "nutrition_deep_dive",
      description: "Analyze food, compare alternatives, get recommendations",
      sequence: [
        "nutrition_analyze_food",
        "nutrition_compare_foods",
        "nutrition_get_recommendations"
      ],
      trigger: "User wants comprehensive nutrition analysis"
    }
  ]
};
