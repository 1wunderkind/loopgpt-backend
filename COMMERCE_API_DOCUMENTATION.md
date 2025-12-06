# LoopGPT Commerce Layer - API Documentation

Complete API reference for the multi-provider commerce routing system.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Request/Response Schemas](#requestresponse-schemas)
5. [Provider Details](#provider-details)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)

---

## Overview

The LoopGPT Commerce Layer provides intelligent routing across multiple grocery delivery providers (MealMe, Instacart, Kroger, Walmart) to find the best price, speed, and availability for your cart.

**Base URL:** `https://your-project.supabase.co/functions/v1`

**Version:** 1.0.0

---

## Authentication

### API Key (Recommended)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Anonymous Access

```bash
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## Endpoints

### POST /loopgpt_route_order

Route a grocery cart to the best available provider.

**Request Body:**

```typescript
{
  items: RequestedItem[];
  shippingAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  preferences?: {
    optimize?: 'price' | 'speed' | 'margin' | 'balanced';
    excludeProviders?: ProviderId[];
    maxDeliveryMinutes?: number;
  };
  userContext?: {
    krogerCustomerId?: string;
    walmartCustomerId?: string;
    loyaltyIds?: string[];
  };
}
```

**Response:**

```typescript
{
  selectedProvider: {
    id: ProviderId;
    name: string;
    priority: number;
  };
  config: ProviderConfig;
  cart: CartItem[];
  quote: {
    subtotalCents: number;
    feesCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
    estimatedDeliveryMinutes?: number;
  };
  itemAvailability: ItemAvailability[];
  affiliateUrl?: string;
  alternativeQuotes?: ProviderQuote[];
  score: number;
  scoreBreakdown: {
    priceScore: number;
    speedScore: number;
    availabilityScore: number;
    marginScore: number;
    reliabilityScore: number;
  };
  confirmationToken: string;
  requestId: string;
}
```

**Example Request:**

```bash
curl -X POST https://your-project.supabase.co/functions/v1/loopgpt_route_order \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "item-1",
        "name": "Chicken Breast",
        "quantity": 2,
        "unit": "lbs",
        "priceCents": 1299
      },
      {
        "id": "item-2",
        "name": "Brown Rice",
        "quantity": 1,
        "unit": "bag",
        "priceCents": 599
      },
      {
        "id": "item-3",
        "name": "Broccoli",
        "quantity": 1,
        "unit": "head",
        "priceCents": 299
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94102",
      "country": "US"
    },
    "preferences": {
      "optimize": "price"
    }
  }'
```

**Example Response:**

```json
{
  "selectedProvider": {
    "id": "WALMART_API",
    "name": "Walmart Direct",
    "priority": 60
  },
  "config": {
    "id": "WALMART_API",
    "name": "Walmart Direct",
    "enabled": true,
    "priority": 60,
    "commissionRate": 0.03,
    "regions": ["US"],
    "timeout": 10000,
    "maxRetries": 2
  },
  "cart": [
    {
      "clientItemId": "item-1",
      "name": "Chicken Breast",
      "quantity": 2,
      "unit": "lbs",
      "priceCents": 1999
    },
    {
      "clientItemId": "item-2",
      "name": "Brown Rice",
      "quantity": 1,
      "unit": "bag",
      "priceCents": 499
    },
    {
      "clientItemId": "item-3",
      "name": "Broccoli",
      "quantity": 1,
      "unit": "head",
      "priceCents": 199
    }
  ],
  "quote": {
    "subtotalCents": 2697,
    "feesCents": 795,
    "taxCents": 0,
    "totalCents": 3492,
    "currency": "USD",
    "estimatedDeliveryMinutes": 90
  },
  "itemAvailability": [
    {
      "clientItemId": "item-1",
      "inStock": true,
      "providerSku": "WM-12345",
      "substituted": false
    },
    {
      "clientItemId": "item-2",
      "inStock": true,
      "providerSku": "WM-67890",
      "substituted": false
    },
    {
      "clientItemId": "item-3",
      "inStock": true,
      "providerSku": "WM-11223",
      "substituted": false
    }
  ],
  "affiliateUrl": "https://www.walmart.com/cart?cartId=abc123&affId=LOOPGPT",
  "alternativeQuotes": [
    {
      "provider": {
        "id": "KROGER_API",
        "name": "Kroger Direct",
        "priority": 60
      },
      "quote": {
        "totalCents": 3899,
        "estimatedDeliveryMinutes": 150
      }
    },
    {
      "provider": {
        "id": "INSTACART",
        "name": "Instacart",
        "priority": 40
      },
      "quote": {
        "totalCents": 4299,
        "estimatedDeliveryMinutes": 60
      }
    }
  ],
  "score": 92.5,
  "scoreBreakdown": {
    "priceScore": 100,
    "speedScore": 75,
    "availabilityScore": 100,
    "marginScore": 80,
    "reliabilityScore": 50
  },
  "confirmationToken": "conf_1733655000_abc123",
  "requestId": "req_1733655000_abc123"
}
```

---

### POST /loopgpt_route_order (Health Check)

Check health status of all providers.

**Request Body:**

```json
{
  "action": "health_check"
}
```

**Response:**

```json
{
  "providers": {
    "MEALME": {
      "healthy": true,
      "latencyMs": 123
    },
    "INSTACART": {
      "healthy": true,
      "latencyMs": 156
    },
    "KROGER_API": {
      "healthy": true,
      "latencyMs": 234
    },
    "WALMART_API": {
      "healthy": true,
      "latencyMs": 189
    }
  },
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

---

## Request/Response Schemas

### RequestedItem

```typescript
interface RequestedItem {
  id: string;                    // Client-side item ID
  name: string;                  // Item name (e.g., "Chicken Breast")
  quantity: number;              // Quantity to purchase
  unit: string;                  // Unit (e.g., "lbs", "pcs", "bag")
  priceCents?: number;           // Optional: expected price in cents
}
```

### ShippingAddress

```typescript
interface ShippingAddress {
  street: string;                // Street address
  city: string;                  // City name
  state?: string;                // State code (e.g., "CA")
  postalCode: string;            // ZIP/postal code
  country: string;               // Country code (e.g., "US")
}
```

### Preferences

```typescript
interface Preferences {
  optimize?: 'price' | 'speed' | 'margin' | 'balanced';
  excludeProviders?: ProviderId[];
  maxDeliveryMinutes?: number;
}
```

**Optimization Strategies:**

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `price` | Minimize total cost | Budget-conscious users |
| `speed` | Minimize delivery time | Urgent orders |
| `margin` | Maximize commission | Revenue optimization |
| `balanced` | Balance all factors | Default |

### ProviderId

```typescript
type ProviderId = 'MEALME' | 'INSTACART' | 'KROGER_API' | 'WALMART_API';
```

### ProviderConfig

```typescript
interface ProviderConfig {
  id: ProviderId;
  name: string;
  enabled: boolean;
  priority: number;              // Base priority (0-100)
  commissionRate: number;        // Commission as decimal (0.03 = 3%)
  regions: string[];             // Supported regions (e.g., ["US"])
  timeout?: number;              // Timeout in milliseconds
  maxRetries?: number;           // Max retry attempts
}
```

### Quote

```typescript
interface Quote {
  subtotalCents: number;         // Item total in cents
  feesCents: number;             // Delivery/service fees in cents
  taxCents: number;              // Tax in cents
  totalCents: number;            // Grand total in cents
  currency: string;              // Currency code (e.g., "USD")
  estimatedDeliveryMinutes?: number;  // ETA in minutes
}
```

### ItemAvailability

```typescript
interface ItemAvailability {
  clientItemId: string;          // Matches RequestedItem.id
  inStock: boolean;              // Is item available?
  providerSku?: string;          // Provider's SKU
  substituted?: boolean;         // Was item substituted?
}
```

### ProviderQuote

```typescript
interface ProviderQuote {
  provider: {
    id: ProviderId;
    name: string;
    priority: number;
  };
  config: ProviderConfig;
  cart: CartItem[];
  quote: Quote;
  itemAvailability: ItemAvailability[];
  affiliateUrl?: string;
  raw?: unknown;                 // Raw provider response
}
```

---

## Provider Details

### MealMe

**Type:** Aggregator  
**Coverage:** US (restaurants + grocery)  
**Commission:** 3-5%  
**ETA:** 30-45 minutes  
**Mock Mode:** `LOOPGPT_MEALME_MOCK=true`

**Features:**
- Restaurant delivery
- Grocery delivery
- Real-time tracking
- Multiple cuisines

### Instacart

**Type:** Aggregator  
**Coverage:** US + Canada  
**Commission:** 2-4%  
**ETA:** 45-60 minutes  
**Mock Mode:** `LOOPGPT_INSTACART_MOCK=true`

**Features:**
- Multiple store partnerships
- Same-day delivery
- Alcohol delivery
- Prescription delivery

### Kroger API

**Type:** Direct API  
**Coverage:** US (Kroger stores)  
**Commission:** 3%  
**ETA:** 2-4 hours  
**Mock Mode:** `LOOPGPT_KROGER_MOCK=true`

**Features:**
- Direct store integration
- Loyalty program support
- Free delivery over $35
- Pickup options

**API Credentials:**
- `KROGER_CLIENT_ID`
- `KROGER_CLIENT_SECRET`
- `KROGER_ENV` (sandbox | production)

### Walmart API

**Type:** Direct API  
**Coverage:** US (Walmart stores)  
**Commission:** 3%  
**ETA:** 1-2 hours  
**Mock Mode:** `LOOPGPT_WALMART_MOCK=true`

**Features:**
- Direct store integration
- Lowest pricing
- Fast delivery
- Pickup options

**API Credentials:**
- `WALMART_API_KEY`
- `WALMART_PARTNER_ID`
- `WALMART_ENV` (sandbox | production)

---

## Error Handling

### Error Response Format

```typescript
{
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}
```

### Error Codes

| Code | HTTP Status | Description | Retryable |
|------|-------------|-------------|-----------|
| `NO_PROVIDERS_AVAILABLE` | 503 | No providers returned quotes | Yes |
| `INVALID_ADDRESS` | 400 | Shipping address is invalid | No |
| `INVALID_ITEMS` | 400 | Cart items are invalid | No |
| `PROVIDER_TIMEOUT` | 504 | Provider timed out | Yes |
| `PROVIDER_ERROR` | 502 | Provider returned error | Maybe |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Yes |
| `INTERNAL_ERROR` | 500 | Internal server error | Yes |

### Example Error Response

```json
{
  "error": {
    "code": "NO_PROVIDERS_AVAILABLE",
    "message": "No providers returned valid quotes. All providers failed or timed out.",
    "details": {
      "attemptedProviders": ["MEALME", "INSTACART", "KROGER_API", "WALMART_API"],
      "errors": {
        "KROGER_API": "Provider KROGER_API timed out after 10000ms",
        "WALMART_API": "Unauthorized"
      }
    }
  },
  "requestId": "req_1733655000_abc123",
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

### Retry Strategy

**Retryable Errors:**
- 429 (Rate Limit) → Exponential backoff
- 503 (No Providers) → Retry after 5s
- 504 (Timeout) → Retry with longer timeout

**Non-Retryable Errors:**
- 400 (Invalid Request) → Fix request
- 401 (Unauthorized) → Check API key
- 403 (Forbidden) → Check permissions

---

## Rate Limits

### Default Limits

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| Free | 10 | 100 | 1,000 |
| Pro | 60 | 1,000 | 10,000 |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1733655060
```

### Handling Rate Limits

```typescript
async function routeOrderWithRetry(request: RouteOrderRequest) {
  try {
    return await routeOrder(request);
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      const resetTime = error.headers['X-RateLimit-Reset'];
      const waitMs = (resetTime * 1000) - Date.now();
      await sleep(waitMs);
      return await routeOrder(request);
    }
    throw error;
  }
}
```

---

## Best Practices

### 1. Cache Results

```typescript
// Cache quotes for 5 minutes
const cacheKey = `quote:${JSON.stringify(request)}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const quote = await routeOrder(request);
await cache.set(cacheKey, quote, { ttl: 300 });
return quote;
```

### 2. Handle Timeouts Gracefully

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const quote = await routeOrder(request, { signal: controller.signal });
  return quote;
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout
    return fallbackQuote;
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

### 3. Provide Fallbacks

```typescript
try {
  return await routeOrder(request);
} catch (error) {
  if (error.code === 'NO_PROVIDERS_AVAILABLE') {
    // Show cached quotes or manual selection
    return getCachedQuotes(request);
  }
  throw error;
}
```

### 4. Monitor Performance

```typescript
const start = Date.now();
try {
  const quote = await routeOrder(request);
  const latency = Date.now() - start;
  metrics.record('route_order_latency', latency);
  return quote;
} catch (error) {
  metrics.increment('route_order_error', { code: error.code });
  throw error;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { LoopGPTCommerce } from '@loopgpt/commerce-sdk';

const client = new LoopGPTCommerce({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-project.supabase.co/functions/v1',
});

const quote = await client.routeOrder({
  items: [
    { id: '1', name: 'Chicken', quantity: 2, unit: 'lbs' },
    { id: '2', name: 'Rice', quantity: 1, unit: 'bag' },
  ],
  shippingAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  },
  preferences: {
    optimize: 'price',
  },
});

console.log(`Selected: ${quote.selectedProvider.name}`);
console.log(`Total: $${quote.quote.totalCents / 100}`);
console.log(`ETA: ${quote.quote.estimatedDeliveryMinutes} min`);
```

### Python

```python
from loopgpt_commerce import LoopGPTCommerce

client = LoopGPTCommerce(
    api_key='your-api-key',
    base_url='https://your-project.supabase.co/functions/v1'
)

quote = client.route_order(
    items=[
        {'id': '1', 'name': 'Chicken', 'quantity': 2, 'unit': 'lbs'},
        {'id': '2', 'name': 'Rice', 'quantity': 1, 'unit': 'bag'},
    ],
    shipping_address={
        'street': '123 Main St',
        'city': 'San Francisco',
        'state': 'CA',
        'postalCode': '94102',
        'country': 'US',
    },
    preferences={'optimize': 'price'}
)

print(f"Selected: {quote['selectedProvider']['name']}")
print(f"Total: ${quote['quote']['totalCents'] / 100}")
print(f"ETA: {quote['quote']['estimatedDeliveryMinutes']} min")
```

---

## Support

**Documentation:** https://docs.loopgpt.com/commerce  
**API Status:** https://status.loopgpt.com  
**Support Email:** api-support@loopgpt.com  
**Slack Community:** https://loopgpt.slack.com
