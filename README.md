# TheLoopGPT.ai Backend

**Unified Supabase backend for the entire LoopGPT ecosystem**

This repository contains all Edge Functions, database migrations, and shared utilities for:
- **MealPlannerGPT** - AI-powered meal planning with 1-click ordering
- **WeightTrackerGPT** - Weight tracking and automatic plan adaptation
- **Delivery Affiliates** - Location-aware delivery recommendations
- **MealMe Integration** - 1-click food ordering from 1M+ restaurants
- **Geolocation** - Multi-country support with smart affiliate routing

---

## 🏗️ Architecture

### **Monorepo Structure**

```
loopgpt-backend/
├── supabase/
│   ├── migrations/          # Database schema migrations
│   ├── seed/                # Seed data
│   └── functions/
│       ├── meal-planner/    # Meal planning functions
│       ├── weight-tracker/  # Weight tracking functions
│       ├── delivery/        # Delivery affiliate functions
│       ├── mealme/          # MealMe integration functions
│       ├── geolocation/     # Location detection functions
│       └── shared/          # Shared utilities
└── scripts/                 # Deployment and testing scripts
```

### **Key Features**

- ✅ **Supabase Auth** - Built-in authentication with RLS policies
- ✅ **100+ Languages** - Multilingual support via GPT-4.1-mini
- ✅ **25 Countries** - Geolocation and affiliate routing
- ✅ **MealMe Integration** - 1-click ordering from 1M+ restaurants
- ✅ **WeightTracker** - Complete feedback loop (Plan → Track → Adapt)
- ✅ **$80-250k/month revenue potential**

---

## 🚀 Quick Start

### **Prerequisites**

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Supabase account and project
- Node.js 18+ (for local development)

### **1. Clone Repository**

```bash
git clone https://github.com/1wunderkind/loopgpt-backend.git
cd loopgpt-backend
```

### **2. Configure Environment**

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key for multilingual formatting
- `MEALME_API_KEY` - MealMe API key for 1-click ordering

### **3. Run Migrations**

```bash
supabase db push
```

This creates:
- 18 database tables
- RLS policies for security
- Indexes for performance
- Helper functions
- Seed data

### **4. Deploy Edge Functions**

```bash
./scripts/deploy-all.sh
```

This deploys all 20+ Edge Functions to Supabase.

### **5. Test**

```bash
./scripts/test-functions.sh
```

---

## 📦 Edge Functions

### **Meal Planning** (4 functions)

- `generate_week_plan` - Generate 7-day meal plan
- `get_plan` - Retrieve meal plan
- `adjust_plan` - Update specific day
- `build_affiliate_links` - Generate shopping links

### **Weight Tracking** (6 functions)

- `log_weight` - Log daily weight
- `weekly_trend` - Calculate EWMA trend
- `evaluate_plan_outcome` - Compare plan vs. result
- `push_plan_feedback` - Apply recommendation
- `get_weight_prefs` - Get user preferences
- `update_weight_prefs` - Update preferences

### **Delivery Affiliates** (1 function)

- `get_delivery_recommendations` - Get delivery options by location

### **MealMe Integration** (7 functions)

- `mealme_search` - Search local stores
- `mealme_create_cart` - Build cart from ingredients
- `mealme_get_quotes` - Get delivery quotes
- `mealme_checkout_url` - Generate checkout URL
- `mealme_webhook` - Handle order updates
- `mealme_order_plan` - Main orchestrator
- `normalize_ingredients` - Normalize ingredient names

### **Geolocation** (4 functions)

- `get_user_location` - Get user's confirmed location
- `update_user_location` - Update location
- `get_affiliate_by_country` - Get affiliates for country
- `change_location` - Change location (travelers)

---

## 🗄️ Database Schema

### **Core Tables**

- `user_profiles` - User data with Supabase Auth
- `meal_plans` - Meal plan metadata
- `meal_plan_items` - Individual meals
- `recipes` - Recipe cache
- `weight_logs` - Daily weight entries
- `plan_outcomes` - Plan evaluation results
- `weight_prefs` - User preferences
- `orders` - MealMe orders
- `order_items` - Order line items
- `delivery_quotes` - Delivery options
- `affiliate_links` - Cached affiliate URLs
- `affiliate_partner_map` - Country-to-affiliate mapping
- `delivery_partners` - Delivery partner catalog
- `feature_flags` - Feature toggles
- `events` - Analytics events

### **Security**

All tables have **Row Level Security (RLS)** enabled:
- Users can only access their own data
- Public read for recipes, affiliates, partners
- Service role for analytics

---

## 🌍 Multilingual Support

All responses are formatted in the user's native language using GPT-4.1-mini:

```typescript
// Automatic language detection
const language = detectLanguage(userInput);

// Format response in user's language
const formattedResponse = await formatMealPlan(data, language);
```

**Supported:** 100+ languages (English, Spanish, Chinese, French, German, Japanese, etc.)

---

## 📍 Geolocation & Affiliates

Smart location detection ensures correct affiliate routing:

```typescript
// Get user's location (stored or geo hint)
const location = await getUserLocation(userId);

// Get affiliates for user's country
const affiliates = await getAffiliatesByCountry(location.country);
```

**Supported:** 25 countries with 50+ affiliate mappings

---

## 🍔 MealMe Integration

1-click ordering from 1M+ restaurants:

```typescript
// Search local stores
const stores = await mealmeSearch(location, cuisine);

// Create cart from meal plan
const cart = await mealmeCreateCart(planId, storeId);

// Get delivery quotes
const quotes = await mealmeGetQuotes(cartId);

// Generate checkout URL
const checkoutUrl = await mealmeCheckoutUrl(cartId, quoteId);
```

**Revenue:** 5-15% commission per order

---

## ⚖️ WeightTracker Feedback Loop

Automatic plan adaptation based on results:

```typescript
// Log weight daily
await logWeight(userId, weightKg, date);

// Calculate weekly trend (EWMA smoothing)
const trend = await weeklyTrend(userId, days=7);

// Evaluate plan outcome
const outcome = await evaluatePlanOutcome(userId, planId);
// Returns: { actual_delta_kg, recommended_adjustment_kcal }

// Apply recommendation to next plan
await pushPlanFeedback(userId, outcomeId);
```

**Plan → Eat → Track → Result → Adapt** 🔄

---

## 🧪 Testing

### **Manual Testing**

```bash
# Test meal planning
curl -X POST https://your-project.supabase.co/functions/v1/generate_week_plan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"goal": "weight_loss", "days": 7}'

# Test weight logging
curl -X POST https://your-project.supabase.co/functions/v1/log_weight \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"weight_kg": 75.5, "date": "2025-11-01"}'
```

### **Automated Testing**

```bash
./scripts/test-functions.sh
```

---

## 📊 Analytics

### **Order Analytics**

```sql
SELECT * FROM order_analytics
WHERE date >= NOW() - INTERVAL '30 days';
```

### **Delivery Analytics**

```sql
SELECT * FROM delivery_analytics
WHERE country = 'US'
ORDER BY total_recommendations DESC;
```

---

## 🚢 Deployment

### **Production Deployment**

```bash
# Deploy all functions
./scripts/deploy-all.sh

# Set environment variables in Supabase Dashboard
# Settings → Edge Functions → Environment Variables
```

### **Environment Variables**

Set these in Supabase Dashboard:

```
OPENAI_API_KEY=sk-...
MEALME_API_KEY=your-key
MEALME_PARTNER_ID=your-id
AMAZON_AFFILIATE_ID=theloopgpt-20
INSTACART_AFFILIATE_ID=your-id
LEFTOVER_GPT_API_URL=https://leftovergpt.railway.app
KCAL_GPT_API_URL=https://kcalgpt.onrender.com
NUTRITION_GPT_API_URL=https://nutritiongpt.railway.app
```

---

## 📈 Revenue Model

### **Affiliate Commissions**

- **Grocery (Amazon, Instacart):** 1-4% commission
- **Delivery (Uber Eats, DoorDash):** 5-15% commission
- **MealMe Orders:** 5-15% commission

### **Projected Revenue**

- **Month 1:** $5-10k
- **Month 3:** $20-40k
- **Month 6:** $80-150k
- **Month 12:** $250k+

---

## 🔒 Security

### **Row Level Security (RLS)**

All tables have RLS policies:
- Users can only access their own data
- Service role for admin operations
- Public read for non-sensitive data

### **Authentication**

- Supabase Auth with JWT tokens
- Automatic user profile creation
- Secure session management

### **API Keys**

- Never expose API keys in client code
- Use Supabase Edge Functions as proxy
- Store secrets in Supabase Dashboard

---

## 🐛 Troubleshooting

### **Function not deploying?**

```bash
# Check Supabase CLI version
supabase --version

# Update to latest
npm install -g supabase@latest

# Check logs
supabase functions logs <function-name>
```

### **Database migration failed?**

```bash
# Reset local database
supabase db reset

# Re-run migrations
supabase db push
```

### **RLS policy blocking access?**

```sql
-- Check if user is authenticated
SELECT auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [MealMe API Docs](https://docs.mealme.ai)

---

## 🤝 Contributing

This is a private repository for TheLoopGPT.ai. For questions or issues, contact the team.

---

## 📄 License

UNLICENSED - Proprietary software for TheLoopGPT.ai

---

## 🎉 What's Next?

### **Phase 2 (Month 2):** Migrate K-Cal GPT
- Move from Render to Supabase
- Share user data with MealPlanner
- Unified calorie tracking

### **Phase 3 (Month 3):** Migrate LeftoverGPT
- Move from Railway to Supabase
- Direct recipe generation (no HTTP calls)
- Faster meal planning

### **Phase 4 (Month 4):** Migrate NutritionGPT
- Move from Railway to Supabase
- Complete ecosystem on single platform
- **$25/month total cost** (vs $100/month separate)

---

**Built with ❤️ by TheLoopGPT.ai Team**

**Plan → Eat → Track → Result → Adapt** 🔄

