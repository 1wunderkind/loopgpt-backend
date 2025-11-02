/**
 * Menu Filtering and Nutrition Goal Alignment
 * 
 * Filters restaurant menu items based on calorie targets and macro goals.
 * Calculates goal alignment scores to rank items by fit.
 */

export interface MenuItem {
  item_name: string;
  description: string;
  price: number;
  calories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface MacroTargets {
  protein_min?: number;
  protein_max?: number;
  carbs_min?: number;
  carbs_max?: number;
  fat_min?: number;
  fat_max?: number;
}

export interface FilteredMenuItem extends MenuItem {
  goal_alignment_score: number;
  alignment_reasons: string[];
  calorie_deviation: number;
}

export interface FilterOptions {
  calorie_target?: number;
  calorie_tolerance?: number; // Percentage (default: 20%)
  macro_targets?: MacroTargets;
  goal_type?: "weight_loss" | "muscle_gain" | "maintenance";
}

/**
 * Calculate goal alignment score for a menu item
 * Score ranges from 0-100, where 100 is perfect alignment
 */
export function calculateGoalAlignment(
  item: MenuItem,
  options: FilterOptions
): number {
  let score = 100;
  const reasons: string[] = [];

  // If no nutrition data, return low score
  if (!item.calories) {
    return 20; // Low score for items without nutrition data
  }

  // Calorie alignment (40% weight)
  if (options.calorie_target) {
    const tolerance = options.calorie_tolerance || 20;
    const maxDeviation = (options.calorie_target * tolerance) / 100;
    const calorieDeviation = Math.abs(item.calories - options.calorie_target);
    
    if (calorieDeviation <= maxDeviation) {
      const calorieScore = 40 * (1 - calorieDeviation / maxDeviation);
      score -= (40 - calorieScore);
    } else {
      score -= 40; // Outside tolerance range
    }
  }

  // Macro alignment (60% weight total)
  if (item.macros && options.macro_targets) {
    const macros = item.macros;
    const targets = options.macro_targets;

    // Protein alignment (30% weight)
    if (targets.protein_min !== undefined && macros.protein !== undefined) {
      if (macros.protein >= targets.protein_min) {
        const proteinScore = Math.min(macros.protein / targets.protein_min, 1.5) * 20;
        score -= (30 - Math.min(proteinScore, 30));
      } else {
        const proteinDeficit = (targets.protein_min - macros.protein) / targets.protein_min;
        score -= 30 * proteinDeficit;
      }
    }

    // Carb alignment (20% weight)
    if (targets.carbs_max !== undefined && macros.carbs !== undefined) {
      if (macros.carbs <= targets.carbs_max) {
        // Within limit - good
        score -= 0;
      } else {
        const carbExcess = (macros.carbs - targets.carbs_max) / targets.carbs_max;
        score -= 20 * Math.min(carbExcess, 1);
      }
    }

    // Fat alignment (10% weight)
    if (targets.fat_max !== undefined && macros.fat !== undefined) {
      if (macros.fat <= targets.fat_max) {
        // Within limit - good
        score -= 0;
      } else {
        const fatExcess = (macros.fat - targets.fat_max) / targets.fat_max;
        score -= 10 * Math.min(fatExcess, 1);
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get alignment reasons for display
 */
export function getAlignmentReasons(
  item: MenuItem,
  options: FilterOptions,
  score: number
): string[] {
  const reasons: string[] = [];

  if (!item.calories) {
    reasons.push("Nutrition data not available");
    return reasons;
  }

  // Calorie alignment
  if (options.calorie_target) {
    const deviation = Math.abs(item.calories - options.calorie_target);
    const percentDev = (deviation / options.calorie_target) * 100;
    
    if (percentDev <= 10) {
      reasons.push("Perfect calorie match");
    } else if (percentDev <= 20) {
      reasons.push("Close to calorie target");
    } else {
      reasons.push(`${Math.round(percentDev)}% ${item.calories > options.calorie_target ? 'over' : 'under'} calorie target`);
    }
  }

  // Protein alignment
  if (item.macros?.protein && options.macro_targets?.protein_min) {
    if (item.macros.protein >= options.macro_targets.protein_min * 1.2) {
      reasons.push("High protein (excellent)");
    } else if (item.macros.protein >= options.macro_targets.protein_min) {
      reasons.push("Good protein content");
    } else {
      reasons.push("Low protein");
    }
  }

  // Carb alignment
  if (item.macros?.carbs && options.macro_targets?.carbs_max) {
    if (item.macros.carbs <= options.macro_targets.carbs_max * 0.8) {
      reasons.push("Low carb (great)");
    } else if (item.macros.carbs <= options.macro_targets.carbs_max) {
      reasons.push("Moderate carbs");
    } else {
      reasons.push("High carbs");
    }
  }

  // Overall score
  if (score >= 90) {
    reasons.unshift("Excellent fit for your goals");
  } else if (score >= 75) {
    reasons.unshift("Good fit for your goals");
  } else if (score >= 60) {
    reasons.unshift("Acceptable fit");
  }

  return reasons;
}

/**
 * Filter menu items by nutrition goals
 */
export function filterMenuItems(
  items: MenuItem[],
  options: FilterOptions
): FilteredMenuItem[] {
  const filtered: FilteredMenuItem[] = [];

  for (const item of items) {
    // Skip items without nutrition data if calorie target is specified
    if (options.calorie_target && !item.calories) {
      continue;
    }

    const score = calculateGoalAlignment(item, options);
    
    // Only include items with score >= 50 (reasonable fit)
    if (score >= 50) {
      const calorieDeviation = options.calorie_target && item.calories
        ? Math.abs(item.calories - options.calorie_target)
        : 0;

      filtered.push({
        ...item,
        goal_alignment_score: score,
        alignment_reasons: getAlignmentReasons(item, options, score),
        calorie_deviation: calorieDeviation,
      });
    }
  }

  // Sort by goal alignment score (highest first)
  filtered.sort((a, b) => b.goal_alignment_score - a.goal_alignment_score);

  return filtered;
}

/**
 * Get recommended macro targets based on goal type
 */
export function getRecommendedMacroTargets(
  goalType: "weight_loss" | "muscle_gain" | "maintenance",
  calorieTarget: number
): MacroTargets {
  switch (goalType) {
    case "weight_loss":
      return {
        protein_min: Math.round(calorieTarget * 0.30 / 4), // 30% protein
        carbs_max: Math.round(calorieTarget * 0.40 / 4), // 40% carbs max
        fat_max: Math.round(calorieTarget * 0.30 / 9), // 30% fat max
      };
    
    case "muscle_gain":
      return {
        protein_min: Math.round(calorieTarget * 0.35 / 4), // 35% protein
        carbs_max: Math.round(calorieTarget * 0.45 / 4), // 45% carbs max
        fat_max: Math.round(calorieTarget * 0.20 / 9), // 20% fat max
      };
    
    case "maintenance":
    default:
      return {
        protein_min: Math.round(calorieTarget * 0.25 / 4), // 25% protein
        carbs_max: Math.round(calorieTarget * 0.50 / 4), // 50% carbs max
        fat_max: Math.round(calorieTarget * 0.25 / 9), // 25% fat max
      };
  }
}

/**
 * Estimate nutrition data for items without it
 * (Fallback when restaurant doesn't provide nutrition info)
 */
export function estimateNutrition(
  itemName: string,
  description: string
): { calories: number; macros: { protein: number; carbs: number; fat: number } } | null {
  const name = itemName.toLowerCase();
  const desc = description.toLowerCase();

  // Simple heuristics based on keywords
  // This is a rough estimate - real implementation would use ML or nutrition API
  
  if (name.includes("salad")) {
    return { calories: 350, macros: { protein: 20, carbs: 30, fat: 15 } };
  }
  
  if (name.includes("burger") || name.includes("sandwich")) {
    return { calories: 650, macros: { protein: 30, carbs: 50, fat: 30 } };
  }
  
  if (name.includes("pizza")) {
    return { calories: 800, macros: { protein: 25, carbs: 80, fat: 35 } };
  }
  
  if (name.includes("bowl") && (desc.includes("rice") || desc.includes("grain"))) {
    return { calories: 550, macros: { protein: 35, carbs: 60, fat: 18 } };
  }
  
  if (name.includes("chicken") || name.includes("fish") || name.includes("salmon")) {
    return { calories: 450, macros: { protein: 40, carbs: 30, fat: 15 } };
  }
  
  if (name.includes("pasta")) {
    return { calories: 700, macros: { protein: 20, carbs: 90, fat: 25 } };
  }

  // Default estimate for unknown items
  return { calories: 500, macros: { protein: 25, carbs: 50, fat: 20 } };
}

/**
 * Group filtered items by restaurant
 */
export function groupByRestaurant(
  items: Array<FilteredMenuItem & { restaurant_id: string; restaurant_name: string }>
): Map<string, Array<FilteredMenuItem & { restaurant_id: string; restaurant_name: string }>> {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.restaurant_id)) {
      grouped.set(item.restaurant_id, []);
    }
    grouped.get(item.restaurant_id).push(item);
  }

  return grouped;
}

/**
 * Get top N items per restaurant
 */
export function getTopItemsPerRestaurant(
  grouped: Map<string, FilteredMenuItem[]>,
  topN: number = 3
): Map<string, FilteredMenuItem[]> {
  const result = new Map();

  for (const [restaurantId, items] of grouped.entries()) {
    result.set(restaurantId, items.slice(0, topN));
  }

  return result;
}
