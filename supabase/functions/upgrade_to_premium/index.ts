/**
 * Upgrade to Premium (MCP Tool)
 * 
 * Purpose: MCP tool for ChatGPT to initiate premium upgrade flow
 * 
 * Flow:
 * 1. User requests upgrade in ChatGPT
 * 2. This tool sends magic link to user's email
 * 3. User clicks link → redirected to billing page
 * 4. Billing page creates checkout session
 * 5. User completes payment in Stripe
 * 6. Webhook activates subscription
 * 
 * Input:
 * - chatgpt_user_id: User identifier
 * - email: User email for magic link
 * - plan: 'monthly' | 'annual' | 'family' (optional, default: 'monthly')
 * 
 * Output:
 * - success: boolean
 * - message: Instructions for user
 * - magic_link_sent: boolean
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpgradeRequest {
  chatgpt_user_id: string;
  email: string;
  plan?: 'monthly' | 'annual' | 'family';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { chatgpt_user_id, email, plan = 'monthly' }: UpgradeRequest = await req.json();

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

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already has active subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("tier, status, trial_end")
      .eq("chatgpt_user_id", chatgpt_user_id)
      .single();

    if (existingSub) {
      const now = new Date();
      const trialEnd = existingSub.trial_end ? new Date(existingSub.trial_end) : null;
      const trialActive = trialEnd ? trialEnd > now : false;

      if ((existingSub.status === 'active' || trialActive) && 
          (existingSub.tier === 'premium' || existingSub.tier === 'family')) {
        return new Response(
          JSON.stringify({
            success: false,
            has_premium: true,
            tier: existingSub.tier,
            status: existingSub.status,
            message: "You already have an active Premium subscription!",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";

    // Send magic link via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/billing?plan=${plan}&user_id=${chatgpt_user_id}`,
        data: {
          chatgpt_user_id,
          plan,
        },
      },
    });

    if (authError) {
      console.error("❌ Error sending magic link:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send magic link",
          details: authError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      event_type: "upgrade_initiated",
      chatgpt_user_id,
      email,
      metadata: {
        plan,
        magic_link_sent: true,
      },
    });

    console.log(`✅ Magic link sent to ${email} for ${plan} plan`);

    // Get plan details for response
    const planDetails = {
      monthly: { price: "$4.99/month", trial: "7-day free trial" },
      annual: { price: "$49/year (save $10!)", trial: "7-day free trial" },
      family: { price: "$14.99/month (up to 5 users)", trial: "7-day free trial" },
    };

    const details = planDetails[plan];

    return new Response(
      JSON.stringify({
        success: true,
        magic_link_sent: true,
        plan,
        plan_price: details.price,
        trial_period: details.trial,
        message: `📧 Check your email! We've sent a magic link to ${email}.\n\n` +
                 `Click the link to complete your upgrade to LoopGPT Premium (${details.price}).\n\n` +
                 `✨ Includes ${details.trial} - no payment required today!\n\n` +
                 `After your trial, you'll get:\n` +
                 `• Unlimited meal plans\n` +
                 `• Advanced nutrition tracking\n` +
                 `• Restaurant ordering\n` +
                 `• Priority support\n\n` +
                 `The link expires in 60 minutes. Check your spam folder if you don't see it.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in upgrade_to_premium:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to initiate upgrade",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

