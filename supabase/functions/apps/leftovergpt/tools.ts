/**
 * LeftoverGPT Tool Definitions
 * 
 * The ONLY tools exposed to ChatGPT.
 * Strict adherence to the 4 allowed tools.
 * 
 * COMPLIANCE NOTE:
 * - Descriptions are purely functional.
 * - No "use when" or triggering guidance.
 * - Schemas are minimal and privacy-preserving.
 * - Commerce tool requires a server-signed token (UI enforcement).
 */

export const LEFTOVERGPT_TOOLS = [
  {
    name: "generate_recipe_from_ingredients",
    category: "Cooking",
    description: "Generates a recipe based on a list of available ingredients. The model will try to use as many of the provided ingredients as possible and suggest common pantry staples if needed.",
    input_schema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of ingredients the user has available"
        },
        dietary_restrictions: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional dietary restrictions (e.g., vegan, gluten-free)"
        },
        meal_type: {
          type: "string",
          description: "Optional meal type (e.g., breakfast, dinner, snack)"
        },
        cooking_time_limit: {
          type: "integer",
          description: "Optional maximum cooking time in minutes"
        }
      },
      required: ["ingredients"]
    },
    readOnlyHint: true
  },
  {
    name: "adjust_recipe",
    category: "Cooking",
    description: "Modifies an existing recipe based on user feedback (e.g., 'make it spicier', 'swap chicken for tofu').",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to adjust"
        },
        adjustment_request: {
          type: "string",
          description: "Natural language description of the desired change"
        }
      },
      required: ["recipe_id", "adjustment_request"]
    },
    readOnlyHint: true
  },
  {
    name: "estimate_recipe_nutrition",
    category: "Cooking",
    description: "Provides estimated nutritional information for a generated recipe.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe to analyze"
        }
      },
      required: ["recipe_id"]
    },
    readOnlyHint: true
  },
  {
    name: "create_external_grocery_order_link",
    category: "Commerce",
    description: "Generates a secure link to order missing ingredients from a third-party grocery provider. Requires a valid commerce_token from generate_recipe_from_ingredients.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "string",
          description: "ID of the recipe"
        },
        commerce_token: {
          type: "string",
          description: "Security token provided when the recipe was generated"
        },
        user_country: {
          type: "string",
          description: "ISO 3166-1 alpha-2 country code (e.g., US, CA, GB) to select the appropriate provider"
        }
      },
      required: ["recipe_id", "commerce_token"]
    },
    openWorldHint: true,
    readOnlyHint: false
  }
];
