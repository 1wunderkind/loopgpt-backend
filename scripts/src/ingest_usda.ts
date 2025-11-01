/**
 * USDA FoodData Central CSV ingestion
 */

import { parse } from "https://deno.land/std@0.224.0/csv/mod.ts";

export interface USDAFood {
  fdc_id: string;
  description: string;
  category: string;
  categoryId: string;
  nutrients: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
}

/**
 * Load and parse USDA CSV files
 */
export async function loadUSDAData(dataDir: string): Promise<USDAFood[]> {
  console.log("📊 Loading USDA data...");
  
  // Load food descriptions
  const foodCsvPath = `${dataDir}/FoodData_Central_sr_legacy_food_csv_2018-04/food.csv`;
  const foodCsv = await Deno.readTextFile(foodCsvPath);
  const foodRows = await parse(foodCsv, { skipFirstRow: true, columns: ["fdc_id", "data_type", "description", "food_category_id", "publication_date"] }) as Array<Record<string, string>>;
  
  // Load food categories
  const categoryCsvPath = `${dataDir}/FoodData_Central_sr_legacy_food_csv_2018-04/food_category.csv`;
  const categoryCsv = await Deno.readTextFile(categoryCsvPath);
  const categoryRows = await parse(categoryCsv, { skipFirstRow: true, columns: ["id", "code", "description"] }) as Array<Record<string, string>>;
  
  // Create category map
  const categoryMap = new Map<string, string>();
  for (const row of categoryRows) {
    categoryMap.set(row.id, row.description); // id -> description
  }
  
  // Load nutrients
  const nutrientCsvPath = `${dataDir}/FoodData_Central_sr_legacy_food_csv_2018-04/food_nutrient.csv`;
  const nutrientCsv = await Deno.readTextFile(nutrientCsvPath);
  const nutrientRows = await parse(nutrientCsv, { skipFirstRow: true, columns: ["id", "fdc_id", "nutrient_id", "amount", "data_points", "derivation_id", "min", "max", "median", "footnote", "min_year_acquired"] }) as Array<Record<string, string>>;
  
  // Create nutrient map: fdc_id -> { nutrient_id -> amount }
  const nutrientMap = new Map<string, Map<string, number>>();
  
  for (const row of nutrientRows) {
    const fdcId = row.fdc_id;
    const nutrientId = row.nutrient_id;
    const amount = parseFloat(row.amount) || 0;
    
    if (!nutrientMap.has(fdcId)) {
      nutrientMap.set(fdcId, new Map());
    }
    nutrientMap.get(fdcId)!.set(nutrientId, amount);
  }
  
  console.log(`✅ Loaded ${foodRows.length} foods, ${nutrientRows.length} nutrient values`);
  
  // Build food objects
  const foods: USDAFood[] = [];
  
  // Debug: show first row structure
  if (foodRows.length > 0) {
    console.log(`🔍 First row sample:`, foodRows[0]);
  }
  
  for (const row of foodRows) {
    const fdcId = row.fdc_id;
    const description = row.description;
    const categoryId = row.food_category_id;
    const category = categoryMap.get(categoryId) || "Unknown";
    
    // Get nutrients for this food
    const nutrients = nutrientMap.get(fdcId) || new Map();
    
    foods.push({
      fdc_id: fdcId,
      description,
      category,
      categoryId,
      nutrients: {
        kcal: nutrients.get("1008") || 0,        // Energy (kcal)
        protein: nutrients.get("1003") || 0,     // Protein (g)
        carbs: nutrients.get("1005") || 0,       // Carbohydrate (g)
        fat: nutrients.get("1004") || 0,         // Total lipid (g)
        fiber: nutrients.get("1079") || 0,       // Fiber, total dietary (g)
        sugar: nutrients.get("1063") || 0,       // Sugars, Total NLEA (g)
        sodium: (nutrients.get("1093") || 0) / 1000, // Sodium (mg -> g)
      },
    });
  }
  
  return foods;
}

/**
 * Filter USDA foods to get the most common/useful ones
 */
export function filterCommonFoods(foods: USDAFood[], limit: number): USDAFood[] {
  // Basic food categories (exclude processed, fast food, restaurant, etc.)
  const basicCategories = [
    "1",  // Dairy and Egg Products
    "2",  // Spices and Herbs
    "4",  // Fats and Oils
    "5",  // Poultry Products
    "9",  // Fruits and Fruit Juices
    "10", // Pork Products
    "11", // Vegetables and Vegetable Products
    "12", // Nut and Seed Products
    "13", // Beef Products
    "14", // Beverages
    "15", // Finfish and Shellfish Products
    "16", // Legumes and Legume Products
    "17", // Lamb, Veal, and Game Products
    "20", // Cereal Grains and Pasta
  ];
  
  // Filter to basic categories
  const filtered = foods.filter((food) => {
    if (!food.description || !food.categoryId) return false;
    
    // Must be in a basic category
    if (!basicCategories.includes(food.categoryId)) return false;
    
    const desc = food.description.toLowerCase();
    
    // Skip overly specific preparations
    if (desc.includes("refrigerated dough") || desc.includes("frozen dinner")) {
      return false;
    }
    
    // Skip baby food
    if (desc.includes("baby") || desc.includes("infant")) {
      return false;
    }
    
    // Must have some nutritional data
    if (food.nutrients.kcal === 0 && food.nutrients.protein === 0 && food.nutrients.carbs === 0) {
      return false;
    }
    
    return true;
  });
  
  // Debug: show sample category IDs
  const sampleCats = foods.slice(0, 10).map(f => `${f.categoryId}:${f.category}`);
  console.log(`📊 Sample category IDs: ${sampleCats.join(", ")}`);
  console.log(`📊 Filtered to ${filtered.length} basic foods from ${foods.length} total`);
  
  // Sort by category priority, then alphabetically
  const sorted = filtered.sort((a, b) => {
    const aPriority = basicCategories.indexOf(a.categoryId);
    const bPriority = basicCategories.indexOf(b.categoryId);
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    return a.description.localeCompare(b.description);
  });
  
  return sorted.slice(0, limit);
}

