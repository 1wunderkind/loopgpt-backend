import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAuthenticatedClient } from "../_lib/auth.ts";
serve(async (req) => {
  try {
    const { user_id, days_ahead } = await req.json();
    
    if (!user_id || !days_ahead) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing user_id or days_ahead" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
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
    
    // Get recent weight history (last 30 days)
    const { data: weightHistory, error } = await supabase
      .from("weight_logs")
      .select("weight_kg, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(30);
    
    if (error || !weightHistory || weightHistory.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Insufficient weight history for prediction (need at least 2 data points)" 
        }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Calculate linear trend (simple regression)
    const weights = weightHistory.map(w => w.weight_kg);
    const dates = weightHistory.map(w => new Date(w.created_at).getTime());
    
    // Calculate average daily change
    const firstWeight = weights[weights.length - 1];
    const lastWeight = weights[0];
    const firstDate = dates[dates.length - 1];
    const lastDate = dates[0];
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const dailyChange = (lastWeight - firstWeight) / daysDiff;
    
    // Predict future weight
    const predictedWeight = lastWeight + (dailyChange * days_ahead);
    const confidence = Math.min(0.95, weights.length / 30); // More data = higher confidence
    
    // Get user's goal
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("target_weight_kg, goal_type")
      .eq("user_id", user_id)
      .single();
    
    let daysToGoal = null;
    if (profile && profile.target_weight_kg) {
      const weightToLose = profile.target_weight_kg - lastWeight;
      daysToGoal = Math.abs(weightToLose / dailyChange);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          current_weight: lastWeight,
          predicted_weight: Math.round(predictedWeight * 10) / 10,
          days_ahead,
          daily_change: Math.round(dailyChange * 1000) / 1000,
          confidence: Math.round(confidence * 100),
          trend: dailyChange < 0 ? "losing" : dailyChange > 0 ? "gaining" : "stable",
          days_to_goal: daysToGoal ? Math.round(daysToGoal) : null,
          data_points: weights.length
        }
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

