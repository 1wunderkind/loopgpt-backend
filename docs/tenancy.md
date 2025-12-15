# Multi-Tenancy Model

## Tenant Definition
In LoopGPT, a **Tenant** is equivalent to a **User**.
*   `TenantId` = `UserId` (UUID)
*   This simplifies the model for B2C use cases while allowing future expansion to Workspaces (B2B) if needed.

## Isolation Strategy
1.  **Logical Isolation:** All data is stored in shared tables with a `tenant_id` (or `user_id`) column.
2.  **Row Level Security (RLS):** Database policies enforce that a tenant can only access their own rows.
3.  **Runtime Enforcement:** All Edge Functions require a resolved `tenantId` before executing business logic.

## Plan Tiers
| Plan | Requests/Day | AI Tokens/Day | Ordering |
| :--- | :--- | :--- | :--- |
| **Free** | 50 | 10k | Disabled |
| **Pro** | 500 | 100k | Enabled |
| **Enterprise** | Custom | Custom | Enabled |

## Context Propagation
The `tenantId` is extracted from the Auth Token (JWT) and threaded through:
*   `LogContext` (for observability)
*   `CostGuard` (for quota tracking)
*   `RateLimiter` (for abuse prevention)
*   `Analytics` (for usage tracking)
