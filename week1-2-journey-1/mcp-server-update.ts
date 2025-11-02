/**
 * MCP Server Update for Journey 1
 * 
 * Add this tool definition to your MCP server's tool list.
 * This replaces the need to call multiple tools - ChatGPT just calls this one.
 */

export const JOURNEY_1_TOOL = {
  name: "journey_1_onboarding",
  description: `Creates a complete personalized onboarding experience with meal plan, adaptation preview, and grocery delivery options. 

**Call this when user expresses ANY of these intents:**
- Wants to lose weight, get fit, or improve health
- Asks for a meal plan or diet plan
- Mentions starting a new diet or lifestyle change
- Says they want to eat healthier
- Asks "can you help me with nutrition?"
- Mentions weight loss goals (e.g., "I want to lose 15 pounds")
- Asks about meal planning or what to eat

**Example user queries:**
- "I want to lose weight"
- "Help me get healthier"
- "Create a meal plan for me"
- "I need to lose 15 pounds"
- "What should I eat to build muscle?"
- "I want to start eating clean"
- "Can you plan my meals?"
- "Help me with my diet"
- "I'm trying to get in shape"
- "What's a good meal plan for weight loss?"

**What this tool does:**
1. Detects user's country (for geo-routed affiliate links)
2. Calculates optimal calorie target (or uses provided target)
3. Creates personalized 7-day meal plan
4. Shows "Demo Loop" - preview of how plan adapts week-to-week
5. Provides 3-5 grocery delivery options with affiliate links
6. Returns complete formatted response ready to show user

**This is a ONE-CALL solution** - no need to call multiple tools. Everything is handled internally and returns a professional, formatted response.

**Important**: This tool ALWAYS includes affiliate links for grocery delivery. The response is pre-formatted and ready to present to the user as-is.`,
  
  inputSchema: {
    type: "object",
    properties: {
      chatgpt_user_id: {
        type: "string",
        description: "The ChatGPT user's unique identifier (required)"
      },
      goal_type: {
        type: "string",
        description: "User's primary goal",
        enum: ["weight_loss", "muscle_gain", "maintenance", "health"]
      },
      target_weight: {
        type: "number",
        description: "Target weight in kg (optional, used for calorie calculation)"
      },
      current_weight: {
        type: "number",
        description: "Current weight in kg (optional, used for calorie calculation)"
      },
      height_cm: {
        type: "number",
        description: "Height in centimeters (optional, used for calorie calculation)"
      },
      age: {
        type: "number",
        description: "Age in years (optional, used for calorie calculation)"
      },
      gender: {
        type: "string",
        description: "Gender (optional, used for calorie calculation)",
        enum: ["male", "female", "other"]
      },
      activity_level: {
        type: "string",
        description: "Activity level (optional, defaults to 'moderate')",
        enum: ["sedentary", "light", "moderate", "active", "very_active"]
      },
      calories_target: {
        type: "integer",
        description: "Specific daily calorie target (optional, will be calculated if not provided)"
      },
      dietary_restrictions: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Dietary restrictions like vegetarian, vegan, gluten-free, dairy-free, keto, etc."
      },
      preferences: {
        type: "object",
        description: "User preferences like cuisine types, cooking time, etc."
      },
      ip_address: {
        type: "string",
        description: "User's IP address for geolocation (optional, will be detected if not provided)"
      }
    },
    required: ["chatgpt_user_id", "goal_type"]
  }
};

/**
 * How to integrate this into your MCP server:
 * 
 * 1. Open: supabase/functions/mcp-server/index.ts
 * 
 * 2. Add to your tools array:
 * 
 *    const tools = [
 *      JOURNEY_1_TOOL,
 *      // ... other tools
 *    ];
 * 
 * 3. In your tool execution handler, add:
 * 
 *    case 'journey_1_onboarding':
 *      const response = await supabase.functions.invoke('journey_1_onboarding', {
 *        body: params
 *      });
 *      return response.data;
 * 
 * 4. Deploy: supabase functions deploy mcp-server
 */

/**
 * Example ChatGPT conversation flow:
 * 
 * User: "I want to lose 15 pounds"
 * 
 * ChatGPT: *calls journey_1_onboarding with:*
 * {
 *   chatgpt_user_id: "user_123",
 *   goal_type: "weight_loss",
 *   target_weight: 75,  // if user mentioned it
 *   current_weight: 82  // if user mentioned it
 * }
 * 
 * Tool returns: {
 *   success: true,
 *   formatted_response: "# 🎯 Your Weight Loss Journey\n\n## 📖 Your Week 1 Meal Plan...",
 *   meal_plan_id: "plan_abc123",
 *   country_code: "US",
 *   calories_target: 1800
 * }
 * 
 * ChatGPT: *shows formatted_response to user*
 * 
 * Result: User sees complete onboarding with meal plan, demo loop, and affiliate links!
 */
