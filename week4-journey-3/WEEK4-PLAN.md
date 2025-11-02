# Week 4: Journey 3 - Chef Personas & Leftover Recipes

**Status:** Planning Phase  
**Goal:** Integrate LeftoverGPT for chaos-based recipe generation with chef personas  
**Timeline:** Week 4 of MVP development

---

## Overview

Journey 3 is the **viral growth driver** - shareable recipe cards with distinct chef personalities that encourage social sharing and word-of-mouth growth.

**Key Features:**
- 🎭 Three chef personas (Jamie, Paul, Gordon)
- 🎲 Chaos-based recipe generation (1-10 scale)
- 🥘 Leftover ingredient utilization
- 🎴 Shareable recipe cards
- 🛒 Affiliate links for missing ingredients

---

## Chef Personas

### Jamie Leftover (Chaos 1-3)
**Personality:** Warm, encouraging, practical  
**Style:** Simple, accessible recipes with clear instructions  
**Tone:** "Let's make something delicious together!"  
**Target:** Beginners, busy parents, comfort food lovers

**Example Recipe Intro:**
> "Right, lovely! Let's turn those leftovers into something proper tasty. This is dead simple, I promise - even if you've never cooked before, you'll smash this."

### Paul Leftovuse (Chaos 4-7)
**Personality:** Precise, technical, sophisticated  
**Style:** Refined techniques with attention to detail  
**Tone:** "Perfection is in the details"  
**Target:** Intermediate cooks, food enthusiasts, technique learners

**Example Recipe Intro:**
> "Ah, magnifique! These ingredients present an opportunity for something truly special. We'll employ a classic technique with a modern twist - precision is key."

### Gordon Leftover-Slay (Chaos 8-10)
**Personality:** Intense, bold, unpredictable  
**Style:** Wild combinations, aggressive flavors, experimental  
**Tone:** "Let's get creative, you donkey!"  
**Target:** Adventurous eaters, experienced cooks, chaos seekers

**Example Recipe Intro:**
> "RIGHT! Listen up - we're going to do something absolutely mental with these leftovers. Forget everything you know about cooking. This is going to be INSANE."

---

## Architecture

### Edge Function: `journey_3_chef_recipes`

**Inputs:**
```typescript
{
  chatgpt_user_id: string;
  chef_name: "jamie" | "paul" | "gordon";
  chaos_level: number; // 1-10
  ingredients: string[];
  dietary_restrictions?: string[];
  cuisine_preference?: string;
}
```

**Outputs:**
```typescript
{
  success: boolean;
  recipe: {
    title: string;
    chef_intro: string;
    ingredients: Array<{
      item: string;
      amount: string;
      have: boolean; // User already has this
    }>;
    instructions: string[];
    cooking_time: number;
    servings: number;
    calories_per_serving: number;
    macros: { protein: number; carbs: number; fat: number };
    chef_tips: string[];
  };
  missing_ingredients: Array<{
    item: string;
    affiliate_link: string;
    partner_name: string;
  }>;
  shareable_card: {
    title: string;
    preview_text: string;
    share_url: string;
  };
  analytics: {
    tool_call_id: string;
    duration_ms: number;
  };
}
```

---

## Integration with LeftoverGPT

### LeftoverGPT MCP Server
**Status:** Already deployed on Railway  
**Endpoint:** (Need to retrieve from Railway deployment)

**Available Tools:**
- `generate_recipe` - Core recipe generation
- `suggest_substitutions` - Ingredient alternatives
- `scale_recipe` - Adjust servings

### Integration Flow

```
User Request
    ↓
Journey 3 Edge Function
    ↓
1. Parse user input (chef, chaos, ingredients)
    ↓
2. Call LeftoverGPT MCP Server
   - Pass chef personality context
   - Pass chaos level
   - Pass available ingredients
    ↓
3. Receive recipe from LeftoverGPT
    ↓
4. Format response with chef personality
    ↓
5. Add affiliate links for missing ingredients
    ↓
6. Generate shareable card
    ↓
7. Log analytics
    ↓
Return formatted response
```

---

## Response Formatting

### Recipe Card Structure

```markdown
# 🎭 [Chef Name] Presents: [Recipe Title]

[Chef Intro - Personality-driven opening]

## What You'll Need

### You Already Have:
- [Ingredient 1] - [Amount]
- [Ingredient 2] - [Amount]

### You'll Need to Grab:
- [Missing Ingredient 1] - [Amount] → [Get it here](affiliate_link)
- [Missing Ingredient 2] - [Amount] → [Get it here](affiliate_link)

## Let's Cook!

1. [Instruction 1]
2. [Instruction 2]
3. [Instruction 3]

## Chef's Tips
- [Tip 1]
- [Tip 2]

## Nutrition (per serving)
- Calories: [X] kcal
- Protein: [X]g | Carbs: [X]g | Fat: [X]g
- Servings: [X] | Time: [X] minutes

---

💚 **Love this recipe?** Share it with friends! [Copy shareable link]

🛒 **Missing ingredients?** Get everything delivered:
[Affiliate Partner Name] - [Link]
```

---

## Shareable Card Design

### Card Content
- Recipe title
- Chef name and chaos level
- Hero image (generated or stock)
- Quick stats (time, calories, servings)
- "Try this in ChatGPT" CTA
- LoopGPT branding

### Sharing Mechanism
- Generate unique URL for each recipe
- Store recipe in database for retrieval
- Track shares and conversions
- Viral loop: Shared cards → New users → More shares

---

## Affiliate Integration

### Missing Ingredients → Revenue

**Flow:**
1. Identify ingredients user doesn't have
2. Query `affiliate_partner_map` by user location
3. Generate affiliate links for each missing ingredient
4. Present as helpful convenience, not pushy sales

**Example:**
```
You'll need fresh basil and parmesan. Want me to find these for you?

🛒 Get them delivered:
• MealMe - Fresh ingredients in 30 minutes
• Instacart - Grocery delivery from local stores
```

### Revenue Optimization
- Prioritize MealMe (#1 partner)
- Geo-route based on user location
- Track conversion rates per partner
- A/B test presentation styles

---

## Analytics Tracking

### Events to Log

**Tool Calls:**
```sql
INSERT INTO tool_calls (
  tool_name,
  user_id,
  input_params,
  success,
  duration_ms,
  error_message
) VALUES (
  'journey_3_chef_recipes',
  user_id,
  jsonb_build_object(
    'chef', chef_name,
    'chaos_level', chaos_level,
    'ingredient_count', array_length(ingredients, 1)
  ),
  success,
  duration_ms,
  error_message
);
```

**User Events:**
```sql
INSERT INTO user_events (
  user_id,
  event_type,
  event_data
) VALUES (
  user_id,
  'recipe_generated',
  jsonb_build_object(
    'chef', chef_name,
    'chaos_level', chaos_level,
    'missing_ingredients', missing_count,
    'shared', false
  )
);
```

**Affiliate Performance:**
```sql
INSERT INTO affiliate_performance (
  user_id,
  partner_id,
  journey_name,
  click_count,
  conversion_count,
  revenue_usd
) VALUES (
  user_id,
  partner_id,
  'journey_3_chef_recipes',
  click_count,
  0, -- Conversions tracked separately
  0  -- Revenue tracked separately
);
```

---

## Success Metrics

### Recipe Generation
- **Success Rate:** 90%+ (target)
- **Response Time:** <5000ms (target)
- **User Satisfaction:** 4.5+ stars (target)

### Engagement
- **Card Sharing Rate:** 40%+ (target)
- **Return Usage:** 60%+ generate multiple recipes (target)
- **Chef Preference:** Track which personas are most popular

### Revenue
- **Affiliate Click Rate:** 30%+ (target)
- **Conversion Rate:** 10%+ (target)
- **Revenue per Recipe:** $1.50+ (target)

---

## MCP Tool Description

### Tool Name: `generate_leftover_recipe`

**Description:**
```
Generate a creative recipe using leftover ingredients with a specific chef personality.

Choose from three chef personas:
- Jamie Leftover (chaos 1-3): Simple, comforting, beginner-friendly
- Paul Leftovuse (chaos 4-7): Refined, technical, sophisticated
- Gordon Leftover-Slay (chaos 8-10): Wild, experimental, intense

The chaos level determines recipe complexity and creativity.
```

**Trigger Phrases:**
- "Make me a recipe with [ingredients]"
- "What can I cook with [ingredients]?"
- "I have [ingredients], what should I make?"
- "Jamie, help me use up [ingredients]"
- "Gordon, make something crazy with [ingredients]"
- "Paul, what's a fancy way to use [ingredients]?"
- "Leftover recipe with [ingredients]"
- "Recipe ideas for [ingredients]"
- "Turn [ingredients] into dinner"
- "Creative recipe with [ingredients]"
- And 20+ more variations

---

## Testing Scenarios

### Scenario 1: Jamie - Simple Comfort Food
**Input:**
```json
{
  "chef_name": "jamie",
  "chaos_level": 2,
  "ingredients": ["chicken breast", "rice", "broccoli"],
  "dietary_restrictions": []
}
```

**Expected Output:**
- Simple, clear recipe
- Warm, encouraging tone
- Basic cooking techniques
- Family-friendly result

---

### Scenario 2: Paul - Refined Technique
**Input:**
```json
{
  "chef_name": "paul",
  "chaos_level": 6,
  "ingredients": ["salmon", "asparagus", "lemon"],
  "dietary_restrictions": []
}
```

**Expected Output:**
- Sophisticated preparation
- Technical language
- Attention to detail
- Restaurant-quality result

---

### Scenario 3: Gordon - Chaotic Creativity
**Input:**
```json
{
  "chef_name": "gordon",
  "chaos_level": 9,
  "ingredients": ["leftover pizza", "eggs", "hot sauce"],
  "dietary_restrictions": []
}
```

**Expected Output:**
- Wild combination
- Intense language
- Experimental techniques
- Surprising result

---

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Create `week4-journey-3` directory
- [ ] Set up Edge Function structure
- [ ] Configure LeftoverGPT MCP integration
- [ ] Define TypeScript interfaces

### Phase 2: Core Logic (Day 2-3)
- [ ] Implement chef personality logic
- [ ] Build LeftoverGPT API integration
- [ ] Create response formatter
- [ ] Add affiliate link generation

### Phase 3: Features (Day 4-5)
- [ ] Implement shareable card generation
- [ ] Add analytics logging
- [ ] Build error handling
- [ ] Create MCP tool description

### Phase 4: Testing (Day 6)
- [ ] Test all three chef personas
- [ ] Test various chaos levels
- [ ] Test affiliate link generation
- [ ] Test analytics logging

### Phase 5: Documentation (Day 7)
- [ ] Write implementation guide
- [ ] Create testing guide
- [ ] Document integration points
- [ ] Write week summary

---

## Files to Create

1. `supabase/functions/journey_3_chef_recipes/index.ts` - Main Edge Function
2. `week4-journey-3/chef-personalities.ts` - Chef persona logic
3. `week4-journey-3/response-formatter.ts` - Recipe card formatting
4. `week4-journey-3/mcp-tool-journey-3.json` - MCP tool description
5. `week4-journey-3/IMPLEMENTATION-GUIDE.md` - Complete guide
6. `week4-journey-3/TESTING-GUIDE.md` - Test scenarios
7. `week4-journey-3/WEEK4-SUMMARY.md` - Week summary

---

## Integration Points

### Journey 1 → Journey 3
After onboarding, suggest recipe generation:
```
"Want to see what you can make with your meal plan ingredients? 
I can generate recipes with Jamie, Paul, or Gordon!"
```

### Journey 3 → Journey 4
After recipe generation, offer ordering:
```
"Missing some ingredients? I can help you order them for delivery!"
```

### Journey 3 → Journey 6
After multiple recipes, show favorites:
```
"You've made 10 recipes! Want to see your favorites and most-used ingredients?"
```

---

## Next Steps

1. Retrieve LeftoverGPT MCP server endpoint from Railway
2. Design Edge Function architecture
3. Implement chef personality logic
4. Build LeftoverGPT integration
5. Test with all three personas
6. Deploy and document

---

**Status:** Ready to begin Week 4 implementation 🚀  
**Confidence:** High - Clear architecture and requirements ✅
