/**
 * MCP Manifest for TheLoopGPT Tools
 * Defines all available tools and their schemas
 */

export const MCP_MANIFEST = {
  name: "TheLoopGPT Tools",
  version: "1.0.0",
  description: "Ultra-reliable food and meal planning tools powered by AI",
  
  tools: [
    // ========================================================================
    // Core Tools
    // ========================================================================
    {
      name: "recipes.generate",
      description: "Generate creative recipes from available ingredients with dietary preferences",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1",
            description: "API version"
          },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Ingredient name" },
                quantity: { type: "string", description: "Amount (optional)" },
                unit: { type: "string", description: "Unit of measurement (optional)" }
              },
              required: ["name"]
            },
            minItems: 1,
            description: "List of available ingredients"
          },
          dietaryTags: {
            type: "array",
            items: { type: "string" },
            description: "Dietary requirements (e.g., vegan, keto, gluten-free)"
          },
          excludeIngredients: {
            type: "array",
            items: { type: "string" },
            description: "Ingredients to avoid"
          },
          maxRecipes: {
            type: "number",
            minimum: 1,
            maximum: 10,
            default: 3,
            description: "Maximum number of recipes to generate"
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard", "any"],
            default: "any",
            description: "Recipe difficulty level"
          }
        },
        required: ["ingredients"]
      }
    },
    
    {
      name: "recipes.generateWithNutrition",
      description: "Generate recipes with automatic nutrition analysis (composite tool - faster than calling both separately)",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1"
          },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                unit: { type: "string" }
              },
              required: ["name"]
            },
            minItems: 1
          },
          dietaryTags: {
            type: "array",
            items: { type: "string" }
          },
          excludeIngredients: {
            type: "array",
            items: { type: "string" }
          },
          maxRecipes: {
            type: "number",
            minimum: 1,
            maximum: 10,
            default: 3
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard", "any"],
            default: "any"
          },
          includeNutrition: {
            type: "boolean",
            const: true,
            default: true
          }
        },
        required: ["ingredients"]
      }
    },
    
    {
      name: "nutrition.analyze",
      description: "Analyze nutritional content of recipes with calorie and macro estimates",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1"
          },
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
                      quantity: { type: "string" }
                    },
                    required: ["name"]
                  }
                },
                servings: { type: "number" }
              },
              required: ["id", "name", "ingredients"]
            },
            minItems: 1
          },
          perServing: {
            type: "boolean",
            default: false,
            description: "Calculate per-serving nutrition"
          }
        },
        required: ["recipes"]
      }
    },
    
    {
      name: "mealplan.generate",
      description: "Generate structured meal plans based on goals and dietary preferences",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1"
          },
          days: {
            type: "number",
            minimum: 1,
            maximum: 30,
            description: "Number of days to plan"
          },
          caloriesPerDay: {
            type: "number",
            minimum: 800,
            maximum: 5000,
            description: "Target calories per day"
          },
          goal: {
            type: "string",
            enum: ["weight_loss", "muscle_gain", "general_health", "maintenance"],
            description: "Health/fitness goal"
          },
          dietTags: {
            type: "array",
            items: { type: "string" },
            description: "Dietary requirements"
          },
          excludeIngredients: {
            type: "array",
            items: { type: "string" },
            description: "Ingredients to avoid"
          }
        },
        required: ["days"]
      }
    },
    
    {
      name: "mealplan.generateWithGroceryList",
      description: "Generate meal plan with automatic grocery list (composite tool - faster than calling both separately)",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1"
          },
          days: {
            type: "number",
            minimum: 1,
            maximum: 30
          },
          caloriesPerDay: {
            type: "number",
            minimum: 800,
            maximum: 5000
          },
          goal: {
            type: "string",
            enum: ["weight_loss", "muscle_gain", "general_health", "maintenance"]
          },
          dietTags: {
            type: "array",
            items: { type: "string" }
          },
          excludeIngredients: {
            type: "array",
            items: { type: "string" }
          },
          includeGroceryList: {
            type: "boolean",
            const: true,
            default: true
          }
        },
        required: ["days"]
      }
    },
    
    {
      name: "grocery.list",
      description: "Generate organized shopping list from recipes or meal plans",
      inputSchema: {
        type: "object",
        properties: {
          version: {
            type: "string",
            enum: ["v1"],
            default: "v1"
          },
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
                      quantity: { type: "string" }
                    },
                    required: ["name"]
                  }
                }
              },
              required: ["id", "name", "ingredients"]
            }
          },
          mealPlan: {
            type: "object",
            properties: {
              days: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dayIndex: { type: "number" },
                    recipes: { type: "array" }
                  }
                }
              }
            }
          },
          additionalItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                category: { type: "string" }
              },
              required: ["name"]
            }
          },
          categorize: {
            type: "boolean",
            default: true,
            description: "Organize by grocery store category"
          }
        }
      }
    },
    
    // ========================================================================
    // Utility Tools
    // ========================================================================
    {
      name: "health.check",
      description: "Check system health and service availability",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    
    {
      name: "usage.stats",
      description: "Get usage statistics and rate limit information for current user",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID to check"
          },
          period: {
            type: "string",
            enum: ["hour", "day", "week", "month"],
            default: "hour",
            description: "Time period for stats"
          }
        },
        required: ["userId"]
      }
    }
  ]
};
