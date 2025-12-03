/**
 * Create Stripe Checkout Session
 * 
 * Purpose: Generate a Stripe checkout session for LoopGPT Premium subscription
 * 
 * Input:
 * - chatgpt_user_id: User identifier from ChatGPT
 * - email: User email for magic link
 * - plan: 'monthly' | 'annual' | 'family' (default: 'monthly')
 * 
 * Output:
 * - checkout_url: Stripe checkout session URL
 * - session_id: Stripe session ID
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  chatgpt_user_id: string;
  email: string;
  plan?: 'monthly' | 'annual' | 'family';
}

const handler = async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { chatgpt_user_id, email, plan = 'monthly' }: CheckoutRequest = await req.json();

    // Validate input
    if (!chatgpt_user_id || !email) {
      return new Response(
        JSON.stringify({ error: "chatgpt_user_id and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-10-28.acacia" });

    // Get price ID based on plan
    const priceIds = {
      monthly: Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || "price_loop_premium_monthly_v1",
      annual: Deno.env.get("STRIPE_PRICE_ID_ANNUAL") || "price_loop_premium_annual_v1",
      family: Deno.env.get("STRIPE_PRICE_ID_FAMILY") || "price_loop_family_monthly_v1",
    };

    const priceId = priceIds[plan];
    const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if customer already exists
    let customerId: string | undefined;
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          chatgpt_user_id,
          source: "loopgpt_magiclink",
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancelled`,
      metadata: {
        chatgpt_user_id,
        plan,
        source: "loopgpt_magiclink",
      },
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          chatgpt_user_id,
          sku: `loop_${plan}_v1`,
          tier: plan === 'family' ? 'family' : 'premium',
          launch_phase: "intro_499",
        },
      },
      allow_promotion_codes: true, // Allow discount codes
      billing_address_collection: "auto", // Collect address for tax
      customer_update: {
        address: "auto",
      },
    });

    // Log analytics event
    await supabase.from("analytics_events").insert({
      event_type: "checkout_session_created",
      chatgpt_user_id,
      email,
      stripe_customer_id: customerId,
      metadata: {
        plan,
        session_id: session.id,
        trial_days: 7,
      },
    });

    // Create or update subscription record (pending state)
    await supabase.from("subscriptions").upsert({
      chatgpt_user_id,
      email,
      stripe_customer_id: customerId,
      tier: plan === 'family' ? 'family' : 'premium',
      status: 'inactive', // Will be updated by webhook
      sku: `loop_${plan}_v1`,
      launch_phase: "intro_499",
    }, {
      onConflict: 'chatgpt_user_id',
    });

    console.log(`✅ Checkout session created for ${email} (${plan}): ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        plan,
        trial_days: 7,
        message: "Checkout session created successfully. Redirecting to Stripe...",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create checkout session",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withStandardAPI(handler));

