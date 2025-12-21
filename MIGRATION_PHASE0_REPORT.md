
# LooptOS Migration - Phase 0: Inventory & Blast Radius Report

**Date:** Dec 21, 2025
**Status:** Complete
**Scope:** `loopgpt-backend`, `loopkitchen-ui`

## 1. Executive Summary
The scan identified **400+ occurrences** of legacy brand terms ("LooptOS", "LooptOS", "LooptOS") across the codebase. The majority are in documentation, but critical dependencies exist in **Edge Function names** and **API endpoints**.

A "Big Bang" rename is **NOT recommended**. We propose a phased approach where public-facing brand elements change first, while internal technical identifiers (function names) are aliased or deprecated over time.

## 2. Inventory by Category

### A. Critical Technical Assets (High Risk)
*   **Edge Functions:**
    *   `loopgpt_route_order` (Commerce Router)
    *   `loopgpt_confirm_order`
    *   `loopgpt_cancel_order`
    *   `loopgpt_record_outcome`
    *   *Impact:* Renaming these breaks the frontend immediately.
*   **File Paths:**
    *   `supabase/functions/loopgpt_*`
    *   `supabase/functions/_shared/config/theloopgptMetadata.ts`
*   **Environment Variables:**
    *   `LOOPGPT_ENV` (if used)
    *   `APP_URL=https://theloopgpt.ai`

### B. Configuration & Metadata (Medium Risk)
*   **GitHub Repository:** `1wunderkind/loopgpt-backend`
*   **Package Names:** `@theloopgpt/*` (internal packages)
*   **Metadata Files:** `theloopgptMetadata.ts`

### C. Documentation & Branding (Low Risk)
*   **Markdown Files:** ~40 files containing "LooptOS Backend", "LooptOS Ecosystem".
*   **Comments:** Code comments referring to "LooptOS team".
*   **URLs:** `docs.loopgpt.com`, `status.loopgpt.com` (likely placeholders).

## 3. Migration Map

| Category | Current State | Target State | Strategy | Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Name** | LooptOS / LooptOS | **LooptOS** | Find & Replace in Docs | 1 |
| **App Name** | LoopKitchen | **LeftoverGPT** | Already done in Manifest | Complete |
| **Function Names** | `loopgpt_route_order` | `looptos_route_order` | **Keep existing**, deploy new aliases if needed | 3 |
| **Repo Name** | `loopgpt-backend` | `looptos-backend` | Rename on GitHub + Update Remotes | 3 |
| **Domain** | `theloopgpt.ai` | `looptos.ai` | Update DNS + Env Vars | 2 |
| **Metadata File** | `theloopgptMetadata.ts` | `looptosMetadata.ts` | Rename file + Update imports | 3 |

## 4. Recommendations for Phase 1 (Brand Migration)

1.  **Docs First:** Execute a global search & replace for "LooptOS" -> "LooptOS" in all `.md` files.
2.  **Preserve Code:** Exclude `supabase/functions/` and `src/` from the text replacement to avoid breaking code.
3.  **Update README:** Rewrite the main `README.md` to officially introduce "LooptOS" as the platform name.

## 5. Next Steps
*   [ ] Approve this Migration Map.
*   [ ] Begin Phase 1: Documentation & Text Rename.
