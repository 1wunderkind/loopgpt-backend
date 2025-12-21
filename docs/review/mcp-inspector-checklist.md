# MCP Inspector Checklist

Use this checklist to validate LeftoverGPT against the MCP Inspector.

## 1. Tool Discovery
*   [ ] **List Tools:** Verify exactly 4 tools are returned.
*   [ ] **Verify Names:** `generate_recipe_from_ingredients`, `adjust_recipe`, `estimate_recipe_nutrition`, `create_external_grocery_order_link`.
*   [ ] **Verify Annotations:**
    *   `generate_...`: `readOnlyHint: true`
    *   `adjust_...`: `readOnlyHint: true`
    *   `estimate_...`: `readOnlyHint: true`
    *   `create_...`: `openWorldHint: true`

## 2. Schema Validation
*   [ ] **Minimal Inputs:** Ensure no `userId`, `sessionId`, or internal fields are required.
*   [ ] **Strict Types:** Ensure all fields have descriptions.

## 3. Functional Test
*   [ ] **Generate Recipe:**
    *   Input: `{"ingredients": ["eggs", "cheese"]}`
    *   Output: Valid JSON recipe.
    *   Check: No internal fields (`_id`, `traceId`) in output.
*   [ ] **Commerce Link:**
    *   Input: `{"recipe_id": "test", "ingredients": ["eggs"]}`
    *   Output: `{"order_url": "...", "missing_items": [...]}`
    *   Check: URL is valid and points to backend.

## 4. Error Handling
*   [ ] **Invalid Input:** Send empty ingredients.
    *   Expect: "Something went wrong" or specific user-safe error.
    *   Check: No stack trace.
