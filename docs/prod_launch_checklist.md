# Production Launch Checklist

**Target Release:** `prod-20251214-01` **Date:** 2025-12-14

## 1. Environment Verification

- [ ] **Project Refs:**
  - Staging: `your-staging-project-ref` (Verified in `scripts/deploy-safe.sh`)
  - Production: `your-prod-project-ref` (Verified in `scripts/deploy-safe.sh`)
- [ ] **Environment Variables:**
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY`
  - [ ] `ENVIRONMENT=production`
  - [ ] `DISABLE_ORDERING=false` (Kill Switch)
- [ ] **Database:**
  - [ ] `npm run db:check` passes locally
  - [ ] Migrations applied in Staging
  - [ ] Migrations ready for Production

## 2. Code Verification

- [ ] **CI Status:** Green on `main` (Verified via `npm run ci`)
- [ ] **Tagging:**
  - [ ] RC Tag: `rc-20251214-01` exists
  - [ ] Prod Tag: `prod-20251214-01` to be created

## 3. Operational Readiness

- [ ] **Rollback:**
  - [ ] Rollback target identified (`v1.0.0-stable`)
  - [ ] Rollback command tested (see `docs/rollback_drill.md`)
- [ ] **Monitoring:**
  - [ ] Alerts defined in `docs/alerts.md`
  - [ ] Log access verified

## 4. Kill Switch

- [ ] **Implementation:** `DISABLE_ORDERING` env var check implemented in
      `delivery_place_order`
- [ ] **Verification:** Tested in Staging
