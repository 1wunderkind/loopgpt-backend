#!/bin/bash

# ============================================================================
# Manual Deployment Script for Stripe Billing System
# ============================================================================
# This script deploys the billing system components to Supabase
# Run this if GitHub Actions doesn't have the updated workflow yet
# ============================================================================

set -e  # Exit on error

PROJECT_REF="qmagnwxeijctkksqbcqz"
SUPABASE_URL="https://qmagnwxeijctkksqbcqz.supabase.co"

echo "🚀 Starting Stripe Billing System Deployment..."
echo "================================================"
echo ""

# ============================================================================
# Step 1: Deploy Database Migration
# ============================================================================
echo "📊 Step 1: Deploying database migration..."
echo "-------------------------------------------"

# Check if we need to run the migration via SQL
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not set"
    echo "📝 You'll need to run the migration manually:"
    echo ""
    echo "Option 1: Via Supabase Dashboard"
    echo "  1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    echo "  2. Copy contents of: supabase/migrations/20251101180000_create_billing_tables.sql"
    echo "  3. Paste and run"
    echo ""
    echo "Option 2: Set SUPABASE_ACCESS_TOKEN and re-run this script"
    echo "  export SUPABASE_ACCESS_TOKEN=your_token"
    echo "  ./deploy-billing-system.sh"
    echo ""
else
    echo "✅ SUPABASE_ACCESS_TOKEN found"
    echo "🔗 Linking to project..."
    supabase link --project-ref $PROJECT_REF
    
    echo "📊 Running database migration..."
    supabase db push --linked
    
    echo "✅ Database migration complete!"
fi

echo ""

# ============================================================================
# Step 2: Deploy Edge Functions
# ============================================================================
echo "🔧 Step 2: Deploying 6 new Edge Functions..."
echo "-------------------------------------------"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  Cannot deploy functions without SUPABASE_ACCESS_TOKEN"
    echo "📝 Manual deployment instructions:"
    echo ""
    echo "Via Supabase CLI:"
    echo "  export SUPABASE_ACCESS_TOKEN=your_token"
    echo "  supabase functions deploy create_checkout_session --project-ref $PROJECT_REF"
    echo "  supabase functions deploy stripe_webhook --project-ref $PROJECT_REF"
    echo "  supabase functions deploy create_customer_portal --project-ref $PROJECT_REF"
    echo "  supabase functions deploy check_entitlement --project-ref $PROJECT_REF"
    echo "  supabase functions deploy upgrade_to_premium --project-ref $PROJECT_REF"
    echo "  supabase functions deploy trial_reminder --project-ref $PROJECT_REF"
    echo ""
    echo "Via Supabase Dashboard:"
    echo "  1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/functions"
    echo "  2. Create each function manually"
    echo "  3. Copy code from supabase/functions/[function_name]/index.ts"
    echo ""
else
    echo "✅ Deploying functions..."
    
    echo "  📦 Deploying create_checkout_session..."
    supabase functions deploy create_checkout_session --project-ref $PROJECT_REF
    
    echo "  📦 Deploying stripe_webhook..."
    supabase functions deploy stripe_webhook --project-ref $PROJECT_REF
    
    echo "  📦 Deploying create_customer_portal..."
    supabase functions deploy create_customer_portal --project-ref $PROJECT_REF
    
    echo "  📦 Deploying check_entitlement..."
    supabase functions deploy check_entitlement --project-ref $PROJECT_REF
    
    echo "  📦 Deploying upgrade_to_premium..."
    supabase functions deploy upgrade_to_premium --project-ref $PROJECT_REF
    
    echo "  📦 Deploying trial_reminder..."
    supabase functions deploy trial_reminder --project-ref $PROJECT_REF
    
    echo "✅ All functions deployed!"
fi

echo ""

# ============================================================================
# Step 3: Deploy Updated MCP Server
# ============================================================================
echo "🔧 Step 3: Deploying updated MCP server..."
echo "-------------------------------------------"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  Cannot deploy without SUPABASE_ACCESS_TOKEN"
    echo "📝 Manual deployment:"
    echo "  supabase functions deploy mcp-server --project-ref $PROJECT_REF"
else
    echo "  📦 Deploying mcp-server (with 30 tools)..."
    supabase functions deploy mcp-server --project-ref $PROJECT_REF
    echo "✅ MCP server updated!"
fi

echo ""

# ============================================================================
# Step 4: Set Environment Variables
# ============================================================================
echo "🔐 Step 4: Environment Variables"
echo "-------------------------------------------"
echo "⚠️  You need to set these in Supabase Dashboard:"
echo ""
echo "Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
echo "Add these secrets:"
echo "  STRIPE_SECRET_KEY=sk_test_PLACEHOLDER"
echo "  STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER"
echo "  STRIPE_PRICE_ID_MONTHLY=price_loop_premium_monthly_v1"
echo "  STRIPE_PRICE_ID_ANNUAL=price_loop_premium_annual_v1"
echo "  STRIPE_PRICE_ID_FAMILY=price_loop_family_monthly_v1"
echo "  APP_URL=https://theloopgpt.ai"
echo "  CRON_SECRET=your_random_secret"
echo ""
echo "📖 See STRIPE_SETUP_GUIDE.md for how to get real Stripe keys"
echo ""

# ============================================================================
# Step 5: Verification
# ============================================================================
echo "✅ Step 5: Verification"
echo "-------------------------------------------"
echo ""
echo "Test the deployment:"
echo ""
echo "1. Check MCP manifest has 30 tools:"
echo "   curl $SUPABASE_URL/functions/v1/mcp-server | jq '.tools | length'"
echo ""
echo "2. Test entitlement check:"
echo "   curl -X POST $SUPABASE_URL/functions/v1/check_entitlement \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"chatgpt_user_id\": \"test_user_001\"}'"
echo ""
echo "3. Check database tables:"
echo "   - Go to: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo "   - Look for: subscriptions, entitlements, analytics_events"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "================================================"
echo "🎉 Deployment Script Complete!"
echo "================================================"
echo ""
echo "📋 What was deployed:"
echo "  ✅ 3 database tables (subscriptions, entitlements, analytics_events)"
echo "  ✅ 6 Edge Functions (billing system)"
echo "  ✅ 1 MCP server update (30 tools)"
echo "  ✅ 1 middleware (check-premium.ts)"
echo ""
echo "📖 Next steps:"
echo "  1. Set environment variables in Supabase Dashboard"
echo "  2. Follow STRIPE_SETUP_GUIDE.md to set up Stripe"
echo "  3. Test the system with BILLING_DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🔗 Project: $SUPABASE_URL"
echo "📚 Documentation: See STRIPE_SETUP_GUIDE.md"
echo ""
echo "Good luck! 🚀"

