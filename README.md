# LooptOS — the Agentic Commerce intelligence layer

**Unified Supabase backend for the entire LooptOS ecosystem**

LooptOS is the Agentic Commerce intelligence layer.

It sits between user intent and execution, orchestrating autonomous agents, decision logic, and external commerce systems.

LooptOS interprets intent, evaluates context, coordinates specialized agents, and routes actions across providers, APIs, and platforms — continuously learning from outcomes to improve future decisions.

Applications and GPTs built on LooptOS do not implement commerce logic themselves; they rely on LooptOS as the underlying operating layer for reasoning, routing, optimization, and execution.

This repository contains all Edge Functions, database migrations, and shared utilities for the functional apps built on LooptOS:

- **MealPlannerGPT** - AI-powered meal planning with 1-click ordering
- **WeightTrackerGPT** - Weight tracking and automatic plan adaptation
- **Delivery Affiliates** - Location-aware delivery recommendations
- **MealMe Integration** - 1-click food ordering from 1M+ restaurants
- **Geolocation** - Multi-country support with smart affiliate routing

---

## 📖 What is LooptOS?

**LooptOS — the Agentic Commerce intelligence layer**

LooptOS was created to solve a fundamental problem in AI-driven commerce: models can understand intent, but they struggle to reliably act across real-world systems.

Modern commerce requires more than recommendations. It requires coordination — across data, agents, providers, constraints, and outcomes.

LooptOS was designed as an operating layer that closes this gap.

Instead of embedding business logic inside every application, LooptOS centralizes reasoning, routing, and execution into a shared intelligence layer. Applications built on LooptOS focus on user experience and intent, while LooptOS handles orchestration, optimization, and learning.

As new agents, providers, and verticals are added, LooptOS adapts — continuously improving decisions through feedback loops and real-world results.

LooptOS is not an app. It is the intelligence layer that enables agentic commerce at scale.

---

## 🛡️ Brand Guardrails

1.  **Platform Layer:** LooptOS is the PLATFORM LAYER (not a user-facing app). Users should NOT "chat with LooptOS" or select it as an app/tool.
2.  **Functional Naming:** GPT/apps must NOT include "Loop" or "Loopt" in their visible names. They are function-first: LeftoverGPT, NutritionGPT, MealPlannerGPT, GroceryGPT, etc.
3.  **Attribution:** In UI/app surfaces, show attribution as: "Powered by LooptOS" OR "Built on LooptOS". Never "Use LooptOS", never "LooptOS app".

---

## 🏗️ Architecture

### **Monorepo Structure**

```
loopgpt-backend/
├── supabase/
│   ├── migrations/          # Database schema migrations
│   ├── seed/                # Seed data
│   └── functions/
│       ├── mcp-server/      # MCP Server implementation
│       ├── mcp-tools/       # MCP Tools (Commerce, Grocery, MealPlan, Nutrition, Recipes)
│       ├── _shared/         # Shared utilities and types
│       ├── loopgpt_route_order/ # Commerce Router (Legacy Name)
│       ├── loopgpt_confirm_order/ # Order Confirmation (Legacy Name)
│       ├── loopgpt_cancel_order/ # Order Cancellation (Legacy Name)
│       └── loopgpt_record_outcome/ # Outcome Recording (Legacy Name)
└── scripts/                 # Deployment and testing scripts
```

### **Key Features**

- ✅ **Supabase Auth** - Built-in authentication with RLS policies
- ✅ **100+ Languages** - Multilingual support via GPT-4.1-mini
- ✅ **25 Countries** - Geolocation and affiliate routing
- ✅ **MealMe Integration** - 1-click ordering from 1M+ restaurants
- ✅ **WeightTracker** - Complete feedback loop (Plan → Track → Adapt)

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

Required environment variables (Note: `LOOPGPT_*` vars are supported for backward compatibility, but `LOOPTOS_*` is preferred):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key for multilingual formatting
- `MEALME_API_KEY` - MealMe API key for 1-click ordering

### **3. Run Migrations**

```bash
supabase db push
```

### **4. Deploy Edge Functions**

```bash
supabase functions deploy
```

---

## 📦 Edge Functions

### **MCP Server**

- `mcp-server` - Main MCP server entry point

### **MCP Tools**

- `commerce` - Commerce integration (Cart, Order Routing)
- `grocery` - Grocery list generation
- `mealplan` - Meal planning
- `nutrition` - Nutrition analysis
- `recipes` - Recipe management

### **Commerce Router**

- `loopgpt_route_order` - Route orders to best provider
- `loopgpt_confirm_order` - Confirm orders
- `loopgpt_cancel_order` - Cancel orders
- `loopgpt_record_outcome` - Record order outcomes

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
AMAZON_AFFILIATE_ID=looptos-20
INSTACART_AFFILIATE_ID=your-id
LEFTOVER_GPT_API_URL=https://leftovergpt.railway.app
KCAL_GPT_API_URL=https://kcalgpt.onrender.com
NUTRITION_GPT_API_URL=https://nutritiongpt.railway.app
```

---

## 🤝 Contributing

This is a private repository for LooptOS. For questions or issues, contact the team.

---

## 📄 License

UNLICENSED - Proprietary software for LooptOS

---

**Built on LooptOS**

**Plan → Eat → Track → Result → Adapt** 🔄
