// ============================================================================
// Journey 1: Onboarding & First Meal Plan
// Purpose: Templates for getting users from "I want to lose weight" to having a personalized plan
// ============================================================================

export const JOURNEY_1_PROMPTS = {
  /**
   * Opening message when user expresses interest in meal planning
   */
  opening: `I'd love to help you create a personalized meal plan! Let me ask you a few questions to make sure it's perfect for you.

First, tell me about your goal:
- Are you looking to **lose weight**, **gain muscle**, **maintain your current weight**, or just **eat healthier**?
- What's your **current weight**?
- How **active** are you? (sedentary, lightly active, moderately active, very active)
- Do you have any **dietary restrictions** or preferences? (vegetarian, vegan, gluten-free, etc.)

Take your time - the more I know, the better your plan will be! 🎯`,

  /**
   * Alternative opening for users who are more direct
   */
  openingDirect: `Perfect! I can create a personalized meal plan for you. I just need a few quick details:

🎯 **Your Goal**: [weight loss / muscle gain / maintenance / health]
⚖️ **Current Weight**: ___ lbs
🏃 **Activity Level**: [sedentary / light / moderate / active / very active]
🥗 **Dietary Restrictions**: [any restrictions or "none"]

Once I have these, I'll create your Week 1 plan!`,

  /**
   * While creating the plan
   */
  creating: (goalType: string) => `Perfect! Based on your goals, I'm creating a 7-day meal plan optimized for **${goalType}**. Give me just a moment...

🔬 Calculating your calorie target...
📊 Balancing your macros...
🍽️ Selecting meals you'll love...`,

  /**
   * Presenting the meal plan (main template)
   */
  presenting: (mealPlan: any) => `📖 **Your Week 1 Story: The Fresh Start**

Here's your personalized meal plan with **${mealPlan.daily_calories} calories per day** (calculated for your body and goals):

${formatWeeklyPlan(mealPlan)}

---

💡 **Why This Works:**
${explainPlanLogic(mealPlan)}

🔄 **The Loop Promise:**
This isn't a static plan. When you log your weight next week, I'll analyze your results and adjust if needed. Your plan learns from YOUR body.`,

  /**
   * Grocery shopping prompt (with affiliate links)
   */
  groceryPrompt: (affiliates: any[], country: string) => `🛒 **Ready to Shop?**

I've prepared your complete grocery list. You have 3 options:

**Option 1: Delivered to Your Door** ⭐ Most Popular
${formatAffiliateOptions(affiliates, 'grocery')}

**Option 2: Pickup** (Save on delivery fees)
${formatPickupOptions(affiliates)}

**Option 3: Shop In-Store**
→ [Download Printable Grocery List (PDF)]

💡 **Pro tip:** Most users save time with delivery and stick to their plan better when groceries arrive ready to cook!

Which option works best for you?`,

  /**
   * Alternative grocery prompt (simpler, for countries with fewer options)
   */
  groceryPromptSimple: (affiliates: any[]) => `🛒 **Your Grocery List is Ready!**

${formatAffiliateOptions(affiliates, 'grocery')}

Or download a printable list: [PDF]

What works best for you?`,

  /**
   * Demo Loop explanation (show users how adaptation works)
   */
  demoLoop: `🔄 **How The Loop Works** (Your Competitive Advantage)

Most meal planning apps give you a plan and that's it. LoopGPT is different:

**Week 1:** I create your plan based on your goals (1,800 cal/day)
**Week 2:** You log your weight (lost 2 lbs!) → I analyze → Keep calories the same ✅
**Week 3:** You log your weight (lost 0.5 lbs) → I analyze → Reduce to 1,700 cal/day 🔄
**Week 4:** You log your weight (lost 2 lbs!) → Back on track! 🎉

Your plan **adapts to YOUR body**. No guessing, no plateaus.

Ready to see this in action? Log your weight next week and watch the magic happen! ✨`,

  /**
   * Next steps after plan is created
   */
  nextSteps: `🎯 **Your Next Steps:**

1. **Order your groceries** (or download the list)
2. **Start Week 1** on Monday (or whenever you're ready)
3. **Log your weight** at the end of the week
4. **Watch your plan adapt** based on your results

I'll be here every step of the way. You can ask me:
- "What's for dinner today?"
- "Show me my meal plan"
- "I have leftover chicken - what can I make?"
- "I don't feel like cooking - order food for me"

Let's do this! 💪`,

  /**
   * Handling incomplete information
   */
  missingInfo: (missingFields: string[]) => `I need a bit more information to create the perfect plan for you:

${missingFields.map(field => `- ${formatFieldName(field)}`).join('\n')}

These details help me calculate the right calorie target and select meals you'll actually enjoy!`,

  /**
   * Handling conflicting goals
   */
  conflictingGoals: `I notice you mentioned both **losing weight** and **gaining muscle**. These are both achievable, but we'll get better results if we prioritize one first.

**Option 1: Focus on Weight Loss First**
→ Slight calorie deficit, high protein
→ Once you hit your target weight, we switch to muscle gain

**Option 2: Focus on Muscle Gain First**
→ Slight calorie surplus, very high protein
→ You might gain a little weight initially (muscle + some fat)

Which approach feels right for you?`,

  /**
   * Meal kit suggestion (if user mentions time constraints)
   */
  mealKitSuggestion: (mealKits: any[]) => `I totally understand! You have a few options:

**Option 1: Simplify Your Plan**
I can adjust your meal plan to include more quick meals (15 min or less).
Would you like me to do that?

**Option 2: Try a Meal Kit Service**
Services like HelloFresh deliver pre-portioned ingredients with recipes that match your calorie goals.

${formatAffiliateOptions(mealKits, 'meal_kit')}

**Option 3: Mix and Match**
Cook 3-4 days, order delivery the other days. Many users do this!

What sounds most realistic for your schedule?`,

  /**
   * Success confirmation
   */
  success: `✅ **Your Meal Plan is Ready!**

You're all set to start your journey. I've created a personalized plan that adapts to YOUR body.

Remember: This is Week 1. The real magic happens when you log your weight next week and I adjust your plan based on actual results.

Questions? Just ask! I'm here 24/7. 🎯`
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats the weekly meal plan with narrative structure
 */
function formatWeeklyPlan(plan: any): string {
  return plan.days.map((day: any, index: number) => {
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index];
    
    return `**${dayName} - Chapter ${index + 1}: ${day.theme}**

🌅 **Breakfast:** ${day.breakfast.name}
→ ${day.breakfast.calories} cal, ${day.breakfast.protein}g protein
💡 *Why this matters:* ${day.breakfast.why}

🌤️ **Lunch:** ${day.lunch.name}
→ ${day.lunch.calories} cal, ${day.lunch.protein}g protein
💡 *Why this matters:* ${day.lunch.why}

🌙 **Dinner:** ${day.dinner.name}
→ ${day.dinner.calories} cal, ${day.dinner.protein}g protein
💡 *Why this matters:* ${day.dinner.why}

📊 **Day ${index + 1} Complete:** ${day.total_calories} calories | ${day.total_protein}g protein`;
  }).join('\n\n---\n\n');
}

/**
 * Explains the logic behind the plan
 */
function explainPlanLogic(plan: any): string {
  const explanations = [];
  
  if (plan.goal_type === 'weight_loss') {
    explanations.push(`Your ${plan.daily_calories} calories per day creates a sustainable deficit for steady weight loss (1-2 lbs/week).`);
  } else if (plan.goal_type === 'muscle_gain') {
    explanations.push(`Your ${plan.daily_calories} calories per day provides a slight surplus to fuel muscle growth.`);
  } else {
    explanations.push(`Your ${plan.daily_calories} calories per day maintains your current weight while improving nutrition.`);
  }
  
  explanations.push(`High protein (${plan.daily_protein}g/day) preserves muscle and keeps you full.`);
  explanations.push(`Balanced macros ensure you get all the nutrients you need.`);
  
  return explanations.join(' ');
}

/**
 * Formats affiliate options for display
 */
function formatAffiliateOptions(affiliates: any[], category: string): string {
  return affiliates
    .filter(aff => aff.category === category)
    .slice(0, 3) // Show top 3
    .map((aff, index) => {
      const badge = index === 0 ? ' ⭐' : '';
      return `→ **${aff.partner_name}**${badge}: ${aff.description}
   [Order Now - ${aff.partner_name}] 💰 ${aff.benefit}`;
    })
    .join('\n\n');
}

/**
 * Formats pickup options
 */
function formatPickupOptions(affiliates: any[]): string {
  const pickupOptions = affiliates.filter(aff => 
    aff.partner_name.includes('Walmart') || 
    aff.delivery_time === 'pickup'
  );
  
  if (pickupOptions.length === 0) {
    return '→ Check your local grocery stores for pickup options';
  }
  
  return pickupOptions.map(aff => 
    `→ **${aff.partner_name}**: ${aff.description}\n   [Order for Pickup] 💰`
  ).join('\n');
}

/**
 * Formats field names for missing info prompts
 */
function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    'goal_type': '🎯 Your goal (weight loss, muscle gain, maintenance, or health)',
    'current_weight_lbs': '⚖️ Your current weight',
    'activity_level': '🏃 Your activity level',
    'dietary_restrictions': '🥗 Any dietary restrictions (or "none")'
  };
  
  return fieldNames[field] || field;
}
