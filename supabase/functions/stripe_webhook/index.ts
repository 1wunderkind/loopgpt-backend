/**
 * Stripe Webhook Handler
 * 
 * Purpose: Handle Stripe webhook events for subscription lifecycle
 * 
 * Events handled:
 * - checkout.session.completed: Subscription created
 * - customer.subscription.created: Subscription activated
 * - customer.subscription.updated: Subscription changed
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_succeeded: Payment successful
 * - invoice.payment_failed: Payment failed
 * 
 * Security: Verifies Stripe webhook signature
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withWebhook } from "../_shared/security/applyMiddleware.ts";


const handler = async (req) => {
  try {
    // Get Stripe signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ No stripe-signature header found");
      return new Response("No signature", { status: 400 });
    }

    // Get raw body
    const body = await req.text();

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe credentials not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-10-28.acacia" });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`📨 Received webhook: ${event.type}`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`✅ Checkout completed for customer: ${session.customer}`);

        // Get metadata
        const chatgptUserId = session.metadata?.chatgpt_user_id;
        const plan = session.metadata?.plan || 'monthly';

        if (!chatgptUserId) {
          console.error("❌ No chatgpt_user_id in session metadata");
          break;
        }

        // Calculate trial end and renewal date
        const trialEnd = session.subscription 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          : null;
        const renewalDate = trialEnd 
          ? new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after trial
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Update subscription
        const { error: subError } = await supabase.from("subscriptions").upsert({
          chatgpt_user_id: chatgptUserId,
          email: session.customer_email || session.customer_details?.email,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          tier: plan === 'family' ? 'family' : 'premium',
          status: 'trialing',
          trial_end: trialEnd?.toISOString(),
          renewal_date: renewalDate.toISOString(),
          sku: `loop_${plan}_v1`,
          launch_phase: "intro_499",
        }, {
          onConflict: 'chatgpt_user_id',
        });

        if (subError) {
          console.error("❌ Error updating subscription:", subError);
        }

        // Create entitlements record
        const { error: entError } = await supabase.from("entitlements").upsert({
          chatgpt_user_id: chatgptUserId,
          credits: 0, // Will be refilled on first renewal
          last_refill: new Date().toISOString(),
        }, {
          onConflict: 'chatgpt_user_id',
        });

        if (entError) {
          console.error("❌ Error creating entitlements:", entError);
        }

        // Log analytics
        await supabase.from("analytics_events").insert({
          event_type: "subscription_created",
          chatgpt_user_id: chatgptUserId,
          email: session.customer_email,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          metadata: {
            plan,
            trial_days: 7,
            session_id: session.id,
          },
        });

        console.log(`✅ Subscription created for ${chatgptUserId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Subscription updated: ${subscription.id}`);

        // Determine status
        let status = 'inactive';
        if (subscription.status === 'active') status = 'active';
        else if (subscription.status === 'trialing') status = 'trialing';
        else if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'canceled') status = 'cancelled';

        // Update subscription
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status,
            renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ Error updating subscription:", error);
        }

        // Log analytics
        await supabase.from("analytics_events").insert({
          event_type: "subscription_updated",
          stripe_subscription_id: subscription.id,
          metadata: {
            status,
            previous_status: event.data.previous_attributes?.status,
          },
        });

        console.log(`✅ Subscription ${subscription.id} updated to ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`❌ Subscription cancelled: ${subscription.id}`);

        // Update subscription status
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ Error cancelling subscription:", error);
        }

        // Log analytics
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("chatgpt_user_id, email")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        await supabase.from("analytics_events").insert({
          event_type: "subscription_cancelled",
          chatgpt_user_id: subData?.chatgpt_user_id,
          email: subData?.email,
          stripe_subscription_id: subscription.id,
          metadata: {
            cancellation_reason: subscription.cancellation_details?.reason,
          },
        });

        console.log(`✅ Subscription ${subscription.id} cancelled`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💰 Payment succeeded for invoice: ${invoice.id}`);

        // Refill credits on successful payment
        if (invoice.subscription) {
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("chatgpt_user_id, tier")
            .eq("stripe_subscription_id", invoice.subscription)
            .single();

          if (subData) {
            // Refill credits based on tier
            const creditAmount = subData.tier === 'family' ? 500 : 200;

            await supabase
              .from("entitlements")
              .update({
                credits: creditAmount,
                last_refill: new Date().toISOString(),
              })
              .eq("chatgpt_user_id", subData.chatgpt_user_id);

            console.log(`✅ Refilled ${creditAmount} credits for ${subData.chatgpt_user_id}`);
          }
        }

        // Log analytics
        await supabase.from("analytics_events").insert({
          event_type: "payment_succeeded",
          stripe_subscription_id: invoice.subscription as string,
          metadata: {
            invoice_id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`❌ Payment failed for invoice: ${invoice.id}`);

        // Update subscription to past_due
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription);
        }

        // Log analytics
        await supabase.from("analytics_events").insert({
          event_type: "payment_failed",
          stripe_subscription_id: invoice.subscription as string,
          metadata: {
            invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
          },
        });

        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withWebhook(handler));

