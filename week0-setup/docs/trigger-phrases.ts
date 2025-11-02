// ============================================================================
// Trigger Phrase Library
// Purpose: Comprehensive list of user queries that should trigger each tool
// Usage: Reference when writing tool descriptions in MCP manifest
// ============================================================================

export const TRIGGER_PHRASES = {
  // ==========================================================================
  // JOURNEY 1: Onboarding & First Meal Plan
  // ==========================================================================
  plan_create_meal_plan: [
    // Direct meal plan requests
    "I want to lose weight",
    "Help me lose 15 pounds",
    "I need to lose weight",
    "Create a meal plan for me",
    "I want a meal plan",
    "Make me a meal plan",
    "Generate a meal plan",
    "I need a nutrition plan",
    "Help me eat healthier",
    "I want to eat better",
    "I need help with my diet",
    "What should I eat to lose weight",
    "How do I lose 10 pounds",
    "I want to get in shape",
    
    // Muscle gain
    "I want to gain muscle",
    "Help me build muscle",
    "I need to bulk up",
    "I want to get stronger",
    "Meal plan for muscle gain",
    
    // Maintenance
    "I want to maintain my weight",
    "Help me eat healthy",
    "I just want to be healthier",
    "I need balanced meals",
    
    // Indirect/conversational
    "I'm trying to lose weight",
    "I'm on a diet",
    "I need nutrition help",
    "What should I eat this week",
    "Plan my meals",
    "I want meal ideas",
    "Help me with food",
    "I don't know what to eat",
    "I need a food plan",
    "Can you help me with nutrition",
    
    // Goal-oriented
    "I have a wedding in 3 months",
    "I want to fit into my old jeans",
    "I need to lose weight for health",
    "My doctor said I should lose weight",
    "I want to feel better",
    
    // Time-based
    "What should I eat today",
    "Plan my week of meals",
    "I need meals for the week",
    "Weekly meal plan",
    "7-day meal plan"
  ],
  
  // ==========================================================================
  // JOURNEY 2: Weight Tracking & Adaptation
  // ==========================================================================
  loop_adjust_calories: [
    // Weight logging
    "I weighed 165 pounds today",
    "My weight is 170 lbs",
    "I'm 75 kg now",
    "I weighed myself today",
    "I'm down to 160",
    "I lost 2 pounds",
    "I gained a pound",
    "My current weight is 165",
    "I'm 165 pounds",
    "I weigh 170",
    "Log my weight",
    "Track my weight",
    "Update my weight",
    "Record my weight",
    
    // Progress mentions
    "I'm not losing weight",
    "I'm losing too fast",
    "The plan isn't working",
    "Should we adjust my calories",
    "How is my plan working",
    "Am I on track",
    "Check my progress",
    "How am I doing",
    
    // Week completion
    "I finished week 1",
    "Week 1 is done",
    "Ready for week 2",
    "What's next",
    "I completed the week"
  ],
  
  loop_evaluate_plan: [
    "How is my plan working",
    "Am I on track",
    "Check my progress",
    "Evaluate my results",
    "How am I doing",
    "Is this working",
    "Should I adjust anything",
    "Review my plan",
    "Analyze my progress"
  ],
  
  loop_predict_outcome: [
    "When will I reach my goal",
    "How long until I lose 15 pounds",
    "Predict my weight loss",
    "When will I hit my target",
    "How much will I lose this week",
    "What's my projected weight",
    "Forecast my progress"
  ],
  
  // ==========================================================================
  // JOURNEY 3: Chef Personas & Recipes
  // ==========================================================================
  plan_generate_from_leftovers: [
    // Leftover mentions
    "I have leftover chicken",
    "I have leftovers",
    "What can I make with leftovers",
    "I have leftover rice",
    "Use my leftovers",
    
    // Ingredient lists
    "I have chicken and rice",
    "I have chicken, rice, and vegetables",
    "What can I make with chicken and broccoli",
    "I have random ingredients",
    "I have some vegetables",
    "I have meat and veggies",
    
    // Recipe requests
    "Give me a recipe",
    "What can I cook",
    "Recipe ideas",
    "What should I make for dinner",
    "I need a recipe",
    "Help me cook something",
    "What can I make with these ingredients",
    "Turn these into a meal",
    "Make a recipe from this",
    
    // Chef-specific requests
    "Get Jamie to help",
    "Let Paul make something",
    "What would Gordon say",
    "I want a fun recipe",
    "Make it fancy",
    "Keep it simple"
  ],
  
  // ==========================================================================
  // JOURNEY 4: Food Ordering & Delivery
  // ==========================================================================
  delivery_search_restaurants: [
    // Direct ordering
    "I don't feel like cooking",
    "I want to order food",
    "Order food for me",
    "I want delivery",
    "Find restaurants near me",
    "What restaurants can I order from",
    "I want to eat out",
    "I'm too tired to cook",
    "Let's order in",
    
    // Cuisine-specific
    "I want Italian food",
    "Find me a pizza place",
    "I want Chinese food",
    "Mexican restaurants near me",
    "I'm craving Thai food",
    
    // Meal-specific
    "I need dinner delivered",
    "Order lunch for me",
    "I want breakfast delivered",
    
    // Convenience
    "I'm hungry now",
    "Quick food delivery",
    "Fast food near me",
    "What can I get delivered"
  ],
  
  delivery_place_order: [
    "Order this for me",
    "Place the order",
    "I'll take that",
    "Order the chicken bowl",
    "Get me that",
    "I want to order this",
    "Complete the order",
    "Checkout"
  ],
  
  // ==========================================================================
  // JOURNEY 5: Nutrition Analysis
  // ==========================================================================
  nutrition_analyze_food: [
    // Food analysis
    "How many calories in chicken breast",
    "What's in salmon",
    "Nutrition facts for rice",
    "Is chicken healthy",
    "Tell me about avocado",
    "Analyze this food",
    "What's the nutrition",
    "How healthy is this",
    "Calories in pizza",
    "Macros for steak"
  ],
  
  nutrition_compare_foods: [
    "Chicken vs salmon",
    "Which is better, rice or quinoa",
    "Compare chicken and turkey",
    "Is salmon healthier than chicken",
    "White rice vs brown rice",
    "Compare these foods",
    "Which should I eat",
    "What's the difference between"
  ],
  
  nutrition_get_macros: [
    "Macros for chicken breast",
    "How much protein in salmon",
    "Carbs in rice",
    "Fat in avocado",
    "Protein content",
    "Show me the macros",
    "Macro breakdown"
  ],
  
  nutrition_get_recommendations: [
    "What should I eat",
    "Food recommendations",
    "What's good for me",
    "Suggest foods",
    "What foods match my goals",
    "Recommend something healthy"
  ],
  
  // ==========================================================================
  // JOURNEY 6: Progress Visualization
  // ==========================================================================
  tracker_get_progress: [
    "Show my progress",
    "How much have I lost",
    "Weight history",
    "My weight trend",
    "Progress report",
    "How am I doing",
    "Show my results",
    "Weight loss progress",
    "Check my stats"
  ],
  
  // ==========================================================================
  // JOURNEY 7: Food Search
  // ==========================================================================
  food_search: [
    "Search for chicken",
    "Find chicken breast",
    "Look up salmon",
    "Search food database",
    "Find this food",
    "Look for broccoli",
    "Search for protein"
  ],
  
  // ==========================================================================
  // Location & Affiliate Functions
  // ==========================================================================
  get_user_location: [
    // Usually called automatically, but users might ask
    "Where am I",
    "What's my location",
    "Detect my location",
    "Find my location",
    "What country am I in"
  ],
  
  get_affiliate_links: [
    // Usually called automatically, but users might ask
    "Where can I buy groceries",
    "How do I get these ingredients",
    "Where should I shop",
    "Grocery delivery options",
    "Where can I order from",
    "Shopping options",
    "How do I get this food"
  ],
  
  // ==========================================================================
  // User Profile Functions
  // ==========================================================================
  user_get_profile: [
    "Show my profile",
    "What's my info",
    "My account",
    "My details",
    "User profile",
    "Account info"
  ],
  
  user_update_diet_preferences: [
    "I'm vegetarian",
    "I can't eat gluten",
    "I'm allergic to dairy",
    "Update my restrictions",
    "Change my diet preferences",
    "I'm vegan now",
    "Add dietary restriction",
    "I can't eat shellfish"
  ],
  
  user_set_weight_goal: [
    "My goal is 150 pounds",
    "I want to weigh 70 kg",
    "Set my target weight",
    "Change my goal",
    "Update my target",
    "My new goal is 160"
  ],
  
  // ==========================================================================
  // Billing Functions
  // ==========================================================================
  check_entitlement: [
    // Usually called automatically
    "Am I premium",
    "What's my subscription",
    "Do I have access",
    "Check my plan",
    "What features do I have"
  ],
  
  create_checkout_session: [
    "I want to upgrade",
    "Go premium",
    "Subscribe",
    "Buy premium",
    "Upgrade my account",
    "Get full access",
    "Unlock all features"
  ]
};

// ==========================================================================
// Negative Examples (What NOT to trigger on)
// ==========================================================================
export const NEGATIVE_EXAMPLES = {
  plan_create_meal_plan: [
    // These should NOT trigger meal plan creation
    "What is a meal plan", // Informational question
    "Tell me about meal planning", // General info
    "How do meal plans work", // Explanation request
    "Do you offer meal plans", // Yes/no question
    "I'm thinking about getting a meal plan" // Not committed yet
  ],
  
  loop_adjust_calories: [
    // These should NOT trigger calorie adjustment
    "What are calories", // Informational
    "How many calories should I eat", // General question
    "Tell me about calories" // Explanation request
  ],
  
  delivery_search_restaurants: [
    // These should NOT trigger restaurant search
    "What restaurants do you support", // Informational
    "Do you have delivery", // Yes/no question
    "Tell me about food delivery" // Explanation request
  ]
};

// ==========================================================================
// Edge Cases (Ambiguous queries that need clarification)
// ==========================================================================
export const EDGE_CASES = {
  ambiguous_goal: [
    "I want to be healthy", // Could be weight loss, maintenance, or muscle gain
    "Help me with food", // Too vague
    "I need help" // No context
  ],
  
  missing_info: [
    "Create a meal plan", // Missing: goal, weight, activity level
    "I want to lose weight", // Missing: current weight, target, timeline
    "Give me a recipe" // Missing: ingredients, preferences
  ],
  
  multi_intent: [
    "I want to lose weight and gain muscle", // Conflicting goals
    "Create a meal plan and order food", // Multiple actions
    "I'm 170 pounds and I don't feel like cooking" // Weight log + ordering
  ]
};
