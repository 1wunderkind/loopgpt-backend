# LoopKitchen API Documentation

**Version**: 1.8.0  
**Last Updated**: December 6, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Widget System](#widget-system)
5. [Recipe Tools](#recipe-tools)
6. [Nutrition Tools](#nutrition-tools)
7. [Meal Planning Tools](#meal-planning-tools)
8. [Error Handling](#error-handling)
9. [Rate Limits](#rate-limits)
10. [Examples](#examples)

---

## Overview

LoopKitchen provides AI-powered recipe generation, nutrition analysis, and meal planning through a set of MCP (Model Context Protocol) tools. All responses use a widget-based architecture for easy UI rendering.

**Key Features**:
- 🍳 Recipe generation with chaos mode
- 📊 Nutrition analysis with health scoring
- 🗓️ Weekly meal planning
- 🛒 Grocery list generation
- 💰 Commerce integration for ordering

---

## Authentication

**Method**: Bearer token (Supabase Service Role Key)

```bash
curl -X POST <base_url>/tools/<tool_name> \
  -H "Authorization: Bearer <your-service-role-key>" \
  -H "Content-Type: application/json" \
  -d '<request-body>'
```

**Note**: For public MCP servers, authentication may be handled at the server level.

---

## Base URL

```
https://your-project.supabase.co/functions/v1/mcp-tools
```

**Endpoints**:
- `GET /` - Get manifest (list all tools)
- `GET /health` - Health check
- `POST /tools/<tool_name>` - Execute tool

---

## Widget System

All LoopKitchen tools return structured widgets for easy UI rendering.

### Widget Types

| Widget Type | Description | Used By |
|------------|-------------|---------|
| `RecipeCardCompact` | Compact recipe card | Recipe generation |
| `RecipeCardDetailed` | Detailed recipe with nutrition | Recipe details |
| `NutritionSummary` | Nutrition information | Nutrition analysis |
| `WeekPlanner` | Weekly meal plan | Meal planning |
| `GroceryList` | Categorized shopping list | Grocery generation |
| `InfoMessage` | System messages/errors | All tools (errors) |

### Base Widget Structure

```typescript
{
  type: string;           // Widget type
  data: object;           // Widget-specific data
  meta: {
    generatedAt: string;  // ISO timestamp
    durationMs: number;   // Generation time (ms)
    model?: string;       // AI model used
  }
}
```

---

## Recipe Tools

### 1. Generate Recipes

**Tool**: `loopkitchen.recipes.generate`

Generate multiple recipe variations with chaos mode for creativity.

**Request**:
```json
{
  "ingredients": ["chicken", "rice", "soy sauce", "ginger"],
  "vibes": ["Quick", "Asian-inspired"],
  "timeLimit": 30,
  "chaosTarget": 5,
  "count": 3,
  "dietConstraints": ["gluten-free"]
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ingredients` | `string[]` | ✅ | List of available ingredients |
| `vibes` | `string[]` | ❌ | Cooking style/mood (e.g., "Quick", "Comfort food") |
| `timeLimit` | `number` | ❌ | Max prep+cook time (minutes) |
| `chaosTarget` | `number` | ❌ | Creativity level (0-10, default: 5) |
| `count` | `number` | ❌ | Number of recipes (1-10, default: 3) |
| `dietConstraints` | `string[]` | ❌ | Diet restrictions (soft constraints) |

**Response**:
```json
[
  {
    "type": "RecipeCardCompact",
    "data": {
      "recipeId": "quick-chicken-rice-bowl-0",
      "title": "Quick Chicken Rice Bowl",
      "prepTime": 10,
      "cookTime": 15,
      "servings": 2,
      "ingredients": [
        { "name": "chicken breast", "quantity": "2", "unit": "pieces" },
        { "name": "rice", "quantity": "1", "unit": "cup" }
      ],
      "tags": ["quick", "asian", "high-protein"],
      "chaosScore": 5
    },
    "meta": {
      "generatedAt": "2025-12-06T23:00:00Z",
      "durationMs": 3200,
      "model": "gpt-4o-mini"
    }
  }
]
```

**cURL Example**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "soy sauce"],
    "vibes": ["Quick", "Asian"],
    "chaosTarget": 5,
    "count": 3
  }'
```

---

### 2. Get Recipe Details

**Tool**: `loopkitchen.recipes.details`

Get detailed recipe with full instructions and nutrition analysis.

**Request**:
```json
{
  "recipeId": "quick-chicken-rice-bowl-0",
  "recipeTitle": "Quick Chicken Rice Bowl",
  "ingredients": ["chicken", "rice", "soy sauce"],
  "vibes": ["Quick"],
  "chaosTarget": 5
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipeId` | `string` | ✅ | Recipe ID from compact card |
| `recipeTitle` | `string` | ✅ | Recipe title |
| `ingredients` | `string[]` | ✅ | Original ingredients list |
| `vibes` | `string[]` | ❌ | Original vibes |
| `chaosTarget` | `number` | ❌ | Original chaos level |

**Response**:
```json
{
  "type": "RecipeCardDetailed",
  "data": {
    "recipeId": "quick-chicken-rice-bowl-0",
    "title": "Quick Chicken Rice Bowl",
    "prepTime": 10,
    "cookTime": 15,
    "servings": 2,
    "ingredients": [
      { "name": "chicken breast", "quantity": "2", "unit": "pieces" },
      { "name": "rice", "quantity": "1", "unit": "cup" },
      { "name": "soy sauce", "quantity": "2", "unit": "tbsp" }
    ],
    "instructions": [
      "Cook rice according to package directions",
      "Season and cook chicken breast",
      "Slice chicken and serve over rice",
      "Drizzle with soy sauce"
    ],
    "tags": ["quick", "asian", "high-protein"],
    "chaosScore": 5,
    "nutrition": {
      "servings": 2,
      "totalNutrition": {
        "calories": 520,
        "protein_g": 45,
        "carbs_g": 60,
        "fat_g": 8,
        "fiber_g": 2,
        "sugar_g": 1
      },
      "perServing": {
        "calories": 260,
        "protein_g": 22.5,
        "carbs_g": 30,
        "fat_g": 4,
        "fiber_g": 1,
        "sugar_g": 0.5
      },
      "dietTags": ["high-protein", "low-fat"],
      "confidence": "high"
    }
  },
  "meta": {
    "generatedAt": "2025-12-06T23:05:00Z",
    "durationMs": 4100,
    "model": "gpt-4o-mini"
  }
}
```

---

## Nutrition Tools

### 3. Analyze Nutrition

**Tool**: `loopkitchen.nutrition.analyze`

Analyze nutrition from recipes or raw ingredients.

**Request (from recipe)**:
```json
{
  "recipes": [{
    "title": "Grilled Chicken Salad",
    "servings": 2,
    "ingredients": [
      { "name": "chicken breast", "quantity": "2", "unit": "pieces" },
      { "name": "mixed greens", "quantity": "4", "unit": "cups" }
    ]
  }]
}
```

**Request (from ingredients)**:
```json
{
  "ingredients": [
    { "name": "oats", "quantity": "1", "unit": "cup" },
    { "name": "banana", "quantity": "1", "unit": "piece" },
    { "name": "almond milk", "quantity": "1", "unit": "cup" }
  ],
  "servings": 1
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipes` | `Recipe[]` | One of | Array of recipe objects |
| `ingredients` | `Ingredient[]` | One of | Array of ingredient objects |
| `servings` | `number` | ❌ | Number of servings (default: 1) |

**Response**:
```json
{
  "type": "NutritionSummary",
  "data": {
    "servings": 2,
    "totalNutrition": {
      "calories": 420,
      "protein_g": 35,
      "carbs_g": 25,
      "fat_g": 18,
      "fiber_g": 6,
      "sugar_g": 8,
      "sodium_mg": 450
    },
    "perServing": {
      "calories": 210,
      "protein_g": 17.5,
      "carbs_g": 12.5,
      "fat_g": 9,
      "fiber_g": 3,
      "sugar_g": 4,
      "sodium_mg": 225
    },
    "dietTags": ["high-protein", "low-carb", "high-fiber"],
    "healthScore": 85,
    "insights": [
      "Excellent protein source for muscle building",
      "Low in carbohydrates, suitable for low-carb diets",
      "High fiber content supports digestive health"
    ],
    "warnings": [
      "Sodium content is moderate, watch if on low-sodium diet"
    ],
    "confidence": "high"
  },
  "meta": {
    "generatedAt": "2025-12-06T23:10:00Z",
    "durationMs": 2800,
    "model": "gpt-4o-mini"
  }
}
```

---

### 4. Log Meal (Planned)

**Tool**: `loopkitchen.nutrition.logMeal`

**Status**: Planned for Phase 5 database integration

Log a meal for daily nutrition tracking.

**Request**:
```json
{
  "userId": "user_123",
  "mealType": "lunch",
  "mealDate": "2025-12-06",
  "recipeTitle": "Grilled Chicken Salad",
  "nutrition": {
    "calories": 420,
    "protein": 35,
    "carbs": 25,
    "fat": 18,
    "fiber": 6,
    "sugar": 8,
    "sodium": 450
  },
  "servings": 1,
  "healthScore": 85,
  "tags": ["high-protein", "low-carb"]
}
```

**Current Response** (placeholder):
```json
{
  "type": "InfoMessage",
  "data": {
    "title": "Meal Logging Coming Soon",
    "message": "Meal logging will be available after database integration in Phase 5.",
    "severity": "info",
    "actionable": false
  }
}
```

---

### 5. Get Daily Nutrition (Planned)

**Tool**: `loopkitchen.nutrition.daily`

**Status**: Planned for Phase 5 database integration

Get aggregated nutrition summary for a day.

**Request**:
```json
{
  "userId": "user_123",
  "date": "2025-12-06"
}
```

**Future Response**:
```json
{
  "type": "NutritionSummary",
  "data": {
    "date": "2025-12-06",
    "totalCalories": 1850,
    "totalProtein": 120,
    "totalCarbs": 180,
    "totalFat": 60,
    "meals": [
      {
        "mealType": "breakfast",
        "calories": 450,
        "healthScore": 75
      },
      {
        "mealType": "lunch",
        "calories": 650,
        "healthScore": 85
      },
      {
        "mealType": "dinner",
        "calories": 750,
        "healthScore": 80
      }
    ],
    "avgHealthScore": 80,
    "insights": ["Met protein goal", "Slightly over calorie target"]
  }
}
```

---

## Meal Planning Tools

### 6. Generate Meal Plan

**Tool**: `loopkitchen.mealplan.generate`

Generate 7-day meal plan with breakfast, lunch, and dinner.

**Request**:
```json
{
  "ingredients": ["chicken", "rice", "broccoli", "eggs", "olive oil"],
  "caloriesPerDay": 2000,
  "dietNotes": "high-protein, balanced",
  "days": 7,
  "startDate": "2025-12-08"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ingredients` | `string[]` | ❌ | Base ingredients (default: common pantry) |
| `caloriesPerDay` | `number` | ❌ | Daily calorie target (null = no target) |
| `dietNotes` | `string` | ❌ | Diet preferences (e.g., "high-protein") |
| `days` | `number` | ❌ | Number of days (1-14, default: 7) |
| `startDate` | `string` | ❌ | Start date (ISO, default: today) |

**Response**:
```json
{
  "type": "WeekPlanner",
  "data": {
    "startDate": "2025-12-08",
    "days": [
      {
        "date": "2025-12-08",
        "dayName": "Monday",
        "meals": {
          "breakfast": {
            "recipeId": "scrambled-eggs-toast",
            "title": "Scrambled Eggs with Toast",
            "approxCalories": 450
          },
          "lunch": {
            "recipeId": "chicken-rice-bowl",
            "title": "Chicken Rice Bowl",
            "approxCalories": 650
          },
          "dinner": {
            "recipeId": "grilled-chicken-broccoli",
            "title": "Grilled Chicken with Broccoli",
            "approxCalories": 700
          }
        },
        "dayTotalCalories": 1800
      }
      // ... 6 more days
    ],
    "weeklySummary": {
      "avgDailyCalories": 1950,
      "totalCalories": 13650,
      "notes": "High-protein plan optimized for ingredient reuse. Balanced macros with variety."
    }
  },
  "meta": {
    "generatedAt": "2025-12-06T23:15:00Z",
    "durationMs": 3800,
    "model": "gpt-4o-mini"
  }
}
```

---

### 7. Generate Meal Plan with Grocery List

**Tool**: `loopkitchen.mealplan.withGrocery`

Generate meal plan and aggregated grocery list in one call.

**Request**:
```json
{
  "ingredients": ["chicken", "pasta", "tomatoes", "garlic", "cheese"],
  "caloriesPerDay": 1800,
  "dietNotes": "vegetarian-friendly",
  "days": 5
}
```

**Response**:
```json
{
  "mealPlan": {
    "type": "WeekPlanner",
    "data": { ... }
  },
  "groceryList": {
    "type": "GroceryList",
    "data": {
      "categories": [
        {
          "name": "Produce",
          "items": [
            { "name": "tomatoes", "quantity": "6 medium", "checked": false },
            { "name": "garlic", "quantity": "2 heads", "checked": false }
          ]
        },
        {
          "name": "Meat & Seafood",
          "items": [
            { "name": "chicken breast", "quantity": "3 lbs", "checked": false }
          ]
        },
        {
          "name": "Dairy & Eggs",
          "items": [
            { "name": "cheese", "quantity": "1 lb", "checked": false }
          ]
        },
        {
          "name": "Pantry & Spices",
          "items": [
            { "name": "pasta", "quantity": "2 lbs", "checked": false },
            { "name": "olive oil", "quantity": "1 bottle", "checked": false }
          ]
        }
      ],
      "totalItems": 15,
      "estimatedCost": null
    },
    "meta": {
      "generatedAt": "2025-12-06T23:20:00Z",
      "durationMs": 2500,
      "model": "gpt-4o-mini"
    }
  }
}
```

---

### 8. Prepare Meal Plan Order

**Tool**: `loopkitchen.mealplan.prepareOrder`

Generate grocery list and get provider quotes for delivery.

**Request**:
```json
{
  "userId": "user_123",
  "mealPlan": {
    "type": "WeekPlanner",
    "data": { ... }
  },
  "location": {
    "address": "123 Main St, San Francisco, CA 94102",
    "lat": 37.7749,
    "lng": -122.4194
  },
  "pantryIngredients": ["salt", "pepper", "olive oil"],
  "preferences": {
    "maxDeliveryTime": 120,
    "preferredProviders": ["instacart", "doordash"]
  }
}
```

**Response**:
```json
{
  "groceryList": {
    "type": "GroceryList",
    "data": { ... }
  },
  "commerce": {
    "providers": [
      {
        "name": "Instacart",
        "estimatedCost": 125.50,
        "deliveryTime": 60,
        "score": 95,
        "available": true
      },
      {
        "name": "DoorDash",
        "estimatedCost": 132.00,
        "deliveryTime": 75,
        "score": 88,
        "available": true
      }
    ],
    "confirmationToken": "abc123...",
    "expiresAt": "2025-12-07T00:00:00Z"
  },
  "mealPlan": {
    "type": "WeekPlanner",
    "data": { ... }
  }
}
```

---

### 9. Complete Meal Planning Flow

**Tool**: `loopkitchen.mealplan.complete`

Generate meal plan + grocery list + provider quotes in one call.

**Request**:
```json
{
  "userId": "user_123",
  "ingredients": ["chicken", "rice", "vegetables"],
  "caloriesPerDay": 2000,
  "days": 7,
  "location": {
    "address": "123 Main St, San Francisco, CA",
    "lat": 37.7749,
    "lng": -122.4194
  },
  "pantryIngredients": ["salt", "pepper", "olive oil"]
}
```

**Response**:
```json
{
  "mealPlan": {
    "type": "WeekPlanner",
    "data": { ... }
  },
  "groceryList": {
    "type": "GroceryList",
    "data": { ... }
  },
  "commerce": {
    "providers": [ ... ],
    "confirmationToken": "...",
    "expiresAt": "..."
  },
  "meta": {
    "generatedAt": "2025-12-06T23:25:00Z",
    "durationMs": 8500,
    "flow": "complete"
  }
}
```

---

## Error Handling

All errors return an `InfoMessage` widget:

```json
{
  "type": "InfoMessage",
  "data": {
    "title": "Error Title",
    "message": "Detailed error message",
    "severity": "error",
    "actionable": false
  },
  "meta": {
    "generatedAt": "2025-12-06T23:30:00Z",
    "durationMs": 100
  }
}
```

**Severity Levels**:
- `error` - Operation failed
- `warning` - Operation succeeded with warnings
- `info` - Informational message

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| "ingredients is required" | Missing ingredients | Provide ingredients array |
| "OpenAI API error" | API key invalid/quota | Check API key and quota |
| "location is required" | Missing location for commerce | Provide location object |
| "Database not configured" | Missing DB credentials | Set SUPABASE_URL and SERVICE_ROLE_KEY |

---

## Rate Limits

**Supabase Edge Functions**:
- Default: 1000 requests/minute per IP
- Bursts: 100 requests/second

**OpenAI API**:
- Tier 1: 500 requests/minute
- Tier 2: 5000 requests/minute
- Monitor usage in OpenAI dashboard

**Recommendations**:
- Implement client-side caching
- Use debouncing for user input
- Batch requests when possible

---

## Examples

### Example 1: Quick Recipe Generation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.recipes.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice"],
    "vibes": ["Quick"],
    "timeLimit": 20,
    "count": 3
  }'
```

### Example 2: Nutrition Analysis

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.nutrition.analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": [
      {"name": "chicken breast", "quantity": "200g"},
      {"name": "rice", "quantity": "1 cup"}
    ],
    "servings": 2
  }'
```

### Example 3: Weekly Meal Plan

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 7
  }'
```

### Example 4: Complete Flow (Plan + Grocery + Order)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/mcp-tools/tools/loopkitchen.mealplan.complete \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "ingredients": ["chicken", "rice", "vegetables"],
    "caloriesPerDay": 2000,
    "days": 7,
    "location": {
      "address": "123 Main St, San Francisco, CA",
      "lat": 37.7749,
      "lng": -122.4194
    }
  }'
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const MCP_URL = "https://your-project.supabase.co/functions/v1/mcp-tools";

async function generateRecipes(ingredients: string[]) {
  const response = await fetch(`${MCP_URL}/tools/loopkitchen.recipes.generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ingredients,
      vibes: ["Quick"],
      count: 3
    })
  });
  
  return await response.json();
}

// Usage
const recipes = await generateRecipes(["chicken", "rice", "soy sauce"]);
console.log(recipes);
```

### Python

```python
import requests

MCP_URL = "https://your-project.supabase.co/functions/v1/mcp-tools"

def generate_recipes(ingredients):
    response = requests.post(
        f"{MCP_URL}/tools/loopkitchen.recipes.generate",
        json={
            "ingredients": ingredients,
            "vibes": ["Quick"],
            "count": 3
        }
    )
    return response.json()

# Usage
recipes = generate_recipes(["chicken", "rice", "soy sauce"])
print(recipes)
```

---

*For more information, see the deployment guide and phase completion documentation.*
