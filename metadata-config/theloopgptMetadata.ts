/**
 * TheLoopGPT Centralized Metadata Configuration
 * 
 * This file contains all metadata that powers:
 * - ChatGPT Apps SDK manifest (app identity, descriptions, routing)
 * - MCP tool descriptions (what ChatGPT sees when deciding to invoke tools)
 * - App Store submission metadata (titles, tags, keywords)
 * - Analytics event naming conventions
 * 
 * Version: 2.0.0
 * Last Updated: 2025-12-03
 */

import type {
  AppIdentity,
  AppTitles,
  SeasonalKeywords,
  TheLoopGPTMetadata,
  AppStoreSubmission,
  MCPToolManifest
} from "./types.ts";

// ============================================================================
// Part 1: App Identity & Branding
// ============================================================================

export const APP_IDENTITY: AppIdentity = {
  // Primary identifiers
  appId: "theloopgpt",
  displayName: "TheLoopGPT",
  shortName: "LoopGPT",
  
  // Version control for metadata changes
  METADATA_VERSION: "2.0.0",
  LAST_UPDATED: "2025-12-03",
  
  // Legacy internal names (for backward compatibility)
  legacyNames: {
    recipes: "LeftoverGPT",
    nutrition: "NutritionGPT", 
    tracking: "KCal GPT",
    planning: "MealPlannerGPT"
  },
  
  // URLs
  website: "https://theloopgpt.ai",
  statusPage: "https://status.theloopgpt.ai",
  supportEmail: "support@theloopgpt.ai"
} as const;

export const APP_TITLES: AppTitles = {
  primary: "TheLoopGPT — AI Cooking, Nutrition & Meal Planning Assistant",
  
  variants: [
    "TheLoopGPT — Turn Leftovers into Delicious Meals",
    "TheLoopGPT — Your AI Kitchen Companion",
    "TheLoopGPT — Meal Planning Made Effortless",
    "TheLoopGPT — From Fridge Chaos to Dinner Gold"
  ],
  
  subtitle: "Recipes • Nutrition • Calorie Tracking • Meal Plans • Grocery Lists"
} as const;

// ============================================================================
// Part 2: Descriptions
// ============================================================================

export const SHORT_DESCRIPTION = `All-in-one AI cooking assistant. Generate creative recipes from whatever's in your fridge, calculate nutrition and macros, track calories, build personalized meal plans, and create smart grocery lists. Your complete food ecosystem inside ChatGPT.`;

export const LONG_DESCRIPTION = `
## What TheLoopGPT Does

TheLoopGPT is an interconnected AI nutrition ecosystem that creates a complete feedback loop around your food journey:

**🍳 Creative Recipe Generation**
Tell me what's in your fridge — even random leftovers — and I'll generate delicious, practical recipes. Each recipe includes a "Chaos Rating" (1-10) showing how experimental the combination is. Perfect for reducing food waste and cooking on a budget.

**📊 Instant Nutrition Analysis**
Get detailed macro breakdowns for any recipe or meal. Supports 800,000+ foods, international ingredients, and multiple languages. Know exactly what you're eating.

**🧮 Effortless Calorie Tracking**
Log meals with natural language — just say "I had a chicken salad for lunch" and I'll handle the rest. Track daily calories, macros, and progress toward your goals. Streak tracking keeps you motivated.

**📅 Smart Meal Planning**
Generate personalized 7-day meal plans based on your calorie targets, dietary preferences (keto, vegan, high-protein), and budget. Plans automatically adjust based on what you actually eat.

**🛒 Intelligent Grocery Lists**
Turn any meal plan into an organized shopping list. Integrated with Instacart, Amazon Fresh, and other delivery services for one-tap ordering.

## The Closed Loop Advantage

Unlike standalone apps, TheLoopGPT creates a **closed feedback loop**:
Plan meals → Track what you eat → See your progress → Adjust your plan → Repeat

This is the complete nutrition system that competitors can't replicate.

## Perfect For

- Home cooks who want to reduce food waste
- Anyone tracking calories or macros for weight goals
- Busy professionals who need quick meal planning
- Fitness enthusiasts optimizing their nutrition
- Families managing weekly grocery budgets
- Anyone who's ever stared at their fridge wondering "what can I make?"
`;

// ============================================================================
// Part 3: Tags & Keywords
// ============================================================================

export const PRIMARY_TAGS = [
  "recipes",
  "cooking", 
  "nutrition",
  "calories",
  "macros",
  "meal planning",
  "grocery lists",
  "food tracking",
  "diet",
  "health"
] as const;

export const SECONDARY_TAGS = [
  "vegetarian",
  "vegan",
  "keto",
  "low carb",
  "high protein",
  "gluten free",
  "dairy free",
  "budget meals",
  "meal prep",
  "leftovers",
  "food waste",
  "weight loss",
  "muscle building",
  "TDEE",
  "CICO"
] as const;

export const SEARCH_KEYWORDS = [
  // Recipe intent
  "what can I cook with",
  "recipe for",
  "what to make with",
  "leftover recipes",
  "quick dinner ideas",
  "easy meals with",
  "what should I cook",
  
  // Nutrition intent
  "calories in",
  "how many calories",
  "macros for",
  "nutrition facts",
  "is this healthy",
  "protein in",
  "carbs in",
  
  // Planning intent
  "meal plan for",
  "weekly meal plan",
  "what to eat this week",
  "plan my meals",
  "diet plan",
  "eating schedule",
  
  // Tracking intent
  "track my food",
  "log my meal",
  "calorie counter",
  "food diary",
  "what I ate today",
  
  // Shopping intent
  "grocery list for",
  "shopping list",
  "what to buy",
  "ingredients I need",
  
  // Goal-based intent
  "lose weight",
  "build muscle",
  "eat healthier",
  "stay under calories",
  "hit my protein goal"
] as const;

export const SEASONAL_KEYWORDS: SeasonalKeywords = {
  winter: [
    "soup recipes",
    "comfort food",
    "slow cooker meals",
    "warm dishes",
    "holiday cooking"
  ],
  spring: [
    "light meals",
    "salad recipes",
    "fresh ingredients",
    "detox meals"
  ],
  summer: [
    "grilling recipes",
    "BBQ ideas",
    "no-cook meals",
    "cold dishes",
    "picnic food"
  ],
  fall: [
    "pumpkin recipes",
    "harvest meals",
    "thanksgiving planning",
    "apple recipes"
  ],
  
  // Time-of-day context
  timeOfDay: {
    morning: ["breakfast ideas", "quick breakfast", "meal prep breakfast"],
    afternoon: ["lunch recipes", "work lunch", "light lunch"],
    evening: ["dinner ideas", "quick dinner", "family dinner"],
    lateNight: ["snack ideas", "midnight snack", "light snack"]
  }
} as const;

export const DIFFERENTIATOR_KEYWORDS = [
  // vs SuperCook/MyFridgeFood (database-only)
  "AI generated recipes",
  "creative recipe ideas",
  "unique meal combinations",
  "not just database search",
  
  // vs MyFitnessPal (standalone tracking)
  "recipes AND tracking",
  "meal plan that adjusts",
  "connected nutrition system",
  "plan to plate to progress",
  
  // vs generic recipe apps
  "chaos rating",
  "leftover magic",
  "fridge to feast",
  "reduce food waste AI"
] as const;

// ============================================================================
// Main Metadata Export
// ============================================================================

/**
 * Complete TheLoopGPT metadata package
 * This is the main export that combines all metadata components
 */
export const THELOOPGPT_METADATA = {
  // Identity
  name: APP_IDENTITY.displayName,
  appId: APP_IDENTITY.appId,
  shortName: APP_IDENTITY.shortName,
  version: APP_IDENTITY.METADATA_VERSION,
  lastUpdated: APP_IDENTITY.LAST_UPDATED,
  
  // Titles
  tagline: APP_TITLES.primary,
  subtitle: APP_TITLES.subtitle,
  titleVariants: APP_TITLES.variants,
  
  // Descriptions
  shortDescription: SHORT_DESCRIPTION,
  longDescription: LONG_DESCRIPTION,
  
  // Keywords
  keywords: [
    ...PRIMARY_TAGS,
    ...SECONDARY_TAGS,
    ...SEARCH_KEYWORDS,
    ...DIFFERENTIATOR_KEYWORDS,
    ...SEASONAL_KEYWORDS.winter,
    ...SEASONAL_KEYWORDS.spring,
    ...SEASONAL_KEYWORDS.summer,
    ...SEASONAL_KEYWORDS.fall,
    ...SEASONAL_KEYWORDS.timeOfDay.morning,
    ...SEASONAL_KEYWORDS.timeOfDay.afternoon,
    ...SEASONAL_KEYWORDS.timeOfDay.evening,
    ...SEASONAL_KEYWORDS.timeOfDay.lateNight
  ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
  primaryTags: [...PRIMARY_TAGS],
  secondaryTags: [...SECONDARY_TAGS],
  searchKeywords: [...SEARCH_KEYWORDS],
  differentiatorKeywords: [...DIFFERENTIATOR_KEYWORDS],
  
  // Categories
  categories: [
    "Food & Drink",
    "Health & Fitness",
    "Lifestyle",
    "Productivity"
  ],
  
  // URLs
  website: APP_IDENTITY.website,
  statusPage: APP_IDENTITY.statusPage,
  supportEmail: APP_IDENTITY.supportEmail,
  
  // Legacy names
  legacyNames: APP_IDENTITY.legacyNames,
  
  // Feature highlights
  features: [
    "AI Recipe Generation from Leftovers",
    "800,000+ Food Nutrition Database",
    "Natural Language Calorie Tracking",
    "Personalized Meal Planning",
    "Smart Grocery Lists",
    "Weight Goal Tracking",
    "Macro Calculator",
    "Delivery Integration"
  ],
  
  // Use cases
  useCases: [
    "Reduce food waste by cooking with leftovers",
    "Track calories and macros for weight goals",
    "Plan weekly meals based on dietary preferences",
    "Calculate nutrition for any recipe",
    "Create organized grocery lists",
    "Monitor progress toward fitness goals"
  ],
  
  // Target users
  targetUsers: [
    "Home cooks",
    "Fitness enthusiasts",
    "Busy professionals",
    "Families",
    "Budget-conscious shoppers",
    "Health-conscious individuals"
  ]
} as const;

// ============================================================================
// Export Helper Functions
// ============================================================================

/**
 * Generate App Store submission metadata
 */
export function generateAppStoreSubmission(): AppStoreSubmission {
  return {
    appId: APP_IDENTITY.appId,
    displayName: APP_IDENTITY.displayName,
    shortDescription: SHORT_DESCRIPTION,
    longDescription: LONG_DESCRIPTION,
    primaryTags: [...PRIMARY_TAGS],
    secondaryTags: [...SECONDARY_TAGS],
    searchKeywords: [...SEARCH_KEYWORDS],
    website: APP_IDENTITY.website,
    supportEmail: APP_IDENTITY.supportEmail,
    version: APP_IDENTITY.METADATA_VERSION
  };
}

/**
 * Get all keywords for search optimization
 */
export function getAllKeywords(): string[] {
  const allKeywords = [
    ...PRIMARY_TAGS,
    ...SECONDARY_TAGS,
    ...SEARCH_KEYWORDS,
    ...DIFFERENTIATOR_KEYWORDS,
    ...SEASONAL_KEYWORDS.winter,
    ...SEASONAL_KEYWORDS.spring,
    ...SEASONAL_KEYWORDS.summer,
    ...SEASONAL_KEYWORDS.fall,
    ...SEASONAL_KEYWORDS.timeOfDay.morning,
    ...SEASONAL_KEYWORDS.timeOfDay.afternoon,
    ...SEASONAL_KEYWORDS.timeOfDay.evening,
    ...SEASONAL_KEYWORDS.timeOfDay.lateNight
  ];
  
  // Remove duplicates
  return [...new Set(allKeywords)];
}

/**
 * Get contextual keywords based on season and time
 */
export function getContextualKeywords(
  season?: "winter" | "spring" | "summer" | "fall",
  timeOfDay?: "morning" | "afternoon" | "evening" | "lateNight"
): string[] {
  const keywords: string[] = [];
  
  if (season) {
    keywords.push(...SEASONAL_KEYWORDS[season]);
  }
  
  if (timeOfDay) {
    keywords.push(...SEASONAL_KEYWORDS.timeOfDay[timeOfDay]);
  }
  
  return keywords;
}

/**
 * Get current season based on month
 */
export function getCurrentSeason(): "winter" | "spring" | "summer" | "fall" {
  const month = new Date().getMonth(); // 0-11
  
  if (month >= 11 || month <= 1) return "winter";
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  return "fall";
}

/**
 * Get current time of day
 */
export function getCurrentTimeOfDay(): "morning" | "afternoon" | "evening" | "lateNight" {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "lateNight";
}
