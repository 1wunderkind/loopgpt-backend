// ============================================================================
// TheLoop Recipes - Creative Recipe Generator
// ============================================================================
// Transforms random leftover ingredients into creative, hilarious recipes
// with chaos ratings. Part of TheLoop Ecosystem.
//
// Migrated from: LeftoverGPT
// New Brand: TheLoop Recipes
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withHeavyOperation } from "../_shared/security/applyMiddleware.ts";


// ============================================================================
// Environment Configuration
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Chef Personality System
// ============================================================================

const CHEF_POOLS = {
  low: ['Jamie Leftover', 'Jamie Rollover', 'Jamie Makeover', 'Jamie Pullover', 'Jamie Holdover'],
  medium: ['Paul Leftovuse', 'Paul Whatcha-use', 'Paul Chaos-use', 'Paul Fridge-cruise', 'Paul Broke-use'],
  high: ['Gordon Leftover-Slay', 'Gordon Scram-Say', 'Gordon Ram-Stray', 'Gordon Fridge-Disarray', 'Gordon Can\'t-Throw-Away', 'Gordon Damn-Dismay']
};

function selectChef(chaosRating: number): string {
  let tier: 'low' | 'medium' | 'high';
  if (chaosRating <= 3) tier = 'low';
  else if (chaosRating <= 6) tier = 'medium';
  else tier = 'high';
  
  const chefNames = CHEF_POOLS[tier];
  return chefNames[Math.floor(Math.random() * chefNames.length)];
}

// ============================================================================
// OpenAI System Prompt
// ============================================================================

function buildSystemPrompt(chefName: string): string {
  return `You are TheLoop Recipes, a creative chef who transforms random ingredients into surprisingly good recipes with hilarious names.

Your chef name for this recipe is: Chef ${chefName}

CRITICAL REQUIREMENT: You MUST include "by Chef ${chefName}" at the END of the recipe_name.
Example: "Midnight Fridge Raid Surprise by Chef ${chefName}"

RULES:
1. Recipe MUST be actually edible and safe to consume
2. Use ALL ingredients the user provided
3. Only suggest adding common pantry staples (salt, pepper, oil, butter, eggs, flour)
4. RESPECT dietary restrictions strictly:
   - vegan: no animal products (meat, dairy, eggs, honey)
   - vegetarian: no meat or fish
   - gluten-free: no wheat, barley, rye
   - keto: high-fat, very low-carb (avoid grains, sugar, starchy vegetables)
   - paleo: no grains, dairy, legumes, or processed foods
   - low-carb: minimal carbohydrates
   - dairy-free: no milk products
   - nut-free: no tree nuts or peanuts
5. Give the recipe a funny but descriptive name that ENDS with "by Chef ${chefName}"
6. Include a "Chaos Rating" (1-10, where 1=boring normal recipe, 10=absolutely wild combination)
7. Keep instructions simple, clear, and encouraging
8. Add personality and humor throughout
9. If ingredients are genuinely inedible together or unsafe, politely refuse and explain why
10. Always be encouraging and make cooking feel fun, even with weird ingredients
11. Output MUST be valid JSON with this exact structure:
{
  "recipe_name": "Funny Recipe Name by Chef ${chefName}",
  "chaos_rating": 7,
  "time_minutes": 25,
  "difficulty": "Easy/Medium/Hard",
  "description": "Chef ${chefName} says: [Brief funny description of the recipe]",
  "ingredients_you_have": ["ingredient1", "ingredient2"],
  "ingredients_to_add": ["salt", "pepper"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "pro_tip": "One helpful or funny tip from Chef ${chefName}",
  "chef_name": "Chef ${chefName}"
}

REMEMBER: 
- The recipe_name MUST end with "by Chef ${chefName}"
- The description MUST start with "Chef ${chefName} says:"
- The chef_name field MUST be "Chef ${chefName}"
- The pro_tip MUST be written as if Chef ${chefName} is speaking directly to the user`;
}

// ============================================================================
// Delivery Integration (Ecosystem)
// ============================================================================

interface DeliveryOption {
  partner_name: string;
  affiliate_url: string;
  cuisine_match: boolean;
}

async function getDeliveryOptions(
  chatgpt_user_id: string,
  recipe_name: string,
  cuisine_type?: string
): Promise<DeliveryOption[]> {
  try {
    const { data, error } = await supabase.functions.invoke('get_delivery_recommendations', {
      body: {
        chatgpt_user_id,
        cuisine: cuisine_type || 'general',
        diet_preferences: [],
      }
    });

    if (error) {
      console.error('[Delivery] Error:', error);
      return [];
    }

    if (!data.recommendations || data.recommendations.length === 0) {
      return [];
    }

    return data.recommendations.slice(0, 3).map((rec: any) => ({
      partner_name: rec.partner_name,
      affiliate_url: rec.affiliate_url,
      cuisine_match: rec.match_score > 50,
    }));
  } catch (error) {
    console.error('[Delivery] Error getting delivery options:', error);
    return [];
  }
}

function formatDeliveryOptions(options: DeliveryOption[]): string {
  if (options.length === 0) {
    return '';
  }

  let formatted = '\n\n---\n\n';
  formatted += '## 🚗 Don\'t Feel Like Cooking?\n\n';
  formatted += 'Order something similar from:\n\n';

  options.forEach((option) => {
    formatted += `• **${option.partner_name}** - [Order Now](${option.affiliate_url})\n`;
  });

  formatted += '\n*Affiliate links help support TheLoop Ecosystem!*\n';

  return formatted;
}

// ============================================================================
// Canva Integration (Recipe Cards)
// ============================================================================

async function generateRecipeCard(recipe: any, vibe: string): Promise<string | null> {
  try {
    console.log('[Canva] Generating recipe card for:', recipe.recipe_name);

    // Determine color scheme based on chaos rating
    let colorScheme = '';
    if (recipe.chaos_rating <= 3) {
      colorScheme = 'warm greens and yellows (calm, wholesome)';
    } else if (recipe.chaos_rating <= 6) {
      colorScheme = 'vibrant oranges and blues (creative, fun)';
    } else {
      colorScheme = 'bold reds and purples (wild, chaotic)';
    }

    // Determine chef emoji
    let chefEmoji = '👨‍🍳';
    if (recipe.chef_name.includes('Gordon')) {
      chefEmoji = '😤';
    } else if (recipe.chef_name.includes('Paul')) {
      chefEmoji = '😏';
    } else if (recipe.chef_name.includes('Jamie')) {
      chefEmoji = '😊';
    }

    const designPrompt = `Create a modern, Instagram-ready recipe card (1080x1920px vertical) with ${colorScheme}.

TITLE (huge, bold): "${recipe.recipe_name}"

CHEF SECTION:
${chefEmoji} By ${recipe.chef_name}

CHAOS METER:
⭐ Chaos Rating: ${recipe.chaos_rating}/10
Visual: Speedometer-style meter from 1-10, filled to ${recipe.chaos_rating}

QUICK INFO (icons):
⏱️ ${recipe.time_minutes} min
🔥 ${recipe.difficulty}
🎯 Vibe: ${vibe}

INGREDIENTS (top 3):
${recipe.ingredients_you_have.slice(0, 3).map((ing: string) => `• ${ing}`).join('\n')}

BRANDING:
Bottom: "Made with TheLoop Recipes 🍳"
Small QR code linking to theloopgpt.ai/recipes

STYLE:
- Bold, playful typography
- High contrast for screenshots
- Emoji-rich
- Social media optimized
- Professional but fun`;

    // Call Canva MCP via manus-mcp-cli
    const generateCmd = new Deno.Command("manus-mcp-cli", {
      args: [
        "tool", "call", "generate-design",
        "--server", "canva",
        "--input", JSON.stringify({
          user_intent: "Generate a shareable recipe card for TheLoop Recipes",
          query: designPrompt
        })
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const generateOutput = await generateCmd.output();
    if (!generateOutput.success) {
      console.error('[Canva] Generate failed');
      return null;
    }

    const generateResult = JSON.parse(new TextDecoder().decode(generateOutput.stdout));
    
    if (!generateResult.candidates || generateResult.candidates.length === 0) {
      console.error('[Canva] No design candidates generated');
      return null;
    }

    const candidateId = generateResult.candidates[0].id;
    console.log('[Canva] Design candidate created:', candidateId);

    // Convert candidate to editable design
    const createCmd = new Deno.Command("manus-mcp-cli", {
      args: [
        "tool", "call", "create-design-from-candidate",
        "--server", "canva",
        "--input", JSON.stringify({
          user_intent: "Convert AI-generated recipe card to editable design",
          candidate_id: candidateId
        })
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const createOutput = await createCmd.output();
    if (!createOutput.success) {
      console.error('[Canva] Create design failed');
      return null;
    }

    const createResult = JSON.parse(new TextDecoder().decode(createOutput.stdout));
    
    if (!createResult.design || !createResult.design.id) {
      console.error('[Canva] Failed to create design from candidate');
      return null;
    }

    const designId = createResult.design.id;
    console.log('[Canva] Editable design created:', designId);

    // Export as PNG
    const exportCmd = new Deno.Command("manus-mcp-cli", {
      args: [
        "tool", "call", "export-design",
        "--server", "canva",
        "--input", JSON.stringify({
          user_intent: "Export recipe card as shareable PNG image",
          design_id: designId,
          format: {
            type: "png",
            width: 1080,
            height: 1920,
            transparent_background: false,
            export_quality: "regular"
          }
        })
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const exportOutput = await exportCmd.output();
    if (!exportOutput.success) {
      console.error('[Canva] Export failed');
      return null;
    }

    const exportResult = JSON.parse(new TextDecoder().decode(exportOutput.stdout));
    
    if (!exportResult.url) {
      console.error('[Canva] Failed to export design');
      return null;
    }

    console.log('[Canva] Recipe card exported:', exportResult.url);
    return exportResult.url;

  } catch (error) {
    console.error('[Canva ERROR]:', error);
    return null;
  }
}

// ============================================================================
// Main Request Handler
// ============================================================================

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { ingredients, dietary_restrictions = 'none', vibe = 'comfort', chatgpt_user_id } = await req.json();

    // Validate ingredients
    if (!ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Please provide at least one ingredient!' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TheLoop Recipes] Creating recipe with ${ingredients.length} ingredients, vibe: ${vibe}, dietary: ${dietary_restrictions}`);

    // Build user prompt
    const userPrompt = `Create a recipe using these ingredients: ${ingredients.join(', ')}

Dietary restrictions: ${dietary_restrictions}
Cooking vibe: ${vibe}

Remember to output valid JSON only, no markdown formatting.`;

    // Select chef based on vibe
    let tempChaosGuess: number;
    if (vibe === 'surprise-me') {
      tempChaosGuess = Math.floor(Math.random() * 10) + 1;
    } else if (vibe === 'chaos') {
      tempChaosGuess = 8;
    } else if (vibe === 'quick') {
      tempChaosGuess = 4;
    } else {
      tempChaosGuess = 5;
    }
    const chefName = selectChef(tempChaosGuess);
    
    console.log(`[TheLoop Recipes] Selected chef: ${chefName}`);

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt(chefName) },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const recipeJson = openaiData.choices[0].message.content;
    
    if (!recipeJson) {
      throw new Error("No recipe generated");
    }

    const recipe = JSON.parse(recipeJson);
    console.log(`[TheLoop Recipes] Recipe generated: ${recipe.recipe_name}, chaos: ${recipe.chaos_rating}`);

    // Format output
    const finalChefName = "Chef " + chefName;
    let formatted = "";
    formatted += "# 🍽️ " + recipe.recipe_name + "\n";
    formatted += "## 👨‍🍳 By " + finalChefName + "\n\n";
    formatted += "---\n\n";
    formatted += "⭐ **Chaos Rating:** " + recipe.chaos_rating + "/10 | ";
    formatted += "⏱️ **Time:** " + recipe.time_minutes + " mins | ";
    formatted += "🔥 **Difficulty:** " + recipe.difficulty + "\n\n";
    formatted += "## What You're Making:\n";
    formatted += recipe.description + "\n\n";
    formatted += "## Ingredients You Have:\n";
    recipe.ingredients_you_have.forEach((ing: string) => {
      formatted += "✓ " + ing + "\n";
    });
    formatted += "\n";
    
    if (recipe.ingredients_to_add && recipe.ingredients_to_add.length > 0) {
      formatted += "## You'll Also Need:\n";
      recipe.ingredients_to_add.forEach((ing: string) => {
        formatted += "• " + ing + "\n";
      });
      formatted += "\n";
    }
    
    formatted += "## Instructions:\n";
    recipe.instructions.forEach((step: string, idx: number) => {
      formatted += (idx + 1) + ". " + step + "\n";
    });
    formatted += "\n";
    formatted += "## 💡 Pro Tip from " + finalChefName + ":\n";
    formatted += recipe.pro_tip + "\n\n";
    formatted += "---\n\n";
    formatted += "**🎖️ This recipe was created by " + finalChefName + "**\n";
    formatted += "*Part of TheLoop Ecosystem*\n";

    // Add delivery options if chatgpt_user_id is provided
    if (chatgpt_user_id) {
      try {
        console.log('[TheLoop Recipes] Fetching delivery options for user...');
        const deliveryOptions = await getDeliveryOptions(
          chatgpt_user_id,
          recipe.recipe_name,
          vibe
        );
        
        if (deliveryOptions.length > 0) {
          formatted += formatDeliveryOptions(deliveryOptions);
          console.log(`[TheLoop Recipes] Added ${deliveryOptions.length} delivery options`);
        }
      } catch (error) {
        console.error('[TheLoop Recipes] Error adding delivery options:', error);
        // Continue without delivery options
      }
    }

    // Generate recipe card image with Canva
    let cardImageUrl: string | null = null;
    try {
      console.log('[TheLoop Recipes] Generating shareable recipe card...');
      cardImageUrl = await generateRecipeCard(recipe, vibe);
      
      if (cardImageUrl) {
        console.log('[TheLoop Recipes] Recipe card generated successfully!');
        formatted += `\n\n📸 **Shareable Recipe Card:**\n${cardImageUrl}\n\n*Right-click to save or share on social media!* 🚀`;
      } else {
        console.log('[TheLoop Recipes] Recipe card generation failed, continuing without image');
      }
    } catch (error) {
      console.error('[TheLoop Recipes] Canva integration error:', error);
      // Continue without recipe card
    }

    // Return response
    return new Response(
      JSON.stringify({
        recipe_markdown: formatted,
        canva_image_url: cardImageUrl,
        recipe_data: recipe
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('[TheLoop Recipes ERROR]:', error);
    return new Response(
      JSON.stringify({ error: `Error generating recipe: ${error.message}` }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withHeavyOperation(handler));

