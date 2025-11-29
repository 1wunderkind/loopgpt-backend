/**
 * Check User Entitlement
 * 
 * Purpose: Validate if user has premium access (active subscription or trial)
 * 
 * Input:
 * - chatgpt_user_id: User identifier
 * 
 * Output:
 * - has_access: boolean
 * - tier: 'free' | 'premium' | 'family'
 * - status: subscription status
 * - trial_active: boolean
 * - trial_end: timestamp
 * - renewal_date: timestamp
 * - credits: number of usage credits
 * - upgrade_url: URL to upgrade (if no access)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntitlementRequest {
  chatgpt_user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { chatgpt_user_id }: EntitlementRequest = await req.json();

    // Validate input
    if (!chatgpt_user_id) {
      return new Response(
        JSON.stringify({ error: "chatgpt_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated Supabase client (enforces RLS)


    const { supabase, userId, error: authError } = await createAuthenticatedClient(req);


    


    if (authError) {


      return new Response(


        JSON.stringify({ ok: false, error: authError }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    if (!userId) {


      return new Response(


        JSON.stringify({ ok: false, error: "Authentication required" }),


        { status: 401, headers: { "Content-Type": "application/json" } }


      );


    }


    


    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // Get subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    // Get entitlements
    const { data: entitlement } = await supabase
      .from("entitlements")
      .select("*")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    // Default to free tier if no subscription
    if (!subscription) {
      const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";
      return new Response(
        JSON.stringify({
          has_access: false,
          tier: "free",
          status: "inactive",
          trial_active: false,
          trial_end: null,
          renewal_date: null,
          credits: 0,
          upgrade_url: `${appUrl}/upgrade`,
          message: "No active subscription. Upgrade to Premium for unlimited access!",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if trial is active
    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const trialActive = trialEnd ? trialEnd > now : false;

    // Determine if user has access
    const hasAccess = 
      (subscription.status === "active" || subscription.status === "trialing" || trialActive) &&
      (subscription.tier === "premium" || subscription.tier === "family");

    // Build response
    const response = {
      has_access: hasAccess,
      tier: subscription.tier,
      status: subscription.status,
      trial_active: trialActive,
      trial_end: subscription.trial_end,
      trial_days_remaining: trialActive && trialEnd 
        ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      renewal_date: subscription.renewal_date,
      credits: entitlement?.credits || 0,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
    };

    // Add upgrade URL if no access
    if (!hasAccess) {
      const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";
      return new Response(
        JSON.stringify({
          ...response,
          upgrade_url: `${appUrl}/upgrade`,
          message: subscription.status === "cancelled"
            ? "Your subscription has been cancelled. Reactivate to continue using Premium features."
            : subscription.status === "past_due"
            ? "Your payment is past due. Please update your payment method."
            : "Upgrade to Premium for unlimited access!",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log analytics (only for successful checks)
    await supabase.from("analytics_events").insert({
      event_type: "entitlement_checked",
      chatgpt_user_id,
      email: subscription.email,
      metadata: {
        has_access: hasAccess,
        tier: subscription.tier,
        status: subscription.status,
        trial_active: trialActive,
      },
    });

    console.log(`✅ Entitlement check for ${chatgpt_user_id}: ${hasAccess ? 'GRANTED' : 'DENIED'}`);

    return new Response(
      JSON.stringify({
        ...response,
        message: trialActive
          ? `You're on a ${response.trial_days_remaining}-day free trial. Enjoying Premium features!`
          : "You have active Premium access. Enjoy unlimited features!",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error checking entitlement:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to check entitlement",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

