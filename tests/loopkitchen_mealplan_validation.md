# LoopKitchen Meal Planning - Phase 4 Validation

**Date**: December 6, 2025  
**Phase**: 4 - Meal Planning Enhancement  
**Status**: Ready for Testing

---

## Test Cases

### 1. Basic Meal Plan Generation

**Tool**: `loopkitchen.mealplan.generate`

**Test Input**:
```json
{
  "ingredients": ["chicken", "rice", "broccoli", "eggs", "olive oil"],
  "caloriesPerDay": 2000,
  "dietNotes": "high-protein, balanced",
  "days": 7
}
```

**Expected Output**:
- Widget type: `WeekPlanner`
- 7 days with breakfast, lunch, dinner
- Each meal has: recipeId, title, approxCalories
- dayTotalCalories ≈ 2000 (±15%)
- weeklySummary with avgDailyCalories, totalCalories, notes

**Validation Criteria**:
- ✅ All 7 days present
- ✅ Each day has 3 meals
- ✅ Recipe titles are realistic
- ✅ Calorie targets respected (within ±15%)
- ✅ Weekly summary accurate
- ✅ Ingredients reused across week

---

### 2. Meal Plan with Grocery List

**Tool**: `loopkitchen.mealplan.withGrocery`

**Test Input**:
```json
{
  "ingredients": ["chicken", "pasta", "tomatoes", "garlic", "cheese"],
  "caloriesPerDay": 1800,
  "dietNotes": "vegetarian-friendly",
  "days": 5
}
```

**Expected Output**:
- `mealPlan`: WeekPlanner widget (5 days)
- `groceryList`: GroceryList widget

**Validation Criteria**:
- ✅ Both widgets returned
- ✅ Grocery list has categories (Produce, Meat & Seafood, etc.)
- ✅ Items are organized logically
- ✅ Quantities are reasonable
- ✅ All items start unchecked

---

### 3. Meal Plan with Commerce Integration

**Tool**: `loopkitchen.mealplan.complete`

**Test Input**:
```json
{
  "userId": "test_user_123",
  "ingredients": ["chicken", "rice", "vegetables"],
  "caloriesPerDay": 2200,
  "dietNotes": "balanced, home-cooked",
  "days": 7,
  "location": {
    "address": "123 Main St, San Francisco, CA 94102",
    "lat": 37.7749,
    "lng": -122.4194
  },
  "preferences": {
    "maxDeliveryTime": 120,
    "preferredProviders": ["instacart", "doordash"]
  }
}
```

**Expected Output**:
- `mealPlan`: WeekPlanner widget
- `groceryList`: GroceryList widget
- `commerce`: Provider quotes with pricing

**Validation Criteria**:
- ✅ All three components returned
- ✅ Commerce data includes providers array
- ✅ Each provider has: name, estimatedCost, deliveryTime, score
- ✅ Providers are ranked by score
- ✅ Confirmation token present

---

### 4. Prepare Order from Existing Meal Plan

**Tool**: `loopkitchen.mealplan.prepareOrder`

**Test Input**:
```json
{
  "userId": "test_user_123",
  "mealPlan": {
    "type": "WeekPlanner",
    "data": {
      "startDate": "2025-12-08",
      "days": [...],
      "weeklySummary": {...}
    }
  },
  "location": {
    "address": "123 Main St, San Francisco, CA 94102",
    "lat": 37.7749,
    "lng": -122.4194
  },
  "pantryIngredients": ["salt", "pepper", "olive oil", "garlic"]
}
```

**Expected Output**:
- `groceryList`: GroceryList widget (filtered by pantry)
- `commerce`: Provider quotes
- `mealPlan`: Original meal plan (passed through)

**Validation Criteria**:
- ✅ Pantry ingredients excluded from grocery list
- ✅ Commerce quotes generated
- ✅ Original meal plan preserved

---

### 5. Custom Days (3-day weekend plan)

**Tool**: `loopkitchen.mealplan.generate`

**Test Input**:
```json
{
  "ingredients": ["eggs", "bacon", "bread", "cheese"],
  "caloriesPerDay": 1500,
  "dietNotes": "quick and easy",
  "days": 3
}
```

**Expected Output**:
- WeekPlanner with 3 days
- Meals optimized for simplicity

**Validation Criteria**:
- ✅ Exactly 3 days
- ✅ Recipes are simple (low prep time implied)
- ✅ Ingredient reuse maximized

---

### 6. High-Protein Diet Plan

**Tool**: `loopkitchen.mealplan.generate`

**Test Input**:
```json
{
  "ingredients": ["chicken", "eggs", "greek yogurt", "protein powder", "almonds"],
  "caloriesPerDay": 2500,
  "dietNotes": "high-protein, muscle gain",
  "days": 7
}
```

**Expected Output**:
- WeekPlanner with protein-focused meals
- Weekly summary notes mention high-protein goal

**Validation Criteria**:
- ✅ Meals prioritize protein sources
- ✅ Recipe titles suggest protein-rich dishes
- ✅ Weekly summary acknowledges high-protein goal

---

### 7. Budget-Friendly Plan

**Tool**: `loopkitchen.mealplan.generate`

**Test Input**:
```json
{
  "ingredients": ["rice", "beans", "eggs", "potatoes", "carrots", "onions"],
  "caloriesPerDay": 1800,
  "dietNotes": "budget-friendly, simple ingredients",
  "days": 7
}
```

**Expected Output**:
- WeekPlanner with economical meals
- High ingredient reuse

**Validation Criteria**:
- ✅ Recipes use basic, affordable ingredients
- ✅ Minimal variety (cost-effective)
- ✅ Weekly summary mentions budget-friendly approach

---

### 8. Error Handling - Missing Location for Commerce

**Tool**: `loopkitchen.mealplan.complete`

**Test Input**:
```json
{
  "userId": "test_user_123",
  "ingredients": ["chicken", "rice"],
  "days": 7
}
```

**Expected Output**:
- InfoMessage widget with error
- Message: "location is required for order routing"

**Validation Criteria**:
- ✅ Returns InfoMessage (not thrown error)
- ✅ Error message is clear
- ✅ Severity is "error"

---

### 9. Grocery List Categorization

**Tool**: `loopkitchen.mealplan.withGrocery`

**Test Input**:
```json
{
  "ingredients": [
    "chicken breast", "salmon", "eggs",
    "broccoli", "spinach", "tomatoes",
    "rice", "pasta", "bread",
    "milk", "cheese", "yogurt"
  ],
  "days": 7
}
```

**Expected Output**:
- GroceryList with proper categorization

**Validation Criteria**:
- ✅ Produce category: broccoli, spinach, tomatoes
- ✅ Meat & Seafood category: chicken, salmon
- ✅ Dairy & Eggs category: milk, cheese, yogurt, eggs
- ✅ Pantry category: rice, pasta
- ✅ Bakery category: bread

---

### 10. Ingredient Estimation Accuracy

**Tool**: `loopkitchen.mealplan.withGrocery`

**Test Input**:
```json
{
  "ingredients": ["chicken", "rice", "vegetables"],
  "days": 7
}
```

**Expected Output**:
- GroceryList with reasonable quantities

**Validation Criteria**:
- ✅ Chicken quantity: 3-5 lbs for 7 days
- ✅ Rice quantity: 3-4 cups
- ✅ Vegetables: multiple items, reasonable amounts
- ✅ Base ingredients included (oil, salt, pepper, garlic, onions)

---

## Integration Tests

### 11. Full Flow: Plan → Grocery → Order

**Scenario**: Complete meal planning and ordering flow

**Steps**:
1. Call `loopkitchen.mealplan.complete` with all params
2. Verify WeekPlanner widget
3. Verify GroceryList widget
4. Verify commerce data with providers
5. Select a provider
6. Call `commerce.confirmOrder` with confirmation token

**Validation Criteria**:
- ✅ All steps complete successfully
- ✅ Data flows correctly between steps
- ✅ Provider quotes are realistic
- ✅ Order confirmation works

---

### 12. Pantry Filtering

**Scenario**: User has pantry items, should be excluded from grocery list

**Steps**:
1. Generate meal plan
2. Call `loopkitchen.mealplan.prepareOrder` with pantryIngredients
3. Verify grocery list excludes pantry items

**Validation Criteria**:
- ✅ Pantry items not in grocery list
- ✅ Non-pantry items present
- ✅ Quantities adjusted if needed

---

## Performance Tests

### 13. Response Time - Meal Plan Only

**Target**: < 5 seconds

**Test**: Generate 7-day meal plan

**Validation Criteria**:
- ✅ Response time < 5s
- ✅ GPT call completes successfully
- ✅ No retries needed (ideally)

---

### 14. Response Time - Complete Flow

**Target**: < 10 seconds

**Test**: Generate meal plan + grocery list + commerce quotes

**Validation Criteria**:
- ✅ Total time < 10s
- ✅ Parallel operations where possible
- ✅ All components successful

---

## Widget Structure Tests

### 15. WeekPlanner Widget Validation

**Test**: Verify WeekPlanner structure matches TypeScript type

**Validation Criteria**:
- ✅ `type` = "WeekPlanner"
- ✅ `data.startDate` is ISO date string
- ✅ `data.days` is array
- ✅ Each day has: date, dayName, meals, dayTotalCalories
- ✅ Each meal has: recipeId, title, approxCalories
- ✅ `data.weeklySummary` has: avgDailyCalories, totalCalories, notes
- ✅ `meta` has: generatedAt, durationMs, model

---

### 16. GroceryList Widget Validation

**Test**: Verify GroceryList structure matches TypeScript type

**Validation Criteria**:
- ✅ `type` = "GroceryList"
- ✅ `data.categories` is array
- ✅ Each category has: name, items
- ✅ Each item has: name, quantity, checked
- ✅ `data.totalItems` matches actual count
- ✅ `meta` fields present

---

## Edge Cases

### 17. Minimal Input (Defaults)

**Test Input**:
```json
{
  "days": 7
}
```

**Expected**: Uses default ingredients and settings

---

### 18. Maximum Days (14)

**Test Input**:
```json
{
  "days": 14,
  "ingredients": ["chicken", "rice", "vegetables"]
}
```

**Expected**: 14-day plan generated

---

### 19. Very Low Calorie Target

**Test Input**:
```json
{
  "caloriesPerDay": 1200,
  "days": 7
}
```

**Expected**: Meals adjusted for low calorie target

---

### 20. Very High Calorie Target

**Test Input**:
```json
{
  "caloriesPerDay": 3500,
  "days": 7
}
```

**Expected**: Larger portions or additional snacks

---

## Manual Testing Checklist

- [ ] Test basic meal plan generation
- [ ] Test meal plan with grocery list
- [ ] Test complete flow with commerce
- [ ] Test pantry filtering
- [ ] Test different day counts (3, 5, 7, 14)
- [ ] Test different calorie targets
- [ ] Test different diet notes (high-protein, vegetarian, budget)
- [ ] Test error handling (missing params)
- [ ] Verify grocery list categorization
- [ ] Verify ingredient estimation accuracy
- [ ] Check response times
- [ ] Validate widget structures
- [ ] Test commerce integration
- [ ] Test with various ingredient lists

---

## Success Criteria

Phase 4 is considered complete when:

1. ✅ `loopkitchen_mealplan.ts` implements all 4 main functions
2. ✅ MealPlannerGPT integration works correctly
3. ✅ WeekPlanner widget structure is correct
4. ✅ Grocery list generation with GroceryGPT works
5. ✅ Grocery list categorization is accurate
6. ✅ Pantry filtering works
7. ✅ Commerce layer integration works
8. ✅ Complete flow (plan + grocery + commerce) works
9. ✅ All tools registered in MCP index
10. ✅ Response times are acceptable (< 10s for complete flow)

---

## Next Steps (Phase 5)

1. Run comprehensive test suite
2. Fix any bugs found
3. Optimize performance
4. Add database integration for meal logging (from Phase 3)
5. Create final documentation
6. Prepare for production deployment

---

## Notes

- **Phase 4 Focus**: Meal planning with MealPlannerGPT + commerce integration
- **Commerce Layer**: Fully integrated, ready for grocery ordering
- **Grocery List**: Uses GroceryGPT for intelligent categorization
- **Widget System**: All outputs are UI-ready widgets
- **Ingredient Estimation**: Smart estimation based on recipe titles (Phase 5 can enhance with actual recipe details)

---

*Generated: December 6, 2025*  
*LoopKitchen Integration Project - Phase 4*
