# Week 5: Journey 4 - Food Ordering with MealMe

**Status:** Planning Phase  
**Goal:** Enable users to search restaurants, filter by nutrition goals, and order meals that fit their plan  
**Timeline:** Week 5 of MVP development

---

## Overview

Journey 4 is the **convenience and revenue driver** - helping users stick to their plan when they don't want to cook, while generating significant affiliate revenue through food delivery orders.

**Key Features:**
- 🔍 Restaurant search by location
- 🍽️ Menu filtering by calories/macros
- 📊 Nutrition goal alignment
- 🛒 One-click ordering with affiliate tracking
- 💰 Highest revenue per conversion ($2.50+ per order)

---

## MealMe Integration

### MealMe API Overview

**What is MealMe?**
- Restaurant aggregator API (DoorDash, Uber Eats, Grubhub, etc.)
- Single API for multiple delivery platforms
- Real-time menu data with pricing
- Affiliate tracking built-in
- Coverage: US, UK, CA

**Why MealMe?**
- #1 prioritized partner in affiliate strategy
- Highest commission rates ($2.50+ per order)
- Best coverage across all regions
- Real-time availability and pricing
- Easy integration

### Existing MealMe Functions

The backend already has MealMe functions we can leverage:

**1. `mealme-search`**
- Search restaurants by location
- Filter by cuisine, price range, rating
- Returns restaurant list with basic info

**2. `mealme-restaurant-menu`**
- Get full menu for a specific restaurant
- Includes item names, descriptions, prices
- Nutrition data (when available)

**3. `mealme-order-link`**
- Generate affiliate order link
- Tracks conversions
- Deep links to specific items

### Integration Strategy

```
User Request
    ↓
Journey 4 Edge Function
    ↓
1. Parse user input (location, preferences, calorie target)
    ↓
2. Call mealme-search
   - Get restaurants near user
   - Filter by cuisine/price if specified
    ↓
3. For each restaurant, call mealme-restaurant-menu
   - Get menu items
   - Filter by calorie/macro targets
    ↓
4. Rank results by:
   - Nutrition goal alignment
   - User preferences
   - Restaurant rating
    ↓
5. Generate affiliate order links
    ↓
6. Format response with recommendations
    ↓
7. Log analytics
    ↓
Return formatted response
```

---

## Architecture

### Edge Function: `journey_4_food_ordering`

**Inputs:**
```typescript
{
  chatgpt_user_id: string;
  location: string; // "New York, NY" or lat/lng
  calorie_target?: number; // From user's meal plan
  macro_targets?: {
    protein_min?: number;
    carbs_max?: number;
    fat_max?: number;
  };
  cuisine_preference?: string; // "Italian", "Asian", etc.
  price_range?: "budget" | "moderate" | "premium";
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
}
```

**Outputs:**
```typescript
{
  success: boolean;
  recommendations: Array<{
    restaurant_name: string;
    restaurant_rating: number;
    cuisine_type: string;
    estimated_delivery_time: number;
    menu_items: Array<{
      item_name: string;
      description: string;
      price: number;
      calories: number;
      macros: { protein: number; carbs: number; fat: number };
      goal_alignment_score: number; // 0-100
    }>;
    order_link: string; // Affiliate link
    partner_name: string; // "MealMe"
  }>;
  summary: {
    total_restaurants: number;
    total_matching_items: number;
    best_match: string; // Restaurant name
  };
  formatted_response: string;
  analytics: {
    tool_call_id: string;
    duration_ms: number;
  };
}
```

---

## Menu Filtering Logic

### Calorie Alignment

**Strict Mode (±10%):**
- Target: 600 cal
- Range: 540-660 cal
- Use when user has specific calorie target

**Flexible Mode (±20%):**
- Target: 600 cal
- Range: 480-720 cal
- Use when user wants more options

### Macro Alignment

**Protein Priority (Weight Loss/Muscle Gain):**
- Minimum protein: 25g per meal
- Prioritize high-protein items
- Score: protein_grams * 2

**Carb Control (Low Carb):**
- Maximum carbs: 30g per meal
- Filter out high-carb items
- Score: (50 - carbs) if carbs < 50, else 0

**Balanced (Maintenance):**
- Protein: 20-40g
- Carbs: 40-60g
- Fat: 15-25g
- Score: balanced_score

### Goal Alignment Score

```typescript
function calculateGoalAlignment(
  item: MenuItem,
  calorieTarget: number,
  macroTargets: MacroTargets
): number {
  let score = 100;
  
  // Calorie alignment (40% weight)
  const calorieDeviation = Math.abs(item.calories - calorieTarget) / calorieTarget;
  score -= calorieDeviation * 40;
  
  // Protein alignment (30% weight)
  if (macroTargets.protein_min) {
    const proteinScore = Math.min(item.macros.protein / macroTargets.protein_min, 1);
    score -= (1 - proteinScore) * 30;
  }
  
  // Carb alignment (20% weight)
  if (macroTargets.carbs_max) {
    const carbDeviation = Math.max(0, item.macros.carbs - macroTargets.carbs_max);
    score -= (carbDeviation / macroTargets.carbs_max) * 20;
  }
  
  // Fat alignment (10% weight)
  if (macroTargets.fat_max) {
    const fatDeviation = Math.max(0, item.macros.fat - macroTargets.fat_max);
    score -= (fatDeviation / macroTargets.fat_max) * 10;
  }
  
  return Math.max(0, Math.min(100, score));
}
```

---

## Response Formatting

### Restaurant Recommendation Card

```markdown
# 🍽️ Restaurants That Fit Your Plan

Based on your goal of **[goal_type]** with **[calorie_target]** calories per meal, here are your best options:

---

## 🏆 Best Match: [Restaurant Name]

**Rating:** ⭐ [4.5/5] | **Cuisine:** [Italian] | **Delivery:** [25-35 min]

### Recommended Items:

#### 1. [Grilled Chicken Salad] - 95% Match
- **Calories:** 520 kcal (target: 600)
- **Protein:** 45g | **Carbs:** 35g | **Fat:** 18g
- **Price:** $14.99
- **Why it fits:** High protein, moderate carbs, perfect for your weight loss goal

[Order this meal →](affiliate_link)

#### 2. [Mediterranean Bowl] - 92% Match
- **Calories:** 580 kcal (target: 600)
- **Protein:** 38g | **Carbs:** 52g | **Fat:** 20g
- **Price:** $13.99
- **Why it fits:** Balanced macros, nutrient-dense ingredients

[Order this meal →](affiliate_link)

---

## 🥗 Runner-Up: [Another Restaurant]

**Rating:** ⭐ [4.3/5] | **Cuisine:** [Asian] | **Delivery:** [20-30 min]

### Recommended Items:

#### 1. [Teriyaki Salmon Bowl] - 88% Match
- **Calories:** 610 kcal (target: 600)
- **Protein:** 42g | **Carbs:** 48g | **Fat:** 22g
- **Price:** $16.99

[Order this meal →](affiliate_link)

---

## 📊 Summary

- **Restaurants found:** 15
- **Matching items:** 47
- **Best match:** [Restaurant Name] - [Item Name] (95% alignment)

💡 **Tip:** Ordering out doesn't mean giving up on your goals! These meals fit perfectly into your plan.

🛒 **Powered by MealMe** - Real-time menus from DoorDash, Uber Eats, Grubhub, and more.
```

---

## Affiliate Integration

### Order Flow

1. User sees recommendations
2. Clicks "Order this meal" link
3. Redirected to MealMe affiliate link
4. MealMe routes to best delivery platform
5. User completes order
6. Conversion tracked
7. Commission earned ($2.50+ per order)

### Revenue Optimization

**Prioritization:**
1. MealMe (highest commission)
2. Direct restaurant ordering (if available)
3. Platform-specific links (DoorDash, Uber Eats)

**Tracking:**
- Impression: User sees recommendations
- Click: User clicks order link
- Conversion: Order completed
- Revenue: Commission earned

**Expected Metrics:**
- Click rate: 40%+ (high intent)
- Conversion rate: 15%+ (ready to order)
- Revenue per order: $2.50+
- Orders per active user: 2-3/month

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
  duration_ms
) VALUES (
  'journey_4_food_ordering',
  user_id,
  jsonb_build_object(
    'location', location,
    'calorie_target', calorie_target,
    'cuisine_preference', cuisine_preference,
    'restaurant_count', restaurant_count,
    'matching_item_count', matching_item_count
  ),
  success,
  duration_ms
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
  'food_ordering_search',
  jsonb_build_object(
    'location', location,
    'restaurants_found', restaurant_count,
    'items_matched', item_count,
    'best_match_score', best_score
  )
);
```

**Affiliate Performance:**
```sql
INSERT INTO affiliate_performance (
  user_id,
  partner_id,
  journey_name,
  impression_count,
  click_count
) VALUES (
  user_id,
  'mealme',
  'journey_4_food_ordering',
  restaurant_count,
  0 -- Clicks tracked separately
);
```

---

## Success Metrics

### Performance
- **Response Time:** <3000ms (target)
- **Restaurant Coverage:** 80%+ of searches return results
- **Item Match Rate:** 60%+ of restaurants have matching items

### Engagement
- **Search-to-Click:** 40%+ click on order links
- **Click-to-Conversion:** 15%+ complete orders
- **Repeat Usage:** 50%+ use feature multiple times

### Revenue
- **Revenue per Search:** $1.00+ (40% click * 15% convert * $2.50 commission)
- **Monthly Revenue per User:** $6-9 (3 orders * $2.50)
- **Conversion Rate:** 15%+ (industry standard: 10%)

---

## MCP Tool Description

### Tool Name: `search_restaurants_by_nutrition`

**Description:**
```
Search for restaurants and menu items that fit your nutrition goals. 
Filter by location, calorie target, macros, cuisine, and price range. 
Get personalized recommendations with one-click ordering.
```

**Trigger Phrases:**
- "Find restaurants near me"
- "What can I order that fits my plan"
- "Restaurants with [calories] calorie meals"
- "Order food that fits my macros"
- "Where can I eat out and stay on track"
- "Healthy restaurants near [location]"
- "Find [cuisine] food under [calories] calories"
- "What should I order for [meal_type]"
- "Restaurants with high protein meals"
- "Low carb options near me"
- And 30+ more variations

---

## Testing Scenarios

### Scenario 1: Weight Loss - Lunch Search
**Input:**
```json
{
  "location": "New York, NY",
  "calorie_target": 500,
  "macro_targets": {
    "protein_min": 30,
    "carbs_max": 50
  },
  "meal_type": "lunch"
}
```

**Expected Output:**
- 10+ restaurants found
- 30+ matching menu items
- High-protein, moderate-carb options
- Clear goal alignment scores
- MealMe affiliate links

---

### Scenario 2: Muscle Gain - Dinner Search
**Input:**
```json
{
  "location": "Los Angeles, CA",
  "calorie_target": 800,
  "macro_targets": {
    "protein_min": 50,
    "carbs_max": 80
  },
  "cuisine_preference": "Asian",
  "meal_type": "dinner"
}
```

**Expected Output:**
- Asian restaurants prioritized
- High-protein, high-calorie options
- Salmon, chicken, beef dishes
- 85%+ goal alignment scores

---

### Scenario 3: Maintenance - Quick Meal
**Input:**
```json
{
  "location": "Chicago, IL",
  "calorie_target": 600,
  "price_range": "budget",
  "meal_type": "dinner"
}
```

**Expected Output:**
- Budget-friendly options
- Balanced macros
- Fast delivery times
- Good value recommendations

---

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Create `week5-journey-4` directory
- [ ] Review existing MealMe functions
- [ ] Define TypeScript interfaces
- [ ] Set up Edge Function structure

### Phase 2: Core Logic (Day 2-3)
- [ ] Implement restaurant search
- [ ] Build menu filtering logic
- [ ] Create goal alignment scoring
- [ ] Add affiliate link generation

### Phase 3: Features (Day 4-5)
- [ ] Implement response formatter
- [ ] Add analytics logging
- [ ] Build error handling
- [ ] Create MCP tool description

### Phase 4: Testing (Day 6)
- [ ] Test weight loss scenario
- [ ] Test muscle gain scenario
- [ ] Test maintenance scenario
- [ ] Test edge cases (no results, API errors)

### Phase 5: Documentation (Day 7)
- [ ] Write implementation guide
- [ ] Create testing guide
- [ ] Document integration points
- [ ] Write week summary

---

## Files to Create

1. `supabase/functions/journey_4_food_ordering/index.ts` - Main Edge Function
2. `week5-journey-4/menu-filtering.ts` - Menu filtering and scoring logic
3. `week5-journey-4/response-formatter.ts` - Restaurant card formatting
4. `week5-journey-4/mcp-tool-journey-4.json` - MCP tool description
5. `week5-journey-4/IMPLEMENTATION-GUIDE.md` - Complete guide
6. `week5-journey-4/TESTING-GUIDE.md` - Test scenarios
7. `week5-journey-4/WEEK5-SUMMARY.md` - Week summary

---

## Integration Points

### Journey 1 → Journey 4
After onboarding:
```
"Too tired to cook? I can find restaurants near you with meals that fit your plan!"
```

### Journey 2 → Journey 4
After weight tracking:
```
"Great progress! Want to celebrate with a meal out? I'll find options that keep you on track."
```

### Journey 4 → Journey 2
After ordering:
```
"Enjoyed your meal? Remember to log your weight this week to see your progress!"
```

---

## Technical Considerations

### MealMe API Limits
- Rate limits: Check existing functions
- Response time: Typically 500-1500ms per call
- Coverage: May not have all restaurants

### Nutrition Data Availability
- Not all restaurants provide nutrition data
- May need to estimate for some items
- Prioritize restaurants with complete data

### Location Handling
- Support both address and lat/lng
- Geocode addresses if needed
- Default to user's last known location

### Error Handling
- No restaurants found → Expand search radius
- No matching items → Relax calorie constraints
- API errors → Fallback to cached data

---

## Next Steps

1. Review existing MealMe functions in detail
2. Design Edge Function architecture
3. Implement restaurant search and filtering
4. Build goal alignment scoring
5. Test with real locations and targets
6. Deploy and document

---

**Status:** Ready to begin Week 5 implementation 🚀  
**Confidence:** High - Clear architecture and existing MealMe integration ✅
