# Food Database Deployment Guide

## Overview

This guide explains how to deploy and use the expanded 1,000-food database system in TheLoopGPT.ai.

---

## What Was Built

### 1. **Food Database (1,000 foods)**
- **File:** `foods@v1.json` (243 KB)
- **Content:** 1,000 foods with complete nutrition data
- **Source:** 107 existing + 893 new from USDA FoodData Central
- **Format:** JSON array of food objects

### 2. **N-gram Fuzzy Search Index**
- **File:** `index.ngram@v1.json` (173 KB)
- **Content:** 3,659 unique tokens for fuzzy matching
- **Performance:** < 1ms average search time

### 3. **Manifest**
- **File:** `manifest@v1.json` (< 1 KB)
- **Content:** Version metadata and statistics

### 4. **Runtime Resolver**
- **File:** `supabase/lib/food_resolver.ts`
- **Features:**
  - CDN loading from Supabase Storage
  - In-memory caching (singleton pattern)
  - Three lookup methods: `getById()`, `findExact()`, `findFuzzy()`
  - < 60ms cold load, < 1ms warm lookup

---

## CDN URLs

All files are hosted on Supabase Storage with immutable caching:

```
https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database/foods@v1.json
https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database/index.ngram@v1.json
https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database/manifest@v1.json
```

**Cache-Control:** `public, max-age=31536000, immutable` (1 year)

---

## Integration Steps

### Step 1: Initialize in Your Edge Function

```typescript
import { initFoodResolver } from "../lib/food_resolver.ts";

const CDN_BASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database";

// Call once at the top of your handler
const resolver = initFoodResolver(CDN_BASE_URL, "v1");
```

### Step 2: Use in Your Tools

```typescript
import { getFoodResolver } from "../lib/food_resolver.ts";

// Exact match
const food = await getFoodResolver().findExact("chicken breast");

// Fuzzy search
const results = await getFoodResolver().findFuzzy("chiken", 10);

// By ID
const food = await getFoodResolver().getById(42);
```

### Step 3: Update Existing Tools

**Example: `analyze_nutrition` tool**

```typescript
// Before (using tracker_foods table)
const food = await supabase
  .from("tracker_foods")
  .select("*")
  .eq("name", ingredientName)
  .single();

// After (using food resolver)
const food = await getFoodResolver().findExact(ingredientName);
```

---

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Cold Load | < 60ms | 24ms | ✅ 2.5x faster |
| Exact Match | < 1ms | 0.02ms | ✅ 50x faster |
| Fuzzy Search | < 5ms | 0.36ms | ✅ 14x faster |
| Memory Usage | < 50 MB | 8.65 MB | ✅ Very efficient |

---

## Food Groups Distribution

| Group | Count | Examples |
|-------|-------|----------|
| **Meat** | 329 | Chicken, beef, pork, fish |
| **Dairy** | 294 | Milk, cheese, yogurt, eggs |
| **Fat** | 228 | Oils, butter, margarine |
| **Misc** | 68 | Beverages, sweets |
| **Condiment** | 60 | Sauces, seasonings |
| **Veg** | 11 | Vegetables |
| **Fruit** | 10 | Fruits |

---

## Updating the Database

### Rebuild with New Foods

```bash
cd /home/ubuntu/loopgpt-backend

# Run the builder script
~/.deno/bin/deno run --allow-read --allow-write scripts/build_food_database.ts \
  --input=data \
  --existing=data/existing_107_foods.json \
  --limit=1500 \
  --version=v2
```

### Upload to Supabase Storage

```bash
cd /home/ubuntu/loopgpt-backend
source .env

for file in foods@v2.json index.ngram@v2.json manifest@v2.json; do
  curl -X POST "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/food-database/$file" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Cache-Control: public, max-age=31536000, immutable" \
    --data-binary "@data/$file"
done
```

### Update Version in Code

```typescript
// Change version from v1 to v2
const resolver = initFoodResolver(CDN_BASE_URL, "v2");
```

---

## Testing

### Run Performance Benchmarks

```bash
cd /home/ubuntu/loopgpt-backend
~/.deno/bin/deno run --allow-read --allow-net scripts/test_food_resolver.ts
```

### Test Fuzzy Search

```bash
# In Deno REPL
import { initFoodResolver } from "./supabase/lib/food_resolver.ts";
const resolver = initFoodResolver("https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/object/public/food-database", "v1");
const results = await resolver.findFuzzy("chiken breast", 5);
console.log(results);
```

---

## Migration from tracker_foods Table

### Option 1: Keep Both (Recommended)

- Keep `tracker_foods` table for backward compatibility
- Use food resolver for new features
- Gradually migrate tools one by one

### Option 2: Full Migration

1. Export existing data from `tracker_foods`
2. Merge with USDA data
3. Rebuild database with `--existing` flag
4. Update all tools to use food resolver
5. Deprecate `tracker_foods` table

---

## Troubleshooting

### Issue: "Bucket not found"

**Solution:** Create the storage bucket first:

```bash
curl -X POST "https://qmagnwxeijctkksqbcqz.supabase.co/storage/v1/bucket" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"food-database","name":"food-database","public":true}'
```

### Issue: Slow cold load

**Check:**
- CDN URLs are correct
- Files are publicly accessible
- Cache headers are set correctly

### Issue: Food not found

**Solution:** Use fuzzy search instead of exact match:

```typescript
// Instead of:
const food = await resolver.findExact("chicken");

// Use:
const results = await resolver.findFuzzy("chicken", 1);
const food = results[0]?.food;
```

---

## Next Steps

1. ✅ Deploy food database to CDN
2. ✅ Test performance benchmarks
3. ⏳ Update `analyze_nutrition` tool
4. ⏳ Update `log_meal` tool
5. ⏳ Update `track_food` tool
6. ⏳ Add autocomplete to frontend
7. ⏳ Monitor performance in production

---

## Support

For questions or issues, contact the development team or refer to:
- Integration examples: `supabase/lib/food_resolver_integration_example.ts`
- Performance tests: `scripts/test_food_resolver.ts`
- Build script: `scripts/build_food_database.ts`

