#!/usr/bin/env python3
"""
Execute SQL migrations via Supabase
"""
import os
import requests

# Load environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qmagnwxeijctkksqbcqz.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found in environment")
    exit(1)

# Read migration files
migrations = [
    "supabase/migrations/20251101180100_create_food_search_logs.sql",
    "supabase/migrations/20251101180200_add_metrics_functions.sql",
]

print("🗄️  Executing SQL migrations via Supabase REST API...")
print()

for migration_file in migrations:
    print(f"📝 {migration_file}")
    
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    # Execute via PostgREST query endpoint
    # We'll use a simple approach: execute each statement separately
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for i, statement in enumerate(statements):
        if not statement:
            continue
            
        print(f"   Executing statement {i+1}/{len(statements)}...", end=" ")
        
        # Use Supabase SQL endpoint
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
            },
            json={"sql": statement}
        )
        
        if response.status_code in [200, 201, 204]:
            print("✅")
        else:
            print(f"⚠️  Status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    
    print()

print("✅ Migration execution complete!")
print()
print("To verify, check your Supabase dashboard:")
print(f"   {SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/editor")

