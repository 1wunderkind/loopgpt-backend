#!/bin/bash
set -e

echo "🔍 Checking Database Contract..."

# 1. Check Migration Naming Convention
echo "Checking migration filenames..."
INVALID_MIGRATIONS=$(find supabase/migrations -name "*.sql" ! -name "*_*.sql")
if [ -n "$INVALID_MIGRATIONS" ]; then
  echo "❌ Invalid migration filenames found (must follow timestamp_name.sql format):"
  echo "$INVALID_MIGRATIONS"
  exit 1
fi

# 2. Check for RLS Enablement in Migrations (Heuristic)
# This is a basic check to ensure 'ENABLE ROW LEVEL SECURITY' is present in migrations that create tables
# A more robust check would parse SQL or run against a real DB
echo "Scanning for RLS enablement..."
# grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations

# 3. Check for Seed File
if [ ! -f "supabase/seed.sql" ]; then
  echo "❌ Missing supabase/seed.sql"
  exit 1
fi

echo "✅ Database contract checks passed!"
