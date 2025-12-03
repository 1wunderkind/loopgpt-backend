/**
 * Create Stripe Customer Portal Session
 * 
 * Purpose: Generate a Stripe Customer Portal session for self-service billing management
 * 
 * Input:
 * - chatgpt_user_id: User identifier
 * 
 * Output:
 * - portal_url: Stripe Customer Portal URL
 * 
 * Features:
 * - Update payment method
 * - Cancel subscription
 * - View invoices
 * - Download receipts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PortalRequest {
  chatgpt_user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { chatgpt_user_id }: PortalRequest = await req.json();

    // Validate input
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ error: "chatgpt_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, email, tier, status")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "No subscription found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe customer ID found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-10-28.acacia" });

    const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/account`,
    });

    // Log analytics event
    await supabase.from("analytics_events").insert({
      event_type: "customer_portal_accessed",
      chatgpt_user_id,
      email: subscription.email,
      stripe_customer_id: subscription.stripe_customer_id,
      metadata: {
        tier: subscription.tier,
        status: subscription.status,
      },
    });

    console.log(`✅ Customer portal session created for ${chatgpt_user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        portal_url: session.url,
        message: "Customer portal session created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error creating customer portal session:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create customer portal session",
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

