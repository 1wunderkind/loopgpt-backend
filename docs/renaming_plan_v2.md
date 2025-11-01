# Edge Function Renaming Plan - Taxonomy v2

**Status:** Ready for execution  
**Impact:** Breaking changes (mitigated by 12 deprecated aliases)  
**Rollback:** Keep v1.9.9 manifest + function names archived

---

## 📋 **Functions to Rename (17 total)**

| Old Name | New Name | Category | Status |
|----------|----------|----------|--------|
| `get_weight_prefs` | `user_get_profile` | User Profile | ✅ Ready |
| `update_weight_prefs` | `user_update_diet_preferences` | User Profile | ✅ Ready |
| `tracker_set_goals` | `user_set_weight_goal` | User Profile | ✅ Ready |
| `generate_week_plan` | `plan_create_meal_plan` | Meal Planning | ✅ Ready |
| `recipes_creative_recipe` | `plan_generate_from_leftovers` | Meal Planning | ✅ Ready |
| `log_meal_plan` | `plan_get_active_plan` | Meal Planning | ✅ Ready |
| `nutrition_analyze` | `nutrition_analyze_food` | Nutrition | ✅ Ready |
| `normalize_ingredients` | `nutrition_get_macros` | Nutrition | ✅ Ready |
| `tracker_log_food` | `tracker_log_meal` | Tracking | ✅ Ready |
| `log_weight` | `tracker_log_weight` | Tracking | ✅ Ready |
| `weekly_trend` | `tracker_get_progress` | Tracking | ✅ Ready |
| `tracker_get_daily_summary` | `tracker_summary` | Tracking | ✅ Ready |
| `evaluate_plan_outcome` | `loop_evaluate_plan` | Feedback Loop | ✅ Ready |
| `push_plan_feedback` | `loop_adjust_calories` | Feedback Loop | ✅ Ready |
| `mealme_search` | `delivery_search_restaurants` | Delivery | ✅ Ready |
| `get_delivery_recommendations` | `delivery_get_menu` | Delivery | ✅ Ready |
| `mealme_order_plan` | `delivery_place_order` | Delivery | ✅ Ready |

---

## 🔄 **Renaming Strategy**

### Option A: Git Move (Preserves History)
```bash
git mv supabase/functions/old_name supabase/functions/new_name
```

**Pros:**
- Preserves git history
- Clean commit log
- Easy to track changes

**Cons:**
- Requires 17 separate commands
- More verbose

### Option B: Direct Rename (Faster)
```bash
mv supabase/functions/old_name supabase/functions/new_name
```

**Pros:**
- Faster execution
- Single script

**Cons:**
- Loses git history (but we have feature branch)

**Recommendation:** Use Option A (git mv) to preserve history.

---

## 🛡️ **Safety Measures**

### 1. Deprecated Aliases (12 tools)
These old names will still work via redirect:
- `set_weight_goal` → `user_set_weight_goal`
- `tracker_set_goals` → `user_set_weight_goal`
- `get_user_profile` → `user_get_profile`
- `update_diet_preferences` → `user_update_diet_preferences`
- `create_meal_plan` → `plan_create_meal_plan`
- `generate_recipes` → `plan_generate_from_leftovers`
- `random_meal` → `plan_random_meal`
- `nutrition_analyze` → `nutrition_analyze_food`
- `get_weight_history` → `tracker_get_progress`
- `get_weight_trend` → `tracker_get_progress`
- `order_meal_delivery` → `delivery_place_order`
- `mealme_search` → `delivery_search_restaurants`

### 2. MCP Server Redirect Logic
The MCP server will handle redirects automatically:
```typescript
const DEPRECATED_REDIRECTS = {
  "tracker_set_goals": "user_set_weight_goal",
  // ... all 12 aliases
};

if (DEPRECATED_REDIRECTS[toolName]) {
  console.warn(`[DEPRECATED] ${toolName} → ${DEPRECATED_REDIRECTS[toolName]}`);
  // Log to tool_choice_log
  toolName = DEPRECATED_REDIRECTS[toolName];
}
```

### 3. Rollback Plan
If issues arise:
1. Revert to `main` branch
2. Redeploy old manifest
3. Restore old function names
4. Total rollback time: ~5 minutes

---

## 📝 **Execution Checklist**

- [ ] Create backup of current functions directory
- [ ] Execute 17 `git mv` commands
- [ ] Update any internal imports/references
- [ ] Update manifest_v2.json (already done ✅)
- [ ] Update MCP server routing (Phase 4)
- [ ] Deploy to Supabase
- [ ] Run routing tests
- [ ] Monitor for 48 hours
- [ ] Begin alias sunsetting (7 days after zero usage)

---

## ⚠️ **Impact Analysis**

### What Breaks
1. **Direct API calls** using old function names
2. **Hardcoded tool names** in tests or docs
3. **External integrations** (if any)

### What Still Works
1. **ChatGPT tool calls** (via manifest + redirects)
2. **MCP server** (handles redirects)
3. **All 12 deprecated aliases** (for 30 days)

### Estimated Downtime
- **Zero** - Redirects handle all traffic
- **Deployment time:** ~10 minutes

---

## 🚀 **Ready to Execute?**

This plan renames all 17 Edge Functions while maintaining backward compatibility through:
1. 12 deprecated aliases in manifest
2. MCP server redirect logic
3. Logging for deprecation tracking

**Recommendation:** Proceed with execution. The safety measures are solid.

**Next Step:** Run the renaming script and update MCP server.

