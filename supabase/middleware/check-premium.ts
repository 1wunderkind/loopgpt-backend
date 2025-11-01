/**
 * Premium Entitlement Middleware
 * 
 * Purpose: Reusable middleware to check if user has premium access
 * 
 * Usage in Edge Functions:
 * ```typescript
 * import { checkPremiumAccess } from "../middleware/check-premium.ts";
 * 
 * const entitlement = await checkPremiumAccess(supabase, chatgpt_user_id);
 * if (!entitlement.has_access) {
 *   return new Response(JSON.stringify({
 *     error: "Premium feature",
 *     message: entitlement.message,
 *     upgrade_url: entitlement.upgrade_url,
 *     tier: entitlement.tier,
 *   }), { status: 403 });
 * }
 * ```
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface EntitlementResult {
  has_access: boolean;
  tier: string;
  status: string;
  trial_active: boolean;
  trial_end: string | null;
  trial_days_remaining: number;
  renewal_date: string | null;
  credits: number;
  upgrade_url: string;
  message: string;
}

/**
 * Check if user has premium access
 * @param supabase Supabase client (service role)
 * @param chatgpt_user_id User identifier
 * @returns EntitlementResult
 */
export async function checkPremiumAccess(
  supabase: SupabaseClient,
  chatgpt_user_id: string
): Promise<EntitlementResult> {
  const appUrl = Deno.env.get("APP_URL") || "https://theloopgpt.ai";

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
    return {
      has_access: false,
      tier: "free",
      status: "inactive",
      trial_active: false,
      trial_end: null,
      trial_days_remaining: 0,
      renewal_date: null,
      credits: 0,
      upgrade_url: `${appUrl}/upgrade`,
      message: "This is a Premium feature. Upgrade to LoopGPT Premium for unlimited access!",
    };
  }

  // Check if trial is active
  const now = new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  const trialActive = trialEnd ? trialEnd > now : false;
  const trialDaysRemaining = trialActive && trialEnd
    ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine if user has access
  const hasAccess =
    (subscription.status === "active" || subscription.status === "trialing" || trialActive) &&
    (subscription.tier === "premium" || subscription.tier === "family");

  // Build result
  const result: EntitlementResult = {
    has_access: hasAccess,
    tier: subscription.tier,
    status: subscription.status,
    trial_active: trialActive,
    trial_end: subscription.trial_end,
    trial_days_remaining: trialDaysRemaining,
    renewal_date: subscription.renewal_date,
    credits: entitlement?.credits || 0,
    upgrade_url: `${appUrl}/upgrade`,
    message: "",
  };

  // Set appropriate message
  if (!hasAccess) {
    if (subscription.status === "cancelled") {
      result.message = "Your subscription has been cancelled. Reactivate Premium to continue using this feature.";
    } else if (subscription.status === "past_due") {
      result.message = "Your payment is past due. Please update your payment method to continue using Premium features.";
    } else {
      result.message = "This is a Premium feature. Upgrade to LoopGPT Premium for unlimited access!";
    }
  } else {
    if (trialActive) {
      result.message = `You're on a ${trialDaysRemaining}-day free trial. Enjoying Premium features!`;
    } else {
      result.message = "Premium access granted. Enjoy unlimited features!";
    }
  }

  return result;
}

/**
 * Deduct usage credits (for metered features)
 * @param supabase Supabase client (service role)
 * @param chatgpt_user_id User identifier
 * @param amount Number of credits to deduct
 * @returns boolean - true if successful, false if insufficient credits
 */
export async function deductCredits(
  supabase: SupabaseClient,
  chatgpt_user_id: string,
  amount: number
): Promise<boolean> {
  // Get current credits
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("credits")
    .eq("chatgpt_user_id", chatgpt_user_id)
    .single();

  if (!entitlement) {
    return false;
  }

  const currentCredits = entitlement.credits || 0;

  // Check if sufficient credits
  if (currentCredits < amount) {
    return false;
  }

  // Deduct credits
  const { error } = await supabase
    .from("entitlements")
    .update({ credits: currentCredits - amount })
    .eq("chatgpt_user_id", chatgpt_user_id);

  return !error;
}

/**
 * Log premium feature usage for analytics
 * @param supabase Supabase client (service role)
 * @param chatgpt_user_id User identifier
 * @param feature_name Name of the premium feature used
 * @param metadata Additional metadata
 */
export async function logPremiumUsage(
  supabase: SupabaseClient,
  chatgpt_user_id: string,
  feature_name: string,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase.from("analytics_events").insert({
    event_type: "premium_feature_used",
    chatgpt_user_id,
    metadata: {
      feature: feature_name,
      ...metadata,
    },
  });
}

