/**
 * CTA (Call-to-Action) Schemas for Engagement Layer
 * 
 * Provides structured follow-up actions that encourage users to explore
 * more features and create a natural flow through the app.
 */

/**
 * Action type for CTAs
 */
export type CtaActionType = "TOOL_CALL" | "PARAM_CHANGE" | "NAVIGATE";

/**
 * CTA (Call-to-Action) structure
 */
export interface Cta {
  id: string;
  label: string;
  description?: string;
  actionType: CtaActionType;
  payload: any;
  icon?: string; // Optional emoji or icon identifier
}

/**
 * Tool call payload structure
 */
export interface ToolCallPayload {
  tool: string;
  params: Record<string, any>;
}

/**
 * Helper function to create a tool call CTA
 */
export function createToolCallCta(
  id: string,
  label: string,
  tool: string,
  params: Record<string, any>,
  description?: string,
  icon?: string
): Cta {
  return {
    id,
    label,
    description,
    actionType: "TOOL_CALL",
    payload: {
      tool,
      params,
    } as ToolCallPayload,
    icon,
  };
}

/**
 * Helper function to create a parameter change CTA
 */
export function createParamChangeCta(
  id: string,
  label: string,
  paramChanges: Record<string, any>,
  description?: string,
  icon?: string
): Cta {
  return {
    id,
    label,
    description,
    actionType: "PARAM_CHANGE",
    payload: {
      action: "modify_params",
      changes: paramChanges,
    },
    icon,
  };
}

/**
 * Generate CTAs for recipe results
 */
export function generateRecipesCtas(
  recipes: any[],
  originalParams: Record<string, any>
): Cta[] {
  const ctas: Cta[] = [];
  
  // Extract ingredients from original params
  const ingredients = originalParams.ingredients || [];
  const dietaryTags = originalParams.dietary_restrictions || originalParams.dietaryTags || [];
  
  // CTA 1: Try another recipe (regenerate with same params)
  ctas.push(
    createToolCallCta(
      "try-another",
      "🔄 Try another recipe",
      "recipes.generate",
      {
        ingredients,
        count: originalParams.count || 3,
        dietary_restrictions: dietaryTags,
      },
      "Generate different recipes with the same ingredients"
    )
  );
  
  // CTA 2: Healthier version
  if (!dietaryTags.includes("healthy") && !dietaryTags.includes("low-fat")) {
    ctas.push(
      createToolCallCta(
        "healthier",
        "🥗 Make it healthier",
        "recipes.generate",
        {
          ingredients,
          count: originalParams.count || 3,
          dietary_restrictions: [...dietaryTags, "healthy", "low-fat"],
        },
        "Get healthier versions of these recipes"
      )
    );
  }
  
  // CTA 3: Higher protein
  if (!dietaryTags.includes("high-protein")) {
    ctas.push(
      createToolCallCta(
        "high-protein",
        "💪 Higher protein",
        "recipes.generate",
        {
          ingredients,
          count: originalParams.count || 3,
          dietary_restrictions: [...dietaryTags, "high-protein"],
        },
        "Get protein-rich versions of these recipes"
      )
    );
  }
  
  // CTA 4: Turn into meal plan
  ctas.push(
    createToolCallCta(
      "create-meal-plan",
      "📅 Turn into meal plan",
      "mealplan.generate",
      {
        days: 7,
        mealsPerDay: 3,
        goals: {
          dailyCalories: 2000,
          proteinGrams: 100,
          dietTags: dietaryTags,
        },
        seedRecipes: recipes.slice(0, 3).map((r: any) => r.id || r.name),
      },
      "Create a weekly meal plan using these recipes"
    )
  );
  
  // CTA 5: Generate grocery list
  ctas.push(
    createToolCallCta(
      "grocery-list",
      "🛒 Create grocery list",
      "grocery.list",
      {
        recipes: recipes.slice(0, 5), // Limit to first 5 recipes
      },
      "Generate shopping list for these recipes"
    )
  );
  
  return ctas;
}

/**
 * Generate CTAs for meal plan results
 */
export function generateMealPlanCtas(
  mealPlan: any,
  originalParams: Record<string, any>
): Cta[] {
  const ctas: Cta[] = [];
  
  const goals = originalParams.goals || {};
  const currentCalories = goals.dailyCalories || 2000;
  const currentProtein = goals.proteinGrams || 100;
  const dietTags = goals.dietTags || [];
  
  // CTA 1: Regenerate plan
  ctas.push(
    createToolCallCta(
      "regenerate",
      "🔄 Regenerate plan",
      "mealplan.generate",
      originalParams,
      "Generate a different meal plan with the same goals"
    )
  );
  
  // CTA 2: Increase protein
  ctas.push(
    createToolCallCta(
      "more-protein",
      "💪 Increase protein",
      "mealplan.generate",
      {
        ...originalParams,
        goals: {
          ...goals,
          proteinGrams: currentProtein + 30,
        },
      },
      `Increase daily protein to ${currentProtein + 30}g`
    )
  );
  
  // CTA 3: Fewer calories
  ctas.push(
    createToolCallCta(
      "fewer-calories",
      "🔥 Fewer calories",
      "mealplan.generate",
      {
        ...originalParams,
        goals: {
          ...goals,
          dailyCalories: Math.max(1200, currentCalories - 300),
        },
      },
      `Reduce daily calories to ${Math.max(1200, currentCalories - 300)}`
    )
  );
  
  // CTA 4: Generate grocery list
  ctas.push(
    createToolCallCta(
      "grocery-list",
      "🛒 Create grocery list",
      "grocery.list",
      {
        mealPlan: mealPlan,
      },
      "Generate shopping list for this meal plan"
    )
  );
  
  return ctas;
}

/**
 * Generate CTAs for grocery list results
 */
export function generateGroceryCtas(
  groceryList: any,
  originalParams: Record<string, any>
): Cta[] {
  const ctas: Cta[] = [];
  
  // CTA 1: Analyze nutrition
  if (originalParams.recipes && originalParams.recipes.length > 0) {
    ctas.push(
      createToolCallCta(
        "nutrition-analysis",
        "📊 Analyze nutrition",
        "nutrition.analyze",
        {
          recipes: originalParams.recipes,
        },
        "See nutritional breakdown of your grocery list"
      )
    );
  }
  
  // CTA 2: Modify list (placeholder for future feature)
  ctas.push({
    id: "modify-list",
    label: "✏️ Modify list",
    description: "Add or remove items from your list",
    actionType: "PARAM_CHANGE",
    payload: {
      action: "edit_grocery_list",
      groceryListId: groceryList.id,
    },
  });
  
  // CTA 3: View meal plan (if created from meal plan)
  if (originalParams.mealPlan) {
    ctas.push({
      id: "view-meal-plan",
      label: "📅 View meal plan",
      description: "Go back to the meal plan",
      actionType: "NAVIGATE",
      payload: {
        destination: "meal_plan",
        mealPlanId: originalParams.mealPlan.id,
      },
    });
  }
  
  return ctas;
}

/**
 * Generate CTAs for nutrition analysis results
 */
export function generateNutritionCtas(
  analyses: any[],
  originalParams: Record<string, any>
): Cta[] {
  const ctas: Cta[] = [];
  
  const recipes = originalParams.recipes || [];
  
  // CTA 1: Create meal plan
  if (recipes.length > 0) {
    ctas.push(
      createToolCallCta(
        "create-meal-plan",
        "📅 Create meal plan",
        "mealplan.generate",
        {
          days: 7,
          mealsPerDay: 3,
          goals: {
            dailyCalories: 2000,
            proteinGrams: 100,
          },
          seedRecipes: recipes.slice(0, 3).map((r: any) => r.id || r.name),
        },
        "Turn these recipes into a weekly meal plan"
      )
    );
  }
  
  // CTA 2: Generate grocery list
  if (recipes.length > 0) {
    ctas.push(
      createToolCallCta(
        "grocery-list",
        "🛒 Create grocery list",
        "grocery.list",
        {
          recipes: recipes,
        },
        "Generate shopping list for these recipes"
      )
    );
  }
  
  // CTA 3: Find healthier alternatives
  ctas.push(
    createToolCallCta(
      "healthier-alternatives",
      "🥗 Find healthier alternatives",
      "recipes.generate",
      {
        ingredients: ["seasonal ingredients"],
        count: 3,
        dietary_restrictions: ["healthy", "low-fat", "low-sodium"],
      },
      "Get healthier recipe suggestions"
    )
  );
  
  return ctas;
}

/**
 * Add CTAs to a response object
 */
export function addCtasToResponse<T>(
  response: T,
  ctas: Cta[]
): T & { suggestedActions: Cta[] } {
  return {
    ...response,
    suggestedActions: ctas,
  };
}
