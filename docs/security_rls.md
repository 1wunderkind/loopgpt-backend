# Row Level Security (RLS) Contract

This document defines the security model for the LoopGPT database. All tables containing user data MUST have RLS enabled.

## Security Model

- **Service Role:** Has full access to all tables (bypasses RLS). Used by Edge Functions and administrative tools.
- **Authenticated Users:** Can access their own data via `auth.uid()`.
- **Anonymous Users:** Generally have NO access, except for specific public read-only tables.

## RLS Policies by Table

### User Data Tables
*Access: strictly scoped to `user_id = auth.uid()`*

- `user_profiles`: Users can read/update their own profile.
- `meal_plans`: Users can CRUD their own meal plans.
- `delivery_orders`: Users can read their own orders.
- `weight_logs`: Users can CRUD their own logs.
- `food_logs`: Users can CRUD their own logs.

### Shared/Public Tables
*Access: Public read-only, or restricted*

- `recipes`: Public read (if shared), otherwise private.
- `food_items`: Public read.

### System/Log Tables
*Access: Service Role only*

- `audit_logs`: No direct user access.
- `error_logs`: No direct user access.
- `provider_metrics`: No direct user access.

## Policy Conventions

1. **Enable RLS:** `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. **Select Policy:**
   ```sql
   CREATE POLICY "Users can view own data" ON table_name
   FOR SELECT USING (auth.uid() = user_id);
   ```
3. **Insert Policy:**
   ```sql
   CREATE POLICY "Users can insert own data" ON table_name
   FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```
4. **Update Policy:**
   ```sql
   CREATE POLICY "Users can update own data" ON table_name
   FOR UPDATE USING (auth.uid() = user_id);
   ```
5. **Delete Policy:**
   ```sql
   CREATE POLICY "Users can delete own data" ON table_name
   FOR DELETE USING (auth.uid() = user_id);
   ```

## Exceptions

- **None currently.** All user-facing tables must enforce RLS.

## Verification

RLS policies are verified via:
1. **Migration Reviews:** All new tables must include RLS enablement and policies in the migration file.
2. **CI Checks:** (Planned) Automated check to ensure `row_security` is enabled on all tables.
