# TheLoopGPT MCP Tools

Ultra-reliable food and meal planning tools powered by OpenAI Structured Outputs.

## 🚀 Live Deployment

**Base URL**: `https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools`

## 📋 Available Tools

### Core Tools (4)

1. **recipes.generate** - Generate creative recipes from ingredients
2. **nutrition.analyze** - Analyze nutritional content of recipes
3. **mealplan.generate** - Generate structured meal plans based on goals
4. **grocery.list** - Generate organized shopping lists from recipes/meal plans

### Composite Tools (2)

5. **recipes.generateWithNutrition** - Generate recipes + nutrition in one call
6. **mealplan.generateWithGroceryList** - Generate meal plan + grocery list in one call

## 🎯 Quick Start

### 1. Health Check

```bash
curl https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/health
```

### 2. Generate Recipes

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "chicken breast"},
      {"name": "rice"},
      {"name": "broccoli"}
    ],
    "maxRecipes": 2
  }'
```

**Response:**
```json
[
  {
    "id": "recipe_1",
    "name": "Chicken Broccoli Rice Bowl",
    "ingredients": [...],
    "instructions": [...],
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 25,
    "servings": 4,
    "difficulty": "easy",
    "tags": ["healthy", "quick"]
  }
]
```

### 3. Analyze Nutrition

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{
    "recipes": [
      {
        "id": "recipe_1",
        "name": "Grilled Chicken Salad",
        "servings": 2,
        "ingredients": [
          {"name": "chicken breast", "quantity": "200g"},
          {"name": "mixed greens", "quantity": "2 cups"}
        ]
      }
    ]
  }'
```

**Response:**
```json
[
  {
    "recipeId": "recipe_1",
    "recipeName": "Grilled Chicken Salad",
    "perServing": {
      "calories": 310,
      "protein": 25,
      "carbs": 12,
      "fat": 18,
      "fiber": 4,
      "sugar": 3,
      "sodium": 450
    },
    "total": {...},
    "servings": 2,
    "healthScore": 85,
    "tags": ["high-protein", "low-carb"],
    "warnings": []
  }
]
```

### 4. Generate Meal Plan

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{
    "goals": {
      "calories": 2000,
      "protein": "high",
      "goal": "muscle building"
    },
    "days": 7,
    "mealsPerDay": 3,
    "dietaryTags": ["high-protein"]
  }'
```

**Response:**
```json
{
  "id": "plan_1",
  "name": "High-Protein Muscle Building Meal Plan",
  "description": "7-day meal plan optimized for muscle building",
  "days": [
    {
      "dayNumber": 1,
      "date": "2025-12-04",
      "meals": [...],
      "totalCalories": 1950,
      "totalProtein": 140,
      "totalCarbs": 180,
      "totalFat": 65
    }
  ],
  "summary": {
    "totalDays": 7,
    "avgCaloriesPerDay": 1985,
    "avgProteinPerDay": 138,
    "avgCarbsPerDay": 175,
    "avgFatPerDay": 68
  }
}
```

### 5. Generate Grocery List

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/grocery.list \
  -H "Content-Type: application/json" \
  -d '{
    "recipes": [
      {
        "name": "Spaghetti Carbonara",
        "ingredients": [
          {"name": "spaghetti", "quantity": "1 lb"},
          {"name": "eggs", "quantity": "4"},
          {"name": "parmesan cheese", "quantity": "1 cup"}
        ]
      }
    ],
    "groupBy": "category"
  }'
```

**Response:**
```json
{
  "id": "list_1",
  "name": "Spaghetti Carbonara Shopping List",
  "totalItems": 7,
  "categories": [
    {
      "name": "Dairy",
      "items": [
        {
          "name": "parmesan cheese",
          "quantity": "1",
          "unit": "cup",
          "notes": "freshly grated",
          "usedIn": ["Spaghetti Carbonara"]
        }
      ]
    }
  ],
  "estimatedCost": 25,
  "tips": ["Buy in bulk for savings"]
}
```

### 6. Composite Tool: Recipes with Nutrition

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/recipes.generateWithNutrition \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "salmon"},
      {"name": "asparagus"}
    ],
    "maxRecipes": 1
  }'
```

**Response:** Recipes with embedded nutrition data

### 7. Composite Tool: Meal Plan with Grocery List

```bash
curl -X POST https://qmagnwxeijctkksqbcqz.supabase.co/functions/v1/mcp-tools/tools/mealplan.generateWithGroceryList \
  -H "Content-Type: application/json" \
  -d '{
    "goals": {"calories": 1800},
    "days": 3,
    "mealsPerDay": 3
  }'
```

**Response:** Both meal plan AND grocery list in one response

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Deno on Supabase Edge Functions
- **AI**: OpenAI GPT-4o with Structured Outputs
- **Validation**: Zod schemas
- **Caching**: In-memory (MVP) - upgrade to Postgres for production
- **Rate Limiting**: In-memory (MVP) - upgrade to Postgres for production

### Key Features

✅ **OpenAI Structured Outputs** - Guaranteed schema compliance  
✅ **Strong typing** - Runtime validation with Zod  
✅ **Error handling** - Graceful degradation  
✅ **Composite tools** - Multi-step workflows in one call  
✅ **CORS enabled** - Ready for web apps  
✅ **Health monitoring** - `/health` endpoint  

### File Structure

```
mcp-tools/
├── index.ts              # Main server entry point
├── recipes.ts            # Recipe generation + composite
├── nutrition.ts          # Nutrition analysis
├── mealplan.ts           # Meal planning + composite
├── grocery.ts            # Grocery list generation
├── cache.ts              # Caching layer (in-memory MVP)
├── rateLimit.ts          # Rate limiting (in-memory MVP)
├── errors.ts             # Error classes
└── README.md             # This file
```

## 🔧 Configuration

### Required Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for GPT-4o
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Optional Headers

- `x-user-id` - User identifier for rate limiting (defaults to "anonymous")

## 📊 Rate Limiting

**Current**: 100 requests per hour per user (in-memory, resets on function restart)

**Production**: Requires Supabase Postgres table for persistent rate limiting

## 💾 Caching

**Current**: In-memory cache (1 hour TTL, not persistent across requests)

**Production**: Requires Supabase Postgres table for persistent caching

### To Enable Production Caching/Rate Limiting

Create these tables in Supabase:

```sql
-- Cache table
CREATE TABLE IF NOT EXISTS mcp_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_cache_expires ON mcp_cache(expires_at);

-- Rate limit table
CREATE TABLE IF NOT EXISTS mcp_rate_limits (
  user_id TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_rate_limits_window ON mcp_rate_limits(window_start);
```

Then update `cache.ts` and `rateLimit.ts` to use Supabase instead of in-memory Map.

## 🧪 Testing

Run the comprehensive test suite:

```bash
./test-all-tools.sh
```

Or test individual tools with curl (see examples above).

## 📈 Performance

- **recipes.generate**: ~5s (OpenAI call)
- **nutrition.analyze**: ~4s (OpenAI call)
- **mealplan.generate**: ~8s (longer response)
- **grocery.list**: ~4s (OpenAI call)
- **Composite tools**: Sum of individual tools

**With caching**: <100ms for cache hits (requires Postgres setup)

## 🚨 Error Handling

All tools return structured errors:

```json
{
  "error": "Validation failed",
  "message": "ingredients array is required and must not be empty"
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad request (validation error)
- `429` - Rate limit exceeded
- `500` - Internal server error
- `501` - Tool not implemented

## 🔐 Security

- CORS enabled for all origins (`*`)
- No authentication required (add OAuth for production)
- Rate limiting per user ID
- Input validation with Zod
- Service role key protected via environment variables

## 📝 Version History

- **v1.0.0-step6** - All 6 tools + caching + rate limiting (current)
- **v1.0.0-step5** - Added composite tools
- **v1.0.0-step4** - All 4 core tools
- **v1.0.0-step3** - Added mealplan.generate
- **v1.0.0-step2** - Added nutrition.analyze
- **v1.0.0-step1** - Initial release with recipes.generate

## 🤝 Contributing

This is a production deployment for TheLoopGPT. For issues or feature requests, contact the development team.

## 📄 License

Proprietary - TheLoopGPT © 2025
