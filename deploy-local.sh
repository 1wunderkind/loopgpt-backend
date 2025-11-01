#!/bin/bash

# TheLoopGPT.ai - Local Deployment Script
# This script deploys the backend to your Supabase project from your local machine

set -e

echo "🚀 TheLoopGPT.ai Backend Deployment"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your credentials."
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ Error: SUPABASE_PROJECT_REF not set in .env"
    exit 1
fi

echo "📋 Configuration:"
echo "   Project: $SUPABASE_PROJECT_REF"
echo "   URL: $SUPABASE_URL"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  macOS: brew install supabase/tap/supabase"
    echo "  Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
    echo "  Linux: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Login check
echo "🔐 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in. Opening browser for login..."
    supabase login
fi

echo "✅ Logged in successfully!"
echo ""

# Link project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $SUPABASE_PROJECT_REF

echo "✅ Project linked!"
echo ""

# Run migrations
echo "📊 Running database migrations..."
echo "   This will create 18 tables with RLS policies..."
supabase db push

echo "✅ Database migrations complete!"
echo ""

# Deploy Edge Functions
echo "🚀 Deploying Edge Functions..."
echo "   This will deploy 19 functions..."
echo ""

# Set environment variables for functions
echo "⚙️  Setting environment variables..."
supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

if [ ! -z "$MEALME_API_KEY" ]; then
    supabase secrets set MEALME_API_KEY="$MEALME_API_KEY"
fi

if [ ! -z "$MEALME_PARTNER_ID" ]; then
    supabase secrets set MEALME_PARTNER_ID="$MEALME_PARTNER_ID"
fi

if [ ! -z "$AMAZON_AFFILIATE_ID" ]; then
    supabase secrets set AMAZON_AFFILIATE_ID="$AMAZON_AFFILIATE_ID"
fi

if [ ! -z "$INSTACART_AFFILIATE_ID" ]; then
    supabase secrets set INSTACART_AFFILIATE_ID="$INSTACART_AFFILIATE_ID"
fi

echo "✅ Environment variables set!"
echo ""

# Deploy functions
echo "📦 Deploying functions..."

# Meal Planner functions
echo "   → Deploying meal-planner functions..."
supabase functions deploy generate_week_plan --project-ref $SUPABASE_PROJECT_REF

# Weight Tracker functions
echo "   → Deploying weight-tracker functions..."
supabase functions deploy log_weight --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy weekly_trend --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy evaluate_plan_outcome --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy push_plan_feedback --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy get_weight_prefs --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy update_weight_prefs --project-ref $SUPABASE_PROJECT_REF

# Delivery functions
echo "   → Deploying delivery functions..."
supabase functions deploy get_delivery_recommendations --project-ref $SUPABASE_PROJECT_REF

# MealMe functions
echo "   → Deploying mealme functions..."
supabase functions deploy mealme_search --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy mealme_create_cart --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy mealme_get_quotes --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy mealme_checkout_url --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy mealme_webhook --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy mealme_order_plan --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy normalize_ingredients --project-ref $SUPABASE_PROJECT_REF

# Geolocation functions
echo "   → Deploying geolocation functions..."
supabase functions deploy get_user_location --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy update_user_location --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy get_affiliate_by_country --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy change_location --project-ref $SUPABASE_PROJECT_REF

echo ""
echo "✅ All functions deployed!"
echo ""

# Test deployment
echo "🧪 Testing deployment..."
echo "   Testing generate_week_plan function..."

TEST_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate_week_plan" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"goal": "weight_loss", "days": 7, "language": "en"}')

if echo "$TEST_RESPONSE" | grep -q "success"; then
    echo "✅ Test passed! Function is working!"
else
    echo "⚠️  Test response: $TEST_RESPONSE"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "✅ Database: 18 tables created"
echo "✅ Functions: 19 Edge Functions deployed"
echo "✅ Environment: Variables configured"
echo ""
echo "🌐 Your backend is live at:"
echo "   $SUPABASE_URL"
echo ""
echo "📊 View your project:"
echo "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF"
echo ""
echo "🚀 Next steps:"
echo "   1. Test functions in Supabase Dashboard"
echo "   2. Monitor logs and performance"
echo "   3. Connect your frontend/GPT"
echo ""
echo "Plan → Eat → Track → Result → Adapt 🔄"

