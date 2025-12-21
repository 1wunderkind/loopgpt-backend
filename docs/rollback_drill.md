# Rollback Drill Report

**Date:** 2025-12-14 **Drill Type:** Simulated Production Rollback **Target:**
Revert `prod-20251214-01` to `v1.0.0-stable`

## Procedure Executed

1. **Trigger:** Simulated "High Error Rate" alert received 5 minutes after
   deployment.
2. **Decision:** Initiate Rollback.
3. **Execution:**
   ```bash
   # 1. Checkout previous stable tag
   git checkout v1.0.0-stable

   # 2. Run safe deploy script
   npm run deploy:prod
   ```
4. **Verification:**
   - Verified logs show `v1.0.0-stable` version active.
   - Ran Smoke Test suite (passed).

## Observations

- **Time to Recovery:** ~2 minutes (checkout + build + deploy).
- **Data Integrity:** No schema changes were involved in this drill, so no DB
  rollback was needed.
- **Kill Switch:** Verified that `DISABLE_ORDERING` could be used as an interim
  measure while rolling back.

## Lessons Learned

- Ensure `v1.0.0-stable` tag exists and is locally fetched before starting.
- Keep the `deploy:prod` script fast (cache dependencies).
