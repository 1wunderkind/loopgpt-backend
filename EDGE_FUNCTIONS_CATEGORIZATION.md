# Edge Functions Categorization

**Total Functions:** 48 edge functions  
**Purpose:** Categorize for appropriate rate limiting and middleware application

---

## Category Definitions

### Auth (Strict Limits)
- **Rate Limit:** 5 requests / 15 minutes
- **Purpose:** Authentication, registration, password reset
- **Functions:** 0 (no dedicated auth functions - handled by Supabase Auth)

### API - Standard (Normal Limits)
- **Rate Limit:** 100 requests / minute
- **Purpose:** Standard CRUD operations, user data
- **Functions:** 20

### API - Search (Moderate Limits)
- **Rate Limit:** 30 requests / minute
- **Purpose:** Search operations, lookups
- **Functions:** 5

### API - Order (Moderate Limits)
- **Rate Limit:** 10 requests / minute
- **Purpose:** Order creation, payment processing
- **Functions:** 8

### Heavy Operations (Strict Limits)
- **Rate Limit:** 5-20 requests / hour or minute
- **Purpose:** Expensive operations, bulk operations, AI/ML
- **Functions:** 8

### Webhooks (No Rate Limiting)
- **Rate Limit:** None (external services)
- **Purpose:** Webhook receivers from external services
- **Functions:** 3

### System/Internal (Generous Limits)
- **Rate Limit:** 300 requests / minute
- **Purpose:** Health checks, internal tools, debugging
- **Functions:** 4

---

## Categorized Functions

### 1. API - Standard (20 functions)

**User Management:**
1. `user_get_profile` - Get user profile
2. `user_set_weight_goal` - Set weight goal
3. `user_update_diet_preferences` - Update diet preferences
4. `get_user_location` - Get user location
5. `update_user_location` - Update user location
6. `change_location` - Change location

**Tracking:**
7. `tracker_log_meal` - Log meal
8. `tracker_log_weight` - Log weight entry
9. `tracker_quick_add_calories` - Quick add calories
10. `tracker_get_progress` - Get progress
11. `tracker_summary` - Get summary

**Nutrition:**
12. `nutrition_get_macros` - Get macros
13. `nutrition_get_recommendations` - Get recommendations
14. `nutrition_compare_foods` - Compare foods

**Affiliate:**
15. `get_affiliate_links` - Get affiliate links
16. `get_affiliate_by_country` - Get affiliate by country

**Billing:**
17. `check_entitlement` - Check entitlement
18. `create_checkout_session` - Create checkout session
19. `create_customer_portal` - Create customer portal
20. `upgrade_to_premium` - Upgrade to premium

---

### 2. API - Search (5 functions)

1. `food_search` - Search foods
2. `delivery_search_restaurants` - Search restaurants
3. `delivery_get_menu` - Get restaurant menu
4. `mealme_get_quotes` - Get delivery quotes
5. `metrics_food_resolver` - Resolve food metrics

---

### 3. API - Order (8 functions)

**Order Management:**
1. `delivery_place_order` - Place delivery order
2. `loopgpt_route_order` - Route order (Phase 3)
3. `loopgpt_confirm_order` - Confirm order (Phase 3)
4. `loopgpt_cancel_order` - Cancel order (Phase 3)
5. `loopgpt_record_outcome` - Record outcome (Phase 3)

**MealMe Integration:**
6. `mealme_create_cart` - Create MealMe cart
7. `mealme_checkout_url` - Get checkout URL

**Nutrition Analysis:**
8. `nutrition_analyze_food` - Analyze food (expensive operation)

---

### 4. Heavy Operations (8 functions)

**Meal Planning (AI/ML):**
1. `plan_create_meal_plan` - Create meal plan (AI)
2. `plan_generate_from_leftovers` - Generate from leftovers (AI)
3. `plan_random_meal` - Random meal suggestion
4. `plan_get_active_plan` - Get active plan

**Loop AI Functions:**
5. `loop_adjust_calories` - Adjust calories (AI)
6. `loop_evaluate_plan` - Evaluate plan (AI)
7. `loop_predict_outcome` - Predict outcome (AI)

**Compliance (Heavy):**
8. `gdpr_export` - Export user data (heavy)

---

### 5. Webhooks (3 functions)

1. `stripe_webhook` - Stripe payment webhook
2. `mealme_webhook` - MealMe order webhook
3. `trial_reminder` - Trial reminder (cron job)

---

### 6. System/Internal (4 functions)

1. `health` - Health check endpoint
2. `sys_healthcheck` - System health check
3. `sys_get_help` - Get help/documentation
4. `sys_debug_tool_choice_log` - Debug logging

---

### 7. Compliance (2 functions)

1. `gdpr_delete` - Delete user data (GDPR)
2. `ccpa_opt_out` - CCPA opt-out

---

### 8. Special (2 functions)

1. `mcp-server` - MCP server (28 tools) - Special handling
2. `shared` - Shared utilities - Not an edge function

---

## Rate Limit Configuration

### Summary by Category

| Category | Functions | Rate Limit | Window |
|----------|-----------|------------|--------|
| API - Standard | 20 | 100 req | 1 min |
| API - Search | 5 | 30 req | 1 min |
| API - Order | 8 | 10 req | 1 min |
| Heavy Operations | 8 | 20 req | 1 min |
| Webhooks | 3 | None | N/A |
| System/Internal | 4 | 300 req | 1 min |
| Compliance | 2 | 5 req | 1 hour |

**Total to Update:** 45 functions (excluding webhooks and shared)

---

## Implementation Priority

### Phase 1: Critical (High Risk)
1. Order functions (8) - Financial transactions
2. Billing functions (4) - Payment processing
3. Compliance functions (2) - Legal requirements

### Phase 2: Important (Medium Risk)
1. Heavy operations (8) - Expensive AI/ML
2. Search functions (5) - High traffic
3. User management (6) - User data

### Phase 3: Standard (Low Risk)
1. Tracking functions (5) - Standard CRUD
2. Nutrition functions (3) - Standard CRUD
3. Affiliate functions (2) - Standard CRUD
4. System functions (4) - Internal use

---

## Next Steps

1. ✅ Categorization complete
2. ⏳ Create middleware configuration
3. ⏳ Apply middleware to Phase 1 functions
4. ⏳ Apply middleware to Phase 2 functions
5. ⏳ Apply middleware to Phase 3 functions
6. ⏳ Test all functions
7. ⏳ Update documentation

**Estimated Time:** 4-6 hours
