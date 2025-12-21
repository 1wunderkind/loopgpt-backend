# Delta Deployment Report

This report identifies the specific incremental changes that need to be deployed
to update the existing Supabase project.

## 1. New Database Migrations (To Be Applied)

These are the new SQL migrations created in the recent steps (Steps 5, 6, 7).

| Migration File                          | Purpose                                   |
| --------------------------------------- | ----------------------------------------- |
| `20251214_step5_security_hardening.sql` | Rate limiting tables, security audit logs |
| `20251214_share_snapshots.sql`          | Table for sharing widget snapshots        |
| `20251214_order_receipts.sql`           | Table for external checkout receipts      |
| `20251214_commerce_cart_sessions.sql`   | Table for persistent cart sessions        |

**Action:** Run `supabase db push` to apply these 4 migrations.

## 2. Modified Edge Functions (To Be Redeployed)

The following functions have been modified or created and need redeployment.

### A. Core MCP Server (`mcp-server`)

This is the main entry point and has significant updates:

- **Security Hardening**: Rate limiting, auth enforcement, audit logging.
- **New Tools**: `commerce.confirmConsent`, `commerce.resumeCart`,
  `loopkitchen_share`.
- **Updated Tools**: `commerce.confirmOrder` (idempotency),
  `loopkitchen_recipes` (share meta).

**Action:** Redeploy `mcp-server`.

### B. Nutrition Engine (`nutrition_analyze_deterministic`)

- **Update**: Now uses the 1,000-food USDA database (vs 50 foods).
- **Impact**: 20x better coverage, higher confidence.

**Action:** Redeploy `nutrition_analyze_deterministic`.

### C. Commerce Router (`commerce_router`)

- **Update**: Now persists session state to `cart_sessions` table.
- **Impact**: Resumable carts, explicit consent flow.

**Action:** Redeploy `commerce_router` (often part of `mcp-server` deployment if
shared code changed).

## 3. Deployment Commands

Run these commands in order to update your existing Supabase project:

### Step 1: Apply New Migrations

```bash
supabase db push
```

### Step 2: Redeploy Critical Functions

```bash
# Deploy the main MCP server (includes security & commerce updates)
supabase functions deploy mcp-server

# Deploy the updated nutrition engine
supabase functions deploy nutrition_analyze_deterministic
```

### Step 3: Verify

```bash
# Check logs to ensure successful startup
supabase functions logs mcp-server
```
