# Deployment Guide

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- `npm` or `pnpm` installed
- Access to Supabase project references (Staging & Production)

## CI/CD Pipeline

We use GitHub Actions for Continuous Integration. Every PR and push to `main`
triggers:

1. Formatting check (`deno fmt --check`)
2. Linting (`deno lint`)
3. Type checking (`deno check`)
4. Tests (`deno test`)

**Rule:** No code can be merged to `main` unless the CI pipeline passes.

## Deployment Process

We follow a strict **Staging → Production** promotion workflow.

### 1. Deploy to Staging

Deploy from your feature branch or `main` to the staging environment to verify
changes.

```bash
npm run deploy:staging
```

This script will:

1. Run full CI checks locally
2. Validate environment configuration
3. Deploy functions to the Staging Supabase project

### 2. Deploy to Production

**Critical:** Only deploy to production from the `main` branch after verifying
on staging.

```bash
npm run deploy:prod
```

This script will:

1. Run full CI checks locally
2. Validate environment configuration
3. Deploy functions to the Production Supabase project

## Rollback Procedure

If a deployment introduces a critical regression, follow these steps
immediately:

### Option 1: Revert and Redeploy (Recommended)

1. Revert the bad commit in git:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```
2. Wait for CI to pass.
3. Deploy to production:
   ```bash
   npm run deploy:prod
   ```

### Option 2: Deploy Previous Tag (Emergency)

If you need to rollback immediately without waiting for a revert PR:

1. Checkout the last known good tag/commit:
   ```bash
   git checkout <last-good-tag>
   ```
2. Run the deploy script:
   ```bash
   npm run deploy:prod
   ```
3. Return to main:
   ```bash
   git checkout main
   ```

## Environment Variables

We use a typed environment contract. See `supabase/functions/_shared/env.ts`.

**Required Variables:**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ENVIRONMENT` (development, staging, production)

**Optional Variables:**

- `MEALME_API_KEY`
- `MEALME_API_BASE`
- `LOGTAIL_TOKEN`

To set secrets in Supabase:

```bash
supabase secrets set --env-file ./supabase/.env.prod --project-ref <prod-ref>
```
