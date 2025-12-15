#!/bin/bash
set -e

echo "🔍 Running Production Lint Gate..."

# Define critical paths to enforce strict linting on
CRITICAL_PATHS=(
  "supabase/functions/mealme_get_quotes"
  "supabase/functions/delivery_place_order"
  "supabase/functions/mcp-tools/nutrition.ts"
  "supabase/functions/mcp-tools/mealplan.ts"
  "supabase/functions/_shared/monitoring"
  "supabase/functions/_shared/errors"
  "supabase/functions/_shared/env.ts"
)

# Construct the include arguments
INCLUDES=""
for path in "${CRITICAL_PATHS[@]}"; do
  INCLUDES="$INCLUDES $path"
done

# Run deno lint only on critical paths
echo "Linting critical paths: $INCLUDES"
/home/ubuntu/.deno/bin/deno lint $INCLUDES

echo "✅ Production lint gate passed!"
