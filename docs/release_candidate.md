# Release Candidate: rc-20251214-01

## Release Plan

1. **Tagging:**
   - Tag: `rc-20251214-01`
   - Commit: `HEAD` of `main` branch
   - Date: 2025-12-14

2. **Scope:**
   - Phase V: Type safety & validation gates
   - Phase VI: Observability & error taxonomy
   - Phase VII: CI/CD & deployment safety
   - Phase VII.1: DB migration discipline

3. **Rollback Target:**
   - Tag: `v1.0.0-stable` (Hypothetical previous stable tag)
   - Procedure: See `docs/deploy.md` -> Rollback Procedure

## Staging Verification

1. **Deploy:** `npm run deploy:staging`
2. **Smoke Tests:** Verify critical paths (Quotes, Order, Nutrition, MealPlan)
3. **Soak Tests:** Run 50 sequential calls to verify stability
