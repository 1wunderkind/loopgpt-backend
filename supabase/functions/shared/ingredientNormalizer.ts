/**
 * Ingredient Normalizer
 * 
 * Normalizes ingredient names for better MealMe search results.
 * Handles common variations, measurements, and aliases.
 */

export interface NormalizedIngredient {
  original: string;
  normalized: string;
  qty: number;
  unit?: string;
}

/**
 * Common ingredient aliases for better search results
 */
const INGREDIENT_ALIASES: Record<string, string> = {
  // Proteins
  "boneless skinless chicken breast": "chicken breast",
  "boneless skinless chicken thighs": "chicken thighs",
  "chicken breast fillet": "chicken breast",
  "ground beef": "beef ground",
  "lean ground beef": "beef ground",
  "ground turkey": "turkey ground",
  "pork chops": "pork chop",
  "salmon fillet": "salmon",
  "cod fillet": "cod",
  
  // Dairy
  "parmigiano reggiano": "parmesan",
  "parmesan cheese": "parmesan",
  "mozzarella cheese": "mozzarella",
  "cheddar cheese": "cheddar",
  "whole milk": "milk",
  "2% milk": "milk",
  "skim milk": "milk",
  "heavy cream": "cream",
  "heavy whipping cream": "cream",
  
  // Vegetables
  "yellow onion": "onion",
  "white onion": "onion",
  "red onion": "onion",
  "sweet onion": "onion",
  "roma tomatoes": "tomatoes",
  "cherry tomatoes": "tomatoes",
  "grape tomatoes": "tomatoes",
  "bell pepper": "pepper",
  "red bell pepper": "red pepper",
  "green bell pepper": "green pepper",
  "russet potatoes": "potatoes",
  "yukon gold potatoes": "potatoes",
  
  // Herbs & Spices
  "fresh basil": "basil",
  "fresh parsley": "parsley",
  "fresh thyme": "thyme",
  "fresh rosemary": "rosemary",
  "garlic cloves": "garlic",
  "minced garlic": "garlic",
  "black pepper": "pepper",
  "ground black pepper": "pepper",
  "kosher salt": "salt",
  "sea salt": "salt",
  
  // Pantry
  "extra virgin olive oil": "olive oil",
  "vegetable oil": "oil",
  "canola oil": "oil",
  "all-purpose flour": "flour",
  "white sugar": "sugar",
  "granulated sugar": "sugar",
  "brown sugar": "sugar",
  "chicken broth": "broth",
  "chicken stock": "broth",
  "beef broth": "broth",
  "beef stock": "broth",
  
  // Grains & Pasta
  "long grain rice": "rice",
  "white rice": "rice",
  "brown rice": "rice",
  "basmati rice": "rice",
  "spaghetti pasta": "spaghetti",
  "penne pasta": "penne",
  "linguine pasta": "linguine",
};

/**
 * Common measurement units
 */
const MEASUREMENT_UNITS = [
  "cup", "cups",
  "tbsp", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters",
  "piece", "pieces",
  "slice", "slices",
  "clove", "cloves",
  "bunch", "bunches",
  "can", "cans",
  "package", "packages",
  "bag", "bags",
];

/**
 * Extract quantity and unit from ingredient string
 */
function extractQuantityAndUnit(ingredient: string): { qty: number; unit?: string; remainder: string } {
  const lowerIngredient = ingredient.toLowerCase().trim();
  
  // Try to match patterns like "2 cups", "1.5 lbs", "3 tablespoons"
  const qtyUnitPattern = /^(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.+)$/i;
  const match = lowerIngredient.match(qtyUnitPattern);
  
  if (match) {
    const qty = parseFloat(match[1]);
    const unit = match[2] || undefined;
    const remainder = match[3];
    
    // Validate unit if present
    if (unit && MEASUREMENT_UNITS.includes(unit.toLowerCase())) {
      return { qty, unit, remainder };
    }
    
    return { qty, unit: undefined, remainder: match[2] ? `${match[2]} ${remainder}` : remainder };
  }
  
  // Try to match just quantity at start
  const qtyPattern = /^(\d+(?:\.\d+)?)\s+(.+)$/;
  const qtyMatch = lowerIngredient.match(qtyPattern);
  
  if (qtyMatch) {
    return {
      qty: parseFloat(qtyMatch[1]),
      unit: undefined,
      remainder: qtyMatch[2],
    };
  }
  
  // No quantity found, default to 1
  return {
    qty: 1,
    unit: undefined,
    remainder: lowerIngredient,
  };
}

/**
 * Remove common descriptors and qualifiers
 */
function removeDescriptors(ingredient: string): string {
  const descriptors = [
    "fresh", "frozen", "canned", "dried", "raw", "cooked",
    "organic", "free-range", "grass-fed", "wild-caught",
    "large", "medium", "small", "extra-large",
    "chopped", "diced", "minced", "sliced", "shredded", "grated",
    "peeled", "seeded", "trimmed", "cleaned",
    "ripe", "unripe", "firm", "soft",
  ];
  
  let result = ingredient.toLowerCase();
  
  for (const descriptor of descriptors) {
    const pattern = new RegExp(`\\b${descriptor}\\b`, "gi");
    result = result.replace(pattern, "").trim();
  }
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

/**
 * Apply ingredient aliases
 */
function applyAliases(ingredient: string): string {
  const lower = ingredient.toLowerCase().trim();
  
  // Check for exact match
  if (INGREDIENT_ALIASES[lower]) {
    return INGREDIENT_ALIASES[lower];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(INGREDIENT_ALIASES)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  
  return ingredient;
}

/**
 * Normalize a single ingredient
 */
export function normalizeIngredient(ingredient: string): NormalizedIngredient {
  const original = ingredient.trim();
  
  // Extract quantity and unit
  const { qty, unit, remainder } = extractQuantityAndUnit(original);
  
  // Remove descriptors
  let normalized = removeDescriptors(remainder);
  
  // Apply aliases
  normalized = applyAliases(normalized);
  
  // Final cleanup
  normalized = normalized.trim();
  
  return {
    original,
    normalized,
    qty,
    unit,
  };
}

/**
 * Normalize a list of ingredients
 */
export function normalizeIngredients(ingredients: string[]): NormalizedIngredient[] {
  return ingredients.map(normalizeIngredient);
}

/**
 * Convert normalized ingredients to MealMe cart items
 */
export function toMealMeCartItems(ingredients: NormalizedIngredient[]): Array<{ name: string; qty: number; skuHint?: string }> {
  return ingredients.map(ing => ({
    name: ing.normalized,
    qty: ing.qty,
    skuHint: undefined, // Can be enhanced later with SKU mapping
  }));
}

/**
 * Group similar ingredients (e.g., "2 onions" + "1 onion" = "3 onions")
 */
export function groupIngredients(ingredients: NormalizedIngredient[]): NormalizedIngredient[] {
  const grouped = new Map<string, NormalizedIngredient>();
  
  for (const ing of ingredients) {
    const key = `${ing.normalized}|${ing.unit || ""}`;
    
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.qty += ing.qty;
    } else {
      grouped.set(key, { ...ing });
    }
  }
  
  return Array.from(grouped.values());
}

/**
 * Validate ingredient list
 */
export function validateIngredients(ingredients: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!ingredients || ingredients.length === 0) {
    errors.push("Ingredient list is empty");
  }
  
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    
    if (!ing || ing.trim().length === 0) {
      errors.push(`Ingredient at index ${i} is empty`);
    }
    
    if (ing.length > 200) {
      errors.push(`Ingredient at index ${i} is too long (max 200 characters)`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

