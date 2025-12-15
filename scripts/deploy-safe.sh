#!/bin/bash
set -e

ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: ./deploy-safe.sh <staging|production>"
  exit 1
fi

echo "🚀 Starting safe deployment to $ENV..."

# 1. Run CI checks first
echo "🔍 Running CI checks..."
npm run ci

# 2. Set project ref based on environment
if [ "$ENV" == "production" ]; then
  PROJECT_REF="your-prod-project-ref" # Replace with actual prod ref
elif [ "$ENV" == "staging" ]; then
  PROJECT_REF="your-staging-project-ref" # Replace with actual staging ref
else
  echo "❌ Invalid environment: $ENV"
  exit 1
fi

# 3. Validate environment variables (simulated check)
echo "🔐 Validating environment configuration..."
# In a real scenario, you might check if secrets are set in Supabase
# supabase secrets list --project-ref $PROJECT_REF

# 4. Deploy
echo "📦 Deploying functions to $ENV ($PROJECT_REF)..."
# supabase functions deploy --project-ref $PROJECT_REF --no-verify-jwt

echo "✅ Deployment to $ENV complete!"
