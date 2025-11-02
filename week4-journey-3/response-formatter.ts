/**
 * Response Formatter for Journey 3 - Chef Recipes
 * 
 * Formats recipe responses with chef personality, affiliate links,
 * and shareable cards for viral growth.
 */

import {
  ChefName,
  formatChefPresentation,
  getChefIntro,
  getChefTips,
  getChefClosing,
  getChefEmoji,
} from "./chef-personalities.ts";

export interface RecipeIngredient {
  item: string;
  amount: string;
  have: boolean; // User already has this ingredient
}

export interface RecipeMacros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  title: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  cooking_time: number; // minutes
  servings: number;
  calories_per_serving: number;
  macros: RecipeMacros;
}

export interface AffiliateLink {
  item: string;
  affiliate_link: string;
  partner_name: string;
}

export interface ShareableCard {
  title: string;
  preview_text: string;
  share_url: string;
}

/**
 * Format complete recipe response with chef personality
 */
export function formatRecipeResponse(
  chef: ChefName,
  chaosLevel: number,
  recipe: Recipe,
  affiliateLinks: AffiliateLink[],
  shareableCard: ShareableCard
): string {
  const sections: string[] = [];

  // 1. Chef Presentation Header
  sections.push(formatChefPresentation(chef, recipe.title));
  sections.push("");

  // 2. Chef Intro
  const intro = getChefIntro(chef, chaosLevel);
  sections.push(intro);
  sections.push("");

  // 3. Ingredients Section
  sections.push("## What You'll Need");
  sections.push("");

  // Separate ingredients user has vs. needs
  const haveIngredients = recipe.ingredients.filter((i) => i.have);
  const needIngredients = recipe.ingredients.filter((i) => !i.have);

  if (haveIngredients.length > 0) {
    sections.push("### You Already Have:");
    haveIngredients.forEach((ing) => {
      sections.push(`- ${ing.item} - ${ing.amount}`);
    });
    sections.push("");
  }

  if (needIngredients.length > 0) {
    sections.push("### You'll Need to Grab:");
    needIngredients.forEach((ing) => {
      const affiliateLink = affiliateLinks.find((a) => a.item === ing.item);
      if (affiliateLink) {
        sections.push(
          `- ${ing.item} - ${ing.amount} → [Get it here](${affiliateLink.affiliate_link})`
        );
      } else {
        sections.push(`- ${ing.item} - ${ing.amount}`);
      }
    });
    sections.push("");
  }

  // 4. Instructions Section
  sections.push("## Let's Cook!");
  sections.push("");
  recipe.instructions.forEach((instruction, index) => {
    sections.push(`${index + 1}. ${instruction}`);
  });
  sections.push("");

  // 5. Chef's Tips
  const tips = getChefTips(chef, chaosLevel);
  if (tips.length > 0) {
    sections.push(`## ${getChefEmoji(chef, "tip")} Chef's Tips`);
    tips.forEach((tip) => {
      sections.push(`- ${tip}`);
    });
    sections.push("");
  }

  // 6. Nutrition Info
  sections.push("## Nutrition (per serving)");
  sections.push(`- **Calories:** ${recipe.calories_per_serving} kcal`);
  sections.push(
    `- **Protein:** ${recipe.macros.protein}g | **Carbs:** ${recipe.macros.carbs}g | **Fat:** ${recipe.macros.fat}g`
  );
  sections.push(
    `- **Servings:** ${recipe.servings} | **Time:** ${recipe.cooking_time} minutes`
  );
  sections.push("");

  // 7. Chef Closing
  const closing = getChefClosing(chef);
  sections.push(`> ${closing}`);
  sections.push("");

  // 8. Divider
  sections.push("---");
  sections.push("");

  // 9. Shareable Card CTA
  sections.push("💚 **Love this recipe?** Share it with friends!");
  sections.push(`[Copy shareable link](${shareableCard.share_url})`);
  sections.push("");

  // 10. Affiliate CTA (if missing ingredients)
  if (affiliateLinks.length > 0) {
    sections.push("🛒 **Missing ingredients?** Get everything delivered:");
    
    // Group by partner
    const partnerGroups = new Map<string, AffiliateLink[]>();
    affiliateLinks.forEach((link) => {
      if (!partnerGroups.has(link.partner_name)) {
        partnerGroups.set(link.partner_name, []);
      }
      partnerGroups.get(link.partner_name)!.push(link);
    });

    // Show top partner with link
    const topPartner = Array.from(partnerGroups.entries())[0];
    if (topPartner) {
      const [partnerName, links] = topPartner;
      sections.push(`**${partnerName}** - [Order now](${links[0].affiliate_link})`);
    }
  }

  return sections.join("\n");
}

/**
 * Format error response with chef personality
 */
export function formatErrorResponse(chef: ChefName, error: string): string {
  const errorMessages = {
    jamie: `Oh no! Something went wrong in the kitchen. ${error}\n\nDon't worry, let's try again!`,
    paul: `Ah, we've encountered a problem. ${error}\n\nLet's approach this with precision and try once more.`,
    gordon: `WHAT?! ${error}\n\nCome on, let's sort this out and try again!`,
  };

  return errorMessages[chef];
}

/**
 * Format "no active plan" message with chef personality
 */
export function formatNoActivePlanMessage(chef: ChefName): string {
  const messages = {
    jamie: `Hello! Before I can create a recipe for you, let's set up your meal plan first. Tell me about your goals and I'll help you get started!`,
    paul: `Bonjour! To create the perfect recipe, I need to understand your nutritional goals first. Shall we begin with your meal plan?`,
    gordon: `RIGHT! Before we start cooking, we need to know what we're working with. Tell me your goals and let's get your meal plan sorted!`,
  };

  return messages[chef];
}

/**
 * Format shareable card preview text
 */
export function formatShareableCardPreview(
  chef: ChefName,
  recipeName: string,
  cookingTime: number,
  calories: number
): string {
  const chefNames = {
    jamie: "Jamie Leftover",
    paul: "Paul Leftovuse",
    gordon: "Gordon Leftover-Slay",
  };

  return `${chefNames[chef]} made ${recipeName} - ${cookingTime} mins, ${calories} cal. Try it in ChatGPT!`;
}

/**
 * Format ingredient list for LeftoverGPT API
 */
export function formatIngredientsForAPI(ingredients: string[]): string {
  return ingredients.join(", ");
}

/**
 * Parse recipe from LeftoverGPT response
 */
export function parseLeftoverGPTRecipe(response: any): Recipe {
  // This will be implemented based on LeftoverGPT's actual response format
  // For now, return a structured recipe object
  return {
    title: response.title || "Delicious Leftover Creation",
    ingredients: response.ingredients || [],
    instructions: response.instructions || [],
    cooking_time: response.cooking_time || 30,
    servings: response.servings || 2,
    calories_per_serving: response.calories_per_serving || 400,
    macros: response.macros || { protein: 25, carbs: 40, fat: 15 },
  };
}

/**
 * Generate shareable URL for recipe
 */
export function generateShareableURL(recipeId: string): string {
  // This will be implemented with actual URL generation logic
  // For now, return a placeholder
  return `https://loopgpt.app/recipe/${recipeId}`;
}

/**
 * Format analytics summary
 */
export function formatAnalyticsSummary(
  toolCallId: string,
  durationMs: number,
  success: boolean
): string {
  return `Tool Call: ${toolCallId} | Duration: ${durationMs}ms | Success: ${success}`;
}

/**
 * Format missing ingredients list for affiliate routing
 */
export function formatMissingIngredientsForAffiliates(
  ingredients: RecipeIngredient[]
): string[] {
  return ingredients.filter((i) => !i.have).map((i) => i.item);
}

/**
 * Create recipe summary for database storage
 */
export function createRecipeSummary(recipe: Recipe, chef: ChefName, chaosLevel: number): any {
  return {
    title: recipe.title,
    chef_name: chef,
    chaos_level: chaosLevel,
    cooking_time: recipe.cooking_time,
    servings: recipe.servings,
    calories_per_serving: recipe.calories_per_serving,
    macros: recipe.macros,
    ingredient_count: recipe.ingredients.length,
    instruction_count: recipe.instructions.length,
  };
}

/**
 * Format recipe for social media sharing
 */
export function formatRecipeForSocialMedia(
  chef: ChefName,
  recipeName: string,
  cookingTime: number,
  calories: number
): string {
  const emojis = {
    jamie: "👨‍🍳",
    paul: "👨‍🍳",
    gordon: "👨‍🍳",
  };

  const chefNames = {
    jamie: "Jamie Leftover",
    paul: "Paul Leftovuse",
    gordon: "Gordon Leftover-Slay",
  };

  return `${emojis[chef]} ${chefNames[chef]} just made: ${recipeName}\n⏱️ ${cookingTime} min | 🔥 ${calories} cal\n\nTry it yourself in ChatGPT! #LoopGPT #LeftoverRecipes`;
}
