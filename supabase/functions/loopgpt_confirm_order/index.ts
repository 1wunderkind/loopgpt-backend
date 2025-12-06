/**
 * LoopGPT Commerce Router - Confirm Order (with Failover)
 * Step 3: Provider Arbitrage Hardening & Failover
 * 
 * This function:
 * 1. Validates confirmation token and retrieves routing context
 * 2. Attempts to confirm order with selected provider
 * 3. On retryable failure, attempts failover to next-best alternative
 * 4. Records outcome for every attempt (success/failure)
 * 5. Returns order confirmation or clear failure message
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import { getProvider } from "../_shared/commerce/providers/providerRegistry.ts";
import type { ProviderId, AlternativeProvider } from "../_shared/commerce/types/index.ts";
import {
  logConfirmOrderStart,
  logConfirmOrderSuccess,
  logConfirmOrderFailure,
  logFailoverAttempt,
  logFailoverSuccess,
  logFailoverFailure,
} from "../_shared/commerce/commerceLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmOrderRequest {
  confirmationToken: string;
  userId: string;
  paymentMethod: {
    type: string;
    token: string;
  };
  // Optional: routing context for failover
  routingContext?: {
    primaryProviderId: ProviderId;
    alternatives?: AlternativeProvider[];
  };
}

interface ConfirmOrderResponse {
  success: boolean;
  orderId?: string;
  orderIds?: string[];
  trackingUrls?: string[];
  estimatedDelivery?: string;
  provider?: string;
  providerId?: ProviderId;
  failoverFrom?: ProviderId;
  failoverAttempted?: boolean;
  message: string;
  error?: string;
}

// Error codes that are retryable and should trigger failover
const RETRYABLE_ERROR_CODES = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'UPSTREAM_5XX',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_ERROR',
];

// Error codes that are NOT retryable (user/data issues)
const NON_RETRYABLE_ERROR_CODES = [
  'INVALID_ADDRESS',
  'PAYMENT_DECLINED',
  'INVALID_PAYMENT',
  'UPSTREAM_4XX',
  'VALIDATION_ERROR',
];

/**
 * Classify error to determine if failover should be attempted
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.errorCode || '';
  const errorMessage = (error.message || '').toLowerCase();
  
  // Check explicit error codes
  if (RETRYABLE_ERROR_CODES.includes(errorCode)) {
    return true;
  }
  
  // Check non-retryable codes
  if (NON_RETRYABLE_ERROR_CODES.includes(errorCode)) {
    return false;
  }
  
  // Heuristic checks on error message
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return true;
  }
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return true;
  }
  if (errorMessage.includes('5')) {
    return true;
  }
  if (errorMessage.includes('payment') || errorMessage.includes('address')) {
    return false;
  }
  
  // Default: treat as retryable
  return true;
}

/**
 * Attempt to confirm order with a specific provider
 */
async function attemptConfirmation(
  providerId: ProviderId,
  confirmationToken: string,
  paymentMethod: any,
  supabase: any
): Promise<{
  success: boolean;
  orderId?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  error?: any;
}> {
  try {
    console.log(`[ConfirmOrder] Attempting confirmation with provider: ${providerId}`);
    
    const provider = getProvider(providerId);
    
    // TODO: Implement actual provider confirmation
    // For now, simulate with mock logic
    
    // Simulate 10% failure rate for testing
    const shouldFail = Math.random() < 0.1;
    
    if (shouldFail) {
      throw new Error('PROVIDER_UNAVAILABLE: Simulated provider failure for testing');
    }
    
    const orderId = `order_${providerId.toLowerCase()}_${Date.now()}`;
    const trackingUrl = `https://track.${providerId.toLowerCase()}.com/${orderId}`;
    const estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    
    console.log(`[ConfirmOrder] ✅ Confirmation successful with ${providerId}: ${orderId}`);
    
    return {
      success: true,
      orderId,
      trackingUrl,
      estimatedDelivery,
    };
    
  } catch (error) {
    console.error(`[ConfirmOrder] ❌ Confirmation failed with ${providerId}:`, error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Record order outcome for provider metrics
 */
async function recordOrderOutcome(
  supabase: any,
  orderId: string,
  providerId: ProviderId,
  providerName: string,
  wasSuccessful: boolean,
  totalValue: number,
  commissionRate: number
): Promise<void> {
  try {
    // Call loopgpt_record_outcome endpoint
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const recordOutcomeUrl = `${supabaseUrl}/functions/v1/loopgpt_record_outcome`;
    
    const response = await fetch(recordOutcomeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        orderId,
        providerId,
        providerName,
        wasSuccessful,
        wasCancelled: false,
        itemsOrdered: 1, // TODO: Get actual item count from routing context
        totalValue,
        commissionRate,
      }),
    });
    
    if (!response.ok) {
      console.error(`[ConfirmOrder] Failed to record outcome: ${response.statusText}`);
    } else {
      console.log(`[ConfirmOrder] Recorded outcome for ${providerId}: ${wasSuccessful ? 'success' : 'failed'}`);
    }
  } catch (error) {
    // Don't throw - outcome recording is non-critical
    console.error('[ConfirmOrder] Error recording outcome:', error);
  }
}

const handler = async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const request: ConfirmOrderRequest = await req.json();

    // Validate request
    if (!request.confirmationToken || !request.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'confirmationToken and userId are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const routingStartTime = Date.now();

    // ========================================================================
    // STEP 1: Retrieve routing context from confirmation token
    // ========================================================================
    
    // TODO: In production, retrieve this from a routing_sessions table
    // For now, use the routing context from the request if provided
    const primaryProviderId = request.routingContext?.primaryProviderId || 'INSTACART';
    const alternatives = request.routingContext?.alternatives || [];
    
    console.log(`[ConfirmOrder] Primary provider: ${primaryProviderId}`);
    console.log(`[ConfirmOrder] Alternatives: ${alternatives.map(a => a.providerId).join(', ')}`);
    
    // Log confirm order start
    const orderId = `pending_${Date.now()}`;
    logConfirmOrderStart(orderId, primaryProviderId, request.userId);

    // ========================================================================
    // STEP 2: Attempt confirmation with primary provider
    // ========================================================================
    
    let confirmResult = await attemptConfirmation(
      primaryProviderId,
      request.confirmationToken,
      request.paymentMethod,
      supabase
    );
    
    let usedProviderId = primaryProviderId;
    let failoverFrom: ProviderId | undefined;
    let failoverAttempted = false;
    
    // ========================================================================
    // STEP 3: Failover logic if primary fails
    // ========================================================================
    
    if (!confirmResult.success && alternatives.length > 0) {
      const error = confirmResult.error;
      const shouldFailover = isRetryableError(error);
      
      if (shouldFailover) {
        console.log(`[ConfirmOrder] Primary provider failed with retryable error, attempting failover...`);
        failoverAttempted = true;
        
        // Try the first alternative
        const alternative = alternatives[0];
        failoverFrom = primaryProviderId;
        usedProviderId = alternative.providerId;
        
        console.log(`[ConfirmOrder] Failing over from ${failoverFrom} to ${usedProviderId}`);
        
        // Log failover attempt
        logFailoverAttempt(
          orderId,
          failoverFrom,
          usedProviderId,
          error?.message || 'Provider unavailable'
        );
        
        confirmResult = await attemptConfirmation(
          usedProviderId,
          request.confirmationToken,
          request.paymentMethod,
          supabase
        );
      } else {
        console.log(`[ConfirmOrder] Primary provider failed with non-retryable error, no failover attempted`);
      }
    }
    
    // ========================================================================
    // STEP 4: Record outcomes for all attempts
    // ========================================================================
    
    // Record primary attempt
    await recordOrderOutcome(
      supabase,
      confirmResult.orderId || `failed_${Date.now()}`,
      primaryProviderId,
      primaryProviderId,
      !failoverAttempted && confirmResult.success,
      100.0, // TODO: Get actual order value from routing context
      0.05   // TODO: Get actual commission rate from provider config
    );
    
    // Record failover attempt if it happened
    if (failoverAttempted) {
      await recordOrderOutcome(
        supabase,
        confirmResult.orderId || `failed_${Date.now()}`,
        usedProviderId,
        usedProviderId,
        confirmResult.success,
        100.0, // TODO: Get actual order value
        0.05   // TODO: Get actual commission rate
      );
    }
    
    // ========================================================================
    // STEP 5: Return response
    // ========================================================================
    
    if (confirmResult.success) {
      // Log success
      if (failoverAttempted && failoverFrom) {
        logFailoverSuccess(
          confirmResult.orderId!,
          failoverFrom,
          usedProviderId,
          Date.now() - routingStartTime
        );
      } else {
        logConfirmOrderSuccess(
          confirmResult.orderId!,
          usedProviderId,
          Date.now() - routingStartTime,
          100.0 // TODO: Get actual order value
        );
      }
      
      const response: ConfirmOrderResponse = {
        success: true,
        orderId: confirmResult.orderId,
        orderIds: [confirmResult.orderId!],
        trackingUrls: confirmResult.trackingUrl ? [confirmResult.trackingUrl] : undefined,
        estimatedDelivery: confirmResult.estimatedDelivery,
        provider: usedProviderId,
        providerId: usedProviderId,
        failoverFrom: failoverFrom,
        failoverAttempted,
        message: failoverFrom
          ? `Order placed successfully with ${usedProviderId} (failed over from ${failoverFrom} due to system issue).`
          : `Order confirmed successfully with ${usedProviderId}! You will receive updates via email.`,
      };
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Log failure
      if (failoverAttempted && failoverFrom) {
        logFailoverFailure(
          orderId,
          failoverFrom,
          usedProviderId,
          confirmResult.error?.code || 'ORDER_FAILED'
        );
      } else {
        logConfirmOrderFailure(
          orderId,
          primaryProviderId,
          confirmResult.error?.code || 'ORDER_FAILED',
          Date.now() - routingStartTime,
          isRetryableError(confirmResult.error)
        );
      }
      
      // Both primary and failover failed
      const errorMessage = failoverAttempted
        ? `Unable to place order. Both ${failoverFrom} and ${usedProviderId} are currently unavailable. Please try again later.`
        : `Unable to place order with ${primaryProviderId}. ${confirmResult.error?.message || 'Please check your payment method and delivery address.'}`;
      
      const response: ConfirmOrderResponse = {
        success: false,
        error: confirmResult.error?.code || 'ORDER_FAILED',
        failoverAttempted,
        message: errorMessage,
      };
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200, // Still return 200 per MCP envelope pattern
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('[ConfirmOrder] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200, // Still return 200 per MCP envelope pattern
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withOrderAPI(handler));
