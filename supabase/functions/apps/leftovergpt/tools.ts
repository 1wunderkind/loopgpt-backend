/**
 * LeftoverGPT Tool Definitions
 * 
 * The ONLY tools exposed to ChatGPT.
 * Strict adherence to the 4 allowed tools.
 */

export const LEFTOVERGPT_TOOLS = [
  {
    name: "generate_recipe_from_ingredients",
    description: "Generate a creative recipe using a list of available ingredients. Use this when the user lists what they have in their fridge or pantry.",
    input_schema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of available ingredients (e.g. ['chicken', 'rice', 'broccoli'])"
        },
        dietary_restrictions: {
          type: "array",
          items: { type: "string" },
          description: "Optional dietary needs (e.g. ['gluten-free', 'vegan'])"
        },
        meal_type: {
          type: "string",
          description: "Optional meal type (e.g. 'dinner', 'snack')"
        },
        cooking_time_limit: {
          type: "string",
          description: "Optional time constraint (e.g. '30 minutes')"
        }
      },
      required: ["ingredients"]
    },
    // Annotation: Read-only (no side effects)
    readOnlyHint: true
  },
  {
    name: "adjust_recipe",
    description: "Modify a previously generated recipe based on user feedback. Use this when the user asks to change something about the recipe (e.g. 'make it spicy', 'I don't have onions').",
    input_schema: {
      type: "object",
      properties: {
        original_recipe_name: {
          type: "string",
          description: "Name of the recipe to adjust"
        },
        adjustment_request: {
          type: "string",
          description: "What to change about the recipe"
        }
      },
      required: ["original_recipe_name", "adjustment_request"]
    },
    // Annotation: Read-only
    readOnlyHint: true
  },
  {
    name: "estimate_recipe_nutrition",
    description: "Estimate the calorie and macronutrient content of a recipe. This is an ESTIMATE for informational purposes only.",
    input_schema: {
      type: "object",
      properties: {
        recipe_description: {
          type: "string",
          description: "Description or name of the recipe to analyze"
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of ingredients for more accuracy"
        }
      },
      required: ["recipe_description"]
    },
    // Annotation: Read-only
    readOnlyHint: true
  },
  {
    name: "create_external_grocery_order_link",
    description: "Creates an external checkout link to purchase ingredients missing from a recipe. This tool should ONLY be triggered by explicit user action (button click).",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to order ingredients for"
        },
        // Note: We allow ingredients to be passed if recipe_id is not sufficient, 
        // but the primary schema emphasizes recipe_id to keep it minimal.
        // However, to make it functional without DB state for recipes, we might need ingredients.
        // But per strict requirements, we'll stick to the requested schema.
        // The implementation will handle the actual data passed by the UI.
      },
      required: ["recipe_id"]
    },
    // Annotation: Open World (External Link) + Side Effect
    openWorldHint: true,
    readOnlyHint: false
  }
];
