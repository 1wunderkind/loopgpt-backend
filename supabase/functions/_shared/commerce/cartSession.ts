import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CartSession {
  id: string;
  user_id: string;
  session_id?: string;
  selected_provider?: string;
  selected_provider_id?: string;
  alternatives?: any;
  cart: any;
  quote: any;
  score_breakdown?: any;
  affiliate_url?: string;
  confirmation_token?: string;
  allow_failover: boolean;
  allow_auto_confirm: boolean;
  status: 'draft' | 'awaiting_consent' | 'confirmed_pending_execution' | 'confirmed' | 'failed' | 'cancelled' | 'expired';
  last_error?: any;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export type CreateCartSessionInput = Omit<CartSession, 'id' | 'created_at' | 'updated_at' | 'expires_at' | 'allow_failover' | 'allow_auto_confirm' | 'status'> & {
  status?: CartSession['status'];
  allow_failover?: boolean;
  allow_auto_confirm?: boolean;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function createCartSession(input: CreateCartSessionInput): Promise<CartSession> {
  const { data, error } = await supabase
    .from('cart_sessions')
    .insert({
      ...input,
      updated_at: new Date().toISOString(),
    }, { schema: 'commerce' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCartSession(id: string, patch: Partial<CartSession>): Promise<void> {
  const { error } = await supabase
    .from('cart_sessions')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    }, { schema: 'commerce' })
    .eq('id', id);

  if (error) {
    console.error(`Failed to update cart session ${id}:`, error);
    // We don't throw here as per requirements, but logging is essential
  }
}

export async function getCartSession(id: string): Promise<CartSession | null> {
  const { data, error } = await supabase
    .from('cart_sessions')
    .select('*')
    .eq('id', id)
    .single(); // Use single() directly on the query builder

  if (error) return null;
  return data;
}

export async function expireCartSessions(): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('cart_sessions')
    .update({ 
      status: 'expired',
      updated_at: now
    }, { schema: 'commerce' })
    .lt('expires_at', now)
    .in('status', ['draft', 'awaiting_consent', 'confirmed_pending_execution']);

  if (error) {
    console.error("Failed to expire cart sessions:", error);
  }
}

export async function getLatestActiveSession(userId: string): Promise<CartSession | null> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('cart_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .in('status', ['awaiting_consent', 'confirmed_pending_execution'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}
