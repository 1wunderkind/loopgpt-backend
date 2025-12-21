
/**
 * LeftoverGPT App Adapter
 * 
 * Main entrypoint for the LeftoverGPT ChatGPT App.
 * Handles tool routing, schema validation, and response formatting.
 */

import { serve } from "std@0.177.0/http/server.ts";
import { getOpenAIClient } from "../../shared/openai.ts";
import { LEFTOVERGPT_TOOLS } from "./tools.ts";
import { CommerceGuard } from "./guards.ts";
import { createCheckoutSession } from "./session.ts";
import { sanitizeResponse, createErrorResponse } from "./utils.ts";
import { 
  LEFTOVERGPT_LIST_SYSTEM, 
  LEFTOVERGPT_LIST_USER,
  LEFTOVERGPT_DETAIL_SYSTEM,
  LEFTOVERGPT_DETAIL_USER,
  NUTRITIONGPT_SYSTEM,
  NUTRITIONGPT_USER
} from "../../_shared/loopkitchen/prompts.ts";

// Configuration
const FRONTEND_URL = "https://loopkitchen-ui.vercel.app";

export async function handleLeftoverGPTRequest(req: Request): Promise<Response> {
  try {
    const { tool, parameters } = await req.json();

    // 1. Generate Recipe
    if (tool === "generate_recipe_from_ingredients") {
      const { ingredients, dietary_restrictions, meal_type, cooking_time_limit } = parameters;
      
      const openai = getOpenAIClient();
      
      // First, generate a list of ideas (using the list prompt)
      // Or directly generate one detailed recipe if the user asked for "a recipe"
      // For simplicity and speed in the app, we'll generate one detailed recipe directly
      // using the detail prompt, as it provides a better immediate experience.
      
      const systemPrompt = LEFTOVERGPT_DETAIL_SYSTEM;
      const userPrompt = LEFTOVERGPT_DETAIL_USER(
        "Creative Leftover Creation", // Placeholder title, the AI will invent one
        ingredients,
        meal_type ? [meal_type] : [],
        5, // Default chaos
        cooking_time_limit ? parseInt(cooking_time_limit) : undefined
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast, cheap, good enough
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return new Response(JSON.stringify(sanitizeResponse(result)), { headers: { "Content-Type": "application/json" } });
    }

    // 2. Adjust Recipe
    if (tool === "adjust_recipe") {
      const { original_recipe_name, adjustment_request } = parameters;
      const openai = getOpenAIClient();

      const systemPrompt = LEFTOVERGPT_DETAIL_SYSTEM + "\n\nIMPORTANT: You are adjusting an existing recipe based on user feedback. Keep the core idea but apply the requested changes.";
      const userPrompt = `Original Recipe: ${original_recipe_name}\nAdjustment Request: ${adjustment_request}\n\nPlease rewrite the recipe to satisfy the request.`;

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
      return new Response(JSON.stringify(sanitizeResponse(result)), { headers: { "Content-Type": "application/json" } });
    }

    // 3. Estimate Nutrition
    if (tool === "estimate_recipe_nutrition") {
      const { recipe_description, ingredients } = parameters;
      const openai = getOpenAIClient();

      const systemPrompt = NUTRITIONGPT_SYSTEM;
      const userPrompt = NUTRITIONGPT_USER(
        recipe_description,
        1, // Default 1 serving for analysis
        (ingredients || []).map((i: string) => ({ name: i, quantity: "1 serving" })) // Rough estimate
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3, // Lower temp for factual data
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return new Response(JSON.stringify(sanitizeResponse(result)), { headers: { "Content-Type": "application/json" } });
    }

    // 4. Create Grocery Order Link
    if (tool === "create_external_grocery_order_link") {
      // Input schema says { recipe_id }, but we accept ingredients if passed (from UI)
      const { recipe_id, ingredients } = parameters; 
      
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
         return createErrorResponse("No ingredients provided for checkout.");
      }

      // Guard: Ensure explicit intent
      CommerceGuard.validateOrderRequest(ingredients);

      // Create secure session
      const token = await createCheckoutSession(recipe_id || "unknown", ingredients);
      
      const projectRef = Deno.env.get("SUPABASE_URL")?.split("//")[1].split(".")[0] || "qmagnwxeijctkksqbcqz";
      const orderUrl = `https://${projectRef}.supabase.co/functions/v1/checkout_redirect?token=${token}`;

      return new Response(JSON.stringify(sanitizeResponse({
        missing_items: ingredients.map((i: string) => ({ name: i, quantity: "1" })),
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
