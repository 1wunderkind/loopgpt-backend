# Tool Taxonomy Refactoring - Implementation Summary

**Status:** Ready for execution  
**Branch:** `feature/manifest-v2`  
**Target Version:** v2.0.0  
**Breaking Changes:** Yes (with 30-day compatibility period)

---

## 📊 **What's Been Completed**

### ✅ Phase 1: Analysis & Mapping
- Created complete tool mapping (27 → 30 tools)
- Mapped all existing tools to 7 clusters
- Identified 18 deprecated aliases
- Created `TOOL_TAXONOMY_MAPPING.md`

### ✅ Phase 2: Manifest v2
- Generated `manifest_v2.json` with 48 total tools:
  - 30 active tools with intent-first descriptions
  - 18 deprecated aliases with `redirect_to` fields
- All tools organized into 7 semantic clusters
- Intent-based descriptions (e.g., "Use when the user says...")

---

## 🔄 **What Needs to Be Done**

### Phase 3: Rename Edge Functions (17 functions)

| Old Name | New Name | Action |
|----------|----------|--------|
| `get_weight_prefs` | `user_get_profile` | RENAME |
| `update_weight_prefs` | `user_update_diet_preferences` | RENAME |
| `generate_week_plan` | `plan_create_meal_plan` | RENAME |
| `recipes_creative_recipe` | `plan_generate_from_leftovers` | RENAME |
| `log_meal_plan` | `plan_get_active_plan` | RENAME |
| `nutrition_analyze` | `nutrition_analyze_food` | RENAME |
| `normalize_ingredients` | `nutrition_get_macros` | RENAME |
| `tracker_log_food` | `tracker_log_meal` | RENAME |
| `log_weight` | `tracker_log_weight` | RENAME |
| `weekly_trend` | `tracker_get_progress` | RENAME |
| `tracker_get_daily_summary` | `tracker_summary` | RENAME |
| `evaluate_plan_outcome` | `loop_evaluate_plan` | RENAME |
| `push_plan_feedback` | `loop_adjust_calories` | RENAME |
| `mealme_search` | `delivery_search_restaurants` | RENAME |
| `get_delivery_recommendations` | `delivery_get_menu` | RENAME |
| `mealme_order_plan` | `delivery_place_order` | RENAME |
| `tracker_set_goals` | `user_set_weight_goal` | RENAME |

**Script:** `scripts/rename_edge_functions.sh`

### Phase 4: Create New Tools (13 functions)

| Tool Name | Cluster | Priority |
|-----------|---------|----------|
| `user_get_goals` | User Profile | HIGH |
| `user_reset_profile` | User Profile | MEDIUM |
| `plan_random_meal` | Meal Planning | HIGH |
| `plan_customize_meal_plan` | Meal Planning | MEDIUM |
| `nutrition_compare_foods` | Nutrition | HIGH |
| `nutrition_get_recommendations` | Nutrition | HIGH |
| `loop_generate_feedback_report` | Feedback Loop | MEDIUM |
| `loop_predict_outcome` | Feedback Loop | HIGH |
| `loop_reset_cycle` | Feedback Loop | LOW |
| `delivery_track_order` | Delivery | LOW |
| `sys_get_help` | System | HIGH |
| `sys_healthcheck` | System | HIGH |
| `sys_debug_tool_choice_log` | System | HIGH |

**Approach:** Create minimal stubs first, expand later

### Phase 5: Update MCP Server Routing

**File:** `supabase/functions/mcp-server/index.ts`

**Changes needed:**
1. Add redirect logic for deprecated tools
2. Update tool name mappings
3. Add logging for deprecated calls
4. Create `tool_choice_log` table

**Example redirect logic:**
```typescript
// Handle deprecated aliases
const DEPRECATED_REDIRECTS = {
  "tracker_set_goals": "user_set_weight_goal",
  "tracker_log_food": "tracker_log_meal",
  // ... all 18 aliases
};

if (DEPRECATED_REDIRECTS[toolName]) {
  console.warn(`[DEPRECATED] ${toolName} → ${DEPRECATED_REDIRECTS[toolName]}`);
  // Log to tool_choice_log table
  toolName = DEPRECATED_REDIRECTS[toolName];
}
```

### Phase 6: Testing & Validation

**A. JSON Schema Validation**
- Validate manifest_v2.json structure
- Check all required fields
- Verify redirect_to references

**B. Routing Accuracy Tests**
- Test 15-20 natural language queries
- Measure which tool ChatGPT selects
- Target: ≥95% correct routing

**Test Queries:**
```
1. "I want to lose 5 kg" → user_set_weight_goal
2. "Make me a meal plan" → plan_create_meal_plan
3. "I ate oatmeal for breakfast" → tracker_log_meal
4. "How many calories in chicken?" → nutrition_analyze_food
5. "Show my progress" → tracker_summary
... (10 more)
```

### Phase 7: Documentation

**Files to create:**
- `MIGRATION_GUIDE_V2.md` - How to upgrade
- `ROUTING_TEST_RESULTS.md` - Accuracy benchmarks
- `CHANGELOG_V2.md` - What changed

---

## ⚠️ **Breaking Changes & Mitigation**

### Breaking Changes
1. **17 Edge Functions renamed** - Old names won't work
2. **Tool invocations from ChatGPT** - May use old names initially
3. **Any hardcoded tool names** - In tests, docs, etc.

### Mitigation Strategy
1. **30-day compatibility period** - Deprecated aliases stay active
2. **Redirect logic** - Old names automatically forward to new names
3. **Logging** - Track usage of deprecated tools
4. **Gradual removal** - Remove aliases when usage = 0 for 1 week

---

## 📈 **Expected Benefits**

### User Experience
- **Faster tool selection** - ChatGPT picks correct tool on first try
- **Fewer errors** - Less ambiguity = fewer "Sorry, let me try again"
- **Better conversations** - More natural interactions

### Developer Experience
- **Clear naming patterns** - Easy to find tools by prefix
- **Better organization** - 7 clusters vs flat list
- **Easier debugging** - `sys_debug_tool_choice_log` tracks routing

### Business Impact
- **Higher conversion** - Better UX = more Premium signups
- **Lower support costs** - Fewer user confusion tickets
- **Faster feature development** - Clear taxonomy for new tools

---

## 🎯 **Next Steps (Your Decision)**

### Option A: Proceed with Full Implementation
I'll execute all phases (3-7) and create a complete PR with:
- All 17 functions renamed
- All 13 new stubs created
- MCP server updated with redirect logic
- Tests and documentation

**Time:** ~6 hours  
**Risk:** Medium (breaking changes, but mitigated)

### Option B: Incremental Rollout
I'll implement in stages:
1. First: Just update manifest and MCP server (no renames)
2. Test routing accuracy with new descriptions
3. Then: Rename functions if routing improves

**Time:** ~8 hours (spread over 2-3 days)  
**Risk:** Low (gradual changes)

### Option C: Review & Approve First
I'll commit what's done so far and create a PR for review:
- Mapping document
- Manifest v2
- Refactoring scripts (not executed)

You review, approve, then I execute.

**Time:** ~1 hour now, ~5 hours after approval  
**Risk:** Lowest (you control timing)

---

## 💡 **My Recommendation**

**Go with Option C** for this reason:

This is a **foundational change** that affects your entire MCP ecosystem. While I'm confident in the implementation, you should:

1. Review the manifest_v2.json to ensure descriptions match your vision
2. Verify the 7-cluster structure makes sense for your roadmap
3. Approve the deprecated aliases list
4. Decide if all 13 new tools are needed immediately

Once you approve, I can execute the full implementation in one go (~5 hours).

---

## 📋 **Files Created So Far**

1. ✅ `TOOL_TAXONOMY_MAPPING.md` - Complete mapping document
2. ✅ `supabase/manifest_v2.json` - New manifest (48 tools)
3. ✅ `scripts/generate_manifest_v2.py` - Manifest generator
4. ✅ `scripts/rename_edge_functions.sh` - Refactoring script
5. ✅ `TAXONOMY_REFACTORING_SUMMARY.md` - This document

**All files are in the `feature/manifest-v2` branch.**

---

## ❓ **Questions?**

1. Should I proceed with Option A, B, or C?
2. Any changes to the manifest descriptions?
3. Any tools you want to add/remove from the 13 new ones?
4. When do you want to deploy to production?

**I'm ready to execute when you give the green light!** 🚀

