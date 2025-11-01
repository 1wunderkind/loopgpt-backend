#!/bin/bash

# TheLoopGPT.ai Backend Deployment Script
# Deploys all Edge Functions to Supabase

set -e

echo "🚀 Deploying TheLoopGPT.ai Backend to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your actual credentials before deploying."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

echo "📦 Deploying Edge Functions..."

# Deploy all functions
echo "  → Deploying meal-planner functions..."
supabase functions deploy generate_week_plan --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}

echo "  → Deploying weight-tracker functions..."
supabase functions deploy log_weight --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy weekly_trend --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy evaluate_plan_outcome --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy push_plan_feedback --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy get_weight_prefs --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy update_weight_prefs --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}

echo "  → Deploying delivery functions..."
supabase functions deploy get_delivery_recommendations --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}

echo "  → Deploying mealme functions..."
supabase functions deploy mealme_search --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy mealme_create_cart --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy mealme_get_quotes --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy mealme_checkout_url --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy mealme_webhook --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy mealme_order_plan --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy normalize_ingredients --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}

echo "  → Deploying geolocation functions..."
supabase functions deploy get_user_location --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy update_user_location --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy get_affiliate_by_country --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}
supabase functions deploy change_location --project-ref ${SUPABASE_PROJECT_REF:-your-project-ref}

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Set environment variables in Supabase Dashboard"
echo "  2. Test functions with: ./scripts/test-functions.sh"
echo "  3. Check logs: supabase functions logs <function-name>"
echo ""

