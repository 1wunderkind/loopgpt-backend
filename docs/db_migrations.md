# Database Migration Playbook

This guide outlines the workflow for managing database schema changes in LoopGPT.

## Core Principles

1.  **Migrations are the Source of Truth:** Never make schema changes via the Supabase Dashboard (ClickOps) in production.
2.  **Version Control:** All schema changes must be committed as SQL migration files.
3.  **Idempotency:** Migrations should be safe to run multiple times (use `IF NOT EXISTS`).
4.  **RLS Everywhere:** Every new table must have RLS enabled and policies defined.

## Workflow: Adding a Schema Change

1.  **Create Migration File:**
    Use the Supabase CLI to create a new migration file.
    ```bash
    supabase migration new description_of_change
    ```
    This creates a file in `supabase/migrations/<timestamp>_description_of_change.sql`.

2.  **Write SQL:**
    Add your DDL statements (CREATE TABLE, ALTER TABLE, etc.) to the file.
    *   Ensure you add `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` for new tables.
    *   Define RLS policies in the same file.

3.  **Apply Locally:**
    Test the migration on your local instance.
    ```bash
    supabase db reset
    ```
    (This applies all migrations and runs the seed file).

4.  **Generate Types:**
    Update the TypeScript definitions.
    ```bash
    npm run db:types
    ```

5.  **Commit:**
    Commit the migration file and the updated types file.

## Deployment

### Staging
Migrations are automatically applied to staging when merging to the `staging` branch (or via manual deploy script).
```bash
supabase db push --linked --project-ref <staging-ref>
```

### Production
Migrations are applied to production ONLY after verification on staging.
```bash
supabase db push --linked --project-ref <prod-ref>
```

## Seeding Data

Seed data is located in `supabase/seed.sql`. This file is run automatically when you run `supabase db reset`.
*   **Do not** put real user data in the seed file.
*   **Do** put configuration, lookup tables, and test users.

## Rollback Strategy

If a migration causes issues in production:

1.  **Revert Migration (Down Migration):**
    Create a new migration that undoes the changes (e.g., `DROP TABLE`).
    ```bash
    supabase migration new revert_description
    ```
    Write the inverse SQL and deploy it.

2.  **Restore Backup (Catastrophic):**
    If data is corrupted, restore from the latest Point-in-Time Recovery (PITR) backup via the Supabase Dashboard.

## Drift Detection

To check if your local schema matches the migration history:
```bash
supabase db diff
```
If this outputs SQL, your local schema has drifted from the migrations.
