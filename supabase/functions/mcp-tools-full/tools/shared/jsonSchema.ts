/**
 * JSON Schema Definitions for OpenAI Structured Outputs
 * Manually defined to avoid external dependencies
 */

export const RecipeListJsonSchema = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                unit: { type: "string" }
              },
              required: ["name"],
              additionalProperties: false
            }
          },
          instructions: {
            type: "array",
            items: { type: "string" }
          },
          prepTimeMinutes: { type: "number" },
          cookTimeMinutes: { type: "number" },
          servings: { type: "number" },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"]
          }
        },
        required: ["id", "name", "ingredients", "instructions"],
        additionalProperties: false
      }
    }
  },
  required: ["recipes"],
  additionalProperties: false
};

export const NutritionAnalysisJsonSchema = {
  type: "object",
  properties: {
    perRecipe: {
      type: "array",
      items: {
        type: "object",
        properties: {
          recipeId: { type: "string" },
          recipeName: { type: "string" },
          summary: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" },
              sodium_mg: { type: "number" }
            },
            required: ["calories", "protein_g", "carbs_g", "fat_g"],
            additionalProperties: false
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          perServing: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" },
              sodium_mg: { type: "number" }
            },
            required: ["calories", "protein_g", "carbs_g", "fat_g"],
            additionalProperties: false
          }
        },
        required: ["recipeId", "recipeName", "summary", "confidence"],
        additionalProperties: false
      }
    },
    total: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        fiber_g: { type: "number" },
        sugar_g: { type: "number" },
        sodium_mg: { type: "number" }
      },
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
      additionalProperties: false
    }
  },
  required: ["perRecipe"],
  additionalProperties: false
};

export const MealPlanJsonSchema = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayIndex: { type: "number" },
          date: { type: "string" },
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "string" },
                      unit: { type: "string" }
                    },
                    required: ["name"],
                    additionalProperties: false
                  }
                },
                instructions: {
                  type: "array",
                  items: { type: "string" }
                },
                prepTimeMinutes: { type: "number" },
                cookTimeMinutes: { type: "number" },
                servings: { type: "number" },
                tags: {
                  type: "array",
                  items: { type: "string" }
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"]
                }
              },
              required: ["id", "name", "ingredients", "instructions"],
              additionalProperties: false
            }
          },
          nutrition: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" },
              sodium_mg: { type: "number" }
            },
            required: ["calories", "protein_g", "carbs_g", "fat_g"],
            additionalProperties: false
          },
          notes: { type: "string" }
        },
        required: ["dayIndex", "recipes"],
        additionalProperties: false
      }
    },
    totalNutrition: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein_g: { type: "number" },
        carbs_g: { type: "number" },
        fat_g: { type: "number" },
        fiber_g: { type: "number" },
        sugar_g: { type: "number" },
        sodium_mg: { type: "number" }
      },
      required: ["calories", "protein_g", "carbs_g", "fat_g"],
      additionalProperties: false
    },
    summary: { type: "string" }
  },
  required: ["days"],
  additionalProperties: false
};

export const GroceryListJsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
          category: { type: "string" },
          source: {
            type: "string",
            enum: ["recipe", "pantry", "manual"]
          },
          recipeIds: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["name"],
        additionalProperties: false
      }
    },
    categorized: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "string" },
            unit: { type: "string" },
            category: { type: "string" },
            source: {
              type: "string",
              enum: ["recipe", "pantry", "manual"]
            },
            recipeIds: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["name"],
          additionalProperties: false
        }
      }
    },
    estimatedCost: { type: "number" },
    notes: { type: "string" }
  },
  required: ["items"],
  additionalProperties: false
};
