/**
 * Widget Type Definitions
 * 
 * Shared widget schemas for LoopGPT recipe generation.
 * Ported from LoopKitchen for integration into LoopGPT backend.
 */

/**
 * ShareMeta - Social sharing metadata for widgets
 * 
 * Enables widgets to be shared on social media with rich previews.
 * Used by the ShareButton component and create_share_snapshot tool.
 */
export interface ShareMeta {
  /** Whether sharing is enabled for this widget */
  enabled: boolean;

  /** Share title (e.g., "I just discovered 'Spicy Thai Basil Chicken' in LoopKitchen") */
  title: string;

  /** Share description (e.g., "Made from: chicken, basil, rice") */
  description: string;

  /** Canonical URL for this widget (e.g., "https://loopgpt.app/recipes/spicy-thai-basil-chicken") */
  canonicalUrl?: string;

  /** Preview image URL for social cards */
  previewImageUrl?: string;

  /** Suggested captions for social sharing */
  suggestedCaptions?: string[];
}

/**
 * WidgetBase - Base interface for all widgets
 */
export interface WidgetBase {
  /** Unique identifier for this widget instance */
  id: string;

  /** Widget type discriminator (used for type narrowing) */
  type: string;

  /** Social sharing metadata (optional) */
  share?: ShareMeta;
}

/**
 * RecipeCardCompact - Compact recipe card widget
 * 
 * Displays a recipe in a compact card format.
 * Used in recipe lists, search results, and carousels.
 */
export interface RecipeCardCompact extends WidgetBase {
  type: 'RecipeCardCompact';

  /** Recipe title (e.g., "Spicy Thai Basil Chicken") */
  title: string;

  /** Short description (1-2 sentences) */
  shortDescription?: string;

  /** Optional hero image URL */
  imageUrl?: string;

  /** Chaos rating from 1 (very calm) to 10 (very chaotic) */
  chaosRating: number;

  /** Total time in minutes (prep + cook) */
  timeMinutes: number;

  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Dietary tags (e.g., ["vegan", "gluten-free", "low-carb"]) */
  dietTags: string[];

  /** Primary ingredients used in this recipe */
  primaryIngredients?: string[];

  /** Vibes/moods this recipe matches */
  vibes?: string[];

  /** Flag: recipe exceeds user's requested time limit */
  overTimeLimit?: boolean;

  /** User's requested time limit (if any) */
  requestedTimeLimit?: number;

  /** Flag: recipe matches user's dietary constraints */
  matchesDiet?: boolean;

  /** User's requested dietary constraints (if any) */
  requestedDiet?: string | string[];
}

/**
 * RecipeCardDetailed - Detailed recipe card widget
 * 
 * Displays a recipe with full details including ingredients and instructions.
 * Used when viewing a single recipe.
 */
export interface RecipeCardDetailed extends WidgetBase {
  type: 'RecipeCardDetailed';

  /** Recipe title */
  title: string;

  /** Recipe description or tagline */
  description: string;

  /** Hero image URL */
  heroImageUrl?: string;

  /** Chaos rating from 1 (very calm) to 10 (very chaotic) */
  chaosRating: number;

  /** Total time in minutes (prep + cook) */
  timeMinutes: number;

  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Number of servings */
  servings: number;

  /** Ingredients the user already has */
  ingredientsHave: Array<{
    name: string;
    quantity: string;
  }>;

  /** Ingredients the user needs to buy */
  ingredientsNeed: Array<{
    name: string;
    quantity: string;
  }>;

  /** Step-by-step cooking instructions */
  instructions: string[];

  /** Optional pro tip or chef's note */
  proTip?: string;

  /** Dietary tags */
  dietTags: string[];
}

/**
 * WeekPlanner - Weekly meal plan widget
 * 
 * Displays a 7-day meal plan in a calendar grid format.
 * Used for meal planning and weekly organization.
 */
export interface WeekPlanner extends WidgetBase {
  type: 'WeekPlanner';

  /** Start date of the meal plan (YYYY-MM-DD) */
  startDate: string;

  /** Array of days with meals */
  days: Array<{
    /** ISO date string (e.g., "2025-12-05") */
    date: string;

    /** Day name (e.g., "Monday") */
    dayName: string;

    /** Meals for this day */
    meals: {
      breakfast: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
      lunch: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
      dinner: {
        recipeId: string;
        title: string;
        approxCalories: number;
      };
    };

    /** Total calories for this day */
    dayTotalCalories: number;
  }>;

  /** Weekly summary statistics */
  weeklySummary: {
    /** Average daily calories */
    avgDailyCalories: number;
    /** Total weekly calories */
    totalCalories: number;
    /** Notes about how this plan meets goals */
    notes: string;
  };
}

/**
 * NutritionSummary - Nutrition information widget
 * 
 * Displays nutritional information for a recipe or meal plan.
 * Shows both total and per-serving breakdowns.
 */
export interface NutritionSummary extends WidgetBase {
  type: 'NutritionSummary';

  /** Number of servings */
  servings: number;

  /** Total nutrition for all servings */
  totalNutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };

  /** Nutrition per serving */
  perServing: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
  };

  /** Dietary tags (e.g., ["high-protein", "low-carb", "vegetarian"]) */
  dietTags: string[];

  /** Confidence level of nutrition estimates */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * GroceryList - Shopping list widget
 * 
 * Displays a categorized grocery list with checkable items.
 * Used for meal plan shopping lists.
 */
export interface GroceryList extends WidgetBase {
  type: 'GroceryList';

  /** Categorized grocery items */
  categories: Array<{
    /** Category name (e.g., "Produce", "Dairy", "Meat") */
    name: string;

    /** Items in this category */
    items: Array<{
      /** Item name (e.g., "Chicken breast") */
      name: string;

      /** Quantity with unit (e.g., "2 lbs", "1 cup") */
      quantity: string;

      /** Whether the item has been checked off */
      checked: boolean;
    }>;
  }>;
}

/**
 * InfoMessage - Information/warning/error message widget
 * 
 * Used for displaying system messages, warnings, or errors to the user.
 */
export interface InfoMessage extends WidgetBase {
  type: 'InfoMessage';

  /** Message severity level */
  severity: 'info' | 'warning' | 'error';

  /** Message title */
  title: string;

  /** Message body text */
  body: string;
}

export interface CheckoutHandoffWidget extends WidgetBase {
  type: "CheckoutHandoffWidget";

  provider: {
    id: string;
    name: string;
    badgeText: string; // "Fulfilled by {providerName}"
  };

  summary: {
    itemCount: number;
    currency: string;
    subtotal?: number;
    deliveryFee?: number;
    tax?: number;
    total?: number;
  };

  cartPreview: Array<{
    name: string;
    quantity: number;
    unit?: string;
  }>;

  disclaimerText: string;

  actions: {
    reviewRequired: true;
    openConfirmationAction: {
      tool: "open_checkout_confirmation";
      args: { receiptId: string };
    };
  };

  support: {
    providerSupportUrl?: string;
    providerSupportText: string;
    loopSupportEmail: string;
    loopSupportText: string;
  };
}

export interface CheckoutConfirmationModalWidget extends WidgetBase {
  type: "CheckoutConfirmationModalWidget";

  provider: {
    id: string;
    name: string;
    badgeText: string; // "Fulfilled by {providerName}"
  };

  title: string; // "You’re being redirected to {providerName}"
  body: string;  // "You will complete checkout on {providerName} in a new tab."

  disclaimerText: string;

  receipt: {
    receiptId: string;
    itemCount: number;
    currency: string;
    total?: number;
  };

  actions: {
    cancel: { label: "Cancel" };
    proceedExternal: {
      label: "Continue to checkout";
      externalUrl: string;
      onProceedTool: {
        tool: "mark_handoff_opened";
        args: { receiptId: string };
      };
    };
  };

  support: {
    providerSupportUrl?: string;
    providerSupportText: string;
    loopSupportEmail: string;
    loopSupportText: string;
  };
}

/**
 * Widget - Union type of all widget types
 * 
 * Use this type for functions that can handle any widget.
 * TypeScript will narrow the type based on the `type` discriminator.
 */
export type Widget =
  | RecipeCardCompact
  | RecipeCardDetailed
  | WeekPlanner
  | NutritionSummary
  | GroceryList
  | InfoMessage
  | CheckoutHandoffWidget
  | CheckoutConfirmationModalWidget;

/**
 * Type guards for widget type checking
 */
export function isRecipeCardCompact(widget: Widget): widget is RecipeCardCompact {
  return widget.type === 'RecipeCardCompact';
}

export function isRecipeCardDetailed(widget: Widget): widget is RecipeCardDetailed {
  return widget.type === 'RecipeCardDetailed';
}

export function isWeekPlanner(widget: Widget): widget is WeekPlanner {
  return widget.type === 'WeekPlanner';
}

export function isNutritionSummary(widget: Widget): widget is NutritionSummary {
  return widget.type === 'NutritionSummary';
}

export function isGroceryList(widget: Widget): widget is GroceryList {
  return widget.type === 'GroceryList';
}

export function isInfoMessage(widget: Widget): widget is InfoMessage {
  return widget.type === 'InfoMessage';
}
