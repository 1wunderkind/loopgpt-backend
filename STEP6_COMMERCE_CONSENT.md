# Step 6: Commerce Consent UX & Cart-State Persistence

This document details the implementation of Step 6, which introduces a robust state management layer for commerce flows.

## 1. Architecture Overview

The system now persists all commerce interactions in a `commerce.cart_sessions` table. This enables:
- **Resumability**: Users can pick up where they left off.
- **Explicit Consent**: Failover and execution require recorded user approval.
- **Idempotency**: Prevents double-charging by tracking confirmation status.
- **Auditability**: Every state change is logged.

### Data Flow
1. **Route Order** -> Creates `draft` session (persisted).
2. **User Consent** -> Updates session to `confirmed_pending_execution`.
3. **Confirm Order** -> Checks session status, executes order, updates to `confirmed`.
4. **Failover** -> If primary fails, checks `allow_failover` flag and retries with alternatives.

## 2. Database Schema (`commerce.cart_sessions`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique session ID |
| `user_id` | TEXT | Owner of the session |
| `status` | TEXT | draft, awaiting_consent, confirmed_pending_execution, confirmed, failed, expired |
| `cart` | JSONB | Snapshot of items |
| `quote` | JSONB | Snapshot of pricing |
| `confirmation_token` | TEXT | Sensitive token (internal use only) |
| `allow_failover` | BOOLEAN | User consent for failover |

## 3. New & Updated Tools

### `commerce.prepareCart` (Updated)
- **Behavior**: Now persists the routing result as a `cart_session` with status `awaiting_consent`.
- **Returns**: `cartSessionId` and a narrative summary.

### `commerce.confirmConsent` (New)
- **Input**: `cartSessionId`, `allowFailover`, `allowAutoConfirm`.
- **Behavior**: Validates session and updates status to `confirmed_pending_execution`.
- **Audit**: Logs `COMMERCE_CONSENT_GRANTED`.

### `commerce.confirmOrder` (Updated)
- **Input**: `cartSessionId` (instead of raw token).
- **Behavior**: 
  - Loads session.
  - Checks idempotency (returns success if already confirmed).
  - Executes order using stored token.
  - Handles failover if enabled.
  - Updates session status to `confirmed` or `failed`.

### `commerce.resumeCart` (New)
- **Input**: `userId`.
- **Behavior**: Finds latest active session and returns status + summary.

## 4. Security & Safety

- **RLS Policies**: Users can only access their own sessions.
- **Expiry**: Sessions expire after 30 minutes.
- **Redaction**: Sensitive tokens are never logged.
- **Idempotency**: Strict checks prevent double execution.

## 5. Verification

The implementation has been verified against the requirements:
- ✅ Cart & routing state persisted server-side.
- ✅ Explicit user consent recorded.
- ✅ Failover respects consent flags.
- ✅ Idempotent confirmation logic.
- ✅ Resume capability implemented.
