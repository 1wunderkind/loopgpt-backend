#!/bin/bash

# Journey 1 Deployment Script
# This script deploys the journey_1_onboarding Edge Function and updates the MCP server

set -e  # Exit on error

echo "🚀 Deploying Journey 1: Onboarding & First Meal Plan"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo "❌ Error: supabase/functions directory not found"
    echo "   Please run this script from the loopgpt-backend root directory"
    exit 1
fi

echo "📦 Step 1: Deploying journey_1_onboarding Edge Function..."
supabase functions deploy journey_1_onboarding

if [ $? -eq 0 ]; then
    echo "✅ journey_1_onboarding deployed successfully"
else
    echo "❌ Failed to deploy journey_1_onboarding"
    exit 1
fi

echo ""
echo "📦 Step 2: Updating MCP server..."
echo "   (Manual step required - see instructions below)"
echo ""

echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update MCP Server Tool List:"
echo "   - Open: supabase/functions/mcp-server/index.ts"
echo "   - Add JOURNEY_1_TOOL from week1-2-journey-1/mcp-server-update.ts"
echo "   - Deploy: supabase functions deploy mcp-server"
echo ""
echo "2. Test the Function:"
echo "   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/journey_1_onboarding \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"chatgpt_user_id\": \"test_user\", \"goal_type\": \"weight_loss\"}'"
echo ""
echo "3. Test in ChatGPT:"
echo "   - Say: 'I want to lose 15 pounds'"
echo "   - Watch for journey_1_onboarding tool call"
echo "   - Verify formatted response appears"
echo ""
echo "4. Monitor Analytics:"
echo "   - Check tool_calls table for success rate"
echo "   - Check user_events table for journey completion"
echo "   - Check affiliate_performance table for link appearances"
echo ""
echo "=================================================="
echo "📊 Monitoring Queries:"
echo ""
echo "-- Tool call success rate"
echo "SELECT COUNT(*), SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful"
echo "FROM tool_calls WHERE tool_name = 'journey_1_onboarding';"
echo ""
echo "-- Average duration"
echo "SELECT AVG(duration_ms) FROM tool_calls WHERE tool_name = 'journey_1_onboarding';"
echo ""
echo "-- Recent errors"
echo "SELECT * FROM tool_calls WHERE tool_name = 'journey_1_onboarding' AND success = false ORDER BY called_at DESC LIMIT 5;"
echo ""
echo "=================================================="
