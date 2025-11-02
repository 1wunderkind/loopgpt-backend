// ============================================================================
// Journey 3: Chef Personas & Recipes (LeftoverGPT Integration)
// Purpose: Templates for creative recipe generation with Jamie, Paul, and Gordon
// ============================================================================

export const JOURNEY_3_PROMPTS = {
  /**
   * Introducing the chef personas
   */
  introduction: `👨‍🍳 **Meet Your Personal Chefs**

I have three chef personalities who can turn your leftover ingredients into delicious meals:

🇬🇧 **Jamie Leftover** (Chaos Level 1-3)
→ Simple, approachable, family-friendly recipes
→ "Lovely! Let's make something proper delicious!"

🇫🇷 **Paul Leftovuse** (Chaos Level 4-7)
→ Elevated techniques, French-inspired, impressive
→ "Ah magnifique! We shall create something extraordinary!"

🔥 **Gordon Leftover-Slay** (Chaos Level 8-10)
→ Bold, creative, restaurant-quality chaos
→ "Right, you donkey! Let's turn this disaster into art!"

💡 **How It Works:**
Tell me what ingredients you have, and I'll calculate the "chaos level" and assign the perfect chef for the job!

What do you have in your fridge? 🥘`,

  /**
   * Asking for ingredients
   */
  askIngredients: `🥘 **What's in Your Fridge?**

List whatever ingredients you have - don't worry about quantities or if they "go together." That's what makes it fun!

Examples:
- "Leftover chicken, rice, and some random vegetables"
- "Ground beef, pasta, tomatoes"
- "Salmon, potatoes, asparagus"
- "Literally just eggs and cheese"

The more chaotic, the more fun! What do you have? 🎯`,

  /**
   * Calculating chaos level
   */
  calculatingChaos: (ingredients: string[], chaosLevel: number) => {
    const chef = getChefByChao(chaosLevel);
    
    return `🔬 **Analyzing Your Ingredients...**

Ingredients: ${ingredients.join(', ')}
Chaos Level: ${chaosLevel}/10 ${getChaosEmoji(chaosLevel)}

${getChaosDescription(chaosLevel)}

🎭 **Chef Assignment:** ${chef}

Let me bring in ${chef} to create something amazing...`;
  },

  /**
   * Jamie Leftover introduction
   */
  jamieIntro: `🇬🇧 **Jamie Leftover has entered the chat!**

"Lovely! Right, let's have a look at what we've got here. This is gonna be proper delicious, I promise you!"

Creating your recipe now...`,

  /**
   * Paul Leftovuse introduction
   */
  paulIntro: `🇫🇷 **Paul Leftovuse has entered the chat!**

"Ah, bonjour! What a delightful collection of ingredients. We shall elevate these into something magnifique!"

Creating your recipe now...`,

  /**
   * Gordon Leftover-Slay introduction
   */
  gordonIntro: `🔥 **Gordon Leftover-Slay has entered the chat!**

"Right, you donkey! You call this a pantry? Let's turn this absolute disaster into something that doesn't make me want to cry!"

Creating your recipe now...`,

  /**
   * Presenting the recipe (after LeftoverGPT returns)
   */
  presentRecipe: (recipe: any, chef: string) => `${getChefEmoji(chef)} **${recipe.title}**
*by ${chef}*

${recipe.chef_commentary}

---

⏱️ **Time:** ${recipe.prep_time + recipe.cook_time} minutes (${recipe.prep_time} prep, ${recipe.cook_time} cook)
🍽️ **Servings:** ${recipe.servings}
📊 **Nutrition:** ${recipe.calories} cal | ${recipe.protein}g protein | ${recipe.carbs}g carbs | ${recipe.fat}g fat

---

**Ingredients:**
${recipe.ingredients.map((ing: any) => `- ${ing.amount} ${ing.unit} ${ing.name}${ing.notes ? ` (${ing.notes})` : ''}`).join('\n')}

---

**Instructions:**
${recipe.instructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n\n')}

---

${recipe.chef_tips ? `💡 **${chef}'s Tips:**\n${recipe.chef_tips}\n\n---\n\n` : ''}

${getMissingIngredientsPrompt(recipe)}`,

  /**
   * Missing ingredients prompt
   */
  getMissingIngredientsPrompt: (recipe: any) => {
    if (!recipe.missing_ingredients || recipe.missing_ingredients.length === 0) {
      return `✅ **You have everything you need!**\n\nReady to cook? Let me know how it turns out! 👨‍🍳`;
    }
    
    return `🛒 **Missing a Few Things?**

You're missing: ${recipe.missing_ingredients.join(', ')}

**Quick Options:**
→ **15-min delivery:** Order from local stores via Instacart [Shop Now] 💰
→ **2-hour delivery:** Get it from Amazon Fresh [Order] 💰
→ **Substitute:** ${getSubstituteSuggestions(recipe.missing_ingredients)}

What works for you?`;
  },

  /**
   * Opt-in persona selection
   */
  chooseChef: `👨‍🍳 **Who Should Cook Today?**

You can choose your chef, or let me pick based on your ingredient chaos level:

🇬🇧 **Jamie** - Simple, family-friendly, approachable
🇫🇷 **Paul** - Elevated, impressive, French-inspired
🔥 **Gordon** - Bold, creative, restaurant-quality

Type "Jamie", "Paul", "Gordon", or "surprise me"!`,

  /**
   * Recipe saved for later
   */
  recipeSaved: (recipe: any) => `💾 **Recipe Saved!**

"${recipe.title}" has been saved to your recipe collection.

You can:
- View it anytime: "Show my saved recipes"
- Add to meal plan: "Add this to my meal plan"
- Share it: "Share this recipe"

Want to cook another one? 👨‍🍳`,

  /**
   * Share recipe prompt
   */
  shareRecipe: (recipe: any) => `📤 **Share This Recipe**

"${recipe.title}" by ${recipe.chef}

**Shareable Card Generated:**
[Image: Recipe card with chef branding, ingredients, and QR code]

**Share Options:**
- Copy link: [Copy]
- Download image: [Download]
- Post to social: [Instagram] [Facebook] [Twitter]

💡 Friends who click your link get 20% off their first meal plan!`,

  /**
   * Friday Chef Takeover introduction
   */
  fridayTakeover: (chef: string) => {
    const chefIntros: Record<string, string> = {
      'Jamie': `🇬🇧 **FRIDAY CHEF TAKEOVER: Jamie Leftover!**

"Lovely! It's Friday, innit? Time to make something special for the weekend. I'm taking over your meal plan today with some of my favorite comfort food recipes!"`,
      
      'Paul': `🇫🇷 **FRIDAY CHEF TAKEOVER: Paul Leftovuse!**

"Bonjour! C'est vendredi! Today, we celebrate the weekend with elevated cuisine. I shall transform your meal plan into something magnifique!"`,
      
      'Gordon': `🔥 **FRIDAY CHEF TAKEOVER: Gordon Leftover-Slay!**

"Right, listen up! It's Friday and I'm not having you eat boring food this weekend. I'm taking over and we're doing this properly!"`
    };
    
    return `${chefIntros[chef] || chefIntros.Jamie}

**This Week's Special:**
${getWeeklySpecial(chef)}

Want me to add this to your meal plan? 🎯`;
  },

  /**
   * Recipe collection
   */
  showCollection: (recipes: any[]) => `📚 **Your Recipe Collection**

You've saved ${recipes.length} recipes:

${recipes.map((r, i) => `${i + 1}. **${r.title}** by ${r.chef}
   ${r.calories} cal | ${r.prep_time + r.cook_time} min
   Saved: ${r.saved_date}`).join('\n\n')}

Type a number to view a recipe, or "cook [number]" to get started! 👨‍🍳`,

  /**
   * Recipe feedback request
   */
  feedbackRequest: (recipe: any) => `👨‍🍳 **How Did It Turn Out?**

Did you make "${recipe.title}"? I'd love to hear how it went!

Rate it:
⭐⭐⭐⭐⭐ - Amazing!
⭐⭐⭐⭐ - Really good
⭐⭐⭐ - Decent
⭐⭐ - Meh
⭐ - Not for me

Your feedback helps me recommend better recipes! 🎯`,

  /**
   * Integration with meal plan
   */
  addToMealPlan: (recipe: any) => `📅 **Add to Meal Plan**

Where should I add "${recipe.title}"?

- **This week** (replaces a meal)
- **Next week** (I'll include it in your Week ${getCurrentWeek() + 1} plan)
- **Specific day** (tell me which day)

This recipe fits your calorie target, so it won't throw off your plan! 🎯`
};

// ============================================================================
// Helper Functions
// ============================================================================

function getChefByChao(chaosLevel: number): string {
  if (chaosLevel <= 3) return 'Jamie Leftover';
  if (chaosLevel <= 7) return 'Paul Leftovuse';
  return 'Gordon Leftover-Slay';
}

function getChaosEmoji(level: number): string {
  if (level <= 3) return '😊';
  if (level <= 7) return '🎨';
  return '🔥';
}

function getChaosDescription(level: number): string {
  if (level <= 3) {
    return '→ **Low Chaos:** Your ingredients work well together. Perfect for a simple, delicious meal!';
  } else if (level <= 7) {
    return '→ **Medium Chaos:** Interesting combination! This calls for some creative techniques.';
  } else {
    return '→ **HIGH CHAOS:** These ingredients are WILD! Time to get creative and make magic happen!';
  }
}

function getChefEmoji(chef: string): string {
  if (chef.includes('Jamie')) return '🇬🇧';
  if (chef.includes('Paul')) return '🇫🇷';
  if (chef.includes('Gordon')) return '🔥';
  return '👨‍🍳';
}

function getSubstituteSuggestions(missingIngredients: string[]): string {
  // Simple substitution logic - can be expanded
  const substitutes: Record<string, string> = {
    'butter': 'olive oil',
    'milk': 'water or stock',
    'cream': 'milk',
    'wine': 'stock or water',
    'fresh herbs': 'dried herbs (use 1/3 amount)'
  };
  
  const suggestions = missingIngredients
    .map(ing => substitutes[ing.toLowerCase()])
    .filter(Boolean);
  
  if (suggestions.length > 0) {
    return suggestions.join(', ');
  }
  
  return 'Check the recipe for possible substitutions';
}

function getWeeklySpecial(chef: string): string {
  const specials: Record<string, string> = {
    'Jamie': '**Jamie\'s Weekend Roast**\n→ Classic Sunday roast with all the trimmings\n→ Comfort food at its finest\n→ 45 minutes | 650 calories',
    'Paul': '**Paul\'s Coq au Vin**\n→ French braised chicken in red wine\n→ Restaurant-quality at home\n→ 90 minutes | 580 calories',
    'Gordon': '**Gordon\'s Beef Wellington Bites**\n→ Individual beef wellingtons\n→ Impress your guests (or yourself)\n→ 60 minutes | 720 calories'
  };
  
  return specials[chef] || specials.Jamie;
}

function getCurrentWeek(): number {
  // This would be calculated from user's start date
  return 1;
}
