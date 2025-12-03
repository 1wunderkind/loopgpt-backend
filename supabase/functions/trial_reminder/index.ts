/**
 * Trial Reminder Cron Job
 * 
 * Purpose: Send email reminders to users 1 day before trial ends
 * 
 * Schedule: Run daily at 10:00 AM UTC
 * Cron: 0 10 * * *
 * 
 * Setup:
 * 1. Deploy this function
 * 2. Set up Supabase Edge Function cron trigger
 * 3. Or use external cron service (e.g., GitHub Actions, Vercel Cron)
 * 
 * What it does:
 * - Finds users with trials ending in 24-48 hours
 * - Sends reminder email via Supabase Auth
 * - Logs analytics event
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withWebhook } from "../_shared/security/applyMiddleware.ts";


const handler = async (req) => {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("🕐 Running trial reminder cron job...");

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range (24-48 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find users with trials ending tomorrow
    const { data: expiringTrials, error } = await supabase
      .from("subscriptions")
      .select("chatgpt_user_id, email, trial_end, tier")
      .eq("status", "trialing")
      .gte("trial_end", tomorrow.toISOString())
      .lt("trial_end", dayAfterTomorrow.toISOString());

    if (error) {
      console.error("❌ Error fetching expiring trials:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!expiringTrials || expiringTrials.length === 0) {
      console.log("✅ No trials expiring tomorrow");
      return new Response(
        JSON.stringify({ message: "No trials expiring", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Found ${expiringTrials.length} trials expiring tomorrow`);

    const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";
    let emailsSent = 0;
    let emailsFailed = 0;

    // Send reminder emails
    for (const trial of expiringTrials) {
      try {
        // Calculate hours remaining
        const trialEndDate = new Date(trial.trial_end);
        const hoursRemaining = Math.floor(
          (trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60)
        );

        // Send email via Supabase Auth (using magic link with custom message)
        // Note: This requires custom email templates in Supabase Auth settings
        const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(
          trial.email,
          {
            data: {
              trial_reminder: true,
              hours_remaining: hoursRemaining,
              tier: trial.tier,
            },
            redirectTo: `${appUrl}/account`,
          }
        );

        if (emailError) {
          console.error(`❌ Failed to send email to ${trial.email}:`, emailError);
          emailsFailed++;
        } else {
          console.log(`✅ Sent trial reminder to ${trial.email}`);
          emailsSent++;

          // Log analytics event
          await supabase.from("analytics_events").insert({
            event_type: "trial_reminder_sent",
            chatgpt_user_id: trial.chatgpt_user_id,
            email: trial.email,
            metadata: {
              hours_remaining: hoursRemaining,
              trial_end: trial.trial_end,
              tier: trial.tier,
            },
          });
        }
      } catch (err) {
        console.error(`❌ Error processing ${trial.email}:`, err);
        emailsFailed++;
      }
    }

    console.log(`✅ Trial reminder job complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        trials_found: expiringTrials.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        message: `Processed ${expiringTrials.length} expiring trials`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Trial reminder cron job error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Apply security middleware (rate limiting, request size limits, security headers)
serve(withWebhook(handler));

