// ============================================================================
// Journey 5: Nutrition Analysis & Food Comparison
// Purpose: Templates for analyzing foods and answering nutrition questions
// ============================================================================

export const JOURNEY_5_PROMPTS = {
  /**
   * Analyzing a single food
   */
  analyzeFood: (food: any) => `🔬 **Nutrition Analysis: ${food.name}**

**Per Serving (${food.serving_size}):**
- Calories: ${food.calories} cal
- Protein: ${food.protein}g
- Carbs: ${food.carbs}g
- Fat: ${food.fat}g
- Fiber: ${food.fiber}g

**Micronutrients:**
${formatMicronutrients(food)}

---

💡 **What This Means:**
${explainNutritionValue(food)}

**Fits Your Goals?**
${assessGoalFit(food)}

Want to compare this to something else?`,

  /**
   * Comparing two foods
   */
  compareFoods: (food1: any, food2: any) => `⚖️ **Food Comparison**

**${food1.name}** vs **${food2.name}**

${formatComparison(food1, food2)}

---

🏆 **Winner for Your Goals:**
${determineWinner(food1, food2)}

💡 **Bottom Line:**
${getComparisonInsight(food1, food2)}

Want to add either of these to your meal plan?`,

  /**
   * Macro breakdown
   */
  getMacros: (food: any) => `📊 **Macro Breakdown: ${food.name}**

**Per ${food.serving_size}:**

🥩 **Protein:** ${food.protein}g (${getProteinPercentage(food)}%)
${getProteinBar(food)}

🍞 **Carbs:** ${food.carbs}g (${getCarbPercentage(food)}%)
${getCarbBar(food)}

🥑 **Fat:** ${food.fat}g (${getFatPercentage(food)}%)
${getFatBar(food)}

---

**Macro Ratio:** ${getMacroRatio(food)}

💡 **For Your Goals:**
${assessMacroFit(food)}`,

  /**
   * Food recommendations
   */
  recommendations: (userGoal: string) => `🎯 **Foods Perfect for ${userGoal}**

Based on your goal, here are my top recommendations:

**Proteins:**
${getProteinRecommendations(userGoal)}

**Carbs:**
${getCarbRecommendations(userGoal)}

**Fats:**
${getFatRecommendations(userGoal)}

**Superfoods:**
${getSuperfoodRecommendations(userGoal)}

💡 **Pro Tip:**
${getRecommendationTip(userGoal)}

Want me to add any of these to your grocery list?`,

  /**
   * "Is [food] healthy?" question
   */
  isHealthy: (food: any) => `🤔 **Is ${food.name} Healthy?**

**Short Answer:** ${getHealthyVerdict(food)}

**The Nuanced Answer:**
${getHealthyExplanation(food)}

**Pros:**
${getHealthyPros(food)}

**Cons:**
${getHealthyCons(food)}

**For Your Goals (${getUserGoal()}):**
${getGoalSpecificAdvice(food)}

💡 **Bottom Line:**
${getHealthyBottomLine(food)}`,

  /**
   * Calorie question
   */
  calorieQuestion: (food: any, serving: string) => `🔢 **Calories in ${food.name}**

**${serving}:** ${food.calories} cal

**Context:**
- That's ${getPercentOfDailyTarget(food.calories)}% of your daily target
- Equivalent to: ${getCalorieEquivalent(food.calories)}
- You'd need to: ${getBurnEquivalent(food.calories)}

**Compared to Alternatives:**
${getCalorieAlternatives(food)}

💡 **Fits Your Plan?**
${assessCalorieFit(food)}`,

  /**
   * Protein question
   */
  proteinQuestion: (food: any) => `💪 **Protein in ${food.name}**

**Per ${food.serving_size}:** ${food.protein}g protein

**Context:**
- That's ${getPercentOfProteinTarget(food.protein)}% of your daily protein goal
- Protein quality: ${getProteinQuality(food)} ${getProteinQualityEmoji(food)}
- Complete protein: ${food.complete_protein ? 'Yes ✅' : 'No ❌'}

**Compared to Other Proteins:**
${compareProteinSources(food)}

💡 **For Your Goals:**
${getProteinAdvice(food)}`,

  /**
   * Carb question
   */
  carbQuestion: (food: any) => `🍞 **Carbs in ${food.name}**

**Per ${food.serving_size}:** ${food.carbs}g carbs

**Breakdown:**
- Fiber: ${food.fiber}g (${getFiberPercentage(food)}%)
- Sugar: ${food.sugar}g (${getSugarPercentage(food)}%)
- Net carbs: ${food.carbs - food.fiber}g

**Glycemic Impact:**
${getGlycemicInfo(food)}

**For Your Goals:**
${getCarbAdvice(food)}`,

  /**
   * Fat question
   */
  fatQuestion: (food: any) => `🥑 **Fat in ${food.name}**

**Per ${food.serving_size}:** ${food.fat}g fat

**Fat Profile:**
- Saturated: ${food.saturated_fat}g
- Monounsaturated: ${food.monounsaturated_fat}g
- Polyunsaturated: ${food.polyunsaturated_fat}g
- Trans fat: ${food.trans_fat}g ${food.trans_fat > 0 ? '⚠️' : '✅'}

**Fat Quality:** ${getFatQuality(food)} ${getFatQualityEmoji(food)}

💡 **What This Means:**
${getFatAdvice(food)}`,

  /**
   * Vitamin/mineral question
   */
  micronutrientQuestion: (food: any, nutrient: string) => `🌟 **${nutrient} in ${food.name}**

**Per ${food.serving_size}:** ${food[nutrient.toLowerCase()]}

**Daily Value:** ${getDailyValuePercentage(food, nutrient)}%

**Why ${nutrient} Matters:**
${getMicronutrientBenefit(nutrient)}

**Best Sources of ${nutrient}:**
${getBestSources(nutrient)}

**For You:**
${getMicronutrientAdvice(food, nutrient)}`,

  /**
   * Food swap suggestion
   */
  suggestSwap: (originalFood: any) => `🔄 **Healthier Swaps for ${originalFood.name}**

Here are better alternatives that taste similar:

${getSwapSuggestions(originalFood)}

💡 **Why These Work:**
${explainSwaps(originalFood)}

Want me to add any of these to your meal plan?`,

  /**
   * Portion size guidance
   */
  portionGuidance: (food: any) => `🍽️ **Portion Size Guide: ${food.name}**

**Standard Serving:** ${food.serving_size}
**Visual Guide:** ${getVisualPortionGuide(food)}

**For Your Goals:**
- Recommended portion: ${getRecommendedPortion(food)}
- Frequency: ${getRecommendedFrequency(food)}

**Portion Tips:**
${getPortionTips(food)}

💡 **Pro Tip:**
${getPortionProTip(food)}`
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatMicronutrients(food: any): string {
  const micros = [
    `Vitamin A: ${food.vitamin_a || 0}% DV`,
    `Vitamin C: ${food.vitamin_c || 0}% DV`,
    `Calcium: ${food.calcium || 0}% DV`,
    `Iron: ${food.iron || 0}% DV`
  ];
  return micros.join(' | ');
}

function explainNutritionValue(food: any): string {
  const insights = [];
  
  if (food.protein > 20) {
    insights.push('High in protein - great for muscle maintenance and satiety');
  }
  if (food.fiber > 5) {
    insights.push('Good fiber content - helps with digestion and fullness');
  }
  if (food.calories < 100) {
    insights.push('Low calorie - can eat more volume');
  }
  
  return insights.join('. ') || 'Provides balanced nutrition.';
}

function assessGoalFit(food: any): string {
  const goal = getUserGoal();
  
  if (goal === 'weight_loss') {
    if (food.calories < 200 && food.protein > 15) {
      return '✅ Excellent for weight loss - low calorie, high protein';
    } else if (food.calories > 400) {
      return '⚠️ High calorie - eat in moderation';
    }
  }
  
  return '✅ Fits your goals when eaten in appropriate portions';
}

function formatComparison(food1: any, food2: any): string {
  return `
| Nutrient | ${food1.name} | ${food2.name} | Winner |
|----------|---------------|---------------|--------|
| Calories | ${food1.calories} | ${food2.calories} | ${food1.calories < food2.calories ? food1.name : food2.name} |
| Protein | ${food1.protein}g | ${food2.protein}g | ${food1.protein > food2.protein ? food1.name : food2.name} |
| Carbs | ${food1.carbs}g | ${food2.carbs}g | ${food1.carbs < food2.carbs ? food1.name : food2.name} |
| Fat | ${food1.fat}g | ${food2.fat}g | ${food1.fat < food2.fat ? food1.name : food2.name} |
| Fiber | ${food1.fiber}g | ${food2.fiber}g | ${food1.fiber > food2.fiber ? food1.name : food2.name} |
`;
}

function determineWinner(food1: any, food2: any): string {
  const goal = getUserGoal();
  
  if (goal === 'weight_loss') {
    const winner = food1.calories < food2.calories && food1.protein > food2.protein ? food1 : food2;
    return `**${winner.name}** - Lower calories, higher protein`;
  }
  
  return `Both are good choices - pick based on your preference!`;
}

function getComparisonInsight(food1: any, food2: any): string {
  return `Both foods can fit your plan. ${food1.name} is better for [reason], while ${food2.name} is better for [reason]. Choose based on your current needs!`;
}

function getProteinPercentage(food: any): number {
  const proteinCals = food.protein * 4;
  return Math.round((proteinCals / food.calories) * 100);
}

function getCarbPercentage(food: any): number {
  const carbCals = food.carbs * 4;
  return Math.round((carbCals / food.calories) * 100);
}

function getFatPercentage(food: any): number {
  const fatCals = food.fat * 9;
  return Math.round((fatCals / food.calories) * 100);
}

function getProteinBar(food: any): string {
  const pct = getProteinPercentage(food);
  const bars = '█'.repeat(Math.floor(pct / 10));
  return `${bars} ${pct}%`;
}

function getCarbBar(food: any): string {
  const pct = getCarbPercentage(food);
  const bars = '█'.repeat(Math.floor(pct / 10));
  return `${bars} ${pct}%`;
}

function getFatBar(food: any): string {
  const pct = getFatPercentage(food);
  const bars = '█'.repeat(Math.floor(pct / 10));
  return `${bars} ${pct}%`;
}

function getMacroRatio(food: any): string {
  const p = getProteinPercentage(food);
  const c = getCarbPercentage(food);
  const f = getFatPercentage(food);
  return `${p}% protein / ${c}% carbs / ${f}% fat`;
}

function assessMacroFit(food: any): string {
  const goal = getUserGoal();
  const p = getProteinPercentage(food);
  
  if (goal === 'weight_loss' && p > 30) {
    return '✅ Great macro ratio for weight loss - high protein keeps you full';
  } else if (goal === 'muscle_gain' && p > 25) {
    return '✅ Good protein content for muscle building';
  }
  
  return '✅ Balanced macros';
}

function getUserGoal(): string {
  // This would come from user profile
  return 'weight_loss';
}

function getProteinRecommendations(goal: string): string {
  return `- Chicken breast (165 cal, 31g protein per 4oz)
- Salmon (206 cal, 23g protein per 4oz)
- Greek yogurt (100 cal, 17g protein per cup)`;
}

function getCarbRecommendations(goal: string): string {
  return `- Sweet potato (112 cal, 26g carbs per medium)
- Quinoa (222 cal, 39g carbs per cup)
- Oatmeal (150 cal, 27g carbs per cup)`;
}

function getFatRecommendations(goal: string): string {
  return `- Avocado (240 cal, 22g fat per avocado)
- Almonds (164 cal, 14g fat per oz)
- Olive oil (119 cal, 14g fat per tbsp)`;
}

function getSuperfoodRecommendations(goal: string): string {
  return `- Blueberries (84 cal, antioxidants)
- Spinach (7 cal, vitamins A/C/K)
- Chia seeds (138 cal, omega-3s)`;
}

function getRecommendationTip(goal: string): string {
  if (goal === 'weight_loss') {
    return 'Focus on high-volume, low-calorie foods to stay full!';
  }
  return 'Variety is key - rotate through different foods for complete nutrition!';
}

function getHealthyVerdict(food: any): string {
  // Simplified health scoring
  if (food.protein > 15 && food.fiber > 3 && food.calories < 300) {
    return '✅ Yes, very healthy!';
  } else if (food.sugar > 20 || food.trans_fat > 0) {
    return '⚠️ Not the healthiest choice';
  }
  return '🤷 It depends on context';
}

function getHealthyExplanation(food: any): string {
  return `"Healthy" depends on your goals, portion size, and overall diet. Let me break down the specifics...`;
}

function getHealthyPros(food: any): string {
  return `- Good source of [nutrient]\n- Provides [benefit]`;
}

function getHealthyCons(food: any): string {
  return `- High in [concern]\n- Low in [nutrient]`;
}

function getGoalSpecificAdvice(food: any): string {
  return `For your weight loss goal, this food ${assessGoalFit(food)}`;
}

function getHealthyBottomLine(food: any): string {
  return `Include this in your diet in moderation as part of a balanced meal plan.`;
}

function getPercentOfDailyTarget(calories: number): number {
  return Math.round((calories / 1800) * 100);
}

function getCalorieEquivalent(calories: number): string {
  const equivalents = [
    { item: 'a banana', cal: 105 },
    { item: 'a slice of bread', cal: 80 },
    { item: 'an apple', cal: 95 }
  ];
  
  const closest = equivalents.reduce((prev, curr) => 
    Math.abs(curr.cal - calories) < Math.abs(prev.cal - calories) ? curr : prev
  );
  
  return closest.item;
}

function getBurnEquivalent(calories: number): string {
  const minutes = Math.round(calories / 10); // Rough estimate: 10 cal/min walking
  return `walk for ${minutes} minutes to burn this off`;
}

function getCalorieAlternatives(food: any): string {
  return `Similar foods with fewer calories: [alternatives]`;
}

function assessCalorieFit(food: any): string {
  return assessGoalFit(food);
}

function getPercentOfProteinTarget(protein: number): number {
  return Math.round((protein / 150) * 100); // Assuming 150g daily target
}

function getProteinQuality(food: any): string {
  if (food.complete_protein) return 'High';
  return 'Moderate';
}

function getProteinQualityEmoji(food: any): string {
  return food.complete_protein ? '⭐' : '📊';
}

function compareProteinSources(food: any): string {
  return `Compared to chicken breast (31g per 4oz), this provides ${food.protein}g per serving.`;
}

function getProteinAdvice(food: any): string {
  return `Good protein source for your goals!`;
}

function getFiberPercentage(food: any): number {
  return Math.round((food.fiber / food.carbs) * 100);
}

function getSugarPercentage(food: any): number {
  return Math.round((food.sugar / food.carbs) * 100);
}

function getGlycemicInfo(food: any): string {
  return `Moderate glycemic impact - pair with protein for stable blood sugar`;
}

function getCarbAdvice(food: any): string {
  return `Good carb source - provides energy without spiking blood sugar`;
}

function getFatQuality(food: any): string {
  if (food.trans_fat > 0) return 'Poor';
  if (food.monounsaturated_fat > food.saturated_fat) return 'High';
  return 'Moderate';
}

function getFatQualityEmoji(food: any): string {
  if (food.trans_fat > 0) return '⚠️';
  return '✅';
}

function getFatAdvice(food: any): string {
  return `Healthy fat source - supports hormone production and nutrient absorption`;
}

function getDailyValuePercentage(food: any, nutrient: string): number {
  return 25; // Placeholder
}

function getMicronutrientBenefit(nutrient: string): string {
  const benefits: Record<string, string> = {
    'Vitamin C': 'Supports immune function and collagen production',
    'Iron': 'Essential for oxygen transport in blood',
    'Calcium': 'Builds strong bones and teeth'
  };
  return benefits[nutrient] || 'Important for overall health';
}

function getBestSources(nutrient: string): string {
  return `Citrus fruits, bell peppers, broccoli`;
}

function getMicronutrientAdvice(food: any, nutrient: string): string {
  return `This food provides a good amount of ${nutrient} for your daily needs`;
}

function getSwapSuggestions(food: any): string {
  return `1. [Healthier alternative] - saves X calories\n2. [Another option] - more protein`;
}

function explainSwaps(food: any): string {
  return `These alternatives provide similar taste with better nutrition`;
}

function getVisualPortionGuide(food: any): string {
  return `About the size of your palm`;
}

function getRecommendedPortion(food: any): string {
  return `1 serving (${food.serving_size})`;
}

function getRecommendedFrequency(food: any): string {
  return `2-3 times per week`;
}

function getPortionTips(food: any): string {
  return `- Use smaller plates\n- Measure portions initially\n- Listen to hunger cues`;
}

function getPortionProTip(food: any): string {
  return `Pre-portion snacks to avoid overeating!`;
}
