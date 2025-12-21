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
