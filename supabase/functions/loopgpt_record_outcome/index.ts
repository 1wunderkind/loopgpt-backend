/**
 * LoopGPT Commerce Router - Record Outcome
 * Phase 3: Records order outcomes for the learning system
 * 
 * This function:
 * 1. Receives order outcome data
 * 2. Updates provider metrics
 * 3. Stores outcome for analysis
 * 4. Adjusts reliability scores
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ScoringLearner } from "../_shared/commerce/ScoringLearner.ts";
import type { OrderOutcome } from "../_shared/commerce/types/index.ts";
import { withOrderAPI } from "../_shared/security/applyMiddleware.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordOutcomeResponse {
  success: boolean;
  message: string;
  error?: string;
}

const handler = async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const outcome: OrderOutcome = await req.json();

    // Validate request
    if (!outcome.orderId || !outcome.providerId || outcome.itemsOrdered === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'orderId, providerId, and itemsOrdered are required',
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

    // Initialize learner
    const learner = new ScoringLearner(supabase);

    // Record outcome
    await learner.recordOutcome(outcome);

    const response: RecordOutcomeResponse = {
      success: true,
      message: 'Order outcome recorded successfully. Provider metrics updated.',
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in loopgpt_record_outcome:', error);
    
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
