// ============================================================================
// Journey 2: Weight Tracking & Adaptation
// Purpose: Templates for weight logging and plan adaptation (The Loop!)
// ============================================================================

export const JOURNEY_2_PROMPTS = {
  /**
   * Acknowledging weight log
   */
  weightLogged: (currentWeight: number, previousWeight: number, change: number) => {
    const emoji = change < 0 ? '⭐' : change === 0 ? '📊' : '📈';
    const changeText = change < 0 ? `down ${Math.abs(change)} lbs` : 
                       change > 0 ? `up ${change} lbs` : 'no change';
    
    return `✅ **Weight Logged: ${currentWeight} lbs**

Previous: ${previousWeight} lbs
Change: ${changeText} ${emoji}

Let me analyze your progress and adjust your plan if needed...`;
  },

  /**
   * Week 1 results (first weigh-in)
   */
  week1Results: (data: any) => `📊 **Your Week 1 Results**

Starting weight: ${data.start_weight} lbs
Current weight: ${data.current_weight} lbs
Change: ${data.change} lbs ${data.change < 0 ? '⭐' : '📈'}

${getWeek1Analysis(data)}

🔮 **Week 2 Projection:**
${data.prediction}

${getWeek2Action(data)}`,

  /**
   * Positive progress (losing weight as intended)
   */
  positiveProgress: (data: any) => `🎉 **Great Progress!**

You lost ${Math.abs(data.change)} lbs this week! ${getCelebration(data.change)}

🔬 **Analysis:**
${data.analysis}

🔄 **Plan Adjustment:**
${data.adjustment}

💡 **Why This Works:**
Your body is responding well to the current plan. We're keeping things consistent because consistency = results.

Ready for Week ${data.next_week}? Here's your updated plan:
${data.next_week_preview}`,

  /**
   * No progress (plateau)
   */
  plateau: (data: any) => `📊 **Let's Talk About This Week**

Your weight stayed the same this week. Before you worry - **this is completely normal**.

🔬 **What's Happening:**
${getPlateauExplanation(data)}

🔄 **The Adjustment:**
I'm reducing your daily calories from ${data.old_calories} to ${data.new_calories} (a small ${data.reduction} cal reduction). This gentle nudge should get things moving again.

💡 **Why Small Changes Work:**
Big calorie cuts backfire. Your body adapts. Small, strategic adjustments keep your metabolism healthy while promoting steady loss.

🎯 **Week ${data.next_week} Plan:**
${data.next_week_preview}

This is exactly why The Loop exists - to catch plateaus early and adjust. You're in good hands! 💪`,

  /**
   * Losing too fast
   */
  tooFast: (data: any) => `⚠️ **You're Losing Weight Quickly**

You lost ${Math.abs(data.change)} lbs this week. While that's exciting, it's faster than optimal for sustainable, healthy weight loss.

🔬 **Why This Matters:**
- Losing too fast can mean muscle loss (not just fat)
- It's harder to maintain long-term
- Your energy and mood might suffer

🔄 **The Adjustment:**
I'm increasing your daily calories from ${data.old_calories} to ${data.new_calories} (adding ${data.increase} cal/day). This will slow your loss to a healthier 1-2 lbs/week.

💡 **Sustainable > Fast:**
The goal isn't to lose weight as fast as possible - it's to lose it in a way you can maintain. Slow and steady wins this race.

🎯 **Week ${data.next_week} Plan:**
${data.next_week_preview}

Trust the process! 🎯`,

  /**
   * Gained weight
   */
  gainedWeight: (data: any) => `📈 **Let's Look at This Week**

Your weight went up ${data.change} lbs this week. First - **don't panic**. Weight fluctuates for many reasons.

🔬 **Possible Reasons:**
- Water retention (sodium, hormones, exercise)
- Digestive timing (food still in system)
- Natural fluctuations (can be 2-5 lbs daily)
- Muscle gain (if you're strength training)

🔄 **What We're Doing:**
${getGainStrategy(data)}

💡 **The Reality:**
Weight loss isn't linear. You won't lose every single week. What matters is the overall trend over 4-6 weeks.

🎯 **Week ${data.next_week} Plan:**
${data.next_week_preview}

One week doesn't define your journey. Let's see what next week brings! 💪`,

  /**
   * Milestone achievements
   */
  milestone: (milestoneType: string, data: any) => {
    const milestones: Record<string, string> = {
      'first_pound': '🎉 **First Pound Lost!**\n\nThis is huge! The first pound is always the hardest because it proves the plan works. You did it!',
      'five_pounds': '⭐ **5 Pounds Down!**\n\nYou\'ve lost 5 pounds! This is significant progress. Your clothes are probably fitting differently. People might start noticing!',
      'ten_pounds': '🔥 **10 POUNDS LOST!**\n\nTEN POUNDS! This is a major milestone. You\'ve lost the equivalent of a bowling ball. How does it feel?',
      'twenty_pounds': '🏆 **20 POUNDS - INCREDIBLE!**\n\nTWENTY POUNDS! You\'ve transformed your body. This is life-changing progress. You should be incredibly proud!',
      'goal_reached': '🎊 **GOAL REACHED!!!**\n\nYOU DID IT! You reached your goal weight! This is what we\'ve been working toward. Congratulations!'
    };
    
    return `${milestones[milestoneType] || milestones.first_pound}

📊 **Your Journey:**
Starting: ${data.start_weight} lbs
Current: ${data.current_weight} lbs
Lost: ${data.total_lost} lbs
Time: ${data.weeks_elapsed} weeks

${getMilestoneReward(milestoneType, data)}

Keep going! 💪`;
  },

  /**
   * Progress check (user asks "how am I doing")
   */
  progressCheck: (data: any) => `📊 **Your Progress Report**

**Overall Stats:**
- Starting weight: ${data.start_weight} lbs
- Current weight: ${data.current_weight} lbs
- Total lost: ${data.total_lost} lbs ${data.total_lost > 0 ? '⭐' : ''}
- Weeks on plan: ${data.weeks_elapsed}
- Average loss/week: ${data.avg_weekly_loss} lbs

**Trend Analysis:**
${getTrendAnalysis(data)}

**Projected Timeline:**
${data.projection}

**How You're Doing:**
${getPerformanceAssessment(data)}

${data.total_lost > 0 ? 'You\'re making progress! Keep it up! 💪' : 'Let\'s make some adjustments to get things moving. 🎯'}`,

  /**
   * Prediction request
   */
  prediction: (data: any) => `🔮 **Your Weight Loss Forecast**

Based on your current progress:

**Current Pace:**
- Average weekly loss: ${data.avg_weekly_loss} lbs/week
- Weeks on plan: ${data.weeks_elapsed}
- Total lost so far: ${data.total_lost} lbs

**Projection:**
- Pounds remaining: ${data.pounds_remaining} lbs
- Estimated weeks to goal: ${data.weeks_to_goal}
- Estimated goal date: ${data.goal_date}

📊 **Confidence Level:** ${data.confidence}

💡 **Important Notes:**
- This assumes your current pace continues
- Weight loss isn't perfectly linear
- The Loop will adjust if needed
- Life happens - that's okay!

**Realistic Timeline:** ${data.realistic_range}

Stay consistent and trust the process! 🎯`,

  /**
   * Streak celebration
   */
  streak: (weeks: number) => {
    const streakMessages: Record<number, string> = {
      2: '🔥 **2-Week Streak!**\n\nYou\'ve logged your weight 2 weeks in a row! Consistency is building!',
      4: '⭐ **1-Month Streak!**\n\nA full month of consistent tracking! This is when habits form!',
      8: '💪 **2-Month Streak!**\n\nTwo months of dedication! You\'re not just losing weight - you\'re building a lifestyle!',
      12: '🏆 **3-Month Streak!**\n\nThree months! At this point, this is who you are. You\'re a person who tracks and adapts!',
      26: '🎊 **6-Month Streak!**\n\nHalf a year of consistency! This is extraordinary dedication!',
      52: '👑 **1-YEAR STREAK!**\n\nA FULL YEAR! You are a tracking legend! This is life-changing commitment!'
    };
    
    return streakMessages[weeks] || `🔥 **${weeks}-Week Streak!**\n\nYou\'ve been consistent for ${weeks} weeks! Keep it going!`;
  },

  /**
   * Encouraging message when user hasn't logged in a while
   */
  comeBack: (daysSinceLastLog: number) => `👋 **Hey! I've Been Waiting for You**

It's been ${daysSinceLastLog} days since your last weigh-in. No judgment - life gets busy!

🔄 **The Loop Needs Data:**
The magic of adaptive planning only works when I know how you're doing. Without your weight data, I can't adjust your plan to match YOUR body's response.

⚖️ **Quick Check-In:**
When you get a chance, hop on the scale and let me know your current weight. Even if it's not what you hoped - that's okay! I'll adjust and get you back on track.

Ready to jump back in? 💪`,

  /**
   * Fallback commands explanation
   */
  fallbackCommands: `💡 **Quick Commands**

If I ever don't understand, you can use these shortcuts:

- \`/track [weight]\` - Log your weight quickly
- \`/progress\` - See your progress report
- \`/predict\` - See when you'll hit your goal
- \`/adjust\` - Manually request a plan adjustment

Example: "/track 165" logs 165 lbs instantly.

But feel free to talk naturally - I understand most things! 😊`
};

// ============================================================================
// Helper Functions
// ============================================================================

function getCelebration(change: number): string {
  if (change <= -5) return '🔥 AMAZING!';
  if (change <= -3) return '⭐ Excellent!';
  if (change <= -2) return '💪 Great job!';
  if (change <= -1) return '🎉 Nice work!';
  return '📊';
}

function getWeek1Analysis(data: any): string {
  if (data.change < -3) {
    return `🔬 **Analysis:** You lost ${Math.abs(data.change)} lbs in Week 1! This is excellent progress. Week 1 often includes water weight, so don't expect this pace every week - but you're off to a great start!`;
  } else if (data.change < -1) {
    return `🔬 **Analysis:** You lost ${Math.abs(data.change)} lbs - perfect! This is exactly the healthy, sustainable pace we want (1-2 lbs/week).`;
  } else if (data.change <= 0) {
    return `🔬 **Analysis:** No loss in Week 1. This can happen - your body might be adjusting, or there could be water retention. Let's give it one more week before adjusting.`;
  } else {
    return `🔬 **Analysis:** Your weight went up slightly. This is often water retention or digestive timing. Let's see what Week 2 brings before making changes.`;
  }
}

function getWeek2Action(data: any): string {
  if (data.change < -1) {
    return `✅ **Action:** Your plan is working! We're keeping everything the same for Week 2. Consistency is key.`;
  } else {
    return `🔄 **Action:** Let's give it one more week. If we don't see movement by Week 3, I'll adjust your calories.`;
  }
}

function getPlateauExplanation(data: any): string {
  const reasons = [
    'Your body adapted to the current calorie level',
    'Water retention might be masking fat loss',
    'Muscle gain could be offsetting fat loss (if you exercise)',
    'Natural fluctuations in body weight'
  ];
  
  return reasons.slice(0, 2).map(r => `- ${r}`).join('\n');
}

function getGainStrategy(data: any): string {
  if (data.weeks_elapsed === 1) {
    return `We're not adjusting yet. One week of data isn't enough. Let's see Week 2.`;
  } else if (data.trend === 'gaining') {
    return `I'm reducing your calories by ${data.reduction} cal/day to reverse this trend.`;
  } else {
    return `Your overall trend is still downward, so we're keeping the plan the same. This week was likely a fluctuation.`;
  }
}

function getMilestoneReward(milestoneType: string, data: any): string {
  return `🎁 **Celebrate Your Success!**

You've earned these milestone rewards:

→ **Upgrade Your Kitchen:** 15% off at Sur La Table [Shop Now] 💰
→ **Treat Yourself:** $20 off premium meal kit [Browse Options] 💰
→ **Invest in Quality:** 20% off organic groceries at Thrive Market [Shop] 💰

💡 Users who celebrate milestones are 3x more likely to reach their final goal!`;
}

function getTrendAnalysis(data: any): string {
  if (data.trend === 'consistent_loss') {
    return '📉 **Excellent!** You\'re losing consistently week over week. This is exactly what we want to see.';
  } else if (data.trend === 'slow_loss') {
    return '📊 **Steady:** You\'re losing slowly but consistently. Slow and steady is sustainable.';
  } else if (data.trend === 'plateau') {
    return '📊 **Plateau:** Your weight has been stable for 2+ weeks. Time for an adjustment.';
  } else {
    return '📈 **Mixed:** Your weight is fluctuating. Let\'s look at the overall trend over 4 weeks.';
  }
}

function getPerformanceAssessment(data: any): string {
  const rate = data.avg_weekly_loss;
  
  if (rate >= 2) {
    return '⚠️ You\'re losing a bit fast. We might slow this down for sustainability.';
  } else if (rate >= 1) {
    return '✅ Perfect pace! You\'re in the sweet spot for sustainable weight loss.';
  } else if (rate >= 0.5) {
    return '📊 Slower than optimal, but still progress. We might adjust to speed this up slightly.';
  } else {
    return '🔄 Minimal progress so far. Time for an adjustment to get things moving.';
  }
}
