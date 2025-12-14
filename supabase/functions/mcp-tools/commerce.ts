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
import { createCartSession, getCartSession, updateCartSession, getLatestActiveSession } from "../_shared/commerce/cartSession.ts";
import { FaultInjection } from "../_shared/testing/faultInjection.ts";

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
    
    // Call real commerce router
    const routingResponse = await callCommerceRouter(routingRequest);

    // Persist draft cart session
    const cartSession = await createCartSession({
      user_id: input.userId,
      selected_provider: routingResponse.provider,
      selected_provider_id: routingResponse.providerId,
      alternatives: routingResponse.alternatives,
      cart: cartPayload,
      quote: routingResponse.quote,
      score_breakdown: routingResponse.scoreBreakdown,
      affiliate_url: routingResponse.affiliateUrl,
      confirmation_token: routingResponse.confirmationToken,
      status: "awaiting_consent",
    });
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.prepareCart", duration, {
      provider: routingResponse.provider,
      total: routingResponse.quote.total,
      itemCount: cartPayload.items.length,
      score: routingResponse.scoreBreakdown.weightedTotal,
      cached: false,
      fallbackUsed: false,
      cartSessionId: cartSession.id,
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
      cartSessionId: cartSession.id,
      timestamp: new Date().toISOString(),
    }));
    
    // Return enhanced response with session ID and narrative
    return {
      ...routingResponse,
      cartSessionId: cartSession.id,
      status: "awaiting_consent",
      message: `I found the best option via ${routingResponse.provider}. Would you like me to place this order? I can switch providers automatically if something fails.`,
    };
    
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
 * Confirm user consent for a cart session
 */
export async function confirmConsent(params: any): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now();
  
  try {
    if (!params.cartSessionId || typeof params.cartSessionId !== "string") {
      throw new Error("cartSessionId is required (string)");
    }
    
    // 1. Get session
    const session = await getCartSession(params.cartSessionId);
    if (!session) {
      throw new Error("Cart session not found");
    }
    
    // 2. Validate ownership (userId check should be done by caller/middleware, but we check if passed)
    if (params.userId && session.user_id !== params.userId) {
      throw new Error("Unauthorized access to cart session");
    }
    
    // 3. Validate status
    if (session.status !== "awaiting_consent") {
      throw new Error(`Invalid session status: ${session.status}. Expected: awaiting_consent`);
    }
    
    // 4. Validate expiry
    if (new Date(session.expires_at) < new Date()) {
      throw new Error("Cart session has expired");
    }
    
    // 5. Update session
    await updateCartSession(session.id, {
      allow_failover: !!params.allowFailover,
      allow_auto_confirm: !!params.allowAutoConfirm,
      status: "confirmed_pending_execution",
    });
    
    // 6. Log audit event
    console.log(JSON.stringify({
      level: "info",
      event: "COMMERCE_CONSENT_GRANTED",
      cartSessionId: session.id,
      userId: session.user_id,
      allowFailover: !!params.allowFailover,
      allowAutoConfirm: !!params.allowAutoConfirm,
      timestamp: new Date().toISOString(),
    }));
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.confirmConsent", duration, {
      cartSessionId: session.id,
      cached: false,
      fallbackUsed: false,
    });
    
    return {
      success: true,
      message: "Got it — I’ll place the order and switch providers automatically if needed.",
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.confirmConsent");
    logStructuredError(categorized, false, duration);
    throw error;
  }
}

/**
 * Confirm order through commerce router (Idempotent & Session-Aware)
 */
export async function confirmOrder(params: any): Promise<OrderConfirmationResponse> {
  const startTime = Date.now();
  
  try {
    // 1. Validate Input
    if (!params.cartSessionId || typeof params.cartSessionId !== "string") {
      throw new Error("cartSessionId is required (string)");
    }
    
    if (!params.paymentMethod || typeof params.paymentMethod !== "object") {
      throw new Error("paymentMethod is required (object)");
    }
    
    if (!SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }

    // 2. Load Session
    const session = await getCartSession(params.cartSessionId);
    if (!session) {
      throw new Error("Cart session not found");
    }

    // 3. Check Idempotency
    if (session.status === "confirmed") {
      console.log(`[commerce.confirmOrder] Session ${session.id} already confirmed. Returning success.`);
      return {
        orderId: "idempotent-replay", // In real world, store orderId in session
        provider: session.selected_provider || "unknown",
        status: "confirmed",
        totalCharged: session.quote.total,
        currency: session.quote.currency,
        estimatedDelivery: "See original confirmation",
      };
    }

    // 4. Validate State
    if (session.status !== "confirmed_pending_execution") {
      throw new Error(`Invalid session status: ${session.status}. Must be confirmed_pending_execution.`);
    }

    if (new Date(session.expires_at) < new Date()) {
      throw new Error("Cart session has expired");
    }

    // 5. Execute Confirmation (with Failover Logic)
    let currentToken = session.confirmation_token;
    let currentProvider = session.selected_provider;
    let attempts = 0;
    const maxAttempts = session.allow_failover ? 3 : 1; // Try up to 3 providers if failover allowed

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        if (!currentToken) throw new Error("No confirmation token available");

        console.log(`[commerce.confirmOrder] Attempt ${attempts}/${maxAttempts} with ${currentProvider}`);

        const request: OrderConfirmationRequest = {
          confirmationToken: currentToken,
          paymentMethod: params.paymentMethod,
        };
        
        // Fault Injection Hook
        await FaultInjection.injectLatency("confirm_order");
        FaultInjection.injectFailure(currentProvider || "unknown", "confirm_order");

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

        // Success! Update session
        await updateCartSession(session.id, {
          status: "confirmed",
          selected_provider: result.provider, // In case it changed
        });

        const duration = Date.now() - startTime;
        logSuccess("commerce.confirmOrder", duration, {
          orderId: result.orderId,
          provider: result.provider,
          cached: false,
          fallbackUsed: attempts > 1,
          cartSessionId: session.id,
        });
        
        console.log(JSON.stringify({
          level: "info",
          event: "checkout_completed",
          orderId: result.orderId,
          provider: result.provider,
          cartSessionId: session.id,
          timestamp: new Date().toISOString(),
        }));
        
        return result;

      } catch (error: any) {
        console.error(`[commerce.confirmOrder] Attempt ${attempts} failed:`, error);
        
        // Record failure
        await updateCartSession(session.id, {
          last_error: {
            message: error.message,
            provider: currentProvider,
            timestamp: new Date().toISOString(),
          }
        });

        // If failover allowed, try next alternative
        if (session.allow_failover && session.alternatives && session.alternatives.length > 0) {
          // Simple logic: pick next alternative (in real world, iterate properly)
          // For now, we assume alternatives contains tokens. 
          // Note: Real router would need to provide alternative tokens or we re-quote.
          // Assuming alternatives have tokens for simplicity of this step.
          const nextAlt = session.alternatives.shift(); // Destructive shift for retry queue
          if (nextAlt && nextAlt.confirmationToken) {
             currentToken = nextAlt.confirmationToken;
             currentProvider = nextAlt.provider;
             // Update session with new candidate
             await updateCartSession(session.id, {
               alternatives: session.alternatives, // Save reduced list
               selected_provider: currentProvider,
               confirmation_token: currentToken
             });
             continue; // Retry loop
          }
        }
        
        // No more alternatives or failover disabled
        await updateCartSession(session.id, { status: "failed" });
        throw error;
      }
    }
    
    throw new Error("Max confirmation attempts reached");
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.confirmOrder");
    logStructuredError(categorized, false, duration);
    throw error;
  }
}

/**
 * Resume the latest active cart session
 */
export async function resumeCart(params: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    if (!params.userId || typeof params.userId !== "string") {
      throw new Error("userId is required (string)");
    }
    
    const session = await getLatestActiveSession(params.userId);
    
    if (!session) {
      return {
        status: "none",
        message: "No active cart session found. Would you like to start a new order?",
      };
    }
    
    const duration = Date.now() - startTime;
    logSuccess("commerce.resumeCart", duration, {
      cartSessionId: session.id,
      status: session.status,
      cached: false,
      fallbackUsed: false,
    });
    
    // Construct safe summary
    const summary = {
      cartSessionId: session.id,
      status: session.status,
      provider: session.selected_provider,
      total: session.quote.total,
      itemCount: session.cart.items.length,
      expiresAt: session.expires_at,
    };
    
    let message = "";
    if (session.status === "awaiting_consent") {
      message = `You were about to order groceries from ${session.selected_provider} ($${session.quote.total}). Do you want me to continue?`;
    } else if (session.status === "confirmed_pending_execution") {
      message = `Your order with ${session.selected_provider} is confirmed and ready to execute. Should I proceed?`;
    }
    
    return {
      ...summary,
      message,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const categorized = categorizeError(error, "commerce.resumeCart");
    logStructuredError(categorized, false, duration);
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
