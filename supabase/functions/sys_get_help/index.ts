import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import manifest from "../manifest_v2.json" assert { type: "json" };

serve(async (req) => {
  try {
    // Get all tools from manifest
    const tools = manifest.tools.filter((t: any) => !t.deprecated);
    
    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const tool of tools) {
      if (!byCategory[tool.category]) {
        byCategory[tool.category] = [];
      }
      byCategory[tool.category].push({
        name: tool.name,
        description: tool.description.split('.')[0] + '.' // First sentence only
      });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        version: manifest.version,
        total_tools: tools.length,
        categories: Object.keys(byCategory).length,
        tools_by_category: byCategory,
        examples: [
          { query: "I want to lose 5 kg", tool: "user_set_weight_goal" },
          { query: "Make me a 7-day plan", tool: "plan_create_meal_plan" },
          { query: "I ate oatmeal for breakfast", tool: "tracker_log_meal" },
          { query: "How many calories in chicken?", tool: "nutrition_analyze_food" },
          { query: "How am I doing?", tool: "tracker_summary" }
        ]
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

