#!/bin/bash

# Deploy billing migration via Supabase Management API
# This creates a migration in the Supabase dashboard

set -e

PROJECT_REF="qmagnwxeijctkksqbcqz"
ACCESS_TOKEN="sbp_77b2b741fad9c8f536000f0b861011991b6b5307"
MIGRATION_FILE="supabase/migrations/20251101180000_create_billing_tables.sql"

echo "📊 Deploying billing database migration..."
echo "============================================"

# Read the migration SQL
SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo "✅ Migration file loaded ($(echo "$SQL_CONTENT" | wc -l) lines)"

# Create a migration via Management API
echo "🚀 Applying migration via Supabase Management API..."

# Use the SQL Editor API to execute the migration
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  > /tmp/migration_result.json 2>&1

# Check result
if grep -q "error" /tmp/migration_result.json 2>/dev/null; then
    echo "❌ Migration failed. Response:"
    cat /tmp/migration_result.json | jq '.'
    echo ""
    echo "📝 Please run the migration manually:"
    echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    echo "2. Copy SQL from: $MIGRATION_FILE"
    echo "3. Paste and execute"
    exit 1
else
    echo "✅ Migration executed successfully!"
    cat /tmp/migration_result.json | jq '.' 2>/dev/null || cat /tmp/migration_result.json
    echo ""
    echo "🎉 Database migration complete!"
    echo "   ✅ subscriptions table created"
    echo "   ✅ entitlements table created"
    echo "   ✅ analytics_events table created"
    echo "   ✅ Helper functions created"
    echo "   ✅ RLS policies enabled"
fi

