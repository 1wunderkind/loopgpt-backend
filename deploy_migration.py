#!/usr/bin/env python3
"""
Deploy billing database migration to Supabase
"""

import os
import sys
import subprocess

# Read the migration SQL
migration_file = "supabase/migrations/20251101180000_create_billing_tables.sql"

print(f"📊 Reading migration file: {migration_file}")

with open(migration_file, 'r') as f:
    sql_content = f.read()

print(f"✅ Migration file loaded ({len(sql_content)} characters)")

# Load environment variables
print("🔐 Loading Supabase credentials...")
result = subprocess.run(['bash', '-c', 'source .env && echo $SUPABASE_URL && echo $SUPABASE_SERVICE_ROLE_KEY'], 
                       capture_output=True, text=True)

lines = result.stdout.strip().split('\n')
if len(lines) < 2:
    print("❌ Error: Could not load environment variables")
    sys.exit(1)

supabase_url = lines[0]
service_role_key = lines[1]

print(f"✅ Supabase URL: {supabase_url}")

# Get database connection string
print("🔗 Getting database connection string...")
result = subprocess.run([
    'bash', '-c', 
    f'export SUPABASE_ACCESS_TOKEN=sbp_77b2b741fad9c8f536000f0b861011991b6b5307 && supabase db dump --db-url --linked'
], capture_output=True, text=True, cwd='/home/ubuntu/loopgpt-backend')

if result.returncode != 0:
    print(f"❌ Error getting DB URL: {result.stderr}")
    print("\n📝 Please run the migration manually:")
    print("1. Go to: https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz/sql/new")
    print(f"2. Copy SQL from: {migration_file}")
    print("3. Paste and execute")
    sys.exit(1)

db_url = result.stdout.strip()
print(f"✅ Database URL obtained")

# Execute migration using psql
print("🚀 Executing migration...")
result = subprocess.run([
    'psql', db_url, '-f', migration_file
], capture_output=True, text=True)

if result.returncode != 0:
    print(f"❌ Migration failed: {result.stderr}")
    print("\n📝 Please run the migration manually:")
    print("1. Go to: https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz/sql/new")
    print(f"2. Copy SQL from: {migration_file}")
    print("3. Paste and execute")
    sys.exit(1)

print("✅ Migration executed successfully!")
print(result.stdout)
print("\n🎉 Database migration complete!")
print("   - subscriptions table created")
print("   - entitlements table created")
print("   - analytics_events table created")
print("   - Helper functions created")
print("   - RLS policies enabled")

