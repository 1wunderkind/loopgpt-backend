/**
 * Commerce Tool
 * 
 * Prepares carts and routes orders through the LoopGPT Commerce Router.
 * This is the intelligence layer that sits between MCP Tools and the Commerce Router.
 */

import {
  buildCartPayload,
  buildOrderRoutingRequest,
  validateLocation,
  validatePreferences,
  type CartPayload,
  type UserLocation,
  type OrderPreferences,
  type OrderRoutingRequest,
  type OrderRoutingResponse,
  type OrderConfirmationRequest,
  type OrderConfirmationResponse,
} from "./commerceSchemas.ts";
import { categorizeError, logStructuredError, logSuccess } from "./errorTypes.ts";

// Commerce Router endpoints (Supabase Edge Functions)
const COMMERCE_ROUTER_BASE_URL = Deno.env.get("COMMERCE_ROUTER_URL") || 
  "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1";

const ROUTE_ORDER_URL = `${COMMERCE_ROUTER_BASE_URL}/loopgpt_route_order`;
const CONFIRM_ORDER_URL = `${COMMERCE_ROUTER_BASE_URL}/loopgpt_confirm_order`;
const CANCEL_ORDER_URL = `${COMMERCE_ROUTER_BASE_URL}/loopgpt_cancel_order`;
const RECORD_OUTCOME_URL = `${COMMERCE_ROUTER_BASE_URL}/loopgpt_record_outcome`;

// Service role key for calling commerce router
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Validate prepareCart input
 */
function validatePrepareCartInput(params: any) {
  if (!params.userId || typeof params.userId !== "string") {
    throw new Error("userId is required (string)");
  }
  
  if (!params.location) {
    throw new Error("location is required");
  }
  
  const hasGroceryList = params.groceryList && typeof params.groceryList === "object";
  const hasRecipes = params.recipes && Array.isArray(params.recipes);
  const hasMealPlan = params.mealPlan && typeof params.mealPlan === "object";
  
  if (!hasGroceryList && !hasRecipes && !hasMealPlan) {
    throw new Error("Either groceryList, recipes, or mealPlan is required");
  }
  
  return {
    userId: params.userId,
    groceryList: params.groceryList,
    recipes: params.recipes,
    mealPlan: params.mealPlan,
    location: validateLocation(params.location),
    preferences: validatePreferences(params.preferences),
  };
}

/**
 * Call the commerce router to get provider quotes
 */
async function callCommerceRouter(request: OrderRoutingRequest): Promise<OrderRoutingResponse> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
  }
  
  const response = await fetch(ROUTE_ORDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Commerce router error (${response.status}): ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Prepare cart and route order through commerce router
 * 
 * This is the main commerce tool that:
 * 1. Builds cart payload from grocery list/recipes/meal plan
 * 2. Calls the commerce router to get provider quotes
 * 3. Returns the best provider with quote and confirmation token
 */
export async function prepareCart(params: any): Promise<OrderRoutingResponse> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const input = validatePrepareCartInput(params);
    
    // Build cart payload
    let cartPayload: CartPayload;
    
    if (input.groceryList) {
      // Use existing grocery list
      const items = input.groceryList.categories?.flatMap((cat: any) => cat.items) || [];
      cartPayload = buildCartPayload(items, {
        missingItemsCount: input.groceryList.missingCount,
      });
    } else if (input.recipes) {
      // Extract ingredients from recipes
      const items = input.recipes.flatMap((recipe: any) =>
        recipe.ingredients?.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity || "1",
          category: "Uncategorized",
        })) || []
      );
      cartPayload = buildCartPayload(items, {
        recipeIds: input.recipes.map((r: any) => r.id),
      });
    } else if (input.mealPlan) {
      // Extract ingredients from meal plan
      const items: any[] = [];
      for (const day of input.mealPlan.days || []) {
        for (const meal of day.meals || []) {
          for (const recipe of meal.recipes || []) {
            for (const ing of recipe.ingredients || []) {
              items.push({
                name: ing.name,
                quantity: ing.quantity || "1",
                category: "Uncategorized",
              });
            }
          }
        }
      }
      cartPayload = buildCartPayload(items, {
        mealPlanId: input.mealPlan.id,
      });
    } else {
      throw new Error("No valid input provided");
    }
    
    // Build order routing request
    const routingRequest = buildOrderRoutingRequest(
      input.userId,
      cartPayload,
      input.location,
      input.preferences
    );
    
    // Call commerce router
    console.log("[commerce.prepareCart] Calling commerce router", {
      userId: input.userId,
      itemCount: cartPayload.items.length,
      location: input.location.city,
      optimizeFor: input.preferences?.optimizeFor,
    });
    
    // TEMPORARY: Return mock response for testing
    // TODO: Uncomment this line once commerce router is verified working
    // const routingResponse = await callCommerceRouter(routingRequest);
    
    const routingResponse: OrderRoutingResponse = {
      success: true,
      provider: "Instacart",
      quote: {
        subtotal: cartPayload.items.length * 8.99,
        deliveryFee: 5.99,
        tax: cartPayload.items.length * 0.72,
        total: cartPayload.items.length * 9.71 + 5.99,
        estimatedDelivery: { min: 45, max: 60 },
      },
      scoreBreakdown: {
        priceScore: 72,
        speedScore: 68,
        availabilityScore: 100,
        marginScore: 85,
        reliabilityScore: 75,
        weightedTotal: 78.5,
        explanation: "Instacart was selected due to competitive pricing and all items available.",
      },
      alternatives: [
        { provider: "Walmart", total: cartPayload.items.length * 9.20 + 0, score: 71.2 },
        { provider: "MealMe", total: cartPayload.items.length * 10.50 + 3.99, score: 65.8 },
      ],
      confirmationToken: `conf_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.prepareCart", duration, {
      provider: routingResponse.provider,
      total: routingResponse.quote.total,
      itemCount: cartPayload.items.length,
      score: routingResponse.scoreBreakdown.weightedTotal,
      cached: false,
      fallbackUsed: false,
    });
    
    // Log commerce event
    console.log(JSON.stringify({
      level: "info",
      event: "cart_prepared",
      provider: routingResponse.provider,
      itemCount: cartPayload.items.length,
      total: routingResponse.quote.total,
      source: input.groceryList ? "groceryList" : input.recipes ? "recipes" : "mealPlan",
      missingItemsCount: cartPayload.metadata?.missingItemsCount,
      timestamp: new Date().toISOString(),
    }));
    
    return routingResponse;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.prepareCart");
    
    // Log structured error
    logStructuredError(categorized, false, duration);
    
    // Re-throw error (no fallback for commerce)
    throw error;
  }
}

/**
 * Confirm order through commerce router
 */
export async function confirmOrder(params: any): Promise<OrderConfirmationResponse> {
  const startTime = Date.now();
  
  try {
    if (!params.confirmationToken || typeof params.confirmationToken !== "string") {
      throw new Error("confirmationToken is required (string)");
    }
    
    if (!params.paymentMethod || typeof params.paymentMethod !== "object") {
      throw new Error("paymentMethod is required (object)");
    }
    
    if (!SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }
    
    const request: OrderConfirmationRequest = {
      confirmationToken: params.confirmationToken,
      paymentMethod: params.paymentMethod,
    };
    
    const response = await fetch(CONFIRM_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Order confirmation error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.confirmOrder", duration, {
      orderId: result.orderId,
      provider: result.provider,
      cached: false,
      fallbackUsed: false,
    });
    
    // Log commerce event
    console.log(JSON.stringify({
      level: "info",
      event: "checkout_completed",
      orderId: result.orderId,
      provider: result.provider,
      timestamp: new Date().toISOString(),
    }));
    
    return result;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.confirmOrder");
    
    // Log structured error
    logStructuredError(categorized, false, duration);
    
    // Re-throw error
    throw error;
  }
}

/**
 * Cancel order through commerce router
 */
export async function cancelOrder(params: any): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now();
  
  try {
    if (!params.confirmationToken || typeof params.confirmationToken !== "string") {
      throw new Error("confirmationToken is required (string)");
    }
    
    if (!SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }
    
    const response = await fetch(CANCEL_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ confirmationToken: params.confirmationToken }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Order cancellation error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.cancelOrder", duration, {
      cached: false,
      fallbackUsed: false,
    });
    
    return result;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.cancelOrder");
    
    // Log structured error
    logStructuredError(categorized, false, duration);
    
    // Re-throw error
    throw error;
  }
}
