# External Checkout Redirect Flow Implementation Report

## 1. Changed Files

*   `supabase/migrations/20251221_checkout_sessions.sql` (New) - Database schema for secure sessions.
*   `supabase/functions/apps/leftovergpt/session.ts` (New) - Utility for creating and hashing session tokens.
*   `supabase/functions/apps/leftovergpt/index.ts` (Modified) - Updated `create_external_grocery_order_link` to use secure sessions.
*   `supabase/functions/checkout_redirect/index.ts` (New) - Public endpoint handling token validation and redirection.

## 2. SQL Migration

```sql
create table if not exists checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  status text not null check (status in ('created', 'redirected', 'expired', 'failed')),
  recipe_id text,
  missing_items jsonb,
  provider_checkout_url text,
  last_error text
);

create index idx_checkout_sessions_hash on checkout_sessions(token_hash);
alter table checkout_sessions enable row level security;
```

## 3. Example Tool Response

**Tool:** `create_external_grocery_order_link`

```json
{
  "missing_items": [
    { "name": "Heavy Cream", "quantity": "1" },
    { "name": "Parmesan Cheese", "quantity": "1" }
  ],
  "order_url": "https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/checkout_redirect?token=a1b2c3d4e5f6...",
  "expires_in_seconds": 1800
}
```

## 4. Example UI States

### State A: Before Click (Recipe Generated)
*   **Card Title:** "Missing Ingredients Found"
*   **Content:** List of items (Heavy Cream, Parmesan Cheese)
*   **Action:** Button "Open grocery checkout"
*   **Note:** No tool call has happened yet. The UI renders this based on `ingredientsNeed` from the recipe.

### State B: After Click (Loading)
*   **Action:** Button shows spinner "Creating link..."
*   **Backend:** Calls `create_external_grocery_order_link`

### State C: Link Ready
*   **Action:** Button changes to "Continue to Checkout" (External Link)
*   **Link Target:** `order_url` from tool response
*   **User Action:** Click opens new tab -> Redirects to Instacart/MealMe

## 5. Testing Instructions

1.  **Run Migration:**
    ```bash
    supabase db push
    ```

2.  **Deploy Functions:**
    ```bash
    supabase functions deploy mcp-server --no-verify-jwt
    supabase functions deploy checkout_redirect --no-verify-jwt
    ```

3.  **Test Flow:**
    *   Generate a recipe in LeftoverGPT.
    *   Observe the "Missing Ingredients" card.
    *   Click "Open grocery checkout".
    *   Verify the tool is called and returns an `order_url`.
    *   Click the link and verify it redirects to Instacart (or MealMe).
