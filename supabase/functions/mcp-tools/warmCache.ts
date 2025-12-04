/**
 * Cache Warming Script
 * Pre-generates and caches responses for the top 100 ingredient combinations
 */

import { generateRecipes } from "./recipes.ts";

// Top 100 most common ingredient combinations based on typical recipe searches
const TOP_INGREDIENT_COMBINATIONS = [
  // Single proteins
  ["chicken"],
  ["beef"],
  ["pork"],
  ["salmon"],
  ["shrimp"],
  ["tofu"],
  ["eggs"],
  ["turkey"],
  ["lamb"],
  ["tuna"],
  
  // Protein + vegetable
  ["chicken", "broccoli"],
  ["chicken", "spinach"],
  ["chicken", "tomatoes"],
  ["beef", "broccoli"],
  ["beef", "mushrooms"],
  ["salmon", "asparagus"],
  ["shrimp", "garlic"],
  ["tofu", "vegetables"],
  ["pork", "peppers"],
  ["turkey", "vegetables"],
  
  // Protein + carb
  ["chicken", "rice"],
  ["chicken", "pasta"],
  ["beef", "potatoes"],
  ["salmon", "quinoa"],
  ["shrimp", "pasta"],
  ["tofu", "noodles"],
  ["eggs", "bread"],
  ["turkey", "rice"],
  ["pork", "rice"],
  ["tuna", "pasta"],
  
  // Protein + carb + vegetable
  ["chicken", "rice", "broccoli"],
  ["chicken", "pasta", "tomatoes"],
  ["beef", "potatoes", "carrots"],
  ["salmon", "quinoa", "asparagus"],
  ["shrimp", "pasta", "garlic"],
  ["tofu", "rice", "vegetables"],
  ["eggs", "bread", "spinach"],
  ["turkey", "rice", "peppers"],
  ["pork", "noodles", "vegetables"],
  ["tuna", "pasta", "tomatoes"],
  
  // Popular vegetarian combinations
  ["pasta", "tomatoes", "basil"],
  ["rice", "beans", "vegetables"],
  ["quinoa", "vegetables"],
  ["lentils", "curry"],
  ["chickpeas", "spinach"],
  ["mushrooms", "garlic"],
  ["eggplant", "tomatoes"],
  ["zucchini", "pasta"],
  ["sweet potato", "black beans"],
  ["avocado", "toast"],
  
  // Popular breakfast combinations
  ["eggs", "bacon", "toast"],
  ["oatmeal", "berries"],
  ["yogurt", "granola"],
  ["pancakes", "syrup"],
  ["eggs", "cheese", "vegetables"],
  ["sausage", "eggs"],
  ["french toast"],
  ["smoothie", "banana", "berries"],
  ["eggs", "avocado", "toast"],
  ["breakfast burrito"],
  
  // Popular lunch/dinner combinations
  ["chicken", "caesar salad"],
  ["burger", "fries"],
  ["pizza", "cheese"],
  ["tacos", "beef"],
  ["stir fry", "chicken"],
  ["curry", "chicken"],
  ["soup", "vegetables"],
  ["sandwich", "turkey"],
  ["salad", "grilled chicken"],
  ["wrap", "chicken"],
  
  // Ethnic cuisine combinations
  ["chicken", "curry", "rice"],
  ["beef", "stir fry", "vegetables"],
  ["shrimp", "pad thai"],
  ["chicken", "tikka masala"],
  ["pork", "fried rice"],
  ["salmon", "teriyaki"],
  ["chicken", "fajitas"],
  ["beef", "tacos"],
  ["chicken", "enchiladas"],
  ["shrimp", "scampi"],
  
  // Healthy combinations
  ["grilled chicken", "salad"],
  ["salmon", "vegetables"],
  ["quinoa", "chickpeas", "vegetables"],
  ["turkey", "lettuce wrap"],
  ["tuna", "salad"],
  ["chicken", "soup"],
  ["vegetable", "stir fry"],
  ["lentil", "soup"],
  ["greek yogurt", "fruit"],
  ["smoothie bowl"],
  
  // Quick meal combinations
  ["pasta", "sauce"],
  ["rice", "chicken"],
  ["noodles", "vegetables"],
  ["quesadilla", "cheese"],
  ["omelet", "vegetables"],
  ["fried rice"],
  ["ramen", "egg"],
  ["mac and cheese"],
  ["grilled cheese"],
  ["baked potato"],
];

/**
 * Warm the cache by pre-generating recipes for top ingredient combinations
 */
export async function warmCache(options: {
  maxConcurrent?: number;
  delayMs?: number;
  dryRun?: boolean;
} = {}) {
  const {
    maxConcurrent = 5,
    delayMs = 1000,
    dryRun = false,
  } = options;

  console.log("[warmCache] Starting cache warming...", {
    totalCombinations: TOP_INGREDIENT_COMBINATIONS.length,
    maxConcurrent,
    delayMs,
    dryRun,
  });

  let successCount = 0;
  let errorCount = 0;
  let cacheHitCount = 0;

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < TOP_INGREDIENT_COMBINATIONS.length; i += maxConcurrent) {
    const batch = TOP_INGREDIENT_COMBINATIONS.slice(i, i + maxConcurrent);
    
    console.log(`[warmCache] Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(TOP_INGREDIENT_COMBINATIONS.length / maxConcurrent)}`);

    if (dryRun) {
      console.log("[warmCache] DRY RUN - Would process:", batch);
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (ingredients) => {
        try {
          const startTime = Date.now();
          const result = await generateRecipes({
            ingredients,
            count: 3,
            dietary_restrictions: [],
            cuisine_preference: undefined,
          });
          const duration = Date.now() - startTime;
          
          // Check if it was a cache hit (very fast response)
          const wasCacheHit = duration < 1000;
          
          console.log(`[warmCache] ✓ ${ingredients.join(", ")} (${duration}ms)${wasCacheHit ? " [cache hit]" : ""}`);
          
          if (wasCacheHit) {
            cacheHitCount++;
          }
          
          return { success: true, ingredients, duration };
        } catch (error) {
          console.error(`[warmCache] ✗ ${ingredients.join(", ")}:`, error.message);
          return { success: false, ingredients, error: error.message };
        }
      })
    );

    // Count successes and errors
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        successCount++;
      } else {
        errorCount++;
      }
    });

    // Delay between batches to avoid rate limiting
    if (i + maxConcurrent < TOP_INGREDIENT_COMBINATIONS.length) {
      console.log(`[warmCache] Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const summary = {
    total: TOP_INGREDIENT_COMBINATIONS.length,
    success: successCount,
    errors: errorCount,
    cacheHits: cacheHitCount,
    successRate: `${((successCount / TOP_INGREDIENT_COMBINATIONS.length) * 100).toFixed(1)}%`,
    cacheHitRate: `${((cacheHitCount / TOP_INGREDIENT_COMBINATIONS.length) * 100).toFixed(1)}%`,
  };

  console.log("[warmCache] Cache warming complete!", summary);
  
  return summary;
}

// CLI usage
if (import.meta.main) {
  const args = Deno.args;
  const dryRun = args.includes("--dry-run");
  const maxConcurrent = parseInt(args.find(arg => arg.startsWith("--concurrent="))?.split("=")[1] || "5");
  const delayMs = parseInt(args.find(arg => arg.startsWith("--delay="))?.split("=")[1] || "1000");

  warmCache({ maxConcurrent, delayMs, dryRun })
    .then((summary) => {
      console.log("\n=== Cache Warming Summary ===");
      console.log(JSON.stringify(summary, null, 2));
      Deno.exit(0);
    })
    .catch((error) => {
      console.error("Cache warming failed:", error);
      Deno.exit(1);
    });
}
