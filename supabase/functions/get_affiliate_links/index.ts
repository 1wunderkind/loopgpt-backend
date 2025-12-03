import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withStandardAPI } from "../_shared/security/applyMiddleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { ingredients, country_code } = await req.json()

    // Get affiliate partner for country
    const { data: partnerData } = await supabaseClient
      .from('affiliate_partner_map')
      .select('partner_name')
      .eq('country_code', country_code || 'US')
      .single()

    const partner = partnerData?.partner_name || 'amazon'

    // Build affiliate links for each ingredient
    const links = ingredients.map((ingredient: string) => ({
      ingredient,
      partner,
      url: `https://www.${partner}.com/s?k=${encodeURIComponent(ingredient)}&tag=youraffid-20`
    }))

    return new Response(
      JSON.stringify({ success: true, links }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
};

serve(withStandardAPI(handler));

