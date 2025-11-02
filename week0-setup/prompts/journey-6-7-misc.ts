// ============================================================================
// Journey 6: Progress Visualization
// Journey 7: Miscellaneous (Food Search, Profile, Billing)
// Purpose: Templates for remaining user interactions
// ============================================================================

// ============================================================================
// JOURNEY 6: PROGRESS VISUALIZATION
// ============================================================================

export const JOURNEY_6_PROMPTS = {
  /**
   * Complete progress dashboard
   */
  progressDashboard: (data: any) => `📊 **Your Complete Progress Dashboard**

**Weight Journey:**
${formatWeightJourney(data)}

**Weekly Breakdown:**
${formatWeeklyBreakdown(data)}

**Achievements Unlocked:**
${formatAchievements(data)}

**Nutrition Stats:**
${formatNutritionStats(data)}

**Consistency Score:**
${formatConsistencyScore(data)}

---

🎯 **What's Next:**
${getNextMilestone(data)}

Keep up the amazing work! 💪`,

  /**
   * Weight trend visualization (text-based)
   */
  weightTrend: (data: any) => `📈 **Your Weight Trend**

${generateTextChart(data.weights)}

**Trend Analysis:**
- Overall change: ${data.total_change} lbs ${data.total_change < 0 ? '📉' : '📈'}
- Average weekly loss: ${data.avg_weekly_loss} lbs
- Best week: Week ${data.best_week} (-${data.best_week_loss} lbs)
- Trend direction: ${data.trend_direction} ${getTrendEmoji(data.trend_direction)}

**Projection:**
At your current pace, you'll reach your goal in ${data.weeks_to_goal} weeks (${data.goal_date}).`,

  /**
   * Milestone card generation
   */
  milestoneCard: (milestone: any) => `🎉 **Milestone Achievement!**

${milestone.title}

${milestone.description}

**Your Stats:**
- Starting: ${milestone.start_weight} lbs
- Current: ${milestone.current_weight} lbs
- Lost: ${milestone.total_lost} lbs
- Time: ${milestone.days_elapsed} days

📸 **Shareable Card Generated:**
[Image: Milestone card with stats and celebration graphics]

**Share Your Success:**
- [Copy Link]
- [Download Image]
- [Post to Instagram]
- [Post to Facebook]

💡 Sharing your progress increases accountability and inspires others!`,

  /**
   * Weekly summary card
   */
  weeklySummary: (week: any) => `📅 **Week ${week.number} Summary**

**Weight:**
Start: ${week.start_weight} lbs
End: ${week.end_weight} lbs
Change: ${week.change} lbs ${week.change < 0 ? '⭐' : '📊'}

**Nutrition:**
Avg daily calories: ${week.avg_calories}
Protein target hit: ${week.protein_days}/7 days
Meals logged: ${week.meals_logged}

**Activity:**
Days tracked: ${week.tracking_days}/7
Streak: ${week.streak_days} days 🔥

**Highlights:**
${week.highlights.map((h: string) => `- ${h}`).join('\n')}

**Next Week Focus:**
${week.next_week_focus}

Ready for Week ${week.number + 1}? 💪`,

  /**
   * Before/After comparison
   */
  beforeAfter: (data: any) => `🔄 **Your Transformation**

**Before (${data.start_date}):**
- Weight: ${data.start_weight} lbs
- BMI: ${data.start_bmi}
- Body Fat: ${data.start_bf}%

**After (${data.current_date}):**
- Weight: ${data.current_weight} lbs
- BMI: ${data.current_bmi}
- Body Fat: ${data.current_bf}%

**Changes:**
- Weight: ${data.weight_change} lbs ${data.weight_change < 0 ? '📉' : '📈'}
- BMI: ${data.bmi_change} points
- Body Fat: ${data.bf_change}%

**What This Means:**
${explainTransformation(data)}

📸 Want to upload progress photos? They're a powerful motivator!`
};

// ============================================================================
// JOURNEY 7: MISCELLANEOUS
// ============================================================================

export const JOURNEY_7_PROMPTS = {
  /**
   * Food search results
   */
  foodSearch: (query: string, results: any[]) => `🔍 **Search Results for "${query}"**

Found ${results.length} matches:

${formatSearchResults(results)}

Type a number to see full nutrition info, or refine your search!`,

  /**
   * User profile display
   */
  userProfile: (profile: any) => `👤 **Your Profile**

**Goals:**
- Primary goal: ${profile.goal_type}
- Target weight: ${profile.target_weight} lbs
- Current weight: ${profile.current_weight} lbs
- To go: ${profile.weight_remaining} lbs

**Settings:**
- Activity level: ${profile.activity_level}
- Daily calories: ${profile.daily_calories}
- Dietary restrictions: ${profile.dietary_restrictions.join(', ') || 'None'}

**Account:**
- Member since: ${profile.member_since}
- Subscription: ${profile.subscription_type}
- Streak: ${profile.streak} days 🔥

Want to update anything? Just let me know!`,

  /**
   * Update dietary restrictions
   */
  updateRestrictions: (restrictions: string[]) => `✅ **Dietary Restrictions Updated**

Your restrictions: ${restrictions.join(', ')}

I'll make sure all future meal plans and recipes respect these restrictions.

Your current meal plan will be regenerated to match. Ready to see your updated plan?`,

  /**
   * Update weight goal
   */
  updateGoal: (newGoal: number, current: number) => `🎯 **Goal Updated**

New target: ${newGoal} lbs
Current: ${current} lbs
To go: ${Math.abs(newGoal - current)} lbs

I'm recalculating your meal plan to match this new goal...

${newGoal > current ? 
  'Switching to muscle gain mode! 💪' : 
  'Adjusting for weight loss! 📉'}`,

  /**
   * Subscription check
   */
  checkSubscription: (status: any) => `💳 **Your Subscription**

**Status:** ${status.active ? '✅ Active' : '❌ Inactive'}
**Plan:** ${status.plan_name}
**Features:**
${formatFeatures(status.features)}

${!status.active ? `
⚠️ **Upgrade to Premium for:**
- Unlimited meal plan adaptations
- Chef persona recipes
- Restaurant ordering
- Priority support
- Advanced analytics

[Upgrade Now] - $9.99/month
` : ''}`,

  /**
   * Upgrade prompt
   */
  upgradePrompt: `🌟 **Upgrade to LoopGPT Premium**

**Free Plan:**
- ✅ Week 1 meal plan
- ✅ Basic tracking
- ✅ Nutrition info

**Premium ($9.99/month):**
- ✅ **Unlimited adaptive meal plans** (The Loop!)
- ✅ **Chef persona recipes** (Jamie, Paul, Gordon)
- ✅ **Restaurant ordering** with goal matching
- ✅ **Advanced analytics** and predictions
- ✅ **Priority support**
- ✅ **Meal kit integration**

💡 **Premium users lose 2.3x more weight** because their plans continuously adapt!

[Start 7-Day Free Trial]
[Upgrade Now - $9.99/month]

Questions about premium?`,

  /**
   * Help/Commands
   */
  help: `💡 **How to Use LoopGPT**

**Main Features:**
- "Create a meal plan" - Get started
- "I weighed [X] lbs" - Log weight
- "Show my progress" - See your stats
- "I have [ingredients]" - Get a recipe
- "I don't want to cook" - Order food
- "Is [food] healthy?" - Nutrition info

**Quick Commands:**
- \`/plan\` - Show current meal plan
- \`/track [weight]\` - Log weight quickly
- \`/progress\` - Progress dashboard
- \`/recipe\` - Generate a recipe
- \`/order\` - Find restaurants
- \`/help\` - Show this message

**Tips:**
- Talk naturally - I understand context!
- Ask follow-up questions
- Tell me if something isn't working

What can I help you with? 🎯`,

  /**
   * Feedback request
   */
  feedbackRequest: `💭 **How Am I Doing?**

I'd love your feedback to improve!

**Quick Rating:**
⭐⭐⭐⭐⭐ - Amazing!
⭐⭐⭐⭐ - Pretty good
⭐⭐⭐ - Okay
⭐⭐ - Needs work
⭐ - Not helpful

**What could be better?**
(Optional - but super helpful!)

Your feedback helps me serve you better! 🙏`,

  /**
   * Error/Confusion
   */
  confused: `🤔 **I'm Not Sure I Understood**

Could you rephrase that? Or try one of these:

- "Create a meal plan"
- "Log my weight"
- "Show my progress"
- "Give me a recipe"
- "Find restaurants"
- "Help"

What would you like to do? 🎯`,

  /**
   * Feature not available
   */
  notAvailable: (feature: string) => `⚠️ **Feature Not Available Yet**

"${feature}" is coming soon! We're working on it.

**Available Now:**
- Meal planning & adaptation
- Weight tracking
- Recipe generation
- Restaurant ordering
- Nutrition analysis

Want to be notified when ${feature} launches? [Yes] [No]`,

  /**
   * Maintenance mode
   */
  maintenance: `🔧 **Quick Maintenance**

I'm experiencing a brief issue, but I'll be back in a moment!

**What You Can Do:**
- Try again in 30 seconds
- Use quick commands: /plan, /track, /progress
- [Check Status Page]

Sorry for the inconvenience! 🙏`
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatWeightJourney(data: any): string {
  return `
Start: ${data.start_weight} lbs (${data.start_date})
Current: ${data.current_weight} lbs
Lost: ${data.total_lost} lbs
Goal: ${data.goal_weight} lbs
Remaining: ${data.remaining} lbs
`;
}

function formatWeeklyBreakdown(data: any): string {
  return data.weeks.map((week: any) => 
    `Week ${week.number}: ${week.change} lbs ${week.change < 0 ? '📉' : '📊'}`
  ).join('\n');
}

function formatAchievements(data: any): string {
  return data.achievements.map((a: any) => 
    `${a.emoji} ${a.title} - ${a.date}`
  ).join('\n');
}

function formatNutritionStats(data: any): string {
  return `
Avg daily calories: ${data.avg_calories}
Protein target hit: ${data.protein_days}/${data.total_days} days
Meals logged: ${data.meals_logged}
`;
}

function formatConsistencyScore(data: any): string {
  const score = data.consistency_score;
  const emoji = score >= 90 ? '🏆' : score >= 70 ? '⭐' : '📊';
  return `${score}/100 ${emoji}\n${getConsistencyMessage(score)}`;
}

function getConsistencyMessage(score: number): string {
  if (score >= 90) return 'Exceptional! You\'re crushing it!';
  if (score >= 70) return 'Great consistency! Keep it up!';
  return 'Room for improvement - try tracking daily!';
}

function getNextMilestone(data: any): string {
  return `Your next milestone: ${data.next_milestone} (${data.distance_to_milestone} lbs away)`;
}

function generateTextChart(weights: number[]): string {
  // Simple text-based chart
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const range = max - min;
  
  return weights.map((w, i) => {
    const normalized = Math.round(((w - min) / range) * 10);
    const bar = '█'.repeat(normalized) + '░'.repeat(10 - normalized);
    return `Week ${i + 1}: ${bar} ${w} lbs`;
  }).join('\n');
}

function getTrendEmoji(direction: string): string {
  if (direction === 'down') return '📉';
  if (direction === 'up') return '📈';
  return '➡️';
}

function explainTransformation(data: any): string {
  const lostLbs = Math.abs(data.weight_change);
  return `You've lost ${lostLbs} pounds! That's like carrying around ${Math.floor(lostLbs / 5)} bags of sugar less every day. Your body is transforming!`;
}

function formatSearchResults(results: any[]): string {
  return results.slice(0, 10).map((r, i) => 
    `${i + 1}. **${r.name}** - ${r.calories} cal per ${r.serving_size}`
  ).join('\n');
}

function formatFeatures(features: string[]): string {
  return features.map(f => `- ✅ ${f}`).join('\n');
}
