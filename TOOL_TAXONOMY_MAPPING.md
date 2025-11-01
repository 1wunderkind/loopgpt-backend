# TheLoopGPT Tool Taxonomy Mapping (v1 → v2)

This document maps the existing 27 tools to the new 7-cluster taxonomy with intent-based naming.

---

## 📊 **Mapping Summary**

- **Total v1 tools:** 27
- **Total v2 tools:** 30 (27 renamed + 3 new support tools)
- **Deprecated tools:** 1 (`tracker_set_goals` → merged into `user_set_weight_goal`)
- **New tools:** 3 (`sys_get_help`, `sys_healthcheck`, `sys_debug_tool_choice_log`)

---

## 🔄 **Cluster 1: User Profile & Goals** (`user_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `get_weight_prefs` | `user_get_profile` | RENAME | Expanded to include all preferences |
| `tracker_set_goals` | `user_set_weight_goal` | RENAME | Primary goal-setting tool |
| `update_weight_prefs` | `user_update_diet_preferences` | RENAME | Diet tags + allergies |
| — | `user_get_goals` | NEW | Read-only goal retrieval |
| — | `user_reset_profile` | NEW | Fresh start functionality |

**Total:** 5 tools

---

## 🔄 **Cluster 2: Meal Planning** (`plan_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `generate_week_plan` | `plan_create_meal_plan` | RENAME | Primary plan generator |
| `recipes_creative_recipe` | `plan_generate_from_leftovers` | RENAME | Leftover-based meal creation |
| — | `plan_random_meal` | NEW | Quick meal suggestions |
| — | `plan_customize_meal_plan` | NEW | Edit existing plans |
| `log_meal_plan` | `plan_get_active_plan` | RENAME | Retrieve current plan |

**Total:** 5 tools

---

## 🔄 **Cluster 3: Nutrition Analysis** (`nutrition_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `nutrition_analyze` | `nutrition_analyze_food` | RENAME | Primary analysis tool |
| `normalize_ingredients` | `nutrition_get_macros` | RENAME | Macro summarization |
| — | `nutrition_compare_foods` | NEW | Food comparison |
| — | `nutrition_get_recommendations` | NEW | Nutrient-based discovery |

**Total:** 4 tools

---

## 🔄 **Cluster 4: Tracking & Progress** (`tracker_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `tracker_log_food` | `tracker_log_meal` | RENAME | Meal logging |
| `log_weight` | `tracker_log_weight` | RENAME | Weight logging |
| `weekly_trend` | `tracker_get_progress` | RENAME | Historical trends |
| `tracker_get_daily_summary` | `tracker_summary` | RENAME | Period summaries |
| `tracker_quick_add_calories` | — | DEPRECATE | Merged into tracker_log_meal |
| `tracker_set_goals` | — | DEPRECATE | Moved to user_set_weight_goal |

**Total:** 4 tools (2 deprecated)

---

## 🔄 **Cluster 5: Feedback Loop** (`loop_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `evaluate_plan_outcome` | `loop_evaluate_plan` | RENAME | Plan vs actual comparison |
| `push_plan_feedback` | `loop_adjust_calories` | RENAME | Calorie adjustment |
| — | `loop_generate_feedback_report` | NEW | Narrative feedback |
| — | `loop_predict_outcome` | NEW | Future forecasting |
| — | `loop_reset_cycle` | NEW | Weekly cycle reset |

**Total:** 5 tools

---

## 🔄 **Cluster 6: Delivery & Integrations** (`delivery_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `mealme_search` | `delivery_search_restaurants` | RENAME | Restaurant search |
| `get_delivery_recommendations` | `delivery_get_menu` | RENAME | Menu retrieval |
| `mealme_order_plan` | `delivery_place_order` | RENAME | Order placement |
| `mealme_checkout_url` | — | DEPRECATE | Merged into delivery_place_order |
| `mealme_create_cart` | — | DEPRECATE | Internal helper |
| `mealme_get_quotes` | — | DEPRECATE | Internal helper |
| `mealme_webhook` | — | KEEP | Webhook handler (not MCP tool) |
| — | `delivery_track_order` | NEW | Order tracking |
| `get_affiliate_links` | — | KEEP | Grocery affiliate links |
| `get_affiliate_by_country` | — | KEEP | Country-specific affiliates |
| `get_user_location` | — | KEEP | Location helper |
| `update_user_location` | — | KEEP | Location update |
| `change_location` | — | KEEP | Location change |

**Total:** 4 tools (3 deprecated, 5 kept as-is)

---

## 🔄 **Cluster 7: System & Support** (`sys_*`)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| — | `sys_get_help` | NEW | Tool list + examples |
| — | `sys_healthcheck` | NEW | System status |
| — | `sys_debug_tool_choice_log` | NEW | Routing debug logs |

**Total:** 3 tools (all new)

---

## 🔄 **Billing & Premium** (Keep as-is)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `upgrade_to_premium` | `upgrade_to_premium` | KEEP | Premium upgrade |
| `check_entitlement` | `check_entitlement` | KEEP | Entitlement check |
| `create_checkout_session` | `create_checkout_session` | KEEP | Stripe checkout |
| `create_customer_portal` | `create_customer_portal` | KEEP | Billing portal |
| `stripe_webhook` | `stripe_webhook` | KEEP | Webhook handler |
| `trial_reminder` | `trial_reminder` | KEEP | Cron job |

**Total:** 6 tools (not part of MCP manifest - internal)

---

## 🔄 **Food Search** (Keep as-is)

| Old Name | New Name | Status | Notes |
|----------|----------|--------|-------|
| `food_search` | `food_search` | KEEP | Autocomplete API |
| `metrics_food_resolver` | `metrics_food_resolver` | KEEP | Metrics endpoint |

**Total:** 2 tools (not part of MCP manifest - internal)

---

## 📋 **Implementation Checklist**

### **Phase 1: Rename Edge Functions**
- [ ] user_get_profile (was get_weight_prefs)
- [ ] user_set_weight_goal (was tracker_set_goals)
- [ ] user_update_diet_preferences (was update_weight_prefs)
- [ ] plan_create_meal_plan (was generate_week_plan)
- [ ] plan_generate_from_leftovers (was recipes_creative_recipe)
- [ ] plan_get_active_plan (was log_meal_plan)
- [ ] nutrition_analyze_food (was nutrition_analyze)
- [ ] nutrition_get_macros (was normalize_ingredients)
- [ ] tracker_log_meal (was tracker_log_food)
- [ ] tracker_log_weight (was log_weight)
- [ ] tracker_get_progress (was weekly_trend)
- [ ] tracker_summary (was tracker_get_daily_summary)
- [ ] loop_evaluate_plan (was evaluate_plan_outcome)
- [ ] loop_adjust_calories (was push_plan_feedback)
- [ ] delivery_search_restaurants (was mealme_search)
- [ ] delivery_get_menu (was get_delivery_recommendations)
- [ ] delivery_place_order (was mealme_order_plan)

### **Phase 2: Create New Tools**
- [ ] user_get_goals
- [ ] user_reset_profile
- [ ] plan_random_meal
- [ ] plan_customize_meal_plan
- [ ] nutrition_compare_foods
- [ ] nutrition_get_recommendations
- [ ] loop_generate_feedback_report
- [ ] loop_predict_outcome
- [ ] loop_reset_cycle
- [ ] delivery_track_order
- [ ] sys_get_help
- [ ] sys_healthcheck
- [ ] sys_debug_tool_choice_log

### **Phase 3: Add Deprecated Aliases**
- [ ] tracker_set_goals → user_set_weight_goal
- [ ] tracker_quick_add_calories → tracker_log_meal
- [ ] mealme_checkout_url → delivery_place_order
- [ ] mealme_create_cart → (internal, remove)
- [ ] mealme_get_quotes → (internal, remove)

### **Phase 4: Update Manifest**
- [ ] Create manifest.json v2
- [ ] Add all 30 tools with intent-first descriptions
- [ ] Add deprecated aliases with redirect_to
- [ ] Update version to 2.0.0

### **Phase 5: Update MCP Server**
- [ ] Add redirect logic for deprecated tools
- [ ] Update routing to new tool names
- [ ] Add logging for deprecated calls

---

## 🎯 **Success Criteria**

- ✅ All 27 existing tools mapped to new names
- ✅ 3 new support tools implemented
- ✅ Deprecated aliases added for backward compatibility
- ✅ Intent-first descriptions for all tools
- ✅ ≥95% routing accuracy in ChatGPT tests
- ✅ Zero breaking changes for 30-day migration period

---

**Status:** Ready for implementation
**Branch:** `feature/manifest-v2`
**Target Release:** v2.0.0

