import { serve } from "std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "std@0.177.0/crypto/mod.ts";
import { selectProvider, RouterInput } from "../_shared/router.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Strict Allowlist for Redirects
const ALLOWED_DOMAINS = [
  "instacart.com",
  "www.instacart.com",
  "amazon.com",
  "www.amazon.com",
  "walmart.com",
  "www.walmart.com",
  "kroger.com",
  "www.kroger.com",
  "mealme.ai",
  "checkout.mealme.ai",
  "loopkitchen-ui.vercel.app" // Allow fallback page
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  try {
    // 1. Hash token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 2. Lookup Session (Minimal Select)
    const { data: session, error } = await supabase
      .from("checkout_sessions")
      .select("id, status, expires_at, missing_items")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !session) {
      return new Response("Invalid or expired session", { status: 404 });
    }

    if (session.status !== "created") {
      return new Response("Session already used or expired", { status: 410 });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("checkout_sessions").update({ status: "expired" }).eq("id", session.id);
      return new Response("Session expired", { status: 410 });
    }

    // 3. Route Order (Server-Side Routing)
    // Derive coarse location from request headers (e.g. CF-IPCountry) or default to US
    const country = req.headers.get("cf-ipcountry") || "US";
    
    const items = session.missing_items || [];
    const basket = items.map((i: any) => ({
      name: typeof i === 'string' ? i : i.name,
      quantity: typeof i === 'string' ? "1" : (i.quantity || "1")
    }));

    const routerInput: RouterInput = {
      intent: "order_missing_ingredients",
      basket: basket,
      coarse_location: { country },
      channel: "chatgpt",
      token_hash: tokenHash // Pass hash for deterministic seeding
    };

    // Call Competitive ZIP-Free Router
    const routingResult = selectProvider(routerInput);
    const checkoutUrl = routingResult.handoff_url;

    // 4. Validate URL against Allowlist
    if (!isAllowedUrl(checkoutUrl)) {
      console.error(`Blocked redirect to unauthorized domain: ${checkoutUrl}`);
      return new Response("Security Error: Redirect blocked", { status: 403 });
    }

    // 5. Update Session
    await supabase.from("checkout_sessions").update({ 
      status: "redirected",
      provider_checkout_url: checkoutUrl,
      updated_at: new Date().toISOString()
    }).eq("id", session.id);

    // 6. Redirect
    return Response.redirect(checkoutUrl, 302);

  } catch (err) {
    console.error("Redirect Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
