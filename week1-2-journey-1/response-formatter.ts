/**
 * Response Formatter for Journey 1: Onboarding & First Meal Plan
 * 
 * This module formats raw data from Edge Functions into user-friendly,
 * engaging responses that ChatGPT will present to users.
 */

import { JOURNEY_1_PROMPTS } from '../week0-setup/prompts/journey-1-onboarding';

interface MealPlan {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  goal_type: string;
  calories_target: number;
  macros_target: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  meals: Array<{
    day: number;
    meal_type: string;
    recipe_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    ingredients: string[];
    instructions: string[];
  }>;
}

interface AffiliatePartner {
  partner_name: string;
  partner_type: string;
  base_url: string;
  description: string;
  benefit: string;
  commission_rate: string;
  priority: number;
}

/**
 * Formats a meal plan into a narrative "storybook" style
 */
export function formatMealPlan(mealPlan: MealPlan): string {
  const goalEmoji = {
    weight_loss: '🎯',
    muscle_gain: '💪',
    maintenance: '⚖️',
    health: '🌟'
  }[mealPlan.goal_type] || '🎯';

  const goalText = {
    weight_loss: 'Your Weight Loss Journey',
    muscle_gain: 'Your Muscle Building Journey',
    maintenance: 'Your Maintenance Plan',
    health: 'Your Health Transformation'
  }[mealPlan.goal_type] || 'Your Personalized Plan';

  let output = `## 📖 Week 1 Story: The Fresh Start\n\n`;
  output += `${goalEmoji} **${goalText}**\n\n`;
  output += `Your personalized meal plan is ready! Here's what makes it special:\n\n`;
  output += `- 🎯 **Daily Target**: ${mealPlan.calories_target} calories\n`;
  output += `- 💪 **Protein**: ${mealPlan.macros_target.protein_g}g | `;
  output += `🍞 **Carbs**: ${mealPlan.macros_target.carbs_g}g | `;
  output += `🥑 **Fat**: ${mealPlan.macros_target.fat_g}g\n`;
  output += `- 📅 **Duration**: 7 days (${mealPlan.start_date} to ${mealPlan.end_date})\n\n`;

  // Group meals by day
  const mealsByDay: { [key: number]: typeof mealPlan.meals } = {};
  mealPlan.meals.forEach(meal => {
    if (!mealsByDay[meal.day]) {
      mealsByDay[meal.day] = [];
    }
    mealsByDay[meal.day].push(meal);
  });

  // Format each day
  Object.keys(mealsByDay).sort((a, b) => Number(a) - Number(b)).forEach(dayStr => {
    const day = Number(dayStr);
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day - 1];
    const meals = mealsByDay[day];

    output += `### 📅 Day ${day} - ${dayName}\n\n`;

    meals.forEach(meal => {
      const mealEmoji = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍎'
      }[meal.meal_type.toLowerCase()] || '🍽️';

      output += `**${mealEmoji} ${meal.meal_type}**: ${meal.recipe_name}\n`;
      output += `- ${meal.calories} cal | P: ${meal.protein_g}g | C: ${meal.carbs_g}g | F: ${meal.fat_g}g\n\n`;
    });

    output += `\n`;
  });

  return output;
}

/**
 * Formats the "Demo Loop" - shows users how adaptation works
 */
export function formatDemoLoop(mealPlan: MealPlan): string {
  let output = `## 🔄 The Loop: How Your Plan Adapts\n\n`;
  output += `Here's the magic of LoopGPT - your plan **learns and adapts** based on your results:\n\n`;
  
  output += `### 📊 Week 1 (This Week)\n`;
  output += `- 🎯 Target: ${mealPlan.calories_target} calories/day\n`;
  output += `- 📝 You follow the plan and track your weight\n`;
  output += `- 📈 We measure your progress\n\n`;

  const adjustedCalories = mealPlan.goal_type === 'weight_loss' 
    ? mealPlan.calories_target - 100 
    : mealPlan.calories_target + 100;

  output += `### 🔄 Week 2 (Next Week)\n`;
  output += `- 📊 Based on your Week 1 results, we adjust:\n`;
  output += `  - ✅ **Lost weight as expected?** → Keep calories the same\n`;
  output += `  - 📉 **Lost too much?** → Increase calories slightly\n`;
  output += `  - 📈 **Didn't lose enough?** → Decrease to ~${adjustedCalories} cal/day\n`;
  output += `- 🎯 Your plan automatically updates every week\n\n`;

  output += `### 💡 Why This Works\n`;
  output += `Most diets fail because they're static. **The Loop adapts to YOUR body's response**, ensuring sustainable progress without guesswork.\n\n`;

  output += `> 🎯 **Your Mission**: Follow this week's plan and weigh yourself next ${getDayOfWeek(7)} morning. I'll adjust Week 2 based on your results!\n\n`;

  return output;
}

/**
 * Formats affiliate partners as helpful suggestions
 */
export function formatAffiliatePartners(
  partners: AffiliatePartner[],
  context: 'grocery' | 'delivery' | 'meal_kit'
): string {
  if (partners.length === 0) {
    return '';
  }

  const contextText = {
    grocery: 'grocery delivery',
    delivery: 'restaurant delivery',
    meal_kit: 'meal kit'
  }[context];

  let output = `## 🛒 Get Your Ingredients Delivered\n\n`;
  output += `Save time with ${contextText} - here are your best options:\n\n`;

  partners.slice(0, 3).forEach((partner, index) => {
    const emoji = index === 0 ? '⭐' : '💰';
    output += `### ${emoji} ${partner.partner_name}\n`;
    output += `${partner.description}\n\n`;
    output += `- 💡 **Benefit**: ${partner.benefit}\n`;
    if (partner.commission_rate) {
      output += `- 💵 **Commission**: ${partner.commission_rate}\n`;
    }
    output += `- 🔗 [Order Now](${partner.base_url})\n\n`;
  });

  output += `> 💡 **Tip**: These links support LoopGPT at no extra cost to you. Thank you!\n\n`;

  return output;
}

/**
 * Combines meal plan + demo loop + affiliate links into complete onboarding response
 */
export function formatCompleteOnboarding(
  mealPlan: MealPlan,
  affiliatePartners: AffiliatePartner[],
  countryCode: string
): string {
  let output = '';

  // 1. Meal Plan
  output += formatMealPlan(mealPlan);
  output += `\n---\n\n`;

  // 2. Demo Loop
  output += formatDemoLoop(mealPlan);
  output += `\n---\n\n`;

  // 3. Affiliate Links
  if (affiliatePartners.length > 0) {
    output += formatAffiliatePartners(affiliatePartners, 'grocery');
  }

  return output;
}

/**
 * Helper: Get day of week name
 */
function getDayOfWeek(dayNumber: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[(dayNumber - 1) % 7];
}

/**
 * Formats a simple grocery list from meal plan
 */
export function formatGroceryList(mealPlan: MealPlan): string {
  const allIngredients = new Set<string>();
  
  mealPlan.meals.forEach(meal => {
    meal.ingredients.forEach(ingredient => {
      allIngredients.add(ingredient);
    });
  });

  let output = `## 📝 Your Week 1 Grocery List\n\n`;
  
  const sorted = Array.from(allIngredients).sort();
  sorted.forEach(ingredient => {
    output += `- ${ingredient}\n`;
  });

  return output;
}
