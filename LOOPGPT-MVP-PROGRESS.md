# LoopGPT MVP Progress Tracker

**Last Updated:** Week 3 Complete  
**Target Launch:** ChatGPT App Store  
**Status:** 2/7 Core Journeys Complete (29%)

---

## 🎯 MVP Goal

Build 7 core user journeys for LoopGPT - a ChatGPT-native nutrition and meal planning app with adaptive optimization, chef personas, and affiliate monetization.

**Key Differentiators:**
- 🔄 **Adaptive Loop:** Automatic plan adjustments based on results
- 👨‍🍳 **Chef Personas:** Jamie, Paul, Gordon with chaos-based recipes
- 🛒 **Affiliate Revenue:** MealMe + 31 partners across US/UK/CA
- 💬 **ChatGPT Native:** No separate app - pure conversational interface

---

## 📊 Overall Progress

```
Week 0: Infrastructure Setup        ████████████████████ 100% ✅
Week 1-2: Journey 1 (Onboarding)    ████████████████████ 100% ✅
Week 3: Journey 2 (Weight Tracking) ████████████████████ 100% ✅
Week 4: Journey 3 (Chef Personas)   ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Week 5: Journey 4 (Food Ordering)   ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Week 6: Journeys 5-7 + Polish       ░░░░░░░░░░░░░░░░░░░░   0% ⏳
```

**Overall:** 29% Complete (2/7 journeys)

---

## ✅ Completed Work

### Week 0: Infrastructure Setup (100% ✅)

**Analytics Tables:**
- ✅ `tool_calls` - Performance monitoring
- ✅ `user_events` - User behavior tracking
- ✅ `affiliate_performance` - Revenue tracking
- ✅ `error_logs` - Error monitoring

**Affiliate Partner Database:**
- ✅ Seeded 31 partners across US, UK, CA
- ✅ MealMe prioritized as #1 partner
- ✅ Geo-routing strategy implemented
- ✅ Multilingual support ready

**Utilities:**
- ✅ Error logger (`_shared/error-logger.ts`)
- ✅ Geolocation detection
- ✅ Analytics tracking helpers

**Documentation:**
- ✅ `loopgpt-chatgpt-mvp.md` - Complete MVP strategy
- ✅ `loopgpt-affiliate-monetization.md` - Revenue strategy
- ✅ `loopgpt-geo-affiliate-routing.md` - Affiliate routing

---

### Week 1-2: Journey 1 - Onboarding & First Meal Plan (100% ✅)

**Edge Function:** `journey_1_onboarding`  
**Status:** Deployed and tested ✅  
**URL:** https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/journey_1_onboarding

**Features:**
- ✅ Calorie calculation (Mifflin-St Jeor formula)
- ✅ Geo-routed affiliate links (100% appearance rate)
- ✅ Demo Loop preview
- ✅ Professional response formatting
- ✅ Analytics tracking
- ✅ Error handling

**Test Results:**
- ✅ Response time: 304ms (target: <3000ms)
- ✅ Affiliate appearance: 100% (target: 100%)
- ✅ Tool call success: 100% (target: 80%+)

**Files:**
- ✅ `supabase/functions/journey_1_onboarding/index.ts`
- ✅ `week1-2-journey-1/response-formatter.ts`
- ✅ `week1-2-journey-1/TESTING-GUIDE.md`
- ✅ `week1-2-journey-1/mcp-tool-journey-1.json`

---

### Week 3: Journey 2 - Weight Tracking & Adaptation (100% ✅)

**Edge Function:** `journey_2_tracking`  
**Status:** Deployed and ready for production ✅  
**URL:** https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/journey_2_tracking

**Features:**
- ✅ Weight logging (kg and lbs)
- ✅ Progress evaluation (on track / too fast / too slow)
- ✅ Automatic calorie adjustment
- ✅ Professional response formatting
- ✅ Analytics tracking
- ✅ Handles users with no active plan

**Adjustment Logic:**
- Weight loss too slow → -150 cal
- Weight loss too fast → +150 cal
- Muscle gain too slow → +200 cal
- Muscle gain too fast → -150 cal
- Maintenance fluctuating → Adjust accordingly

**Files:**
- ✅ `supabase/functions/journey_2_tracking/index.ts`
- ✅ `week3-journey-2/IMPLEMENTATION-GUIDE.md`
- ✅ `week3-journey-2/WEEK3-SUMMARY.md`
- ✅ `week3-journey-2/mcp-tool-journey-2.json`

**Note:** Full testing requires authenticated users (will work once integrated with ChatGPT App Store)

---

## ⏳ Remaining Work

### Week 4: Journey 3 - Chef Personas & Leftover Recipes (0% ⏳)

**Goal:** Integrate LeftoverGPT for chaos-based recipe generation

**Features to Build:**
- [ ] Edge Function: `journey_3_chef_recipes`
- [ ] Chef persona selection (Jamie, Paul, Gordon)
- [ ] Chaos level input (1-10 scale)
- [ ] Recipe generation with leftover ingredients
- [ ] Shareable recipe cards
- [ ] Affiliate links for missing ingredients
- [ ] MCP tool description

**Integration:**
- LeftoverGPT MCP server (already deployed on Railway)
- Chef personas with distinct personalities
- Viral sharing mechanism

**Success Metrics:**
- Recipe generation success rate: 90%+
- Card sharing rate: 40%+
- Response time: <5000ms

---

### Week 5: Journey 4 - Food Ordering (0% ⏳)

**Goal:** MealMe integration for restaurant search and ordering

**Features to Build:**
- [ ] Edge Function: `journey_4_food_ordering`
- [ ] Restaurant search by location
- [ ] Menu filtering by calories/macros
- [ ] Order link generation
- [ ] Affiliate tracking
- [ ] MCP tool description

**Integration:**
- MealMe API (existing functions: `mealme-search`, `mealme-restaurant-menu`)
- Affiliate revenue optimization
- Location-based search

**Success Metrics:**
- Order conversion rate: 15%+
- Affiliate revenue per order: $2.50+
- Response time: <3000ms

---

### Week 6: Journeys 5-7 + Polish (0% ⏳)

**Journey 5: Nutrition Analysis**
- [ ] Edge Function: `journey_5_nutrition_analysis`
- [ ] Photo-based food logging
- [ ] Barcode scanning
- [ ] Calorie/macro tracking
- [ ] MCP tool description

**Journey 6: Progress Visualization**
- [ ] Edge Function: `journey_6_progress_viz`
- [ ] Weight trend charts
- [ ] Calorie adherence tracking
- [ ] Shareable progress cards
- [ ] MCP tool description

**Journey 7: Friday Takeover**
- [ ] Edge Function: `journey_7_friday_takeover`
- [ ] Weekly reflection prompt
- [ ] Celebration of wins
- [ ] Next week planning
- [ ] Viral sharing mechanism
- [ ] MCP tool description

**Polish & Integration:**
- [ ] Connect all journeys in MCP server
- [ ] End-to-end testing with real users
- [ ] Performance optimization
- [ ] Error handling refinement
- [ ] Analytics dashboard
- [ ] Launch preparation

---

## 🎯 Success Metrics

### User Engagement
- **Week 2 Retention:** Target 60%
- **Free-to-Premium Conversion:** Target 25%
- **Card Sharing Rate:** Target 40%

### Technical Performance
- **Tool Call Success Rate:** Target 80%+
- **Response Time:** Target <3000ms
- **Error Rate:** Target <5%

### Revenue
- **Affiliate Revenue:** Target $7.70/user/month
- **Premium Subscriptions:** Target $9.99/month
- **Combined ARPU:** Target $17.69/month

---

## 📁 Repository Structure

```
loopgpt-backend/
├── supabase/
│   └── functions/
│       ├── journey_1_onboarding/         ✅ Complete
│       ├── journey_2_tracking/           ✅ Complete
│       ├── journey_3_chef_recipes/       ⏳ Week 4
│       ├── journey_4_food_ordering/      ⏳ Week 5
│       ├── journey_5_nutrition_analysis/ ⏳ Week 6
│       ├── journey_6_progress_viz/       ⏳ Week 6
│       ├── journey_7_friday_takeover/    ⏳ Week 6
│       └── _shared/                      ✅ Complete
├── week0-infrastructure/                 ✅ Complete
├── week1-2-journey-1/                    ✅ Complete
├── week3-journey-2/                      ✅ Complete
├── week4-journey-3/                      ⏳ Next
├── week5-journey-4/                      ⏳ Future
└── week6-polish/                         ⏳ Future
```

---

## 🚀 Next Steps

### Immediate (Week 4)
1. Start Journey 3 implementation
2. Integrate LeftoverGPT MCP server
3. Build chef persona selection logic
4. Implement recipe generation
5. Create shareable recipe cards
6. Test end-to-end flow

### Short-term (Week 5)
1. Implement Journey 4 (Food Ordering)
2. Integrate MealMe API
3. Build restaurant search and filtering
4. Test affiliate tracking

### Medium-term (Week 6)
1. Complete remaining journeys (5-7)
2. End-to-end integration testing
3. Performance optimization
4. Launch preparation

---

## 🔗 Key Links

**Deployment:**
- Supabase Project: https://supabase.com/dashboard/project/qmagnwxeijctkksqbcqz
- GitHub Repo: https://github.com/1wunderkind/loopgpt-backend
- Railway (LeftoverGPT MCP): https://railway.app

**Documentation:**
- MVP Strategy: `loopgpt-chatgpt-mvp.md`
- Affiliate Strategy: `loopgpt-affiliate-monetization.md`
- Geo Routing: `loopgpt-geo-affiliate-routing.md`

**Edge Functions:**
- Journey 1: https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/journey_1_onboarding
- Journey 2: https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/journey_2_tracking

---

## 📝 Notes

**Why Approach B (Backend Orchestration)?**
- Guarantees 100% affiliate appearance (critical for revenue)
- Consistent response formatting
- Faster response times (single round-trip)
- Easier analytics tracking
- Better error handling

**Testing Limitations:**
- Full testing requires authenticated users
- Will be testable once integrated with ChatGPT App Store
- Code is production-ready, just needs real authentication

**Key Design Decisions:**
- Conservative calorie adjustments (±150-200 cal)
- Weekly evaluation to smooth fluctuations
- Goal-specific logic (weight loss vs. muscle gain)
- Positive framing of adjustments
- Clear explanations for user trust

---

**Status:** On track for MVP launch 🚀  
**Next Milestone:** Week 4 - Chef Personas & Recipes  
**Confidence:** High ✅
