# LoopKitchen Nutrition Analysis - Phase 3 Validation

**Date**: December 6, 2025  
**Phase**: 3 - Nutrition Enhancement  
**Status**: Ready for Testing

---

## Test Cases

### 1. Standalone Nutrition Analysis (Recipe-Based)

**Tool**: `loopkitchen.nutrition.analyze`

**Test Input**:
```json
{
  "recipes": [
    {
      "title": "Grilled Chicken Salad",
      "servings": 2,
      "prepTime": 10,
      "cookTime": 15,
      "ingredients": [
        { "name": "chicken breast", "quantity": "2", "unit": "pieces" },
        { "name": "mixed greens", "quantity": "4", "unit": "cups" },
        { "name": "cherry tomatoes", "quantity": "1", "unit": "cup" },
        { "name": "olive oil", "quantity": "2", "unit": "tbsp" },
        { "name": "balsamic vinegar", "quantity": "1", "unit": "tbsp" }
      ],
      "instructions": [
        "Season and grill chicken breast for 6-7 minutes per side",
        "Slice grilled chicken",
        "Toss greens with tomatoes",
        "Top with chicken and drizzle with oil and vinegar"
      ]
    }
  ]
}
```

**Expected Output**:
- Widget type: `NutritionSummary`
- Fields present:
  - `totalNutrition` (calories, protein, carbs, fat, fiber, sugar, sodium)
  - `perServing` (same fields)
  - `servings` = 2
  - `healthScore` (0-100)
  - `tags` (array of diet/health tags)
  - `warnings` (array)
  - `insights` (array of health tips)
  - `confidence` (high/medium/low)
  - `source` = "Grilled Chicken Salad"

**Validation Criteria**:
- ✅ Calories should be reasonable (300-500 per serving for this recipe)
- ✅ Protein should be high (chicken is primary protein source)
- ✅ Health score should be 70+ (healthy ingredients)
- ✅ Tags should include "high-protein", possibly "low-carb"
- ✅ Confidence should be "high" or "medium"
- ✅ No warnings expected (healthy recipe)
- ✅ Insights should mention protein content

---

### 2. Standalone Nutrition Analysis (Ingredient-Based)

**Tool**: `loopkitchen.nutrition.analyze`

**Test Input**:
```json
{
  "ingredients": [
    { "name": "oats", "quantity": "1", "unit": "cup" },
    { "name": "banana", "quantity": "1", "unit": "piece" },
    { "name": "almond milk", "quantity": "1", "unit": "cup" },
    { "name": "honey", "quantity": "1", "unit": "tbsp" },
    { "name": "cinnamon", "quantity": "1", "unit": "tsp" }
  ],
  "servings": 1
}
```

**Expected Output**:
- Widget type: `NutritionSummary`
- Source: "Custom Ingredients"
- Servings: 1

**Validation Criteria**:
- ✅ Calories should be reasonable (250-350 for oatmeal)
- ✅ Carbs should be high (oats + banana)
- ✅ Fiber should be moderate-high (oats are fiber-rich)
- ✅ Tags should include "high-fiber", possibly "vegan"
- ✅ Health score should be 75+ (nutritious breakfast)

---

### 3. Error Handling - Missing Required Fields

**Tool**: `loopkitchen.nutrition.analyze`

**Test Input**:
```json
{
  "servings": 2
}
```

**Expected Output**:
- Widget type: `InfoMessage`
- Severity: `error`
- Message: Contains "Either 'recipes' or 'ingredients' must be provided"

**Validation Criteria**:
- ✅ Returns InfoMessage widget (not error thrown)
- ✅ Error message is user-friendly
- ✅ Severity is "error"

---

### 4. Error Handling - Empty Arrays

**Tool**: `loopkitchen.nutrition.analyze`

**Test Input**:
```json
{
  "recipes": []
}
```

**Expected Output**:
- Widget type: `InfoMessage`
- Severity: `error`
- Message: Contains "must be a non-empty array"

---

### 5. Meal Logging (Placeholder - Phase 4)

**Tool**: `loopkitchen.nutrition.logMeal`

**Test Input**:
```json
{
  "userId": "test_user_123",
  "mealType": "lunch",
  "mealDate": "2025-12-06",
  "recipeTitle": "Grilled Chicken Salad",
  "nutrition": {
    "calories": 420,
    "protein": 35,
    "carbs": 25,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 450
  },
  "servings": 1,
  "healthScore": 85,
  "tags": ["high-protein", "low-carb"]
}
```

**Expected Output (Phase 3 - Placeholder)**:
- Widget type: `InfoMessage`
- Severity: `info`
- Message: Contains "ready for database integration in Phase 4"
- Message should mention the recipe title and meal type

**Validation Criteria**:
- ✅ Validates required fields (userId, mealType, recipeTitle, nutrition)
- ✅ Returns friendly placeholder message
- ✅ Does not throw errors

---

### 6. Daily Nutrition Summary (Placeholder - Phase 4)

**Tool**: `loopkitchen.nutrition.daily`

**Test Input**:
```json
{
  "userId": "test_user_123",
  "date": "2025-12-06"
}
```

**Expected Output (Phase 3 - Placeholder)**:
- Widget type: `InfoMessage`
- Severity: `info`
- Message: Contains "ready for database integration in Phase 4"
- Message should mention the target date

**Validation Criteria**:
- ✅ Validates userId is required
- ✅ Defaults to today if date not provided
- ✅ Returns friendly placeholder message

---

## Integration Tests

### 7. Recipe Details → Nutrition Analysis Flow

**Scenario**: Get recipe details with nutrition analysis

**Tool Chain**:
1. `loopkitchen.recipes.generate` → Get recipe list
2. `loopkitchen.recipes.details` → Get full recipe (includes nutrition)
3. Verify nutrition data matches standalone analysis

**Validation Criteria**:
- ✅ Nutrition data is consistent across tools
- ✅ Parallel calls work correctly
- ✅ Widget structure is correct

---

### 8. Complete Meal Flow (Future - Phase 4)

**Scenario**: Generate recipe → Analyze nutrition → Log meal → View daily summary

**Tool Chain**:
1. `loopkitchen.recipes.generate`
2. `loopkitchen.recipes.details`
3. `loopkitchen.nutrition.logMeal`
4. `loopkitchen.nutrition.daily`

**Status**: Placeholder functions ready, database integration pending

---

## Performance Tests

### 9. Response Time

**Target**: < 3 seconds for nutrition analysis

**Test**:
- Analyze nutrition for a recipe with 10 ingredients
- Measure time from request to response

**Validation Criteria**:
- ✅ Response time < 3s (GPT-4o-mini is fast)
- ✅ Retry logic works if first attempt fails
- ✅ Error handling doesn't add significant overhead

---

### 10. Widget Structure Validation

**Test**: Verify all widgets match TypeScript types

**Validation Criteria**:
- ✅ NutritionSummary has all required fields
- ✅ InfoMessage has all required fields
- ✅ Meta fields are present (generatedAt, durationMs, model)
- ✅ No extra fields that aren't in type definitions

---

## Database Schema Tests (Phase 4 Prep)

### 11. Schema Validation

**File**: `/database/schemas/loopkitchen_meal_logs.sql`

**Validation Criteria**:
- ✅ Tables created: `loopkitchen_meal_logs`, `loopkitchen_user_nutrition_prefs`
- ✅ Materialized view created: `loopkitchen_daily_nutrition`
- ✅ Functions created: `refresh_loopkitchen_daily_nutrition`, `get_weekly_nutrition_summary`, `get_nutrition_progress`
- ✅ Triggers created for auto-updating timestamps
- ✅ Indexes created for performance
- ✅ Sample data inserted successfully

**Test Commands** (when database is available):
```sql
-- Test table creation
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'loopkitchen%';

-- Test sample data
SELECT * FROM loopkitchen_user_nutrition_prefs 
WHERE user_id = 'test_user_123';

-- Test function
SELECT * FROM get_weekly_nutrition_summary(
  'test_user_123',
  '2025-12-01',
  '2025-12-07'
);
```

---

## Edge Cases

### 12. Very Large Recipe

**Test Input**: Recipe with 30+ ingredients

**Expected**: Should handle gracefully, may take slightly longer

---

### 13. Minimal Recipe

**Test Input**: Recipe with 2 ingredients

**Expected**: Should still provide reasonable nutrition estimates

---

### 14. Unusual Ingredients

**Test Input**: Ingredients like "dragon fruit", "quinoa", "tahini"

**Expected**: GPT should recognize and estimate nutrition correctly

---

## Manual Testing Checklist

- [ ] Test nutrition analysis with recipe input
- [ ] Test nutrition analysis with ingredient input
- [ ] Test error handling for missing fields
- [ ] Test error handling for empty arrays
- [ ] Test meal logging placeholder
- [ ] Test daily summary placeholder
- [ ] Verify widget structures match TypeScript types
- [ ] Check response times
- [ ] Test with various ingredient combinations
- [ ] Verify health scores are reasonable
- [ ] Verify tags are relevant
- [ ] Verify insights are helpful
- [ ] Check confidence indicators
- [ ] Test database schema (when available)

---

## Success Criteria

Phase 3 is considered complete when:

1. ✅ `loopkitchen_nutrition.ts` implements all 3 functions
2. ✅ Standalone nutrition analysis works for recipes
3. ✅ Standalone nutrition analysis works for ingredients
4. ✅ Error handling returns InfoMessage widgets
5. ✅ Meal logging validates inputs and returns placeholder
6. ✅ Daily summary validates inputs and returns placeholder
7. ✅ Database schema is created and documented
8. ✅ All tools are registered in MCP index
9. ✅ Widget structures match TypeScript types
10. ✅ Response times are acceptable (< 3s)

---

## Notes

- **Phase 3 Focus**: Standalone nutrition analysis + database schema prep
- **Phase 4 Will Add**: Database integration for meal logging and daily summaries
- **Database Schema**: Ready to deploy, just needs Supabase connection
- **Placeholder Functions**: Validate inputs and return friendly messages until Phase 4

---

## Next Steps (Phase 4)

1. Set up Supabase database connection
2. Run schema migration
3. Uncomment database code in `logMeal` and `getDailyNutrition`
4. Test full meal logging flow
5. Add RLS policies for user data isolation
6. Set up scheduled jobs to refresh materialized views
7. Add analytics and long-term trend tracking
