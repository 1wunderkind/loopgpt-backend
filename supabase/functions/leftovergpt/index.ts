/**
 * LeftoverGPT App Adapter
 * 
 * Main entrypoint for the LeftoverGPT ChatGPT App.
 * Handles tool routing, schema validation, and response formatting.
 * 
 * COMPLIANCE NOTE:
 * - Implements server-side commerce gating via HMAC tokens.
 * - Enforces recipe_id lifecycle.
 * - Minimizes data exposure.
 */

import { serve } from "std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "std@0.177.0/crypto/mod.ts";
import { getOpenAIClient } from "../_lib/openai.ts";
import { LEFTOVERGPT_TOOLS } from "./tools.ts";
import { createCheckoutSession } from "./session.ts";
import { sanitizeResponse, createErrorResponse } from "./utils.ts";
import { 
  LEFTOVERGPT_DETAIL_SYSTEM, 
  LEFTOVERGPT_DETAIL_USER,
  NUTRITIONGPT_SYSTEM,
  NUTRITIONGPT_USER
} from "../_shared/loopkitchen/prompts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) throw new Error("Missing required env: JWT_SECRET");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const FRONTEND_URL = "https://loopkitchen-ui.vercel.app";

// Helper to sign tokens
async function signCommerceToken(recipeId: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const data = encoder.encode(recipeId);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to verify tokens
async function verifyCommerceToken(recipeId: string, token: string): Promise<boolean> {
  const expected = await signCommerceToken(recipeId);
  return expected === token;
}

export async function handleLeftoverGPTRequest(req: Request): Promise<Response> {
  try {
    const { tool, parameters } = await req.json();

    // 1. Generate Recipe
    if (tool === "generate_recipe_from_ingredients") {
      const { ingredients, dietary_restrictions, meal_type, cooking_time_limit } = parameters;
      const openai = getOpenAIClient();
      
      const systemPrompt = LEFTOVERGPT_DETAIL_SYSTEM;
      const userPrompt = LEFTOVERGPT_DETAIL_USER(
        "Creative Leftover Creation", 
        ingredients,
        meal_type ? [meal_type] : [],
        5, 
        cooking_time_limit ? parseInt(cooking_time_limit) : undefined
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Save to DB (Service Role Only)
      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({
          title: result.title,
          description: result.description,
          ingredients_have: result.ingredientsHave,
          ingredients_need: result.ingredientsNeed,
          instructions: result.instructions,
          metadata: result
        })
        .select("id")
        .single();

      if (error) throw new Error("Failed to save recipe.");

      // Generate Commerce Token
      const commerceToken = await signCommerceToken(recipe.id);

      return new Response(JSON.stringify(sanitizeResponse({
        ...result,
        recipe_id: recipe.id,
        commerce_token: commerceToken, // Pass token to LLM
        missing_items: result.ingredientsNeed
      })), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Adjust Recipe
    if (tool === "adjust_recipe") {
      const { recipe_id, original_recipe_name, adjustment_request } = parameters;
      const openai = getOpenAIClient();

      let context = "";
      if (recipe_id) {
        const { data: recipe } = await supabase.from("recipes").select("metadata").eq("id", recipe_id).single();
        if (recipe) {
          context = `Original Recipe: ${JSON.stringify(recipe.metadata)}`;
        }
      }
      if (!context && original_recipe_name) {
        context = `Original Recipe Name: ${original_recipe_name}`;
      }

      const systemPrompt = LEFTOVERGPT_DETAIL_SYSTEM + "\n\nIMPORTANT: You are adjusting an existing recipe based on user feedback. Keep the core idea but apply the requested changes.";
      const userPrompt = `${context}\nAdjustment Request: ${adjustment_request}\n\nPlease rewrite the recipe.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Save new version
      const { data: newRecipe, error } = await supabase
        .from("recipes")
        .insert({
          title: result.title,
          description: result.description,
          ingredients_have: result.ingredientsHave,
          ingredients_need: result.ingredientsNeed,
          instructions: result.instructions,
          metadata: result
        })
        .select("id")
        .single();
        
      if (error) throw error;

      const commerceToken = await signCommerceToken(newRecipe.id);

      return new Response(JSON.stringify(sanitizeResponse({
        ...result,
        recipe_id: newRecipe.id,
        commerce_token: commerceToken,
        missing_items: result.ingredientsNeed
      })), { headers: { "Content-Type": "application/json" } });
    }

    // 3. Estimate Nutrition
    if (tool === "estimate_recipe_nutrition") {
      const { recipe_id, recipe_description, ingredients } = parameters;
      const openai = getOpenAIClient();

      let title = recipe_description || "Unknown Recipe";
      let ingList = ingredients || [];

      if (recipe_id) {
        const { data: recipe } = await supabase.from("recipes").select("title, ingredients_have, ingredients_need").eq("id", recipe_id).single();
        if (recipe) {
          title = recipe.title;
          const have = (recipe.ingredients_have || []).map((i: any) => ({ name: i.name, quantity: i.quantity }));
          const need = (recipe.ingredients_need || []).map((i: any) => ({ name: i.name, quantity: i.quantity }));
          ingList = [...have, ...need];
        }
      }

      const systemPrompt = NUTRITIONGPT_SYSTEM;
      const userPrompt = NUTRITIONGPT_USER(
        title,
        1,
        ingList.map((i: any) => ({ name: typeof i === 'string' ? i : i.name, quantity: typeof i === 'string' ? '1 serving' : i.quantity }))
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return new Response(JSON.stringify(sanitizeResponse(result)), { headers: { "Content-Type": "application/json" } });
    }

    // 4. Create Grocery Order Link (Commerce Trigger)
    if (tool === "create_external_grocery_order_link") {
      const { recipe_id, commerce_token } = parameters;
      
      // GUARD: Validate Token
      if (!commerce_token || !(await verifyCommerceToken(recipe_id, commerce_token))) {
        return createErrorResponse("Security Error: Invalid or missing commerce token. Please regenerate the recipe.");
      }

      let missingItems = [];
      
      if (recipe_id) {
        const { data: recipe } = await supabase.from("recipes").select("ingredients_need").eq("id", recipe_id).single();
        if (recipe && recipe.ingredients_need) {
          missingItems = recipe.ingredients_need;
        }
      }

      if (missingItems.length === 0) {
         return createErrorResponse("Could not find ingredients for this recipe. Please regenerate the recipe.");
      }

      // Create secure session
      const token = await createCheckoutSession(recipe_id || "unknown", missingItems);
      
      // Point to Frontend
      const ingredientsParam = encodeURIComponent(JSON.stringify(missingItems));
      const orderUrl = `${FRONTEND_URL}/checkout?token=${token}&ingredients=${ingredientsParam}`;

      return new Response(JSON.stringify(sanitizeResponse({
        missing_items: missingItems,
        order_url: orderUrl,
        expires_in_seconds: 1800
      })), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Tool not found" }), { status: 404 });

  } catch (error) {
    console.error("Adapter Error:", error);
    return createErrorResponse("An unexpected error occurred.");
  }
}
