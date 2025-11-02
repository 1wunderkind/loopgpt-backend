/**
 * Journey 3: Chef Personas & Leftover Recipes
 * 
 * Edge Function for generating creative recipes using leftover ingredients
 * with distinct chef personalities (Jamie, Paul, Gordon) and chaos-based
 * recipe generation.
 * 
 * Features:
 * - Three chef personas with unique styles
 * - Chaos-based recipe complexity (1-10 scale)
 * - Integration with LeftoverGPT for recipe generation
 * - Affiliate links for missing ingredients
 * - Shareable recipe cards for viral growth
 * - Complete analytics tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Types
type ChefName = "jamie" | "paul" | "gordon";

interface RequestBody {
  chatgpt_user_id: string;
  chef_name?: ChefName;
  chaos_level?: number;
  ingredients: string[];
  dietary_restrictions?: string[];
  cuisine_preference?: string;
}

interface RecipeIngredient {
  item: string;
  amount: string;
  have: boolean;
}

interface Recipe {
  title: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  cooking_time: number;
  servings: number;
  calories_per_serving: number;
  macros: { protein: number; carbs: number; fat: number };
}

// Chef Personality Functions
function getChefIntro(chef: ChefName, chaosLevel: number): string {
  const intros = {
    jamie: [
      "Right, lovely! Let's turn those leftovers into something proper tasty. This is dead simple, I promise - even if you've never cooked before, you'll smash this.",
      "Hello, hello! Look at these beautiful ingredients. We're going to make something absolutely delicious, and it's going to be so easy.",
      "Alright, let's get cooking! This is one of my favorite ways to use up leftovers - simple, quick, and absolutely delicious.",
    ],
    paul: [
      "Ah, magnifique! These ingredients present an opportunity for something truly special. We'll employ a classic technique with a modern twist - precision is key.",
      "Bonjour! What we have here is a chance to create something refined. Pay attention to the details, and we'll achieve perfection.",
      "Excellent. These ingredients deserve respect. We'll use proper technique to elevate them into something memorable.",
    ],
    gordon: [
      "RIGHT! Listen up - we're going to do something absolutely mental with these leftovers. Forget everything you know about cooking. This is going to be INSANE.",
      "COME ON! Look at these ingredients - most people would throw them away, but we're going to make something EXTRAORDINARY. Let's get creative, you donkey!",
      "LISTEN! We're not making boring food here. We're going to take these leftovers and turn them into something SPECTACULAR. Are you ready? LET'S GO!",
    ],
  };

  const chefIntros = intros[chef];
  const index = Math.min(Math.floor(chaosLevel / 4), chefIntros.length - 1);
  return chefIntros[index];
}

function getChefTips(chef: ChefName, chaosLevel: number): string[] {
  const tips = {
    jamie: [
      "Don't worry if it's not perfect - cooking is about having fun and making something tasty!",
      "Taste as you go and adjust the seasoning to your liking.",
      "If you don't have an ingredient, just use what you've got - cooking is flexible!",
      "This tastes even better the next day, so make extra for leftovers!",
    ],
    paul: [
      "Temperature control is crucial - use a thermometer for precision.",
      "Let your proteins rest after cooking to retain their juices.",
      "Season in layers - taste and adjust at each stage of cooking.",
      "Quality ingredients make a difference - choose the best you can afford.",
    ],
    gordon: [
      "Don't be scared - push the flavors to the edge!",
      "If it's not bold enough, you're not trying hard enough!",
      "Taste it! TASTE IT! How do you know if it's good if you don't taste it?",
      "This isn't for the faint of heart - commit to the chaos!",
    ],
  };

  const chefTips = tips[chef];
  const numTips = Math.min(chaosLevel <= 3 ? 2 : chaosLevel <= 7 ? 3 : 4, chefTips.length);
  return chefTips.slice(0, numTips);
}

function getChefClosing(chef: ChefName): string {
  const closings = {
    jamie: "There you go - lovely! Enjoy your meal, and remember, cooking should be fun. See you next time!",
    paul: "Voilà! A dish worthy of your effort. Bon appétit, and remember - perfection is in the details.",
    gordon: "DONE! Now that's how you cook with leftovers. Absolutely stunning. Now get in the kitchen and make it happen!",
  };

  return closings[chef];
}

function autoSelectChef(chaosLevel: number): ChefName {
  if (chaosLevel <= 3) return "jamie";
  if (chaosLevel <= 7) return "paul";
  return "gordon";
}

// Recipe Generation (Placeholder - will integrate with LeftoverGPT)
async function generateRecipe(
  ingredients: string[],
  chaosLevel: number,
  dietaryRestrictions: string[],
  cuisinePreference?: string
): Promise<Recipe> {
  // TODO: Integrate with LeftoverGPT MCP server
  // For now, return a mock recipe based on ingredients
  
  const recipeTitles = {
    low: ["Simple Stir-Fry", "Easy Pasta", "Quick Soup"],
    medium: ["Gourmet Bowl", "Refined Risotto", "Elegant Salad"],
    high: ["Chaos Fusion", "Extreme Mashup", "Wild Creation"],
  };

  const complexity = chaosLevel <= 3 ? "low" : chaosLevel <= 7 ? "medium" : "high";
  const titleOptions = recipeTitles[complexity];
  const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];

  // Create recipe ingredients from user's ingredients
  const recipeIngredients: RecipeIngredient[] = ingredients.map((ing) => ({
    item: ing,
    amount: "As needed",
    have: true,
  }));

  // Add some missing ingredients based on chaos level
  const additionalIngredients = [
    { item: "Olive oil", amount: "2 tbsp", have: false },
    { item: "Salt", amount: "To taste", have: false },
    { item: "Black pepper", amount: "To taste", have: false },
  ];

  if (chaosLevel > 5) {
    additionalIngredients.push(
      { item: "Fresh herbs", amount: "1 bunch", have: false },
      { item: "Garlic", amount: "3 cloves", have: false }
    );
  }

  recipeIngredients.push(...additionalIngredients);

  // Generate instructions based on chaos level
  const instructions = [
    "Prepare all ingredients by washing and chopping as needed.",
    "Heat a large pan over medium-high heat.",
    `Add your main ingredients (${ingredients.slice(0, 2).join(", ")}) and cook until tender.`,
    "Season with salt, pepper, and any additional spices to taste.",
    "Serve hot and enjoy!",
  ];

  if (chaosLevel > 5) {
    instructions.splice(3, 0, "Add garlic and herbs for extra flavor.");
  }

  return {
    title,
    ingredients: recipeIngredients,
    instructions,
    cooking_time: 20 + (chaosLevel * 3),
    servings: 2,
    calories_per_serving: 350 + (chaosLevel * 20),
    macros: {
      protein: 25 + (chaosLevel * 2),
      carbs: 35 + (chaosLevel * 3),
      fat: 12 + chaosLevel,
    },
  };
}

// Affiliate Link Generation
async function getAffiliateLinks(
  supabase: any,
  missingIngredients: string[],
  userLocation: string
): Promise<Array<{ item: string; affiliate_link: string; partner_name: string }>> {
  if (missingIngredients.length === 0) return [];

  // Query affiliate partners by location
  const { data: partners, error } = await supabase
    .from("affiliate_partner_map")
    .select("*")
    .eq("country_code", userLocation)
    .eq("category", "grocery")
    .order("priority", { ascending: true })
    .limit(3);

  if (error || !partners || partners.length === 0) {
    console.error("Error fetching affiliate partners:", error);
    return [];
  }

  // Use top partner (MealMe) for all missing ingredients
  const topPartner = partners[0];
  
  return missingIngredients.map((item) => ({
    item,
    affiliate_link: `${topPartner.base_url}?ingredient=${encodeURIComponent(item)}&ref=${topPartner.partner_id}`,
    partner_name: topPartner.partner_name,
  }));
}

// Response Formatting
function formatRecipeResponse(
  chef: ChefName,
  chaosLevel: number,
  recipe: Recipe,
  affiliateLinks: Array<{ item: string; affiliate_link: string; partner_name: string }>,
  shareUrl: string
): string {
  const sections: string[] = [];

  // Chef Presentation Header
  const chefNames = {
    jamie: "Jamie Leftover",
    paul: "Paul Leftovuse",
    gordon: "Gordon Leftover-Slay",
  };
  sections.push(`# 👨‍🍳 ${chefNames[chef]} Presents: ${recipe.title}`);
  sections.push("");

  // Chef Intro
  sections.push(getChefIntro(chef, chaosLevel));
  sections.push("");

  // Ingredients
  sections.push("## What You'll Need");
  sections.push("");

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
        sections.push(`- ${ing.item} - ${ing.amount} → [Get it here](${affiliateLink.affiliate_link})`);
      } else {
        sections.push(`- ${ing.item} - ${ing.amount}`);
      }
    });
    sections.push("");
  }

  // Instructions
  sections.push("## Let's Cook!");
  sections.push("");
  recipe.instructions.forEach((instruction, index) => {
    sections.push(`${index + 1}. ${instruction}`);
  });
  sections.push("");

  // Chef's Tips
  const tips = getChefTips(chef, chaosLevel);
  sections.push("## 💡 Chef's Tips");
  tips.forEach((tip) => {
    sections.push(`- ${tip}`);
  });
  sections.push("");

  // Nutrition
  sections.push("## Nutrition (per serving)");
  sections.push(`- **Calories:** ${recipe.calories_per_serving} kcal`);
  sections.push(`- **Protein:** ${recipe.macros.protein}g | **Carbs:** ${recipe.macros.carbs}g | **Fat:** ${recipe.macros.fat}g`);
  sections.push(`- **Servings:** ${recipe.servings} | **Time:** ${recipe.cooking_time} minutes`);
  sections.push("");

  // Chef Closing
  sections.push(`> ${getChefClosing(chef)}`);
  sections.push("");
  sections.push("---");
  sections.push("");

  // Shareable CTA
  sections.push("💚 **Love this recipe?** Share it with friends!");
  sections.push(`[Copy shareable link](${shareUrl})`);
  sections.push("");

  // Affiliate CTA
  if (affiliateLinks.length > 0) {
    sections.push("🛒 **Missing ingredients?** Get everything delivered:");
    const partnerGroups = new Map<string, typeof affiliateLinks>();
    affiliateLinks.forEach((link) => {
      if (!partnerGroups.has(link.partner_name)) {
        partnerGroups.set(link.partner_name, []);
      }
      partnerGroups.get(link.partner_name)!.push(link);
    });

    const topPartner = Array.from(partnerGroups.entries())[0];
    if (topPartner) {
      const [partnerName, links] = topPartner;
      sections.push(`**${partnerName}** - [Order now](${links[0].affiliate_link})`);
    }
  }

  return sections.join("\n");
}

// Main Handler
serve(async (req) => {
  const startTime = Date.now();

  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Parse request
    const body: RequestBody = await req.json();
    const {
      chatgpt_user_id,
      chef_name,
      chaos_level = 5,
      ingredients,
      dietary_restrictions = [],
      cuisine_preference,
    } = body;

    // Validate inputs
    if (!chatgpt_user_id || !ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: chatgpt_user_id and ingredients",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auto-select chef if not provided
    const selectedChef = chef_name || autoSelectChef(chaos_level);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate recipe
    const recipe = await generateRecipe(
      ingredients,
      chaos_level,
      dietary_restrictions,
      cuisine_preference
    );

    // Get missing ingredients
    const missingIngredients = recipe.ingredients
      .filter((i) => !i.have)
      .map((i) => i.item);

    // Get affiliate links (default to US for now)
    const affiliateLinks = await getAffiliateLinks(
      supabase,
      missingIngredients,
      "US"
    );

    // Generate shareable URL (placeholder)
    const recipeId = crypto.randomUUID();
    const shareUrl = `https://loopgpt.app/recipe/${recipeId}`;

    // Format response
    const formattedResponse = formatRecipeResponse(
      selectedChef,
      chaos_level,
      recipe,
      affiliateLinks,
      shareUrl
    );

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Log analytics
    const toolCallId = crypto.randomUUID();
    
    // Log tool call
    await supabase.from("tool_calls").insert({
      tool_call_id: toolCallId,
      tool_name: "journey_3_chef_recipes",
      user_id: chatgpt_user_id,
      input_params: {
        chef: selectedChef,
        chaos_level,
        ingredient_count: ingredients.length,
        has_dietary_restrictions: dietary_restrictions.length > 0,
      },
      success: true,
      duration_ms: durationMs,
    });

    // Log user event
    await supabase.from("user_events").insert({
      user_id: chatgpt_user_id,
      event_type: "recipe_generated",
      event_data: {
        chef: selectedChef,
        chaos_level,
        recipe_title: recipe.title,
        missing_ingredient_count: missingIngredients.length,
        cooking_time: recipe.cooking_time,
      },
    });

    // Log affiliate performance
    if (affiliateLinks.length > 0) {
      const partnerId = affiliateLinks[0].partner_name;
      await supabase.from("affiliate_performance").insert({
        user_id: chatgpt_user_id,
        partner_id: partnerId,
        journey_name: "journey_3_chef_recipes",
        impression_count: 1,
        click_count: 0,
        conversion_count: 0,
        revenue_usd: 0,
      });
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        recipe: {
          title: recipe.title,
          chef: selectedChef,
          chaos_level,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          cooking_time: recipe.cooking_time,
          servings: recipe.servings,
          calories_per_serving: recipe.calories_per_serving,
          macros: recipe.macros,
        },
        missing_ingredients: affiliateLinks,
        shareable_card: {
          title: recipe.title,
          preview_text: `${selectedChef} made ${recipe.title} - ${recipe.cooking_time} mins, ${recipe.calories_per_serving} cal`,
          share_url: shareUrl,
        },
        formatted_response: formattedResponse,
        analytics: {
          tool_call_id: toolCallId,
          duration_ms: durationMs,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("Error in journey_3_chef_recipes:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: durationMs,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
