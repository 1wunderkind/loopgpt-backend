#!/bin/bash
# Food Resolver Integration Tests Runner

echo "🧪 Running Food Resolver Integration Tests"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run tests with Deno
~/.deno/bin/deno test \
  --allow-net \
  --allow-read \
  --allow-env \
  tests/food_resolver_integration.test.ts

echo ""
echo "=========================================="
echo "✅ Test run complete!"

