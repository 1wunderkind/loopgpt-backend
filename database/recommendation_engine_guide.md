# LoopKitchen Recommendation Engine - Integration Guide

## Overview
The recommendation engine is now deployed to production Supabase. This guide shows how to integrate it with your MCP tools.

---

## Quick Start

### Basic Usage

```typescript
// Call from any MCP tool (LeftoverGPT, MealPlannerGPT, RecipeGPT)
const { data, error } = await supabase.rpc('get_recipe_recommendations', {
  p_user_id: user.id,
  p_candidate_recipes: candidateRecipes, // JSONB array
  p_limit: 5
});
```

### Candidate Recipe Format

```typescript
const candidateRecipes = [
  {
    recipe_id: "leftover-chicken-rice-001",
    title: "Leftover Chicken Fried Rice",
    ingredients: ["chicken", "rice", "eggs", "soy sauce", "vegetables"],
    calories: 450,
    protein_g: 28,
    carbs_g: 52,
    fat_g: 12
  },
  {
    recipe_id: "veggie-stir-fry-002",
    title: "Quick Veggie Stir Fry",
    ingredients: ["broccoli", "carrots", "bell peppers", "garlic", "ginger"],
    calories: 280,
    protein_g: 8,
    carbs_g: 38,
    fat_g: 10
  }
  // ... more recipes
];
```

### Response Format

```typescript
[
  {
    recipe_id: "leftover-chicken-rice-001",
    recipe_title: "Leftover Chicken Fried Rice",
    total_score: 78.50,
    ingredient_match_score: 32.00,  // 0-40
    goal_alignment_score: 20.00,    // 0-25
    behavioral_score: 12.00,         // 0-20
    diversity_score: 14.50,          // 0-15
    match_reason: "High ingredient match (4/5). Perfect calorie match. New recipe for you.",
    confidence: "high"  // 'high' | 'medium' | 'low'
  },
  // ... more recommendations, sorted by total_score DESC
]
```

---

## Integration Examples

### 1. LeftoverGPT Integration

**Use Case:** User submits ingredients → Get personalized recipe recommendations

```typescript
// In LeftoverGPT MCP tool
async function generateRecipeRecommendations(
  userId: string,
  submittedIngredients: string[]
) {
  // Step 1: Generate candidate recipes (your existing logic)
  const candidateRecipes = await generateRecipesFromIngredients(submittedIngredients);
  
  // Step 2: Get personalized recommendations
  const { data: recommendations } = await supabase.rpc('get_recipe_recommendations', {
    p_user_id: userId,
    p_candidate_recipes: candidateRecipes,
    p_limit: 5
  });
  
  // Step 3: Return top recommendations
  return recommendations.filter(r => r.confidence !== 'low');
}
```

**Benefits:**
- Prioritizes recipes using ingredients user already has
- Learns from past recipe accepts/rejects
- Respects dietary restrictions
- Ensures variety

---

### 2. MealPlannerGPT Integration

**Use Case:** Generate weekly meal plan → Recommend diverse, goal-aligned meals

```typescript
// In MealPlannerGPT MCP tool
async function generateMealPlan(
  userId: string,
  daysCount: number = 7
) {
  const mealPlan = [];
  
  for (let day = 0; day < daysCount; day++) {
    // Generate candidate recipes for this day
    const candidates = await generateDailyRecipeCandidates();
    
    // Get recommendations (with diversity scoring to prevent repetition)
    const { data: recommendations } = await supabase.rpc('get_recipe_recommendations', {
      p_user_id: userId,
      p_candidate_recipes: candidates,
      p_limit: 3  // Breakfast, lunch, dinner
    });
    
    mealPlan.push({
      day: day + 1,
      meals: recommendations
    });
  }
  
  return mealPlan;
}
```

**Benefits:**
- Aligns meals with calorie/macro targets
- Prevents repetitive meals (diversity scoring)
- Adapts to user preferences over time

---

### 3. RecipeGPT Integration

**Use Case:** User asks for recipe ideas → Get personalized suggestions

```typescript
// In RecipeGPT MCP tool
async function suggestRecipes(
  userId: string,
  query: string,  // e.g., "dinner ideas", "high protein meals"
) {
  // Step 1: Generate candidates based on query
  const candidates = await searchRecipesByQuery(query);
  
  // Step 2: Personalize with recommendation engine
  const { data: recommendations } = await supabase.rpc('get_recipe_recommendations', {
    p_user_id: userId,
    p_candidate_recipes: candidates,
    p_limit: 10
  });
  
  // Step 3: Group by confidence
  return {
    highConfidence: recommendations.filter(r => r.confidence === 'high'),
    mediumConfidence: recommendations.filter(r => r.confidence === 'medium'),
    lowConfidence: recommendations.filter(r => r.confidence === 'low')
  };
}
```

**Benefits:**
- Surfaces most relevant recipes first
- Provides confidence levels for UI display
- Includes match explanations for transparency

---

## Helper Functions

### Get User's Ingredient Profile

```typescript
// See what ingredients the user commonly uses
const { data: profile } = await supabase.rpc('get_user_ingredient_profile', {
  p_user_id: user.id
});

// Returns:
// [
//   { ingredient_name: "chicken", frequency: 12, last_used: "2025-12-05", recency_days: 1 },
//   { ingredient_name: "rice", frequency: 10, last_used: "2025-12-04", recency_days: 2 },
//   ...
// ]
```

**Use Case:** Display "Your Top Ingredients" in UI

---

### Get User's Recipe Preferences

```typescript
// See user's learned preferences
const { data: prefs } = await supabase.rpc('get_user_recipe_preferences', {
  p_user_id: user.id
});

// Returns:
// {
//   total_interactions: 45,
//   acceptance_rate: 62.50,
//   avg_chaos_rating: 35.2,
//   preferred_persona: "Gordon Ramsay",
//   accepted_count: 25,
//   rejected_count: 15
// }
```

**Use Case:** Show "Your Recipe Stats" dashboard

---

### Check Dietary Compliance

```typescript
// Check if a recipe matches dietary restrictions
const isCompliant = await supabase.rpc('check_dietary_compliance', {
  p_recipe_ingredients: ['chicken', 'rice', 'vegetables'],
  p_dietary_restrictions: ['vegetarian']
});

// Returns: false (chicken violates vegetarian)
```

**Use Case:** Pre-filter recipes before showing to user

---

## Scoring System Explained

### Ingredient Match Score (0-40 points)
- **40 pts:** 100% ingredient match
- **30 pts:** 75% ingredient match
- **20 pts:** 50% ingredient match
- **10 pts:** 25% ingredient match
- **0 pts:** No matching ingredients

**Boost:** Recent ingredients (last 7 days) get priority

---

### Goal Alignment Score (0-25 points)
- **25 pts:** Within ±10% of calorie target
- **20 pts:** Within ±20% of calorie target
- **15 pts:** Within ±30% of calorie target
- **10 pts:** Beyond ±30% of calorie target

**Filter:** Recipes violating dietary restrictions are excluded entirely

---

### Behavioral Score (0-20 points)
- **+20 pts:** High historical acceptance rate
- **+5 pts:** Previously accepted this recipe
- **-15 pts:** Previously rejected this recipe
- **10 pts:** New user (neutral)

**Learning:** Adapts over time as user accepts/rejects recipes

---

### Diversity Score (0-15 points)
- **15 pts:** Never seen before
- **12 pts:** Not seen in 14+ days
- **8 pts:** Not seen in 7-13 days
- **3 pts:** Seen in last 7 days

**Goal:** Prevent recipe fatigue

---

## Confidence Levels

### High Confidence (70-100 points)
- Strong ingredient match
- Aligns with goals
- Positive behavioral signals
- Good diversity

**UI Suggestion:** Show prominently, mark as "Recommended for You"

### Medium Confidence (50-69 points)
- Moderate ingredient match
- Acceptable goal alignment
- Neutral behavioral signals

**UI Suggestion:** Show in main results, no special marking

### Low Confidence (0-49 points)
- Poor ingredient match
- Misaligned with goals
- Negative behavioral signals

**UI Suggestion:** Show at bottom or hide entirely

---

## Performance Considerations

### Candidate Recipe Count
- **Recommended:** 20-50 candidates per request
- **Maximum:** 200 candidates (beyond this, consider pagination)

### Response Time
- **Typical:** 100-300ms for 50 candidates
- **Factors:** User history size, candidate count

### Caching Strategy
```typescript
// Cache recommendations for 1 hour per user
const cacheKey = `recommendations:${userId}:${context}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const recommendations = await getRecommendations(userId);
await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));
return recommendations;
```

---

## Testing Queries

### Test with Sample User

```sql
-- 1. Create test ingredient submissions
INSERT INTO analytics.ingredient_submissions (user_id, source_gpt, ingredients)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'LeftoverGPT',
  '[
    {"name": "chicken", "quantity": 500, "unit": "g"},
    {"name": "rice", "quantity": 2, "unit": "cups"},
    {"name": "soy sauce", "quantity": 2, "unit": "tbsp"}
  ]'::jsonb
);

-- 2. Create test user goal
INSERT INTO analytics.user_goals (user_id, goal_type, calorie_target, dietary_restrictions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'weight_loss',
  1800,
  ARRAY['gluten_free'],
  true
);

-- 3. Test ingredient profile
SELECT * FROM get_user_ingredient_profile('00000000-0000-0000-0000-000000000001');

-- 4. Test recommendations
SELECT * FROM get_recipe_recommendations(
  '00000000-0000-0000-0000-000000000001',
  '[
    {
      "recipe_id": "chicken-rice-001",
      "title": "Chicken Fried Rice",
      "ingredients": ["chicken", "rice", "eggs", "soy sauce"],
      "calories": 450,
      "protein_g": 28,
      "carbs_g": 52,
      "fat_g": 12
    },
    {
      "recipe_id": "pasta-marinara-002",
      "title": "Pasta Marinara",
      "ingredients": ["pasta", "tomato sauce", "basil"],
      "calories": 380,
      "protein_g": 12,
      "carbs_g": 68,
      "fat_g": 8
    }
  ]'::jsonb,
  10
);
```

---

## Troubleshooting

### Issue: All scores are 0
**Cause:** User has no history (new user)
**Solution:** Expected behavior - scores will improve as user interacts

### Issue: No recommendations returned
**Cause:** All recipes violate dietary restrictions
**Solution:** Check `dietary_restrictions` in user_goals table

### Issue: Same recipes recommended repeatedly
**Cause:** Small candidate pool or user hasn't rejected any
**Solution:** Increase candidate pool size, diversity score will improve over time

---

## Roadmap

### Phase 3B: Advanced Features (Future)
- [ ] Collaborative filtering (similar users)
- [ ] Seasonal ingredient boosting
- [ ] Time-of-day recommendations
- [ ] Cuisine preference learning
- [ ] Cooking skill level matching

### Phase 3C: Optimization (Future)
- [ ] Materialized views for user profiles
- [ ] Recommendation result caching
- [ ] Batch recommendation generation
- [ ] A/B testing framework

---

## Summary

The recommendation engine is **production-ready** and can be integrated into all MCP tools immediately. It will:

✅ Personalize recipe suggestions based on user behavior
✅ Respect dietary restrictions and goals
✅ Learn and improve over time
✅ Ensure recipe diversity
✅ Provide transparency with match reasons

Start integrating today and watch acceptance rates improve! 🚀
