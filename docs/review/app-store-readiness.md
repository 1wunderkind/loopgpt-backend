# App Store Readiness Report

**App:** LeftoverGPT  
**Version:** 1.0.0 (Strict Adapter)

## Executive Summary
LeftoverGPT is a utility app that turns leftover ingredients into recipes. It is built on the LooptOS platform but exposes a strictly limited "Adapter" surface to ChatGPT, ensuring compliance with all App Store policies.

## Compliance Highlights

### 1. Commerce Model
*   **External Checkout Only:** No in-chat payments.
*   **UI-Gated:** The `create_external_grocery_order_link` tool is `openWorldHint: true` and can ONLY be triggered by a user clicking a button in the UI. It is never called autonomously by the model.
*   **Transparent Redirect:** Users are redirected to a secure landing page before being handed off to the merchant.

### 2. Privacy & Safety
*   **No PII:** The app requests zero PII (no email, login, or location).
*   **Stateless:** No user accounts or long-term history.
*   **Sanitized Outputs:** All tool outputs are stripped of internal IDs and metadata before returning to the model.

### 3. User Experience
*   **Predictable:** Tools have `readOnlyHint: true` where appropriate.
*   **Fast:** Optimized Edge Functions ensure <2s response times.
*   **Clean UI:** Follows ChatGPT UI guidelines (simple cards, no ads).

## Tool Manifest
| Tool Name | Type | Trigger | Description |
|-----------|------|---------|-------------|
| `generate_recipe...` | Read-Only | User Prompt | Generates recipe from ingredients. |
| `adjust_recipe` | Read-Only | User Prompt | Modifies existing recipe. |
| `estimate_nutrition` | Read-Only | User Prompt | Estimates macros. |
| `create_order_link` | Action | **UI Click** | Generates checkout link. |

## Verification
*   [x] MCP Inspector Validated
*   [x] Privacy Policy Published
*   [x] Support Contact Verified
