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
        "required": [
          "user_id",
          "diet",
          "calories_per_day"
        ]
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
        "required": [
          "user_id",
          "plan_id",
          "plan_data"
        ]
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
        "required": [
          "ingredients",
          "country_code"
        ]
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
        "required": [
          "user_id",
          "weight_kg"
        ]
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
        "required": [
          "user_id",
          "week_start"
        ]
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
            "enum": [
              "increasing",
              "decreasing",
              "stable"
            ]
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
        "required": [
          "plan_id",
          "user_id",
          "end_weight"
        ]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "outcome": {
            "type": "string",
            "enum": [
              "exceeded_goal",
              "met_goal",
              "partial_progress",
              "no_progress",
              "opposite_direction"
            ]
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
        "required": [
          "plan_id",
          "user_id",
          "overall_rating"
        ]
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
        "required": [
          "user_id"
        ]
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
            "enum": [
              "sedentary",
              "lightly_active",
              "moderately_active",
              "very_active",
              "extremely_active"
            ]
          },
          "strategy": {
            "type": "string",
            "enum": [
              "lose_weight",
              "gain_weight",
              "maintain_weight",
              "build_muscle"
            ]
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
            "enum": [
              "sedentary",
              "lightly_active",
              "moderately_active",
              "very_active",
              "extremely_active"
            ]
          },
          "strategy": {
            "type": "string",
            "enum": [
              "lose_weight",
              "gain_weight",
              "maintain_weight",
              "build_muscle"
            ]
          }
        },
        "required": [
          "user_id"
        ]
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
            "required": [
              "latitude",
              "longitude"
            ]
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
        "required": [
          "user_id",
          "location"
        ]
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
            "required": [
              "latitude",
              "longitude"
            ]
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
        "required": [
          "location"
        ]
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
              "required": [
                "item_id",
                "quantity"
              ]
            }
          },
          "user_id": {
            "type": "string"
          }
        },
        "required": [
          "restaurant_id",
          "items"
        ]
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
            "required": [
              "street",
              "city",
              "zip"
            ]
          }
        },
        "required": [
          "cart_id",
          "delivery_address"
        ]
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
        "required": [
          "cart_id",
          "quote_id"
        ]
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
            "enum": [
              "order_confirmed",
              "order_preparing",
              "order_out_for_delivery",
              "order_delivered",
              "order_cancelled"
            ]
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
        "required": [
          "event_type",
          "order_id"
        ]
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
        "required": [
          "plan_id",
          "user_id",
          "delivery_schedule",
          "delivery_address"
        ]
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
        "required": [
          "ingredients"
        ]
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
        "required": [
          "user_id",
          "country_code"
        ]
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
            "enum": [
              "grocery",
              "meal_delivery",
              "both"
            ],
            "default": "both"
          }
        },
        "required": [
          "country_code"
        ]
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
        "required": [
          "user_id",
          "new_country_code"
        ]
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
      "name": "upgrade_to_premium",
      "category": "Billing & Subscriptions",
      "description": "Initiates the premium upgrade flow by sending a magic link to the user's email. User clicks the link to complete payment via Stripe. Includes 7-day free trial.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "Unique user identifier from ChatGPT"
          },
          "email": {
            "type": "string",
            "description": "User's email address for magic link"
          },
          "plan": {
            "type": "string",
            "enum": [
              "monthly",
              "annual",
              "family"
            ],
            "description": "Subscription plan type",
            "default": "monthly"
          }
        },
        "required": [
          "chatgpt_user_id",
          "email"
        ]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "magic_link_sent": {
            "type": "boolean"
          },
          "plan": {
            "type": "string"
          },
          "plan_price": {
            "type": "string"
          },
          "trial_period": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    },
    {
      "name": "check_subscription_status",
      "category": "Billing & Subscriptions",
      "description": "Checks the user's current subscription status, tier, trial status, and remaining credits. Returns upgrade URL if not premium.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "Unique user identifier"
          }
        },
        "required": [
          "chatgpt_user_id"
        ]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "has_access": {
            "type": "boolean"
          },
          "tier": {
            "type": "string",
            "enum": [
              "free",
              "premium",
              "family"
            ]
          },
          "status": {
            "type": "string"
          },
          "trial_active": {
            "type": "boolean"
          },
          "trial_days_remaining": {
            "type": "number"
          },
          "renewal_date": {
            "type": "string"
          },
          "credits": {
            "type": "number"
          },
          "upgrade_url": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    },
    {
      "name": "manage_billing",
      "category": "Billing & Subscriptions",
      "description": "Generates a Stripe Customer Portal link for users to manage their subscription, update payment methods, view invoices, and cancel if needed.",
      "input_schema": {
        "type": "object",
        "properties": {
          "chatgpt_user_id": {
            "type": "string",
            "description": "Unique user identifier"
          }
        },
        "required": [
          "chatgpt_user_id"
        ]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "portal_url": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    },

    // ===== NEW TRACKING TOOLS =====
    {
      "name": "tracker_log_weight",
      "category": "Tracking",
      "description": "Logs a user's weight measurement. Use when the user says things like 'I weigh 175 pounds', 'log my weight as 80kg', or 'record today's weight'. Supports both pounds and kilograms with automatic conversion.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "weight": {
            "type": "number",
            "description": "Weight value"
          },
          "unit": {
            "type": "string",
            "enum": ["kg", "lbs"],
            "description": "Weight unit (kg or lbs)"
          },
          "date": {
            "type": "string",
            "description": "Date of measurement (ISO format, defaults to today)"
          }
        },
        "required": ["user_id", "weight"]
      }
    },
    {
      "name": "tracker_get_progress",
      "category": "Tracking",
      "description": "Retrieves user's weight tracking progress and trends. Use when the user asks 'how am I doing?', 'show my progress', 'what's my weight trend?', or 'am I on track?'. Returns weight history, goal progress, and trend analysis.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "period": {
            "type": "string",
            "enum": ["week", "month", "quarter", "year"],
            "description": "Time period for progress analysis"
          }
        },
        "required": ["user_id"]
      }
    },
    {
      "name": "tracker_quick_add_calories",
      "category": "Tracking",
      "description": "Quickly logs calories without detailed food information. Use when the user says 'add 500 calories', 'log 300 calories for lunch', or 'I just ate about 800 calories'. For detailed food logging, use tracker_log_meal instead.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "calories": {
            "type": "number",
            "description": "Number of calories to add"
          },
          "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Type of meal"
          },
          "note": {
            "type": "string",
            "description": "Optional note about what was eaten"
          }
        },
        "required": ["user_id", "calories"]
      }
    },
    {
      "name": "tracker_summary",
      "category": "Tracking",
      "description": "Provides daily or weekly nutrition and calorie summaries. Use when the user asks 'what did I eat today?', 'show my weekly summary', 'how many calories have I had?', or 'summarize my nutrition'. Returns totals, macro breakdown, and goal comparison.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "period": {
            "type": "string",
            "enum": ["today", "yesterday", "week", "month"],
            "description": "Summary period"
          }
        },
        "required": ["user_id"]
      }
    },
    {
      "name": "tracker_log_meal",
      "category": "Tracking",
      "description": "Logs a complete meal with detailed nutrition information. Use when the user describes what they ate with specifics like 'I had grilled chicken with rice', 'log my breakfast: eggs and toast', or 'I just ate a salad with salmon'. Calculates and stores full macro breakdown.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Type of meal"
          },
          "foods": {
            "type": "array",
            "description": "Array of food items with portions",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "quantity": { "type": "number" },
                "unit": { "type": "string" }
              }
            }
          },
          "description": {
            "type": "string",
            "description": "Free-text description of the meal"
          }
        },
        "required": ["user_id", "meal_type"]
      }
    },

    // ===== USER MANAGEMENT TOOLS =====
    {
      "name": "user_get_profile",
      "category": "User Management",
      "description": "Retrieves the user's profile including dietary preferences, goals, and settings. Use when the user asks 'what are my settings?', 'show my profile', 'what diet am I on?', or when you need context about their preferences before making recommendations.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          }
        },
        "required": ["user_id"]
      }
    },
    {
      "name": "user_set_weight_goal",
      "category": "User Management",
      "description": "Sets or updates the user's weight goal. Use when the user says 'I want to lose 10 pounds', 'my goal weight is 150', 'I want to gain 5kg of muscle', or 'set my target weight'. Calculates timeline and daily calorie targets.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "goal_weight": {
            "type": "number",
            "description": "Target weight"
          },
          "unit": {
            "type": "string",
            "enum": ["kg", "lbs"],
            "description": "Weight unit"
          },
          "goal_type": {
            "type": "string",
            "enum": ["lose", "gain", "maintain"],
            "description": "Type of weight goal"
          },
          "pace": {
            "type": "string",
            "enum": ["slow", "moderate", "aggressive"],
            "description": "Rate of change"
          }
        },
        "required": ["user_id", "goal_weight"]
      }
    },
    {
      "name": "user_update_diet_preferences",
      "category": "User Management",
      "description": "Updates dietary preferences, restrictions, and allergies. Use when the user says 'I'm vegetarian', 'I'm allergic to nuts', 'I don't eat gluten', 'I'm doing keto', or 'update my diet to vegan'. Affects all future meal recommendations.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "diet_type": {
            "type": "string",
            "description": "Diet type (e.g., vegetarian, vegan, keto, paleo)"
          },
          "allergies": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of food allergies"
          },
          "restrictions": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Foods to avoid"
          }
        },
        "required": ["user_id"]
      }
    },

    // ===== NUTRITION ANALYSIS TOOLS =====
    {
      "name": "nutrition_analyze_food",
      "category": "Nutrition Analysis",
      "description": "Analyzes the nutritional content of a food item or meal. Use when the user asks 'how many calories in a banana?', 'what's the nutrition of grilled chicken?', 'is this food healthy?', or 'analyze this meal'. Returns calories, macros, vitamins, and health insights.",
      "input_schema": {
        "type": "object",
        "properties": {
          "food": {
            "type": "string",
            "description": "Food item or meal to analyze"
          },
          "quantity": {
            "type": "number",
            "description": "Amount"
          },
          "unit": {
            "type": "string",
            "description": "Unit of measurement (g, oz, cup, serving)"
          }
        },
        "required": ["food"]
      }
    },
    {
      "name": "nutrition_get_macros",
      "category": "Nutrition Analysis",
      "description": "Calculates the macro breakdown (protein, carbs, fat) for a recipe or list of ingredients. Use when the user asks 'what are the macros for this recipe?', 'how much protein is in my meal plan?', or 'calculate the carbs in these ingredients'. Ideal for recipe analysis.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ingredients": {
            "type": "array",
            "description": "List of ingredients with quantities",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "amount": { "type": "number" },
                "unit": { "type": "string" }
              }
            }
          },
          "servings": {
            "type": "number",
            "description": "Number of servings the recipe makes"
          }
        },
        "required": ["ingredients"]
      }
    },
    {
      "name": "nutrition_compare_foods",
      "category": "Nutrition Analysis",
      "description": "Compares the nutritional value of two foods or meals side by side. Use when the user asks 'is chicken healthier than beef?', 'compare rice vs quinoa', 'which has more protein?', or 'what's the difference between these foods?'. Returns comparative analysis.",
      "input_schema": {
        "type": "object",
        "properties": {
          "food_a": {
            "type": "string",
            "description": "First food to compare"
          },
          "food_b": {
            "type": "string",
            "description": "Second food to compare"
          },
          "quantity": {
            "type": "number",
            "description": "Quantity for comparison (same for both)"
          },
          "unit": {
            "type": "string",
            "description": "Unit for comparison"
          }
        },
        "required": ["food_a", "food_b"]
      }
    },
    {
      "name": "nutrition_get_recommendations",
      "category": "Nutrition Analysis",
      "description": "Provides personalized nutrition recommendations based on user's goals and current intake. Use when the user asks 'what should I eat?', 'how can I get more protein?', 'I need to eat healthier', or 'nutrition advice'. Considers dietary preferences and deficiencies.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "focus": {
            "type": "string",
            "enum": ["weight_loss", "muscle_gain", "balanced", "energy", "specific_nutrient"],
            "description": "Area to focus recommendations on"
          }
        },
        "required": ["user_id"]
      }
    },

    // ===== FOOD DATABASE TOOLS =====
    {
      "name": "food_search",
      "category": "Food Database",
      "description": "Searches the food database for items matching a query. Use when the user needs to find specific foods, asks 'what foods have high protein?', 'find low carb snacks', or needs food options before logging. Returns matching foods with nutrition data.",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          },
          "category": {
            "type": "string",
            "description": "Food category filter"
          },
          "max_results": {
            "type": "number",
            "description": "Maximum number of results to return"
          }
        },
        "required": ["query"]
      }
    },

    // ===== MEAL PLANNING TOOLS =====
    {
      "name": "plan_generate_from_leftovers",
      "category": "Meal Planning",
      "description": "Generates creative recipes from leftover ingredients in the user's fridge. Use when the user says 'I have leftover chicken and rice', 'what can I make with these ingredients?', 'use up my leftovers', or lists random ingredients they have available. Includes Chaos Rating for entertainment value. Specialty of LeftoverGPT.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ingredients": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of available ingredients"
          },
          "preferences": {
            "type": "object",
            "description": "Optional dietary preferences and restrictions",
            "properties": {
              "diet": { "type": "string" },
              "avoid": { "type": "array", "items": { "type": "string" } },
              "max_time": { "type": "number" }
            }
          },
          "chaos_level": {
            "type": "number",
            "description": "Desired creativity level 1-10 (higher = more experimental)"
          }
        },
        "required": ["ingredients"]
      }
    },
    {
      "name": "plan_create_meal_plan",
      "category": "Meal Planning",
      "description": "Creates a structured meal plan for a specified duration. Use when the user says 'plan my meals for the week', 'create a meal plan', 'help me eat better this week', or 'I need a 7-day meal plan'. Considers calories, macros, and dietary preferences. Integrates with nutrition tracking.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "duration_days": {
            "type": "number",
            "description": "Number of days to plan (e.g., 7 for a week)"
          },
          "meals_per_day": {
            "type": "number",
            "description": "Number of meals per day (typically 3-5)"
          },
          "calories_target": {
            "type": "number",
            "description": "Daily calorie target"
          },
          "diet_type": {
            "type": "string",
            "description": "Diet type (e.g., balanced, keto, vegetarian)"
          }
        },
        "required": ["user_id", "duration_days"]
      }
    },
    {
      "name": "plan_get_active_plan",
      "category": "Meal Planning",
      "description": "Retrieves the user's current active meal plan. Use when the user asks 'what's my meal plan?', 'what should I eat today?', 'show my plan', or 'what's for dinner tonight?'. Returns the full meal plan with today's meals highlighted.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "include_past": {
            "type": "boolean",
            "description": "Whether to include meals from past days"
          }
        },
        "required": ["user_id"]
      }
    },
    {
      "name": "plan_random_meal",
      "category": "Meal Planning",
      "description": "Suggests a random meal based on user preferences and available options. Use when the user says 'I don't know what to eat', 'surprise me', 'random meal idea', or 'what should I have for dinner?'. Great for breaking decision fatigue. Respects dietary preferences.",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier (for personalization)"
          },
          "meal_type": {
            "type": "string",
            "enum": ["breakfast", "lunch", "dinner", "snack"],
            "description": "Type of meal to suggest"
          },
          "max_prep_time": {
            "type": "number",
            "description": "Maximum preparation time in minutes"
          }
        },
        "required": []
      }
    }
  ]
}
;
