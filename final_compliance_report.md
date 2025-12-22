# Final Compliance Report: Recipes RLS Hardening

## 1. New Migration
**File:** `supabase/migrations/20251222_harden_recipes_rls_final.sql`

```sql
-- Purpose: Least-privilege RLS for recipes
-- - Prevent anon/auth inserts/updates/deletes via API
-- - Writes only happen via Edge Functions using service role (which bypasses RLS)
-- - Optional public read remains

-- 1. Drop any permissive write policies
drop policy if exists "Anyone can insert recipes" on recipes;
drop policy if exists "Service role only insert" on recipes;

-- 2. Drop any other potential write policies (none found in search, but good practice to be explicit if known)
-- (No other write policies were found in the codebase analysis)

-- 3. Drop duplicate/conflicting read policies if they exist
drop policy if exists "Anyone can view recipes" on recipes;

-- 4. Ensure RLS is enabled
alter table recipes enable row level security;

-- 5. Ensure public SELECT is allowed (required by app for sharing/viewing)
-- If policy already exists, leave it; otherwise create it:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'recipes'
      and policyname = 'Public recipes are viewable by everyone'
  ) then
    create policy "Public recipes are viewable by everyone"
      on recipes for select
      using (true);
  end if;
end $$;
```

## 2. Dropped Policies
The following policies were explicitly targeted for removal to ensure no write access via API:
- `"Anyone can insert recipes"` (Permissive insert)
- `"Service role only insert"` (Previous hardening attempt, removed to be cleaner)
- `"Anyone can view recipes"` (Duplicate read policy)

## 3. Final Policy Set
The `recipes` table now has:
- **RLS Enabled:** Yes
- **Write Policies:** NONE (0). No INSERT, UPDATE, or DELETE policies exist.
- **Read Policies:** ONE (1). `"Public recipes are viewable by everyone"` (SELECT using true).

## 4. Documentation Updates
Added "Data Access Boundaries (Recipes Table)" section to:
- `docs/privacy/data-handling.md`
- `docs/review/app-store-review-walkthrough.md`

**Content Added:**
> - The recipes table has Row Level Security (RLS) enabled.
> - There are NO INSERT/UPDATE/DELETE policies for recipes.
> - Anonymous and authenticated clients cannot write recipes via the Supabase API.
> - Recipes are written only by LooptOS Edge Functions using the Supabase service role key.
> - The service role key is never exposed to clients.
> - If public viewing is enabled: "SELECT is allowed via a dedicated read policy; write operations remain blocked."
> 
> This prevents client-side abuse, cost burn, and unintended data modification.

## 5. Verification Notes
- **Anon/auth cannot write:** Because RLS is enabled and no INSERT/UPDATE/DELETE policies exist, any write attempt from the client API will be rejected by Postgres.
- **Service role writes continue:** The Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, allowing the backend to continue creating recipes as designed.
- **Least Privilege:** This is the strictest possible configuration that still allows the application to function (public reads, server-side writes).
