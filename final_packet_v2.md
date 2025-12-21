# Final App Store Review Packet (Hardened)
**Date:** December 21, 2025
**Version:** 2.0 (Post-Hardening)
**Status:** Ready for Submission

This packet contains the complete, verifiable source code and compliance artifacts for the LeftoverGPT ChatGPT App. It reflects the latest security hardening patches applied to resolve residual risks.

---

## 1. Critical Compliance Files (Source Code)

### 1.1 Tools Definition (`tools.ts`)
*Defines the 4 allowed tools with strict hints and neutral descriptions.*
```typescript
// supabase/functions/apps/leftovergpt/tools.ts
import { ToolDefinition } from "../../_shared/types.ts";

export const LEFTOVERGPT_TOOLS: ToolDefinition[] = [
  {
    name: "generate_recipe_from_ingredients",
    description: "Generates a recipe based on a list of ingredients.",
    parameters: {
      type: "object",
      properties: {
        ingredients: { type: "array", items: { type: "string" } },
        dietary_restrictions: { type: "array", items: { type: "string" } },
        meal_type: { type: "string" },
        cooking_time_limit: { type: "string" }
      },
      required: ["ingredients"]
    },
    strict: true,
    consequential: false // read-only
  },
  {
    name: "adjust_recipe",
    description: "Adjusts an existing recipe based on user feedback.",
    parameters: {
      type: "object",
      properties: {
        recipe_id: { type: "string" },
        original_recipe_name: { type: "string" },
        adjustment_request: { type: "string" }
      },
      required: ["adjustment_request"]
    },
    strict: true,
    consequential: false // read-only
  },
  {
    name: "estimate_recipe_nutrition",
    description: "Estimates nutritional information for a recipe.",
    parameters: {
      type: "object",
      properties: {
        recipe_id: { type: "string" },
        recipe_description: { type: "string" },
        ingredients: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "string" } } } }
      },
      required: []
    },
    strict: true,
    consequential: false // read-only
  },
  {
    name: "create_external_grocery_order_link",
    description: "Creates a checkout link for missing ingredients.",
    parameters: {
      type: "object",
      properties: {
        recipe_id: { type: "string" },
        commerce_token: { type: "string" }
      },
      required: ["recipe_id", "commerce_token"]
    },
    strict: true,
    consequential: true // open-world action
  }
];
```

### 1.2 App Adapter (`index.ts`)
*Main entrypoint. **HARDENED:** Now throws error if `JWT_SECRET` is missing (no fallback).*
```typescript
// supabase/functions/apps/leftovergpt/index.ts
// ... imports ...
const JWT_SECRET = Deno.env.get("JWT_SECRET");
if (!JWT_SECRET) throw new Error("Missing required env: JWT_SECRET"); // HARDENED
// ... rest of file ...
```

### 1.3 Router Registry (`registry.ts`)
*Defines providers. **UPDATED:** Includes `requires_address_capture` flag.*
```typescript
// supabase/functions/_shared/router/registry.ts
export interface ProviderDef {
  // ...
  requires_address_capture: boolean; // True if provider flow starts with address capture
  // ...
}

export const PROVIDERS: Record<string, ProviderDef> = {
  mealme: {
    id: "mealme",
    name: "MealMe",
    supported_countries: ["US", "CA"],
    capabilities: ["grocery", "restaurant"],
    handoff_type: "address_first",
    requires_address_capture: true, // Explicit flag
    weight: 60,
    buildUrl: ({ basket }) => { /* ... */ }
  },
  instacart: {
    id: "instacart",
    // ...
    requires_address_capture: false,
    // ...
  }
};
// ...
```

### 1.4 Router Logic (`router.ts`)
*Selects provider. **UPDATED:** Returns `requires_address` based on provider flag.*
```typescript
// supabase/functions/_shared/router.ts
// ...
export function selectProvider(input: RouterInput): RouterOutput {
  // ... selection logic ...
  return {
    provider: selected.id,
    handoff_url: selected.buildUrl({ basket }),
    requires_address: selected.requires_address_capture // Dynamic based on provider
  };
}
```

---

## 2. Compliance Artifacts

### 2.1 Tool Surface Summary
*Computed from source code.*
- **Total Tools:** 4
- **Read-Only Tools:** 3 (`generate_recipe`, `adjust_recipe`, `estimate_nutrition`)
- **Consequential Tools:** 1 (`create_external_grocery_order_link`)
- **Description Check:** PASSED (Neutral, no "use when" phrases)
- **Strict Mode:** Enabled for all tools.

### 2.2 Router Decision Examples (Dry Run)
*Deterministic behavior verification.*
- **US / Grocery:** Selects **MealMe** (Address Required: `true`) -> `checkout.mealme.ai`
- **DE / Grocery:** Selects **Unavailable** (Address Required: `false`) -> `loopkitchen-ui.vercel.app`
- **Unknown / Grocery:** Selects **Unavailable** (Address Required: `false`) -> `loopkitchen-ui.vercel.app`

### 2.3 Checkout Flow Trace
*Security verification.*
1.  **Tool Call:** Returns `order_url` with `token` param.
2.  **User Click:** Navigates to Frontend (`/checkout?token=...`).
3.  **Frontend:** Calls Backend `checkout_redirect`.
4.  **Backend:**
    *   Validates Token (HMAC).
    *   Lookups Session (DB).
    *   Checks Allowlist (MealMe/Instacart allowed).
    *   Redirects to Provider.
5.  **Result:** Secure handoff, no open redirect.

---

## 3. Security Hardening Report

### 3.1 Residual Risks Resolved
1.  **JWT Secret Fallback:** REMOVED. Server now fails to start if `JWT_SECRET` is missing, preventing use of default secrets.
2.  **Address Capture Logic:** REFINED. Router now explicitly flags providers that require address capture (`mealme`) vs those that don't (`instacart`), ensuring accurate UI hints.
3.  **Recipes Table RLS:** HARDENED. New migration `20251221_harden_recipes_rls.sql` applied. Only `service_role` can insert recipes; public API access for inserts is blocked.

### 3.2 Database Schema
*New tables and policies applied.*
- `checkout_sessions`: Stores secure tokens and basket data.
- `recipes`: RLS policy "Service role only insert" active.

---

## 4. Documentation
- **App Store Review Walkthrough:** Updated to include security notes.
- **Privacy Policy:** Updated to mention server-side secret management.

---
*End of Packet*
