/**
 * Validation utilities for recipe consistency
 */

/**
 * Extract ingredients from recipe details response
 */
export function extractIngredientsFromDetails(detailsResponse: any): string[] {
  const ingredients: string[] = [];
  
  if (!detailsResponse?.widgets?.[0]) {
    return ingredients;
  }
  
  const widget = detailsResponse.widgets[0];
  
  // Extract from ingredientsHave
  if (widget.ingredientsHave) {
    for (const ing of widget.ingredientsHave) {
      if (ing.name) {
        ingredients.push(ing.name.toLowerCase());
      }
    }
  }
  
  // Extract from ingredientsNeed
  if (widget.ingredientsNeed) {
    for (const ing of widget.ingredientsNeed) {
      if (ing.name) {
        ingredients.push(ing.name.toLowerCase());
      }
    }
  }
  
  return ingredients;
}

/**
 * Calculate ingredient overlap between two lists
 * Returns a score from 0 (no overlap) to 1 (perfect match)
 */
export function calculateIngredientOverlap(
  ingredients1: string[],
  ingredients2: string[]
): number {
  if (!ingredients1.length || !ingredients2.length) {
    return 0;
  }
  
  const set1 = new Set(ingredients1.map(i => i.toLowerCase().trim()));
  const set2 = new Set(ingredients2.map(i => i.toLowerCase().trim()));
  
  let matches = 0;
  for (const ing of set1) {
    if (set2.has(ing)) {
      matches++;
    } else {
      // Check for partial matches (e.g., "chicken" matches "chicken breast")
      for (const ing2 of set2) {
        if (ing.includes(ing2) || ing2.includes(ing)) {
          matches += 0.5; // Partial match
          break;
        }
      }
    }
  }
  
  // Use the smaller set as denominator for more lenient matching
  const denominator = Math.min(set1.size, set2.size);
  return matches / denominator;
}

/**
 * Validate that recipe details match expected ingredients
 */
export function validateRecipeIngredients(
  detailsResponse: any,
  expectedIngredients: string[],
  minOverlap: number = 0.4
): {
  valid: boolean;
  overlap: number;
  detailsIngredients: string[];
  reason?: string;
} {
  const detailsIngredients = extractIngredientsFromDetails(detailsResponse);
  const overlap = calculateIngredientOverlap(expectedIngredients, detailsIngredients);
  
  const valid = overlap >= minOverlap;
  
  return {
    valid,
    overlap,
    detailsIngredients,
    reason: valid ? undefined : `Ingredient mismatch: ${(overlap * 100).toFixed(0)}% overlap (expected ≥${(minOverlap * 100).toFixed(0)}%)`
  };
}

/**
 * Check if a recipe looks like a generic fallback template
 */
export function isGenericFallback(detailsResponse: any): boolean {
  if (!detailsResponse?.widgets?.[0]?.title) {
    return false;
  }
  
  const title = detailsResponse.widgets[0].title.toLowerCase();
  
  const fallbackKeywords = [
    'mystery',
    'whimsical',
    'surprise',
    'mash-up',
    'medley',
    'leftover',
    'chaos',
    'mishmash',
    'hodgepodge'
  ];
  
  for (const keyword of fallbackKeywords) {
    if (title.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}
