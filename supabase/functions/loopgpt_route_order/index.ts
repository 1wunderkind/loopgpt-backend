/**
 * LoopGPT Commerce Router - Route Order
 * Production-grade multi-provider order routing with intelligent scoring
 * 
 * This function:
 * 1. Queries all enabled providers for quotes (parallel with timeouts)
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
import { getProvider } from "../_shared/commerce/providers/providerRegistry.ts";
import { getEnabledProvidersSorted } from "../_shared/commerce/providers/providerConfigs.ts";
import { withTimeout } from "../_shared/commerce/utils/timeout.ts";
import {
  logProviderQuoteStart,
  logProviderQuoteSuccess,
  logProviderQuoteError,
  logRouterDecision,
  logRouterFailure,
  logRouterLatency,
  generateRequestId,
  createRoutingMetrics,
  sendMetrics,
} from "../_shared/commerce/utils/logging.ts";
import type {
  RouteOrderRequest,
  RouteOrderResponse,
  ProviderQuote,
  RequestedItem,
  ProviderId,
} from "../_shared/commerce/types/index.ts";
import type { QuoteRequest } from "../_shared/commerce/providers/ICommerceProvider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();

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
    // PRODUCTION MULTI-PROVIDER ROUTING
    // ========================================================================

    // Get all enabled providers sorted by priority
    const candidateConfigs = getEnabledProvidersSorted();

    if (candidateConfigs.length === 0) {
      console.error('[Router] No enabled providers found');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NO_PROVIDERS',
          message: 'No providers are currently enabled',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Router] Querying ${candidateConfigs.length} providers:`, 
      candidateConfigs.map(c => c.id).join(', '));

    // Build base quote request
    const baseQuoteRequest: Omit<QuoteRequest, 'providerId'> = {
      items: request.items.map((item, idx) => ({
        id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${idx}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.preferences?.unit as string | undefined,
        preferences: item.preferences,
      })),
      shippingAddress: {
        street: request.location.street || '',
        city: request.location.city,
        state: request.location.state || '',
        postalCode: request.location.zip,
        country: request.location.country || 'US',
      },
      userContext: {
        // TODO: Add user-specific context from database
      },
    };

    // Query all providers in parallel with timeouts
    const quotes: ProviderQuote[] = [];
    const errors: Array<{ providerId: ProviderId; error: string }> = [];
    const providerLatencies: Record<ProviderId, number> = {} as Record<ProviderId, number>;

    const routingStartTime = Date.now();

    const results = await Promise.allSettled(
      candidateConfigs.map(async (config) => {
        const provider = getProvider(config.id);
        const quoteRequest: QuoteRequest = {
          ...baseQuoteRequest,
          providerId: config.id,
        };

        // Log provider query start
        logProviderQuoteStart(config.id, request.items.length, requestId);

        const startTime = Date.now();

        try {
          const timeout = config.timeout || 10000; // Default 10s
          const quote = await withTimeout(
            provider.getQuote(quoteRequest, config),
            timeout,
            config.id
          );

          const latencyMs = Date.now() - startTime;
          providerLatencies[config.id] = latencyMs;

          logProviderQuoteSuccess(config.id, quote, latencyMs, requestId);
          return quote;
        } catch (err) {
          const latencyMs = Date.now() - startTime;
          providerLatencies[config.id] = latencyMs;

          logProviderQuoteError(config.id, err, latencyMs, requestId);
          errors.push({
            providerId: config.id,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      })
    );

    // Extract successful quotes
    for (const result of results) {
      if (result.status === 'fulfilled') {
        quotes.push(result.value);
      }
    }

    // Check if we have any valid quotes
    if (quotes.length === 0) {
      const attemptedProviders = candidateConfigs.map(c => c.id);
      const errorMessages = errors.map(e => `${e.providerId}: ${e.error}`);
      
      logRouterFailure(attemptedProviders, errorMessages, requestId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'NO_VALID_QUOTES',
          message: 'No providers returned valid quotes',
          details: errors,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Router] Received ${quotes.length} valid quotes`);

    // Initialize scorer
    const scorer = new ProviderScorer(supabase);

    // Score providers
    const scoredQuotes = await scorer.scoreProviders(
      quotes,
      request.items.length,
      request.preferences?.optimizeFor || 'balanced'
    );

    // Select best provider
    const selected = scoredQuotes[0];

    // Log router decision
    logRouterDecision(selected, quotes.length, requestId);

    // Log latency metrics
    const totalLatencyMs = Date.now() - routingStartTime;
    logRouterLatency(totalLatencyMs, providerLatencies, requestId);

    // Create and send metrics summary
    const metrics = createRoutingMetrics(
      requestId,
      totalLatencyMs,
      candidateConfigs.map(c => c.id),
      quotes,
      selected
    );
    await sendMetrics(metrics);

    // Generate confirmation token
    const confirmationToken = `conf_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Build response
    const response: RouteOrderResponse = {
      success: true,
      provider: selected.provider.name,
      providerId: selected.provider.id,
      store: selected.store,
      cart: selected.cart,
      quote: selected.quote,
      itemAvailability: selected.itemAvailability,
      scoreBreakdown: selected.scoreBreakdown,
      alternatives: scoredQuotes.slice(1, 3).map(q => ({
        provider: q.provider.name,
        providerId: q.provider.id,
        totalCents: q.quote.totalCents,
        score: q.score,
        estimatedDeliveryMinutes: q.quote.estimatedDeliveryMinutes || 0,
        // Legacy fields
        total: q.quote.total,
        estimatedDelivery: q.quote.estimatedDelivery?.max || 0,
      })),
      confirmationToken,
      affiliateUrl: selected.affiliateUrl,
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
    console.error('[Router] Fatal error:', error);
    
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
