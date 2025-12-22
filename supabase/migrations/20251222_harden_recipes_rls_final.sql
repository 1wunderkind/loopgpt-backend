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

-- 4. Ensure RLS is enabled and forced
alter table recipes enable row level security;
alter table recipes force row level security;

-- 5. Ensure public SELECT is allowed (required by app for sharing/viewing)
-- If policy already exists, leave it; otherwise create it:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'recipes'
      and policyname = 'Public recipes are viewable by everyone'
  ) then
    create policy "Public recipes are viewable by everyone"
      on recipes for select
      using (true);
  end if;
end $$;
