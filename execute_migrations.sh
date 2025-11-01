#!/bin/bash
# Execute SQL migrations via Supabase Management API

PROJECT_ID="qmagnwxeijctkksqbcqz"
ACCESS_TOKEN="sbp_77b2b741fad9c8f536000f0b861011991b6b5307"

echo "🗄️  Executing SQL migrations..."
echo ""

# Read migration 1
echo "📝 Migration 1: Create food_search_logs table"
SQL1=$(cat supabase/migrations/20251101180100_create_food_search_logs.sql)

# Execute via psql REST API
curl -X POST "https://${PROJECT_ID}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL1" | jq -Rs .)}"

echo ""
echo "📝 Migration 2: Add metrics functions"
SQL2=$(cat supabase/migrations/20251101180200_add_metrics_functions.sql)

curl -X POST "https://${PROJECT_ID}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL2" | jq -Rs .)}"

echo ""
echo "✅ Migrations executed!"
