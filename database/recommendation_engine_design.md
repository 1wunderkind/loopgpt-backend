# LoopKitchen Recommendation Engine - Phase 3 Design

## Overview
Personalized recipe recommendation system that learns from user behavior, pantry contents, and dietary goals to suggest the most relevant recipes.

## Data Sources (from Phase 1 Analytics)

### Available Tables
1. **analytics.ingredient_submissions** - User's pantry/ingredient history
   - `ingredients` JSONB array: `[{name, quantity, unit, raw}]`
   - `source_gpt`, `user_id`, `session_id`, `created_at`

2. **analytics.recipe_events** - Recipe interaction history
   - `event_type`: generated, accepted, rejected, regenerated, cooked
   - `recipe_id`, `recipe_title`, `chaos_rating_shown`, `persona_used`
   - `user_id`, `session_id`, `created_at`

3. **analytics.user_goals** - Dietary preferences and targets
   - `goal_type`: weight_loss, muscle_gain, maintenance, performance
   - `calorie_target`, `macro_targets` JSONB, `dietary_restrictions` array
   - `is_active`, `user_id`

4. **analytics.meal_logs** - Actual consumption data
   - `calories_kcal`, `protein_g`, `carbs_g`, `fat_g`
   - `meal_type`, `user_id`, `created_at`

5. **analytics.session_events** - Engagement patterns
   - `gpt_name`, `event_type`, `user_id`, `session_id`

## Recommendation Scoring System

### 1. Ingredient Match Score (0-40 points)
**Goal:** Prioritize recipes that use ingredients the user already has

**Calculation:**
```sql
ingredient_match_score = (
  COUNT(matching_ingredients) / 
  COUNT(total_recipe_ingredients)
) * 40
```

**Data source:** Extract ingredient names from `analytics.ingredient_submissions` JSONB, match against recipe ingredient lists

**Boost factors:**
- Recent submissions (last 7 days): +10 points
- Frequently submitted ingredients: +5 points

---

### 2. Goal Alignment Score (0-25 points)
**Goal:** Match recipes to user's calorie and macro targets

**Calculation:**
```sql
calorie_alignment = 1 - ABS(recipe_calories - user_target) / user_target
macro_alignment = AVG(
  1 - ABS(recipe_protein - target_protein) / target_protein,
  1 - ABS(recipe_carbs - target_carbs) / target_carbs,
  1 - ABS(recipe_fat - target_fat) / target_fat
)
goal_alignment_score = (calorie_alignment * 0.6 + macro_alignment * 0.4) * 25
```

**Data source:** `analytics.user_goals` (active goal only)

**Filters:**
- Exclude recipes with restricted ingredients (from `dietary_restrictions` array)
- Apply goal-type specific rules (e.g., high protein for muscle_gain)

---

### 3. Behavioral Score (0-20 points)
**Goal:** Learn from past acceptances/rejections

**Calculation:**
```sql
acceptance_rate = COUNT(accepted) / COUNT(accepted + rejected)
behavioral_score = acceptance_rate * 20
```

**Factors:**
- Similar chaos ratings: +5 points
- Same persona preference: +3 points
- Similar ingredient categories: +2 points

**Data source:** `analytics.recipe_events` (last 30 days)

**Penalties:**
- Previously rejected recipe: -15 points
- Previously rejected similar recipe: -5 points

---

### 4. Diversity Score (0-15 points)
**Goal:** Prevent repetitive suggestions

**Calculation:**
```sql
days_since_last_similar = CURRENT_DATE - MAX(created_at WHERE similar_recipe)
diversity_score = MIN(days_since_last_similar / 7, 1) * 15
```

**Similarity criteria:**
- Same primary ingredient
- Same cuisine type
- Same cooking method

**Data source:** `analytics.recipe_events`, `analytics.meal_logs`

**Boost:**
- Never seen before: +15 points
- Not seen in 14+ days: +10 points
- Not seen in 7-13 days: +5 points

---

## Total Score Calculation

```
total_score = 
  ingredient_match_score (0-40) +
  goal_alignment_score (0-25) +
  behavioral_score (0-20) +
  diversity_score (0-15)

Maximum: 100 points
```

## Recommendation Function Design

### Main Function: `get_recipe_recommendations()`

**Parameters:**
- `p_user_id` UUID - Target user
- `p_limit` INT - Number of recommendations (default 10)
- `p_context` TEXT - 'leftover', 'meal_plan', 'general'

**Returns:**
```sql
TABLE (
  recipe_id TEXT,
  recipe_title TEXT,
  total_score NUMERIC,
  ingredient_score NUMERIC,
  goal_score NUMERIC,
  behavioral_score NUMERIC,
  diversity_score NUMERIC,
  match_reason TEXT,
  confidence TEXT -- 'high', 'medium', 'low'
)
```

**Logic Flow:**
1. Get user's recent ingredients (last 30 days)
2. Get user's active goals
3. Get user's recipe history (accepted/rejected)
4. For each candidate recipe:
   - Calculate ingredient match score
   - Calculate goal alignment score
   - Calculate behavioral score
   - Calculate diversity score
   - Sum to total_score
5. Order by total_score DESC
6. Return top N results

---

### Helper Functions

#### 1. `get_user_ingredient_profile(p_user_id UUID)`
Returns user's ingredient usage patterns:
- Most common ingredients
- Recent ingredients (7 days)
- Ingredient frequency scores

#### 2. `calculate_recipe_goal_fit(p_recipe_id TEXT, p_user_id UUID)`
Returns goal alignment score for a specific recipe

#### 3. `get_user_recipe_preferences(p_user_id UUID)`
Returns learned preferences:
- Preferred chaos ratings
- Preferred personas
- Accepted ingredient patterns
- Rejected ingredient patterns

#### 4. `check_dietary_restrictions(p_recipe_id TEXT, p_user_id UUID)`
Returns TRUE if recipe violates user's dietary restrictions

---

## Implementation Strategy

### Phase 3A: Core Recommendation Function
1. Build `get_recipe_recommendations()` with basic scoring
2. Test with sample data
3. Deploy to production

### Phase 3B: Optimization & Caching
1. Add materialized views for user profiles
2. Implement recommendation caching (24h TTL)
3. Add performance indexes

### Phase 3C: Advanced Features
1. Collaborative filtering (users with similar tastes)
2. Seasonal ingredient boosting
3. Time-of-day recommendations

---

## Database Schema Additions

### New Table: `recommendation_cache`
```sql
CREATE TABLE recommendation_cache (
  user_id UUID NOT NULL,
  recipe_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);
```

### New Materialized View: `user_ingredient_profiles`
```sql
CREATE MATERIALIZED VIEW user_ingredient_profiles AS
SELECT 
  user_id,
  jsonb_agg(DISTINCT ingredient_name) as common_ingredients,
  jsonb_object_agg(ingredient_name, frequency) as ingredient_frequencies
FROM (
  -- Extract and count ingredients from submissions
) GROUP BY user_id;
```

---

## Integration with MCP Tools

The recommendation engine will be called by:
1. **LeftoverGPT** - Recommend recipes based on submitted ingredients
2. **MealPlannerGPT** - Suggest meals for meal plan generation
3. **RecipeGPT** - Personalize recipe suggestions

**MCP Function Call:**
```typescript
const recommendations = await supabase.rpc('get_recipe_recommendations', {
  p_user_id: user.id,
  p_limit: 5,
  p_context: 'leftover'
});
```

---

## Success Metrics

1. **Acceptance Rate** - % of recommended recipes that are accepted
   - Target: >40% (vs ~25% baseline)

2. **Diversity** - Average days between similar recipe suggestions
   - Target: >7 days

3. **Goal Adherence** - % of recommendations within ±10% of calorie target
   - Target: >80%

4. **Ingredient Utilization** - % of user's ingredients used in recommendations
   - Target: >60%

---

## Next Steps

1. ✅ Design complete
2. ⏳ Implement core recommendation function
3. ⏳ Test with production data
4. ⏳ Deploy and monitor
