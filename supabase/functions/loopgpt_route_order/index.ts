/**
 * LoopGPT Commerce Router - Route Order
 * Phase 3: Multi-provider order routing with intelligent scoring
 * 
 * This function:
 * 1. Queries all available providers for quotes
 * 2. Scores providers using the Phase 3 algorithm
 * 3. Selects the best provider based on weighted scoring
 * 4. Returns quote with explanation and alternatives
 * 
 * Security: Rate limited (10 req/min), request size limit (10MB), security headers
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ProviderScorer } from "../_shared/commerce/ProviderScorer.ts";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";
import type {
  RouteOrderRequest,
  RouteOrderResponse,
  ProviderQuote,
} from "../_shared/commerce/types/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const request: RouteOrderRequest = await req.json();

    // Validate request
    if (!request.userId || !request.items || request.items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'userId and items are required',
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

    // ========================================================================
    // PHASE 3 IMPLEMENTATION
    // ========================================================================

    // For now, return a mock response with Phase 3 structure
    // This will be replaced with actual provider integration
    
    const mockQuotes: ProviderQuote[] = [
      {
        provider: {
          id: 'mealme',
          name: 'MealMe',
          priority: 1,
        },
        config: {
          id: 'mealme',
          name: 'MealMe',
          enabled: true,
          priority: 1,
          commissionRate: 0.05,
          regions: ['US'],
        },
        cart: request.items.map((item, idx) => ({
          productId: `prod_${idx}`,
          name: item.name,
          quantity: item.quantity,
          price: 12.99,
        })),
        quote: {
          subtotal: 38.97,
          deliveryFee: 4.99,
          tax: 3.12,
          total: 47.08,
          estimatedDelivery: {
            min: 30,
            max: 45,
          },
        },
        itemAvailability: request.items.map(item => ({
          requestedItem: item.name,
          status: 'found' as const,
          foundProduct: {
            id: 'prod_123',
            name: item.name,
            price: 12.99,
          },
        })),
      },
      {
        provider: {
          id: 'instacart',
          name: 'Instacart',
          priority: 2,
        },
        config: {
          id: 'instacart',
          name: 'Instacart',
          enabled: true,
          priority: 2,
          commissionRate: 0.07,
          regions: ['US'],
        },
        cart: request.items.map((item, idx) => ({
          productId: `prod_${idx}`,
          name: item.name,
          quantity: item.quantity,
          price: 11.49,
        })),
        quote: {
          subtotal: 34.47,
          deliveryFee: 5.99,
          tax: 2.76,
          total: 43.22,
          estimatedDelivery: {
            min: 45,
            max: 60,
          },
        },
        itemAvailability: request.items.map(item => ({
          requestedItem: item.name,
          status: 'found' as const,
          foundProduct: {
            id: 'prod_456',
            name: item.name,
            price: 11.49,
          },
        })),
      },
    ];

    // Initialize scorer
    const scorer = new ProviderScorer(supabase);

    // Score providers
    const scoredQuotes = await scorer.scoreProviders(
      mockQuotes,
      request.items.length,
      request.preferences?.optimizeFor || 'balanced'
    );

    // Select best provider
    const selected = scoredQuotes[0];

    // Generate confirmation token (mock for now)
    const confirmationToken = `conf_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Build response
    const response: RouteOrderResponse = {
      success: true,
      provider: selected.provider.name,
      store: selected.store,
      cart: selected.cart,
      quote: selected.quote,
      itemAvailability: selected.itemAvailability,
      scoreBreakdown: selected.scoreBreakdown,
      alternatives: scoredQuotes.slice(1, 3).map(q => ({
        provider: q.provider.name,
        total: q.quote.total,
        score: q.score,
        estimatedDelivery: q.quote.estimatedDelivery.max,
      })),
      confirmationToken,
      message: `Order routed to ${selected.provider.name}. ${selected.scoreBreakdown.explanation}`,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in loopgpt_route_order:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withOrderAPI(handler));
