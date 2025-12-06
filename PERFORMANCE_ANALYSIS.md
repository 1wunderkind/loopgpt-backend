# LoopKitchen Performance Analysis

**Date**: December 6, 2025  
**Environment**: Dev/Staging  
**Goal**: Reduce response times by 50%

---

## 📊 Current Performance

| Operation | Current Time | Target | Gap |
|-----------|-------------|--------|-----|
| Recipe generation (3 recipes) | 9.6s | <5s | -4.6s (48%) |
| Nutrition analysis | 6.4s | <3s | -3.4s (53%) |
| Meal plan (2-day) | 9.3s | <5s | -4.3s (46%) |
| Meal plan (7-day) | 19.9s | <10s | -9.9s (50%) |

---

## 🔍 Bottleneck Analysis

### 1. OpenAI API Calls (Primary Bottleneck)

**Recipe Generation**:
- Model: `gpt-4o-mini`
- Temperature: 0.7
- Max tokens: 2000
- Estimated time: **7-8s** (83% of total)

**Nutrition Analysis**:
- Model: `gpt-4o-mini`
- Temperature: 0.3
- Max tokens: 1500
- Estimated time: **5-6s** (94% of total)

**Meal Planning**:
- Model: `gpt-4o-mini`
- Temperature: 0.7
- Max tokens: 3000
- Estimated time: **16-18s** (90% of total)

**Root Causes**:
- Prompts are verbose (system prompts 500-800 tokens)
- User prompts include full ingredient lists
- Response schemas are complex
- No caching of common queries

### 2. Cold Starts (Secondary Bottleneck)

**Impact**: 1-2s per request in dev environment
- First request after idle: ~2s overhead
- Subsequent requests: ~0.5s overhead

**Root Causes**:
- Deno runtime initialization
- Module imports
- OpenAI client initialization

### 3. No Caching (Missed Opportunity)

**Common queries that could be cached**:
- Recipe generation for popular ingredients (chicken, rice, pasta)
- Nutrition analysis for common foods (chicken breast, eggs, milk)
- Meal plans for standard calorie targets (1500, 2000, 2500)

**Potential savings**: 50-80% for cache hits

### 4. Sequential Processing (Inefficiency)

**Meal planning workflow**:
1. Generate meal plan (16-18s)
2. Generate grocery list (2-3s)
3. Get commerce quotes (1-2s)

**Total**: 19-23s (sequential)

**Potential**: 16-18s if parallelized

---

## 🎯 Optimization Opportunities

### High Impact (50-70% reduction)

1. **Prompt Optimization** (30-40% reduction)
   - Reduce system prompt verbosity
   - Use more concise schemas
   - Remove redundant instructions
   - Use fewer examples

2. **Response Caching** (50-80% for cache hits)
   - Cache common ingredient combinations
   - Cache nutrition data for standard foods
   - Cache meal plans for popular preferences
   - TTL: 1 hour for recipes, 24 hours for nutrition

3. **Model Selection** (20-30% reduction)
   - Consider `gpt-4o-mini` vs `gpt-3.5-turbo`
   - Use lower temperature for deterministic tasks
   - Reduce max_tokens where possible

### Medium Impact (20-30% reduction)

4. **Parallel Processing** (15-20% reduction)
   - Parallelize meal plan + grocery list generation
   - Batch nutrition analysis for multiple recipes

5. **Streaming Responses** (perceived performance)
   - Stream recipe cards as they're generated
   - Progressive meal plan rendering
   - Doesn't reduce total time, but improves UX

### Low Impact (5-10% reduction)

6. **Code Optimization** (5-10% reduction)
   - Optimize JSON parsing
   - Reduce logging overhead
   - Minimize data transformations

---

## 📋 Implementation Plan

### Phase 1: Prompt Optimization (Target: 30-40% reduction)

**Recipe Generation**:
- Reduce system prompt from 800 to 400 tokens
- Simplify output schema
- Remove verbose examples
- **Expected**: 9.6s → 6.0s

**Nutrition Analysis**:
- Reduce system prompt from 500 to 250 tokens
- Simplify schema (remove optional fields)
- **Expected**: 6.4s → 4.0s

**Meal Planning**:
- Reduce system prompt from 700 to 350 tokens
- Simplify weekly summary
- **Expected**: 19.9s → 12.0s

### Phase 2: Response Caching (Target: 50-80% for cache hits)

**Implementation**:
- Use in-memory cache (Map) for dev
- Redis for production
- Cache keys: hash of (tool_name + params)
- TTL: 1 hour for recipes, 24 hours for nutrition

**Expected cache hit rates**:
- Recipe generation: 20-30% (popular ingredients)
- Nutrition analysis: 40-50% (common foods)
- Meal planning: 10-15% (standard targets)

**Expected improvements**:
- Recipe generation: 6.0s → 1.5s (cache hit)
- Nutrition analysis: 4.0s → 1.0s (cache hit)
- Meal planning: 12.0s → 3.0s (cache hit)

### Phase 3: Streaming Support (Target: Perceived performance)

**Implementation**:
- Add SSE (Server-Sent Events) support
- Stream recipe cards as generated
- Progressive meal plan rendering

**Expected UX improvement**:
- Users see first result in 2-3s
- Perceived wait time: 50% reduction

### Phase 4: Parallel Processing (Target: 15-20% reduction)

**Meal planning workflow**:
- Generate meal plan (16s)
- Parallel: Grocery list + Commerce quotes (3s)
- **Total**: 16s instead of 19s

---

## 🎯 Expected Final Performance

| Operation | Current | After Optimization | Cache Hit | Target | Status |
|-----------|---------|-------------------|-----------|--------|--------|
| Recipe generation | 9.6s | 6.0s | 1.5s | <5s | ⚠️ Close |
| Nutrition analysis | 6.4s | 4.0s | 1.0s | <3s | ⚠️ Close |
| Meal plan (2-day) | 9.3s | 6.0s | 2.0s | <5s | ⚠️ Close |
| Meal plan (7-day) | 19.9s | 12.0s | 3.0s | <10s | ⚠️ Close |

**Note**: Without caching, we'll be close to targets. With caching, we'll exceed targets.

---

## 🚀 Quick Wins (Implement First)

1. **Reduce max_tokens** (5 minutes)
   - Recipe generation: 2000 → 1500
   - Nutrition analysis: 1500 → 1000
   - Meal planning: 3000 → 2500

2. **Simplify prompts** (30 minutes)
   - Remove verbose instructions
   - Use more concise schemas
   - Remove redundant examples

3. **Add basic caching** (45 minutes)
   - In-memory Map cache
   - Simple hash-based keys
   - 1-hour TTL

**Total time**: ~1.5 hours  
**Expected improvement**: 30-40% reduction

---

## 📊 Success Metrics

**Primary**:
- Recipe generation: <6s (without cache), <2s (with cache)
- Nutrition analysis: <4s (without cache), <1.5s (with cache)
- Meal planning: <12s (without cache), <4s (with cache)

**Secondary**:
- Cache hit rate: >20% overall
- P95 latency: <15s for all operations
- Error rate: <1%

---

## 🔄 Monitoring Plan

**Metrics to track**:
- Response time per tool (p50, p95, p99)
- Cache hit/miss rates
- OpenAI token usage
- Error rates

**Tools**:
- Console logging (dev)
- Supabase metrics (production)
- Custom performance tracking

---

**Next Steps**: Implement Phase 1 (Prompt Optimization)
