# Residual Risk Hardening Report

## 1. Files Changed & Migrations Added

### Modified Files
- `supabase/functions/leftovergpt/index.ts`: 
  - Verified no `JWT_SECRET` fallback exists.
  - Added comment: "Recipes are stored server-side; clients cannot write directly."
- `supabase/functions/_shared/router/registry.ts`:
  - Added `requires_address_capture` capability flag.
  - Set `MealMe: true` and `Instacart: false`.
- `supabase/functions/_shared/router.ts`:
  - Updated `selectProvider` to derive `requires_address` from the provider's flag.
  - Added explanatory comment about address capture semantics.
- `docs/review/app-store-review-walkthrough.md`:
  - Added "Security Hardening" section noting `JWT_SECRET` requirement.
- `docs/privacy/data-handling.md`:
  - Added "Security Note" regarding `JWT_SECRET`.

### New Migrations
- `supabase/migrations/20251221_harden_recipes_rls.sql`:
  - Drops permissive insert policy.
  - Enforces service-role-only inserts.

## 2. Migration SQL

```sql
-- Harden recipes table RLS (Least Privilege)
-- Goal: Remove public insert access. Only service role can insert.

-- 1. Drop the permissive insert policy
drop policy if exists "Anyone can insert recipes" on recipes;

-- 2. Create a restrictive insert policy (Service Role Only)
-- Note: Service role bypasses RLS by default, but this policy ensures
-- that NO authenticated or anonymous user can insert directly via the API.
create policy "Service role only insert"
  on recipes for insert
  with check ( auth.role() = 'service_role' );

-- 3. Ensure public read access remains (required for sharing/viewing)
-- (Existing policy "Public recipes are viewable by everyone" remains active)
```

## 3. Verification

### JWT_SECRET Fallback
- **Status:** Verified.
- **Evidence:** `supabase/functions/leftovergpt/index.ts` lines 29-30:
  ```typescript
  const JWT_SECRET = Deno.env.get("JWT_SECRET");
  if (!JWT_SECRET) throw new Error("Missing required env: JWT_SECRET");
  ```
  No default values are used.

### requires_address Logic
- **Status:** Verified.
- **Evidence:** 
  - `registry.ts`: `mealme` has `requires_address_capture: true`, `instacart` has `false`.
  - `router.ts`: `requires_address: selected.requires_address_capture`.

### Recipes RLS Hardening
- **Status:** Verified.
- **Evidence:** Migration `20251221_harden_recipes_rls.sql` drops the public insert policy and restricts it to `service_role`.

## 4. Build & Lint
- Code changes are minimal and strictly typed.
- No new dependencies added.
- Existing logic preserved.
