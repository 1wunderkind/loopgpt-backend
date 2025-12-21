import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "std@0.177.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function createCheckoutSession(recipeId: string, missingItems: any[]) {
  // 1. Generate opaque token
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  
  // 2. Hash token
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 3. Store in DB
  const { error } = await supabase
    .from("checkout_sessions")
    .insert({
      token_hash: tokenHash,
      recipe_id: recipeId,
      missing_items: missingItems,
      status: "created",
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
    });

  if (error) throw error;

  return token;
}
