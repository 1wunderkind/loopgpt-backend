// ============================================================================
// Journey 4: Food Ordering & Delivery
// Purpose: Templates for restaurant search and food ordering with affiliate links
// ============================================================================

export const JOURNEY_4_PROMPTS = {
  /**
   * Acknowledging user doesn't want to cook
   */
  dontWantToCook: `🍽️ **No Problem! Let's Order Something**

I totally get it - sometimes you just don't feel like cooking. The good news? I can find restaurants that match your meal plan goals.

What are you in the mood for?
- **Cuisine type** (Italian, Mexican, Asian, etc.)
- **Specific craving** (pizza, burgers, salad, etc.)
- **Just show me options** that fit my calories

What sounds good? 🎯`,

  /**
   * Searching for restaurants
   */
  searching: (cuisine?: string) => `🔍 **Searching for Restaurants...**

${cuisine ? `Looking for ${cuisine} restaurants near you...` : 'Finding restaurants that match your goals...'}

📊 Filtering by your calorie target (${getCalorieTarget()} cal/meal)
📍 Using your location
🎯 Prioritizing healthy options`,

  /**
   * Presenting restaurant options
   */
  presentRestaurants: (restaurants: any[], affiliates: any[]) => `🍽️ **Here Are Your Best Options**

I found ${restaurants.length} restaurants that match your goals:

${formatRestaurants(restaurants)}

---

💰 **Save Money with These Delivery Services:**

${formatDeliveryAffiliates(affiliates)}

💡 **Pro Tip:** MealMe compares prices across all platforms and shows you the cheapest option!

Which restaurant looks good? 🎯`,

  /**
   * Restaurant details
   */
  restaurantDetails: (restaurant: any) => `🍽️ **${restaurant.name}**

${restaurant.cuisine} • ${restaurant.rating} ⭐ (${restaurant.review_count} reviews)
${restaurant.price_range} • ${restaurant.delivery_time}

**Recommended Dishes (Within Your Calories):**
${formatRecommendedDishes(restaurant.dishes)}

**Why This Works:**
${explainNutritionFit(restaurant)}

Ready to order? I can:
1. **Place order through MealMe** (best price) 💰
2. **Show on Uber Eats** 💰
3. **Show on DoorDash** 💰
4. **Just give me the info** (order yourself)

What works for you?`,

  /**
   * Placing order
   */
  placingOrder: (restaurant: any, dish: any) => `🛒 **Placing Your Order**

Restaurant: ${restaurant.name}
Dish: ${dish.name}
Price: $${dish.price}
Calories: ${dish.calories} cal

Delivery to: ${getUserAddress()}
Estimated time: ${restaurant.delivery_time}

Confirming order through MealMe...`,

  /**
   * Order confirmed
   */
  orderConfirmed: (order: any) => `✅ **Order Confirmed!**

${order.restaurant_name} - ${order.dish_name}
Order #: ${order.order_id}

**Delivery Details:**
Estimated arrival: ${order.estimated_time}
Delivery fee: $${order.delivery_fee}
Total: $${order.total}

📊 **Nutrition:**
${order.calories} cal | ${order.protein}g protein | ${order.carbs}g carbs | ${order.fat}g fat

💡 **Fits Your Plan:** This meal is within your daily calorie target. Enjoy!

Track your order: [Link]

Bon appétit! 🎉`,

  /**
   * No restaurants found
   */
  noRestaurants: (cuisine?: string) => `😕 **Hmm, I'm Not Finding Great Options**

${cuisine ? `I couldn't find ${cuisine} restaurants in your area that match your calorie goals.` : 'I\'m not finding restaurants nearby that fit your nutrition targets.'}

**Alternative Options:**

1. **Expand search** - Show me ALL restaurants (I'll help you pick the healthiest option)
2. **Different cuisine** - Try a different type of food
3. **Meal kit instead** - Get a pre-portioned meal delivered:
${formatMealKitOptions()}
4. **Quick recipe** - I can suggest a 15-minute meal you can make

What would you prefer?`,

  /**
   * Over calorie budget
   */
  overBudget: (dish: any, overage: number) => `⚠️ **Heads Up on Calories**

"${dish.name}" is ${dish.calories} calories, which is ${overage} cal over your meal target.

**You Have Options:**

1. **Order it anyway** - Adjust other meals today to compensate
2. **Order a smaller portion** - Ask for half size or save half for tomorrow
3. **Pick something else** - I'll show you dishes under ${getCalorieTarget()} cal
4. **Make it a cheat meal** - Enjoy it, get back on track tomorrow

What feels right? 🎯`,

  /**
   * Healthy modifications suggestion
   */
  modifications: (dish: any) => `💡 **Make It Healthier**

"${dish.name}" can be modified to fit your goals better:

**Suggested Changes:**
${getSuggestedModifications(dish)}

**New Nutrition:**
${dish.calories} cal → ${dish.modified_calories} cal
${dish.protein}g protein → ${dish.modified_protein}g protein

Want me to add these modifications to your order?`,

  /**
   * Delivery affiliate comparison
   */
  compareDelivery: (restaurant: any, platforms: any[]) => `💰 **Price Comparison**

"${restaurant.name}" is available on multiple platforms:

${formatPriceComparison(platforms)}

💡 **Recommendation:** ${getBestPlatform(platforms)}

Which platform should I use?`,

  /**
   * Reorder suggestion
   */
  reorder: (previousOrders: any[]) => `🔄 **Reorder a Favorite?**

You've ordered these before and they fit your plan:

${formatPreviousOrders(previousOrders)}

Want to reorder one of these, or search for something new?`,

  /**
   * Meal kit alternative
   */
  mealKitAlternative: (mealKits: any[]) => `📦 **Or Try a Meal Kit?**

If you don't want to cook OR order delivery, meal kits are a great middle ground:

${formatMealKitOptions(mealKits)}

**Why Meal Kits:**
- ✅ Pre-portioned (no food waste)
- ✅ Matches your calorie goals
- ✅ Learn new recipes
- ✅ Healthier than takeout
- ✅ Cheaper than delivery

Interested? 🎯`,

  /**
   * Tracking order
   */
  trackOrder: (order: any) => `📍 **Track Your Order**

Order #${order.order_id} from ${order.restaurant_name}

**Status:** ${order.status}
**Driver:** ${order.driver_name || 'Assigned'}
**ETA:** ${order.eta}

[Live Tracking Map]

I'll let you know when it's close! 🚗`,

  /**
   * Order arrived
   */
  orderArrived: (order: any) => `🎉 **Your Food Has Arrived!**

Enjoy your ${order.dish_name} from ${order.restaurant_name}!

📊 **Don't Forget to Log:**
This meal is ${order.calories} calories. I've automatically logged it to your daily tracker.

**Remaining Today:**
${getRemainingCalories(order.calories)} calories left

Rate your experience: ⭐⭐⭐⭐⭐`,

  /**
   * Ordering too frequently warning
   */
  frequencyWarning: (ordersThisWeek: number) => `💡 **Quick Check-In**

I noticed you've ordered delivery ${ordersThisWeek} times this week. No judgment - life gets busy!

**Just a Reminder:**
- Cooking at home = better control over ingredients
- Delivery = higher sodium, hidden calories
- Your wallet will thank you 😊

**Want Help?**
I can adjust your meal plan to include more quick meals (15 min or less) so cooking feels easier.

Interested? Or you're good with delivery? 🎯`
};

// ============================================================================
// Helper Functions
// ============================================================================

function getCalorieTarget(): number {
  // This would come from user's meal plan
  return 600; // Example: 600 cal per meal
}

function formatRestaurants(restaurants: any[]): string {
  return restaurants.slice(0, 5).map((r, i) => {
    return `**${i + 1}. ${r.name}** ${r.rating} ⭐
${r.cuisine} • ${r.price_range} • ${r.delivery_time}
💡 Best pick: ${r.recommended_dish} (${r.recommended_calories} cal)
[View Menu]`;
  }).join('\n\n');
}

function formatDeliveryAffiliates(affiliates: any[]): string {
  return affiliates.map(aff => {
    return `→ **${aff.partner_name}**: ${aff.description}
   [Order via ${aff.partner_name}] 💰 ${aff.benefit}`;
  }).join('\n\n');
}

function formatRecommendedDishes(dishes: any[]): string {
  return dishes.map(dish => {
    return `→ **${dish.name}** - $${dish.price}
   ${dish.calories} cal | ${dish.protein}g protein
   💡 ${dish.why_recommended}`;
  }).join('\n\n');
}

function explainNutritionFit(restaurant: any): string {
  return `The dishes I recommended are within your ${getCalorieTarget()} calorie target and provide good protein (${restaurant.avg_protein}g). They won't derail your progress!`;
}

function getUserAddress(): string {
  // This would come from user profile
  return '[Your saved address]';
}

function formatMealKitOptions(mealKits?: any[]): string {
  const kits = mealKits || [
    { name: 'HelloFresh', price: '$8-12/meal', benefit: '50% off first box' },
    { name: 'Factor', price: '$11-15/meal', benefit: 'Fully prepared meals' }
  ];
  
  return kits.map(kit => {
    return `→ **${kit.name}**: ${kit.price}
   [Get Started] 💰 ${kit.benefit}`;
  }).join('\n\n');
}

function getSuggestedModifications(dish: any): string {
  const mods = [
    '- Dressing on the side (saves ~100 cal)',
    '- No cheese or light cheese (saves ~80 cal)',
    '- Grilled instead of fried (saves ~150 cal)',
    '- Extra vegetables instead of fries'
  ];
  
  return mods.slice(0, 3).join('\n');
}

function formatPriceComparison(platforms: any[]): string {
  return platforms.map((p, i) => {
    const badge = i === 0 ? ' ⭐ BEST PRICE' : '';
    return `${i + 1}. **${p.platform_name}**${badge}
   Subtotal: $${p.subtotal}
   Delivery: $${p.delivery_fee}
   Total: $${p.total}
   Time: ${p.delivery_time}`;
  }).join('\n\n');
}

function getBestPlatform(platforms: any[]): string {
  const cheapest = platforms[0];
  return `Use **${cheapest.platform_name}** - it's $${platforms[1].total - cheapest.total} cheaper than the next option!`;
}

function formatPreviousOrders(orders: any[]): string {
  return orders.slice(0, 3).map((o, i) => {
    return `${i + 1}. **${o.dish_name}** from ${o.restaurant_name}
   ${o.calories} cal | Last ordered: ${o.last_ordered}
   [Reorder] 💰`;
  }).join('\n\n');
}

function getRemainingCalories(consumed: number): number {
  // This would calculate based on user's daily target
  const dailyTarget = 1800;
  return dailyTarget - consumed;
}
