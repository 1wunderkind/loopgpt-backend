/**
 * Food Intent Classifier
 * 
 * Classifies natural language food queries into intents:
 * - recipes: cooking ideas, ingredient usage, meal prep
 * - nutrition: calories, macros, diet analysis
 * - mealplan: multi-day planning, structured diets
 * - grocery: shopping lists, ingredient buying
 * - other: non-food queries
 */

import OpenAI from "https://esm.sh/openai@4.28.0";
import { cacheGet, cacheSet } from "./cache.ts";

export interface FoodIntent {
  primaryIntent: "recipes" | "nutrition" | "mealplan" | "grocery" | "other";
  secondaryIntents?: string[];
  confidence: "low" | "medium" | "high";
  reasoning?: string;
  missingInfo?: string[]; // e.g. ["ingredients", "caloriesPerDay", "dietTags", "goal"]
}

/**
 * Classify a food-related query into an intent
 */
export async function classifyFoodIntent(
  query: string,
  locale?: string
): Promise<FoodIntent> {
  // Cache key based on normalized query
  const cacheKey = `foodIntent:${locale || "en"}:${query.trim().toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  
  if (cached) {
    console.log("[foodIntent] Cache hit", { query, cacheKey });
    return JSON.parse(cached);
  }

  // Get OpenAI client
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an intent classifier for TheLoopGPT, a food assistant.

Classify the user's query into ONE primary intent:

1. "recipes" - User wants:
   - Recipe ideas or cooking instructions
   - What to cook with specific ingredients
   - Meal prep ideas or leftover usage
   - Cooking techniques or substitutions
   Examples: "What can I cook with chicken?", "Easy dinner ideas", "Use up leftover rice"

2. "nutrition" - User wants:
   - Calorie counts or macros
   - Nutritional analysis of food/meals
   - Diet compatibility (keto, vegan, etc.)
   - Health information about ingredients
   Examples: "How many calories in this?", "Is this keto-friendly?", "Protein content"

3. "mealplan" - User wants:
   - Multi-day meal planning
   - Structured diet plans
   - Weekly/monthly meal schedules
   - Goal-based planning (weight loss, muscle gain)
   Examples: "3-day meal plan", "Weekly diet for weight loss", "Plan my meals"

4. "grocery" - User wants:
   - Shopping lists
   - Ingredient lists for recipes/plans
   - What to buy at the store
   Examples: "Make a grocery list", "What do I need to buy?", "Shopping list for this week"

5. "other" - Query is not primarily about food/cooking/nutrition/planning

Respond ONLY with valid JSON in this exact format:
{
  "primaryIntent": "recipes" | "nutrition" | "mealplan" | "grocery" | "other",
  "secondaryIntents": ["optional", "array"],
  "confidence": "low" | "medium" | "high",
  "reasoning": "brief explanation",
  "missingInfo": ["optional", "array", "of", "missing", "fields"]
}

Rules:
- Be decisive: choose the MOST relevant intent
- Use "high" confidence when query clearly matches one intent
- Use "medium" when query could fit multiple intents
- Use "low" when query is vague or unclear
- Include secondaryIntents only if query genuinely spans multiple areas

Missing Info Detection:
- Identify what key information is missing from the query
- Common missing fields:
  * "ingredients" - for recipe queries without specific ingredients
  * "caloriesPerDay" - for meal planning without calorie targets
  * "dietTags" - when dietary preferences aren't specified
  * "goal" - when health/fitness goals aren't clear
  * "cuisinePreferences" - when cuisine type isn't mentioned
  * "servings" - when portion size isn't specified
  * "timeConstraint" - when prep/cook time isn't mentioned
- Only include missingInfo if it would significantly improve the response
- For vague queries like "I'm tired, what should I eat?", mark ["ingredients"] as missing
- For goal-based queries like "help me lose weight", mark ["caloriesPerDay", "dietTags"] if not specified`;

  const userPrompt = `Query: "${query}"
Locale: ${locale || "en"}

Classify this query:`;

  try {
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cheap for classification
      temperature: 0, // Deterministic
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const duration = Date.now() - startTime;
    const raw = completion.choices[0]?.message?.content;
    
    if (!raw) {
      throw new Error("Empty intent classification response");
    }

    const parsed = JSON.parse(raw) as FoodIntent;
    
    // Validate the response
    if (!["recipes", "nutrition", "mealplan", "grocery", "other"].includes(parsed.primaryIntent)) {
      throw new Error(`Invalid primaryIntent: ${parsed.primaryIntent}`);
    }
    
    if (!["low", "medium", "high"].includes(parsed.confidence)) {
      throw new Error(`Invalid confidence: ${parsed.confidence}`);
    }

    console.log("[foodIntent] Classified", {
      query,
      intent: parsed.primaryIntent,
      confidence: parsed.confidence,
      durationMs: duration,
    });

    // Cache for 5 minutes (intent classification is stable)
    await cacheSet(cacheKey, JSON.stringify(parsed), 5 * 60);

    return parsed;
    
  } catch (error: any) {
    console.error("[foodIntent] Classification error", {
      query,
      error: error.message,
    });

    // Fail-safe: default to recipes with low confidence
    // This ensures the router never crashes on classification failure
    const fallback: FoodIntent = {
      primaryIntent: "recipes",
      secondaryIntents: [],
      confidence: "low",
      reasoning: "Classification failed, defaulting to recipes",
    };

    return fallback;
  }
}

/**
 * Batch classify multiple queries (for testing/analytics)
 */
export async function classifyFoodIntentBatch(
  queries: string[],
  locale?: string
): Promise<Map<string, FoodIntent>> {
  const results = new Map<string, FoodIntent>();
  
  // Process in parallel with limit to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (query) => {
        const intent = await classifyFoodIntent(query, locale);
        return { query, intent };
      })
    );
    
    batchResults.forEach(({ query, intent }) => {
      results.set(query, intent);
    });
    
    // Small delay between batches
    if (i + batchSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
