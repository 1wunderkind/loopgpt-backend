/**
 * Get Affiliate By Country Edge Function
 * 
 * Returns prioritized list of affiliate partners for a given country.
 * 
 * Purpose: Enable correct affiliate routing based on user location
 * Pattern: Query affiliate_partner_map by country, order by priority
 * 
 * Use Cases:
 * - Get US affiliates for Hindi speaker in US
 * - Get Spain affiliates for Brazilian in Madrid
 * - Get UK affiliates for German in London
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withLogging } from "../../middleware/logging.ts";
import { createErrorResponse, createSuccessResponse, validateRequired } from "../../middleware/errorHandler.ts";

interface GetAffiliateByCountryRequest {
  country: string;
  limit?: number;
}

interface AffiliatePartner {
  partner_id: string;
  partner_name: string;
  affiliate_id: string;
  priority: number;
  base_url: string;
  commission_rate?: number;
  cuisine_tags?: string[];
  diet_tags?: string[];
}

interface GetAffiliateByCountryResponse {
  success: boolean;
  country: string;
  affiliates: AffiliatePartner[];
  count: number;
}

async function handler(req: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json() as GetAffiliateByCountryRequest;

    // Validate required fields
    validateRequired(body, ["country"]);

    const { country, limit = 10 } = body;

    console.log(`[GetAffiliateByCountry] Country: ${country}, Limit: ${limit}`);

    // Validate country code format (2-letter ISO code)
    if (!/^[A-Z]{2}$/.test(country)) {
      return createErrorResponse(
        new Error(`Invalid country code: ${country}. Must be 2-letter ISO code (e.g., US, IN, ES)`)
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query affiliate_partner_map with join to delivery_partners
    const { data, error } = await supabase
      .from("affiliate_partner_map")
      .select(`
        partner_id,
        affiliate_id,
        priority,
        delivery_partners (
          name,
          base_url,
          commission_rate,
          cuisine_tags,
          diet_tags
        )
      `)
      .eq("country_code", country)
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[GetAffiliateByCountry] Error querying affiliates:", error);
      throw error;
    }

    // Transform data to flat structure
    const affiliates: AffiliatePartner[] = (data || []).map((item: any) => ({
      partner_id: item.partner_id,
      partner_name: item.delivery_partners?.name || "Unknown",
      affiliate_id: item.affiliate_id,
      priority: item.priority,
      base_url: item.delivery_partners?.base_url || "",
      commission_rate: item.delivery_partners?.commission_rate,
      cuisine_tags: item.delivery_partners?.cuisine_tags || [],
      diet_tags: item.delivery_partners?.diet_tags || [],
    }));

    console.log(`[GetAffiliateByCountry] Found ${affiliates.length} affiliates for ${country}`);

    // If no affiliates found, return empty list with helpful message
    if (affiliates.length === 0) {
      console.log(`[GetAffiliateByCountry] No affiliates found for country: ${country}`);
    }

    return createSuccessResponse<GetAffiliateByCountryResponse>({
      success: true,
      country,
      affiliates,
      count: affiliates.length,
    });

  } catch (error) {
    console.error("[GetAffiliateByCountry] Error:", error);
    return createErrorResponse(error);
  }
}

// Export handler with logging middleware
serve(withLogging(handler));

