
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
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }

    // 4. Create Grocery Order Link
    if (tool === "create_external_grocery_order_link") {
      const { ingredients, zip_code } = parameters;
      
      // Guard: Ensure explicit intent (though the tool definition itself implies it)
      CommerceGuard.validateOrderRequest(ingredients);

      // Generate a link to the frontend which handles the actual cart creation
      // This keeps the backend simple and avoids PII/Location issues in the chat
      const params = new URLSearchParams();
      params.set("ingredients", ingredients.join(","));
      if (zip_code) params.set("zip", zip_code);
      params.set("source", "leftovergpt_chat");

      const checkoutUrl = `${FRONTEND_URL}/checkout?${params.toString()}`;

      return new Response(JSON.stringify({
        checkout_url: checkoutUrl,
        store_name: "Grocery Partners (via LoopKitchen)",
        expires_in: "24 hours"
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Tool not found" }), { status: 404 });

  } catch (error) {
    console.error("Adapter Error:", error);
    return new Response(JSON.stringify({ error: "Internal processing error" }), { status: 500 });
  }
}
