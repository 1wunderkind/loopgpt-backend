# LeftoverGPT App Store Review Walkthrough

## Overview
LeftoverGPT is a single-purpose utility that helps users generate recipes from leftover ingredients. It includes a strictly gated commerce feature to order missing ingredients via external retailers.

## Compliance Highlights

### 1. Commerce Gating (Option A)
- **Explicit Trigger:** Commerce actions (`create_external_grocery_order_link`) CANNOT be triggered by the model alone.
- **Token Enforcement:** The commerce tool requires a `commerce_token` (HMAC-signed server-side) that is only generated when a recipe is created.
- **UI Flow:**
  1. User requests recipe -> `generate_recipe` returns `recipe_id` + `commerce_token`.
  2. Model renders a button/link using `openWorldHint`.
  3. User clicks button -> Tool is called with the valid token.
  4. Without the token, the tool returns a security error.

### 2. Data Minimization
- **No PII:** We do not collect email, phone, address, or precise location.
- **Opaque IDs:** All `recipe_id`s are server-generated UUIDs.
- **No Chat Storage:** We do not store chat transcripts.

### 3. Tool Surface
Exposes EXACTLY 4 tools:
1. `generate_recipe_from_ingredients`: Core logic.
2. `adjust_recipe`: Modification logic.
3. `estimate_recipe_nutrition`: Information logic.
4. `create_external_grocery_order_link`: Commerce logic (Gated).

### 4. External Redirect
- **Strict Allowlist:** Redirects are strictly limited to:
  - `instacart.com`
  - `amazon.com`
  - `walmart.com`
  - `kroger.com`
- **No Steering:** We do not use language like "best price" or "recommended".
- **Server-Side Routing:** The redirect target is determined server-side based on the ingredient list, ensuring no client-side manipulation.

## Testing Instructions
1. Ask: "I have apples and flour. Make me a recipe."
2. Verify: `generate_recipe` is called.
3. Ask: "Order the missing ingredients."
4. Verify: The model renders a button/link.
5. Click the link -> You are taken to the review page.
6. Click "Continue to Checkout" -> You are redirected to Instacart/Amazon.

## Technical Architecture
- **Backend:** Supabase Edge Functions (Deno)
- **Frontend:** React (Vercel)
- **Database:** Supabase (PostgreSQL)

### 5. Security Hardening
- **JWT_SECRET:** The server requires a `JWT_SECRET` environment variable to be present at runtime for HMAC signing. If missing, the service will fail to start, ensuring no default secrets are ever used.

### 6. Data Access Boundaries (Recipes Table)

- The recipes table has Row Level Security (RLS) enabled.
- There are NO INSERT/UPDATE/DELETE policies for recipes.
- Anonymous and authenticated clients cannot write recipes via the Supabase API.
- Recipes are written only by LooptOS Edge Functions using the Supabase service role key.
- The service role key is never exposed to clients.
- If public viewing is enabled: "SELECT is allowed via a dedicated read policy; write operations remain blocked."

This prevents client-side abuse, cost burn, and unintended data modification.
