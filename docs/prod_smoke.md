# Production Smoke Test Results

**Release:** `prod-20251214-01` **Date:** 2025-12-14 **Tester:**
Automated/Manual

## Test Cases

### 1. MealMe Get Quotes

- **Endpoint:** `/mealme_get_quotes`
- **Payload:** `{ "cartId": "test-cart", "mode": "groceries" }`
- **Expected:** 200 OK, valid quotes array (or mock response if using test
  creds)
- **Result:** [PENDING]
- **Timestamp:** [PENDING]

### 2. Delivery Place Order (Handoff Mode)

- **Endpoint:** `/delivery_place_order`
- **Payload:**
  `{ "chatgpt_user_id": "smoke-test", "latitude": 37.77, "longitude": -122.41, "ingredients": ["milk", "eggs"] }`
- **Expected:** 200 OK, `checkoutUrl` present
- **Result:** [PENDING]
- **Timestamp:** [PENDING]

### 3. Nutrition Analysis

- **Endpoint:** `/mcp-tools/nutrition`
- **Payload:** `{ "recipes": [{ "name": "Apple" }] }`
- **Expected:** 200 OK, structured analysis
- **Result:** [PENDING]
- **Timestamp:** [PENDING]

### 4. Meal Plan Generation

- **Endpoint:** `/mcp-tools/mealplan`
- **Payload:** `{ "goals": { "calories": 2000 } }`
- **Expected:** 200 OK, structured meal plan
- **Result:** [PENDING]
- **Timestamp:** [PENDING]

### 5. Kill Switch Verification

- **Action:** Set `DISABLE_ORDERING=true` in Prod
- **Endpoint:** `/delivery_place_order`
- **Expected:** 503 Service Unavailable, "Ordering is temporarily disabled"
- **Result:** [PENDING]
- **Timestamp:** [PENDING]
