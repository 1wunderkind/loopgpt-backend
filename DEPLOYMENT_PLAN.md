# LoopGPT Backend Deployment Plan

This document outlines the step-by-step process to deploy the LoopGPT backend to
Supabase.

## 1. Prerequisites

- **Supabase CLI**: Installed and authenticated (`supabase login`).
- **Supabase Project**: Created in the Supabase Dashboard.
- **Environment Variables**: Collected from external providers (OpenAI, MealMe,
  etc.).

## 2. Environment Configuration

Create a `.env` file based on `.env.example` with the following keys:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# MealMe (Food Ordering)
MEALME_API_KEY=...

# Other Providers
INSTACART_API_KEY=...
```

## 3. Database Migration

The database schema is managed via SQL migrations in `supabase/migrations/`.

**Command:**

```bash
supabase db push
```

This will apply all pending migrations, including:

- Core tables (`users`, `profiles`)
- Analytics tables (`tool_invocations`, `provider_metrics`)
- Commerce tables (`cart_sessions`, `order_receipts`)
- Security tables (`rate_limit_counters`, `security_audit_events`)

## 4. Edge Functions Deployment

We use a script to deploy all functions at once.

**Command:**

```bash
./scripts/deploy-all.sh
```

This script deploys:

- `mcp-server`: The main entry point for ChatGPT.
- `nutrition_analyze_deterministic`: The nutrition engine.
- `commerce_router`: The order routing logic.
- `analytics_*`: Various analytics background tasks.

## 5. Secrets Management

Production secrets must be set in the Supabase Dashboard or via CLI.

**Command:**

```bash
supabase secrets set --env-file .env
```

## 6. Verification

After deployment, verify the health of the system:

1. **Check Function Logs**:
   ```bash
   supabase functions logs mcp-server
   ```

2. **Run Smoke Tests**:
   ```bash
   deno run --allow-net scripts/security-smoke-test.ts
   ```

3. **Run Chaos Tests** (Optional, for staging):
   ```bash
   deno run --allow-net scripts/chaos-test.ts
   ```

## 7. App Store Submission

Ensure the following are ready for the App Store review:

- **Privacy Policy URL**: Hosted on your marketing site.
- **Support URL**: Hosted on your marketing site.
- **Test Account**: A user account with pre-populated data for reviewers.

## 8. Rollback Plan

In case of critical failure:

1. **Revert Edge Functions**: Redeploy the previous git commit.
2. **Revert Database**: Use Supabase PITR (Point-in-Time Recovery) to restore to
   a safe state.
