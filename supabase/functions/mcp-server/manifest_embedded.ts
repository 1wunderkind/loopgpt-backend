// Embedded manifest for TheLoopGPT.ai MCP Server
// This is auto-generated from manifest.json

export const MANIFEST = 
{
  "name": "TheLoopGPT.ai",
  "description": "A comprehensive AI-powered meal planning and nutrition platform. TheLoopGPT.ai provides personalized meal plans, weight tracking with adaptive feedback loops, restaurant ordering via MealMe, and multi-country grocery affiliate links. Built on a robust microservices architecture with support for 100+ languages across 25 countries.",
  "version": "1.0.0",
  "schema_version": "v1",
  "namespace": "loopgpt",
  "contact_email": "support@theloopgpt.ai",
  "api": {
    "type": "openai-mcp",
    "url": "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-server"
  },
  "authentication": {
    "type": "none"
  },
  "tools": [
    {
      "name": "generate_week_plan",
      "category": "Meal Planning",
      "description": "Generates a personalized 7-day meal plan based on user dietary preferences, calorie targets, allergies, and cuisine preferences. Returns a complete week of breakfast, lunch, and dinner with recipes and shopping lists.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "diet": {
            "type": "string",
            "description": "Diet type (e.g., vegetarian, vegan, keto, paleo, pescatarian, omnivore)"
          },
          "calories_per_day": {
            "type": "number",
            "description": "Target daily calorie intake"
          },
          "meals_per_day": {
            "type": "integer",
            "description": "Number of meals per day (typically 2-4)",
            "default": 3
          },
          "allergies": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of food allergies or ingredients to exclude"
          },
          "cuisine_preferences": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Preferred cuisines (e.g., Italian, Mexican, Asian, Mediterranean)"
          },
          "language": {
            "type": "string",
            "description": "Language code for meal plan (e.g., en, es, fr, de)",
            "default": "en"
          }
        },
        "required": ["user_id", "diet", "calories_per_day"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "plan_id": {
            "type": "string",
            "description": "Unique identifier for this meal plan"
          },
          "week_start": {
            "type": "string",
            "description": "Start date of the week (ISO 8601)"
          },
          "meals": {
            "type": "array",
            "description": "Array of meals for the week"
          },
          "shopping_list": {
            "type": "array",
            "description": "Aggregated shopping list for the week"
          },
          "total_calories": {
            "type": "number",
            "description": "Total calories for the week"
          }
        }
      }
    },
    {
      "name": "log_meal_plan",
      "category": "Meal Planning",
      "description": "Saves a generated meal plan to the user's account for tracking and future reference. This creates a permanent record that can be used for outcome evaluation and plan adaptation.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "plan_id": {
            "type": "string",
            "description": "Meal plan identifier from generate_week_plan"
          },
          "plan_data": {
            "type": "object",
            "description": "Complete meal plan data to store"
          },
          "start_date": {
            "type": "string",
            "description": "When the user will start this plan (ISO 8601)"
          }
        },
        "required": ["user_id", "plan_id", "plan_data"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "stored_plan_id": {
            "type": "string"
          }
        }
      }
    },
    {
      "name": "get_affiliate_links",
      "category": "Meal Planning",
      "description": "Generates country-specific grocery affiliate links for ingredients in a meal plan. Supports 25 countries with localized grocery delivery services and affiliate partnerships.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ingredients": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of ingredient names"
          },
          "country_code": {
            "type": "string",
            "description": "ISO 3166-1 alpha-2 country code (e.g., US, GB, DE, FR)"
          },
          "user_id": {
            "type": "string",
            "description": "User ID for tracking affiliate conversions"
          }
        },
        "required": ["ingredients", "country_code"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "ingredient": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "provider": {
                  "type": "string"
                },
                "estimated_price": {
                  "type": "number"
                }
              }
            }
          },
          "total_estimated_cost": {
            "type": "number"
          }
        }
      }
    },
    {
      "name": "log_weight",
      "category": "Weight Tracking",
      "description": "Records a daily weight entry for a user. This is a core component of the feedback loop that enables plan adaptation based on actual results.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "weight_kg": {
            "type": "number",
            "description": "Weight in kilograms"
          },
          "date": {
            "type": "string",
            "description": "Date of measurement (ISO 8601)",
            "default": "today"
          },
          "notes": {
            "type": "string",
            "description": "Optional notes about the measurement"
          }
        },
        "required": ["user_id", "weight_kg"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "log_id": {
            "type": "string"
          },
          "bmi": {
            "type": "number",
            "description": "Calculated BMI if height is available"
          }
        }
      }
    },
    {
      "name": "weekly_trend",
      "category": "Weight Tracking",
      "description": "Calculates weekly weight trends and statistics for a user. Shows average weight, change from previous week, and trend direction (increasing, decreasing, stable).",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "week_start": {
            "type": "string",
            "description": "Start date of the week to analyze (ISO 8601)"
          },
          "include_graph_data": {
            "type": "boolean",
            "description": "Whether to include daily data points for graphing",
            "default": false
          }
        },
        "required": ["user_id", "week_start"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "average_weight": {
            "type": "number"
          },
          "weight_change": {
            "type": "number",
            "description": "Change from previous week in kg"
          },
          "trend": {
            "type": "string",
            "enum": ["increasing", "decreasing", "stable"]
          },
          "data_points": {
            "type": "integer",
            "description": "Number of measurements in the week"
          },
          "daily_data": {
            "type": "array",
            "description": "Daily weight measurements if requested"
          }
        }
      }
    },
    {
      "name": "evaluate_plan_outcome",
      "category": "Weight Tracking",
      "description": "Evaluates the effectiveness of a meal plan by comparing actual weight results against goals. This drives the adaptive feedback loop that improves future meal plans.",
      "input_schema": {
        "type": "object",
        "properties": {
          "plan_id": {
            "type": "string",
            "description": "Meal plan identifier to evaluate"
          },
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "end_weight": {
            "type": "number",
            "description": "Weight at end of plan period (kg)"
          },
          "adherence_score": {
            "type": "number",
            "description": "How closely user followed the plan (0-100)",
            "default": 100
          }
        },
        "required": ["plan_id", "user_id", "end_weight"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "outcome": {
            "type": "string",
            "enum": ["exceeded_goal", "met_goal", "partial_progress", "no_progress", "opposite_direction"]
          },
          "weight_change": {
            "type": "number"
          },
          "goal_achievement_percentage": {
            "type": "number"
          },
          "recommendations": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Suggestions for next meal plan"
          }
        }
      }
    },
    {
      "name": "push_plan_feedback",
      "category": "Weight Tracking",
      "description": "Submits user feedback on a meal plan including ratings, comments, and specific meal preferences. This qualitative data complements quantitative weight tracking for plan optimization.",
      "input_schema": {
        "type": "object",
        "properties": {
          "plan_id": {
            "type": "string",
            "description": "Meal plan identifier"
          },
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "overall_rating": {
            "type": "integer",
            "description": "Overall satisfaction (1-5 stars)",
            "minimum": 1,
            "maximum": 5
          },
          "feedback_text": {
            "type": "string",
            "description": "Detailed feedback comments"
          },
          "liked_meals": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Meal IDs that user enjoyed"
          },
          "disliked_meals": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Meal IDs that user didn't enjoy"
          }
        },
        "required": ["plan_id", "user_id", "overall_rating"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "feedback_id": {
            "type": "string"
          }
        }
      }
    },
    {
      "name": "get_weight_prefs",
      "category": "Weight Tracking",
      "description": "Retrieves a user's weight goals and preferences including target weight, weekly goal, height, activity level, and weight loss/gain strategy.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          }
        },
        "required": ["user_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "target_weight_kg": {
            "type": "number"
          },
          "weekly_goal_kg": {
            "type": "number",
            "description": "Target weight change per week (negative for loss)"
          },
          "height_cm": {
            "type": "number"
          },
          "activity_level": {
            "type": "string",
            "enum": ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]
          },
          "strategy": {
            "type": "string",
            "enum": ["lose_weight", "gain_weight", "maintain_weight", "build_muscle"]
          }
        }
      }
    },
    {
      "name": "update_weight_prefs",
      "category": "Weight Tracking",
      "description": "Updates a user's weight goals and preferences. This affects future meal plan generation and calorie calculations.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "target_weight_kg": {
            "type": "number"
          },
          "weekly_goal_kg": {
            "type": "number"
          },
          "height_cm": {
            "type": "number"
          },
          "activity_level": {
            "type": "string",
            "enum": ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]
          },
          "strategy": {
            "type": "string",
            "enum": ["lose_weight", "gain_weight", "maintain_weight", "build_muscle"]
          }
        },
        "required": ["user_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "updated_preferences": {
            "type": "object"
          }
        }
      }
    },
    {
      "name": "get_delivery_recommendations",
      "category": "Delivery Integration",
      "description": "Provides personalized meal delivery service recommendations based on user location, meal plan, and preferences. Integrates with multiple delivery providers across 25 countries.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "Unique user identifier"
          },
          "location": {
            "type": "object",
            "properties": {
              "latitude": {
                "type": "number"
              },
              "longitude": {
                "type": "number"
              }
            },
            "required": ["latitude", "longitude"]
          },
          "meal_plan_id": {
            "type": "string",
            "description": "Optional meal plan to match against"
          },
          "budget": {
            "type": "number",
            "description": "Maximum weekly budget in local currency"
          }
        },
        "required": ["user_id", "location"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "providers": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "rating": {
                  "type": "number"
                },
                "estimated_cost": {
                  "type": "number"
                },
                "delivery_days": {
                  "type": "integer"
                },
                "match_score": {
                  "type": "number",
                  "description": "How well this matches the meal plan (0-100)"
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "mealme_search",
      "category": "MealMe Integration",
      "description": "Searches for restaurants and meals via the MealMe API based on location, cuisine type, and dietary filters. Returns available restaurants with menu items.",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "object",
            "properties": {
              "latitude": {
                "type": "number"
              },
              "longitude": {
                "type": "number"
              }
            },
            "required": ["latitude", "longitude"]
          },
          "query": {
            "type": "string",
            "description": "Search term (e.g., 'pizza', 'vegan', 'thai food')"
          },
          "radius_km": {
            "type": "number",
            "description": "Search radius in kilometers",
            "default": 5
          },
          "diet_filters": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Dietary filters (e.g., vegan, gluten-free, halal)"
          }
        },
        "required": ["location"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "restaurants": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "name": {
                  "type": "string"
                },
                "cuisine": {
                  "type": "string"
                },
                "rating": {
                  "type": "number"
                },
                "distance_km": {
                  "type": "number"
                },
                "menu_items": {
                  "type": "array"
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "mealme_create_cart",
      "category": "MealMe Integration",
      "description": "Creates a shopping cart in the MealMe system with selected menu items from a restaurant. This is the first step in the ordering process.",
      "input_schema": {
        "type": "object",
        "properties": {
          "restaurant_id": {
            "type": "string",
            "description": "MealMe restaurant identifier"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "item_id": {
                  "type": "string"
                },
                "quantity": {
                  "type": "integer"
                },
                "customizations": {
                  "type": "object"
                }
              },
              "required": ["item_id", "quantity"]
            }
          },
          "user_id": {
            "type": "string"
          }
        },
        "required": ["restaurant_id", "items"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "cart_id": {
            "type": "string"
          },
          "subtotal": {
            "type": "number"
          },
          "tax": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        }
      }
    },
    {
      "name": "mealme_get_quotes",
      "category": "MealMe Integration",
      "description": "Retrieves delivery quotes for a cart from available delivery providers. Shows estimated delivery time and cost for each option.",
      "input_schema": {
        "type": "object",
        "properties": {
          "cart_id": {
            "type": "string",
            "description": "Cart identifier from mealme_create_cart"
          },
          "delivery_address": {
            "type": "object",
            "properties": {
              "street": {
                "type": "string"
              },
              "city": {
                "type": "string"
              },
              "state": {
                "type": "string"
              },
              "zip": {
                "type": "string"
              },
              "country": {
                "type": "string"
              }
            },
            "required": ["street", "city", "zip"]
          }
        },
        "required": ["cart_id", "delivery_address"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "quotes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "quote_id": {
                  "type": "string"
                },
                "provider": {
                  "type": "string"
                },
                "delivery_fee": {
                  "type": "number"
                },
                "estimated_delivery_time": {
                  "type": "string"
                },
                "total_cost": {
                  "type": "number"
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "mealme_checkout_url",
      "category": "MealMe Integration",
      "description": "Generates a checkout URL for completing the order payment. Users are redirected to MealMe's secure checkout to finalize the purchase.",
      "input_schema": {
        "type": "object",
        "properties": {
          "cart_id": {
            "type": "string"
          },
          "quote_id": {
            "type": "string",
            "description": "Selected delivery quote"
          },
          "return_url": {
            "type": "string",
            "description": "URL to redirect after checkout"
          }
        },
        "required": ["cart_id", "quote_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "checkout_url": {
            "type": "string",
            "description": "URL for user to complete payment"
          },
          "expires_at": {
            "type": "string",
            "description": "When this checkout URL expires"
          }
        }
      }
    },
    {
      "name": "mealme_webhook",
      "category": "MealMe Integration",
      "description": "Internal webhook handler for MealMe order status updates. This is called by MealMe's system, not by end users. Processes order confirmations, delivery updates, and cancellations.",
      "input_schema": {
        "type": "object",
        "properties": {
          "event_type": {
            "type": "string",
            "enum": ["order_confirmed", "order_preparing", "order_out_for_delivery", "order_delivered", "order_cancelled"]
          },
          "order_id": {
            "type": "string"
          },
          "timestamp": {
            "type": "string"
          },
          "data": {
            "type": "object"
          }
        },
        "required": ["event_type", "order_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "acknowledged": {
            "type": "boolean"
          }
        }
      }
    },
    {
      "name": "mealme_order_plan",
      "category": "MealMe Integration",
      "description": "Orders an entire meal plan through MealMe by creating multiple carts and scheduling deliveries across the week. This is a high-level convenience function that automates the full ordering workflow.",
      "input_schema": {
        "type": "object",
        "properties": {
          "plan_id": {
            "type": "string",
            "description": "Meal plan to order"
          },
          "user_id": {
            "type": "string"
          },
          "delivery_schedule": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "date": {
                  "type": "string"
                },
                "meals": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            },
            "description": "When to deliver which meals"
          },
          "delivery_address": {
            "type": "object"
          }
        },
        "required": ["plan_id", "user_id", "delivery_schedule", "delivery_address"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "orders": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "order_id": {
                  "type": "string"
                },
                "delivery_date": {
                  "type": "string"
                },
                "status": {
                  "type": "string"
                },
                "total_cost": {
                  "type": "number"
                }
              }
            }
          },
          "total_plan_cost": {
            "type": "number"
          }
        }
      }
    },
    {
      "name": "normalize_ingredients",
      "category": "MealMe Integration",
      "description": "Normalizes ingredient names to standard forms for better matching across recipes, grocery lists, and restaurant menus. Handles plurals, synonyms, and common variations.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ingredients": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of ingredient names to normalize"
          }
        },
        "required": ["ingredients"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "normalized": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "original": {
                  "type": "string"
                },
                "normalized": {
                  "type": "string"
                },
                "category": {
                  "type": "string",
                  "description": "Food category (e.g., vegetable, protein, grain)"
                },
                "confidence": {
                  "type": "number",
                  "description": "Confidence in normalization (0-1)"
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "get_user_location",
      "category": "Geolocation",
      "description": "Detects user's geographic location from IP address or explicit coordinates. Returns country, city, and coordinates for localization and service availability.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ip": {
            "type": "string",
            "description": "IP address to geolocate (optional, uses request IP if not provided)"
          },
          "user_id": {
            "type": "string",
            "description": "User ID to associate location with"
          }
        }
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "country_code": {
            "type": "string"
          },
          "country_name": {
            "type": "string"
          },
          "city": {
            "type": "string"
          },
          "latitude": {
            "type": "number"
          },
          "longitude": {
            "type": "number"
          },
          "supported": {
            "type": "boolean",
            "description": "Whether this country is supported by TheLoopGPT.ai"
          }
        }
      }
    },
    {
      "name": "update_user_location",
      "category": "Geolocation",
      "description": "Updates a user's stored location preferences. This affects which grocery affiliates, delivery services, and restaurants are shown.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string"
          },
          "country_code": {
            "type": "string"
          },
          "city": {
            "type": "string"
          },
          "latitude": {
            "type": "number"
          },
          "longitude": {
            "type": "number"
          },
          "timezone": {
            "type": "string",
            "description": "IANA timezone identifier (e.g., America/New_York)"
          }
        },
        "required": ["user_id", "country_code"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "updated_location": {
            "type": "object"
          }
        }
      }
    },
    {
      "name": "get_affiliate_by_country",
      "category": "Geolocation",
      "description": "Retrieves available grocery and meal delivery affiliate partners for a specific country. Returns providers with commission rates and service details.",
      "input_schema": {
        "type": "object",
        "properties": {
          "country_code": {
            "type": "string",
            "description": "ISO 3166-1 alpha-2 country code"
          },
          "service_type": {
            "type": "string",
            "enum": ["grocery", "meal_delivery", "both"],
            "default": "both"
          }
        },
        "required": ["country_code"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "country": {
            "type": "string"
          },
          "affiliates": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "commission_rate": {
                  "type": "number"
                },
                "coverage": {
                  "type": "string",
                  "description": "Geographic coverage (e.g., nationwide, major cities)"
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "change_location",
      "category": "Geolocation",
      "description": "Changes a user's active country/region, updating all associated preferences including language, currency, available services, and affiliate partners.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string"
          },
          "new_country_code": {
            "type": "string"
          },
          "update_language": {
            "type": "boolean",
            "description": "Whether to update language to country default",
            "default": true
          },
          "update_currency": {
            "type": "boolean",
            "description": "Whether to update currency to country default",
            "default": true
          }
        },
        "required": ["user_id", "new_country_code"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "message": {
            "type": "string"
          },
          "new_settings": {
            "type": "object",
            "properties": {
              "country": {
                "type": "string"
              },
              "language": {
                "type": "string"
              },
              "currency": {
                "type": "string"
              },
              "available_services": {
                "type": "array"
              }
            }
          }
        }
      }
    },
    {
      "name": "recipes_creative_recipe",
      "category": "Recipe Generation",
      "description": "Transform random leftover ingredients into creative, hilarious recipes with chaos ratings. Perfect for using random fridge items, reducing food waste, and discovering unexpected flavor combinations. Features chef personalities, dietary restriction support, and shareable recipe cards.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ingredients": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of ingredients you have available. Can be random, mismatched, or unusual combinations."
          },
          "dietary_restrictions": {
            "type": "string",
            "enum": ["none", "vegan", "vegetarian", "gluten-free", "low-carb", "dairy-free", "nut-free", "keto", "paleo"],
            "default": "none",
            "description": "Dietary restrictions: none (no restrictions), vegan (no animal products), vegetarian (no meat/fish), gluten-free (no wheat/gluten), low-carb (minimal carbs), dairy-free (no milk products), nut-free (no nuts), keto (high-fat low-carb), paleo (no grains/dairy/processed foods)"
          },
          "vibe": {
            "type": "string",
            "enum": ["comfort", "quick", "healthy", "impressive", "chaos", "normal", "surprise-me"],
            "default": "comfort",
            "description": "Cooking vibe/mood: comfort = cozy warming comfort food, quick = fast meals under 20 minutes, healthy = nutritious fresh options, impressive = elegant dishes to wow guests, chaos = wild unexpected combinations (maximum chaos/weirdness), normal = balanced everyday meals, surprise-me = random vibe chosen by the chef"
          },
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID for personalized delivery options (optional)"
          }
        },
        "required": ["ingredients"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "recipe_markdown": {
            "type": "string",
            "description": "Fully formatted recipe in markdown with chef personality, chaos rating, ingredients, instructions, and pro tips"
          },
          "canva_image_url": {
            "type": "string",
            "description": "URL to shareable recipe card image (1080x1920px) generated via Canva"
          },
          "recipe_data": {
            "type": "object",
            "description": "Structured recipe data",
            "properties": {
              "recipe_name": {
                "type": "string"
              },
              "chaos_rating": {
                "type": "integer",
                "description": "Chaos rating from 1-10"
              },
              "time_minutes": {
                "type": "integer"
              },
              "difficulty": {
                "type": "string",
                "enum": ["Easy", "Medium", "Hard"]
              },
              "chef_name": {
                "type": "string",
                "description": "Chef personality (Jamie Leftover, Paul Leftovuse, or Gordon Leftover-Slay)"
              },
              "ingredients_you_have": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "ingredients_to_add": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "instructions": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "pro_tip": {
                "type": "string"
              }
            }
          }
        }
      }
    },
    {
      "name": "nutrition_analyze",
      "category": "Nutrition Analysis",
      "description": "Analyzes a recipe and returns comprehensive nutritional information including macros (calories, protein, carbs, fat, fiber, sugar, sodium), micronutrients (vitamins, minerals), diet tags (vegan, keto, gluten-free, etc.), and confidence scoring. Supports 40+ common ingredients with USDA-based nutrition data. Automatically responds in the same language as the recipe name and ingredients. Perfect for meal planning, diet tracking, and understanding nutritional content.",
      "input_schema": {
        "type": "object",
        "properties": {
          "recipeName": {
            "type": "string",
            "description": "Name of the recipe to analyze (in any language, e.g., 'Chicken Stir Fry', '鸡肉炒饭', 'Pollo Salteado')"
          },
          "servings": {
            "type": "integer",
            "description": "Number of servings the recipe makes",
            "minimum": 1
          },
          "ingredients": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string",
                  "description": "Ingredient name in any language (e.g., 'chicken breast', '鸡胸肉', 'pechuga de pollo')"
                },
                "quantity": {
                  "type": "number",
                  "description": "Quantity of the ingredient",
                  "minimum": 0
                },
                "unit": {
                  "type": "string",
                  "description": "Unit of measurement: g (grams), kg (kilograms), ml (milliliters), cup, tbsp (tablespoon), tsp (teaspoon), oz (ounce), lb (pound), piece, slice, whole, or localized units"
                }
              },
              "required": ["name", "quantity", "unit"]
            },
            "description": "List of ingredients with quantities and units"
          },
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID for personalized healthy delivery recommendations (optional)"
          }
        },
        "required": ["recipeName", "servings", "ingredients"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "nutrition_markdown": {
            "type": "string",
            "description": "Fully formatted nutrition analysis in markdown, presented in the same language as the recipe name. Includes per-serving and total nutrition, micronutrients, diet tags, and confidence level."
          },
          "nutrition_data": {
            "type": "object",
            "description": "Structured nutrition data",
            "properties": {
              "perServingNutrition": {
                "type": "object",
                "properties": {
                  "calories": {"type": "integer"},
                  "protein_g": {"type": "number"},
                  "carbs_g": {"type": "number"},
                  "fat_g": {"type": "number"},
                  "fiber_g": {"type": "number"},
                  "sugar_g": {"type": "number"},
                  "sodium_mg": {"type": "integer"}
                }
              },
              "totalNutrition": {
                "type": "object",
                "description": "Same structure as perServingNutrition"
              },
              "micronutrients": {
                "type": "object",
                "properties": {
                  "vitamin_a_mcg": {"type": "integer"},
                  "vitamin_c_mg": {"type": "integer"},
                  "vitamin_e_mg": {"type": "number"},
                  "calcium_mg": {"type": "integer"},
                  "iron_mg": {"type": "number"},
                  "potassium_mg": {"type": "integer"}
                }
              },
              "dietTags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Array of diet tags: vegan, vegetarian, gluten_free, dairy_free, high_protein, high_fiber, low_carb, low_fat, low_sodium, low_sugar, keto_friendly, paleo_friendly"
              },
              "confidenceLevel": {
                "type": "string",
                "enum": ["high", "medium", "low"],
                "description": "Confidence level of the nutrition estimate based on ingredient database coverage"
              },
              "servings": {
                "type": "integer"
              },
              "insights": {
                "type": "string",
                "description": "Analysis notes about data sources and accuracy"
              }
            }
          }
        }
      }
    },
    {
      "name": "tracker_log_food",
      "category": "Calorie Tracking",
      "description": "Log food intake with detailed nutrition tracking. Searches the food database (107+ foods), calculates macros, updates daily summary, and maintains streak tracking. Supports custom foods and meal categorization (breakfast, lunch, dinner, snack).",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID for tracking"
          },
          "food_name": {
            "type": "string",
            "description": "Name of the food to log (e.g., 'Chicken Breast', 'Apple', 'Pizza')"
          },
          "quantity": {
            "type": "number",
            "description": "Quantity of food consumed",
            "minimum": 0
          },
          "quantity_unit": {
            "type": "string",
            "description": "Unit of measurement: g, kg, ml, cup, tbsp, tsp, oz, lb, piece, slice, serving",
            "default": "g"
          },
          "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Type of meal",
            "default": "snack"
          },
          "log_date": {
            "type": "string",
            "description": "Date to log (YYYY-MM-DD format). Defaults to today if not provided."
          }
        },
        "required": ["chatgpt_user_id", "food_name", "quantity"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean"},
          "message": {"type": "string"},
          "log_entry": {
            "type": "object",
            "properties": {
              "food_name": {"type": "string"},
              "calories": {"type": "integer"},
              "protein_g": {"type": "number"},
              "carbs_g": {"type": "number"},
              "fat_g": {"type": "number"},
              "meal_type": {"type": "string"}
            }
          },
          "daily_progress": {
            "type": "object",
            "properties": {
              "calories_consumed": {"type": "integer"},
              "calories_remaining": {"type": "integer"},
              "protein_consumed_g": {"type": "number"},
              "current_streak_days": {"type": "integer"}
            }
          }
        }
      }
    },
    {
      "name": "tracker_get_daily_summary",
      "category": "Calorie Tracking",
      "description": "Get comprehensive daily nutrition summary with progress tracking, meal breakdown, streak stats, and personalized insights. Shows calories, macros (protein, carbs, fat, fiber), progress toward goals, and all food logs for the day.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID"
          },
          "date": {
            "type": "string",
            "description": "Date for summary (YYYY-MM-DD format). Defaults to today if not provided."
          }
        },
        "required": ["chatgpt_user_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean"},
          "date": {"type": "string"},
          "summary": {
            "type": "object",
            "properties": {
              "calories": {
                "type": "object",
                "properties": {
                  "consumed": {"type": "integer"},
                  "target": {"type": "integer"},
                  "remaining": {"type": "integer"},
                  "progress_percent": {"type": "integer"}
                }
              },
              "protein": {
                "type": "object",
                "properties": {
                  "consumed_g": {"type": "number"},
                  "target_g": {"type": "integer"},
                  "remaining_g": {"type": "number"},
                  "progress_percent": {"type": "integer"}
                }
              }
            }
          },
          "stats": {
            "type": "object",
            "properties": {
              "current_streak_days": {"type": "integer"},
              "longest_streak_days": {"type": "integer"},
              "total_days_logged": {"type": "integer"}
            }
          },
          "insights": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Personalized insights and recommendations"
          }
        }
      }
    },
    {
      "name": "tracker_set_goals",
      "category": "Calorie Tracking",
      "description": "Set or update nutrition goals and user profile. Supports automatic macro calculation based on weight, height, age, activity level, and goal type (weight loss, muscle gain, maintenance). Creates personalized daily targets for calories, protein, carbs, and fat.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID"
          },
          "age": {
            "type": "integer",
            "description": "Age in years",
            "minimum": 13,
            "maximum": 120
          },
          "height_cm": {
            "type": "integer",
            "description": "Height in centimeters",
            "minimum": 100,
            "maximum": 250
          },
          "weight_kg": {
            "type": "number",
            "description": "Weight in kilograms",
            "minimum": 30,
            "maximum": 300
          },
          "gender": {
            "type": "string",
            "enum": ["male", "female", "other"],
            "description": "Gender for BMR calculation"
          },
          "activity_level": {
            "type": "string",
            "enum": ["sedentary", "light", "moderate", "active", "very_active"],
            "description": "Physical activity level"
          },
          "goal_type": {
            "type": "string",
            "enum": ["weight_loss", "muscle_gain", "maintenance", "health"],
            "description": "Primary fitness goal"
          },
          "daily_calorie_target": {
            "type": "integer",
            "description": "Manual daily calorie target (overrides auto-calculation)",
            "minimum": 1000,
            "maximum": 5000
          },
          "daily_protein_target_g": {
            "type": "integer",
            "description": "Manual daily protein target in grams",
            "minimum": 50,
            "maximum": 400
          }
        },
        "required": ["chatgpt_user_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean"},
          "message": {"type": "string"},
          "user": {
            "type": "object",
            "properties": {
              "chatgpt_user_id": {"type": "string"},
              "age": {"type": "integer"},
              "weight_kg": {"type": "number"},
              "goal_type": {"type": "string"},
              "daily_targets": {
                "type": "object",
                "properties": {
                  "calories": {"type": "integer"},
                  "protein_g": {"type": "integer"},
                  "carbs_g": {"type": "integer"},
                  "fat_g": {"type": "integer"}
                }
              }
            }
          }
        }
      }
    },
    {
      "name": "tracker_quick_add_calories",
      "category": "Calorie Tracking",
      "description": "Quickly log calories without detailed food information. Perfect for when you know the calorie count but don't want to search for specific foods. Automatically estimates macros and updates daily summary and streak tracking.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "ChatGPT user ID"
          },
          "calories": {
            "type": "integer",
            "description": "Number of calories to log",
            "minimum": 0,
            "maximum": 10000
          },
          "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Type of meal",
            "default": "snack"
          },
          "description": {
            "type": "string",
            "description": "Optional description of what you ate",
            "default": "Quick add"
          },
          "log_date": {
            "type": "string",
            "description": "Date to log (YYYY-MM-DD format). Defaults to today."
          }
        },
        "required": ["chatgpt_user_id", "calories"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean"},
          "message": {"type": "string"},
          "log_entry": {
            "type": "object",
            "properties": {
              "description": {"type": "string"},
              "calories": {"type": "integer"},
              "meal_type": {"type": "string"},
              "estimated_macros": {
                "type": "object",
                "properties": {
                  "protein_g": {"type": "integer"},
                  "carbs_g": {"type": "integer"},
                  "fat_g": {"type": "integer"}
                }
              }
            }
          }
        }
      }
    }
  ]
}

;
