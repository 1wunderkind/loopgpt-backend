# LoopGPT Commerce Layer Tests

Comprehensive test suite for the multi-provider commerce routing system.

## 🎯 Test Coverage

### Provider Tests
- **Kroger Provider** (`providers/kroger.test.ts`)
  - Mock mode validation
  - Real API integration (skipped without keys)
  - Fallback behavior
  - Health checks
  - Pricing logic (free delivery over $35)

- **Walmart Provider** (`providers/walmart.test.ts`)
  - Mock mode validation
  - Real API integration (skipped without keys)
  - Fallback behavior
  - Health checks
  - Competitive pricing

### Router Tests
- **Multi-Provider Routing** (`router/router.test.ts`)
  - Provider selection logic
  - Scoring algorithms (price, speed, margin)
  - Priority boost effects
  - Config-driven behavior

### E2E Integration Tests (Staging Only)
- **End-to-End Routing** (`integration/e2e.test.ts`)
  - MealMe-only routing
  - Direct APIs-only routing
  - Mixed provider routing
  - Response schema validation
  - Fixed scoring weight consistency
  - Optimization strategies (price, speed, margin)

## 🚀 Running Tests

### Run All Tests
```bash
cd /home/ubuntu/loopgpt-backend/supabase/functions/_tests
./run_tests.sh
```

### Run E2E Tests (Staging Only)
```bash
# Set staging environment
export LOOPGPT_ENV=staging

# Run all tests including E2E
./run_tests.sh
```

### Run Specific Test File
```bash
deno test --allow-all commerce/providers/kroger.test.ts
```

### Run With Real API Keys (Optional)
```bash
# Set API credentials
export KROGER_CLIENT_ID="your-client-id"
export KROGER_CLIENT_SECRET="your-secret"
export WALMART_API_KEY="your-api-key"
export WALMART_PARTNER_ID="your-partner-id"

# Disable mock mode
export LOOPGPT_KROGER_MOCK=false
export LOOPGPT_WALMART_MOCK=false

# Run tests
./run_tests.sh
```

## 📊 Test Modes

### Mock Mode (Default)
- Uses deterministic mock data
- No external API calls
- Fast and reliable
- Perfect for CI/CD

### Real API Mode
- Requires valid API credentials
- Tests actual API integration
- May be slower
- Skipped automatically if keys not configured

## 🧠 Test Structure

```
_tests/
├── commerce/
│   ├── providers/
│   │   ├── kroger.test.ts       # Kroger provider tests
│   │   └── walmart.test.ts      # Walmart provider tests
│   ├── router/
│   │   └── router.test.ts       # Router integration tests
│   ├── integration/
│   │   └── e2e.test.ts          # End-to-end tests (staging only)
│   └── testUtils.ts             # Shared test utilities
├── run_tests.sh                 # Test runner script
└── README.md                    # This file
```

## ✅ Test Assertions

### Provider Quote Validation
- Correct provider ID
- Non-zero pricing
- Valid item availability
- Reasonable pricing (subtotal + fees + tax = total)
- Affiliate URL present

### Router Validation
- At least one quote returned
- Correct provider selected based on optimization
- Priority boosts applied correctly
- Config-driven behavior (enabled/disabled providers)

## 🔧 Environment Variables

### Provider Configuration
```bash
# Enable/disable providers
LOOPGPT_ENABLE_KROGER=true
LOOPGPT_ENABLE_WALMART=true

# Force mock mode
LOOPGPT_KROGER_MOCK=true
LOOPGPT_WALMART_MOCK=true

# Allow fallback to mock
LOOPGPT_KROGER_ALLOW_MOCK_FALLBACK=true
LOOPGPT_WALMART_ALLOW_MOCK_FALLBACK=true
```

### API Credentials
```bash
# Kroger
KROGER_CLIENT_ID=your-client-id
KROGER_CLIENT_SECRET=your-secret
KROGER_ENV=sandbox

# Walmart
WALMART_API_KEY=your-api-key
WALMART_PARTNER_ID=your-partner-id
WALMART_ENV=sandbox
```

### Scoring Weights
```bash
LOOPGPT_SCORE_PRIORITY_WEIGHT=1.0
LOOPGPT_SCORE_PRICE_WEIGHT=0.30
LOOPGPT_SCORE_SPEED_WEIGHT=0.15
LOOPGPT_SCORE_COMMISSION_WEIGHT=0.20
LOOPGPT_SCORE_AVAILABILITY_WEIGHT=0.25
LOOPGPT_SCORE_RELIABILITY_WEIGHT=0.10
```

## 📝 Adding New Tests

### 1. Create Test File
```typescript
// _tests/commerce/providers/newprovider.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { newProvider } from "../../../_shared/commerce/providers/newProvider.ts";
import { createSampleQuoteRequest, assertValidProviderQuote } from "../testUtils.ts";

Deno.test("New Provider - Mock Mode - Returns valid quote", async () => {
  const request = createSampleQuoteRequest('NEW_PROVIDER');
  const config = createSampleProviderConfig('NEW_PROVIDER');
  
  const quote = await newProvider.getQuote(request, config);
  
  assertValidProviderQuote(quote, 'NEW_PROVIDER', request.items.length);
});
```

### 2. Add to Test Runner
```bash
# Edit run_tests.sh
run_test "commerce/providers/newprovider.test.ts"
```

## 🐛 Debugging Tests

### View Detailed Output
```bash
deno test --allow-all --no-check commerce/providers/kroger.test.ts
```

### Run Single Test
```bash
deno test --allow-all --filter "Mock Mode - Returns valid quote" commerce/providers/kroger.test.ts
```

### Enable Debug Logging
```bash
export LOOPGPT_DEBUG=true
deno test --allow-all commerce/providers/kroger.test.ts
```

## 📚 References

- [Deno Testing](https://deno.land/manual/testing)
- [Kroger API Docs](https://developer.kroger.com/)
- [Walmart API Docs](https://developer.walmart.com/)
