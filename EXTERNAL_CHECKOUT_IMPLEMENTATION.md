# External Checkout Handoff (Mode A) Implementation

This document details the implementation of the External Checkout Handoff system, ensuring explicit responsibility boundaries and dynamic provider routing.

## 1. Architecture Overview

The system follows a strict "Single Source of Truth" pattern where the provider is selected once during the `prepare_external_checkout` phase and stored in an immutable `OrderReceipt`. All subsequent UI interactions read from this receipt.

### Data Flow
1. **User requests checkout** -> `prepare_external_checkout` tool called.
2. **Router selects provider** (e.g., MealMe, Instacart) -> `OrderReceipt` created in DB.
3. **UI displays Handoff Widget** -> Reads provider details from receipt.
4. **User clicks "Review"** -> `open_checkout_confirmation` tool called.
5. **UI displays Confirmation Modal** -> Explicitly names provider and shows disclaimer.
6. **User clicks "Continue"** -> `mark_handoff_opened` called -> User redirected to external URL.

## 2. Database Schema (`order_receipts`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique receipt ID |
| `provider_id` | TEXT | e.g., "mealme", "instacart" |
| `provider_name` | TEXT | Display name (e.g., "MealMe") |
| `checkout_url` | TEXT | The external checkout link |
| `cart` | JSONB | Snapshot of items at checkout time |
| `status` | TEXT | initiated, handoff_opened, completed, failed |

## 3. MCP Tools

### `prepare_external_checkout`
- **Input**: Cart items, currency.
- **Logic**: Calls merchant router, creates receipt, returns `CheckoutHandoffWidget`.
- **Output**: Widget with provider badge and summary.

### `open_checkout_confirmation`
- **Input**: `receiptId`.
- **Logic**: Loads receipt, returns `CheckoutConfirmationModalWidget`.
- **Output**: Modal widget with "Continue to [Provider]" button.

### `mark_handoff_opened`
- **Input**: `receiptId`.
- **Logic**: Updates status to `handoff_opened`.
- **Output**: Info message confirming handoff.

## 4. UI Components

### `CheckoutHandoffWidget`
- Displays "Fulfilled by [Provider]" badge.
- Shows cart summary and cost estimate.
- Includes disclaimer text.

### `CheckoutConfirmationModalWidget`
- Modal dialog.
- Explicitly states redirection to provider.
- Final "Continue" action triggers external navigation.

## 5. Critical Rules Verified
- ✅ **No hardcoded provider names**: All names come from the DB receipt.
- ✅ **No silent re-routing**: Provider is fixed at receipt creation.
- ✅ **Visible Boundaries**: Disclaimers present at every step.
