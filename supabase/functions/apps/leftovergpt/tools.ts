/**
 * LeftoverGPT Tool Definitions
 * 
 * The ONLY tools exposed to ChatGPT.
 * Strict adherence to the 4 allowed tools.
 */

export const LEFTOVERGPT_TOOLS = [
  {
    name: "generate_recipe_from_ingredients",
    description: "Generates a recipe based on a list of available ingredients.",
    input_schema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of available ingredients"
        },
        dietary_restrictions: {
          type: "array",
          items: { type: "string" },
          description: "Optional dietary needs"
        },
        meal_type: {
          type: "string",
          description: "Optional meal type"
        },
        cooking_time_limit: {
          type: "string",
          description: "Optional time constraint"
        }
      },
      required: ["ingredients"]
    },
    readOnlyHint: true
  },
  {
    name: "adjust_recipe",
    description: "Modifies a previously generated recipe based on user feedback.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to adjust"
        },
        original_recipe_name: {
          type: "string",
          description: "Name of the recipe to adjust (fallback)"
        },
        adjustment_request: {
          type: "string",
          description: "What to change about the recipe"
        }
      },
      required: ["adjustment_request"]
    },
    readOnlyHint: true
  },
  {
    name: "estimate_recipe_nutrition",
    description: "Estimates the calorie and macronutrient content of a recipe.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to analyze"
        },
        recipe_description: {
          type: "string",
          description: "Description or name of the recipe to analyze (fallback)"
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of ingredients for more accuracy"
        }
      },
      required: []
    },
    readOnlyHint: true
  },
  {
    name: "create_external_grocery_order_link",
    description: "Generates a secure checkout link for the recipe ingredients.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to order ingredients for"
        }
      },
      required: ["recipe_id"]
    },
    openWorldHint: true,
    readOnlyHint: false
  }
];
