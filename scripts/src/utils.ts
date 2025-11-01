/**
 * Utility functions for food database builder
 */

/**
 * Normalize food name: lowercase, remove punctuation, trim
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,()/]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(raw|cooked|fresh|frozen|canned|dried)\b/gi, "")
    .trim();
}

/**
 * Pluralize a word (simple English rules)
 */
export function pluralize(word: string): string {
  if (word.endsWith("y") && !word.endsWith("ay") && !word.endsWith("ey") && !word.endsWith("oy") && !word.endsWith("uy")) {
    return word.slice(0, -1) + "ies";
  }
  if (word.endsWith("s") || word.endsWith("x") || word.endsWith("z") || word.endsWith("ch") || word.endsWith("sh")) {
    return word + "es";
  }
  if (word.endsWith("f")) {
    return word.slice(0, -1) + "ves";
  }
  if (word.endsWith("fe")) {
    return word.slice(0, -2) + "ves";
  }
  return word + "s";
}

/**
 * Generate aliases for a food name (regional variations, plurals)
 */
export function generateAliases(name: string): string[] {
  const aliases: string[] = [];
  
  // Add plural
  const words = name.split(" ");
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    const pluralLastWord = pluralize(lastWord);
    if (pluralLastWord !== lastWord) {
      aliases.push([...words.slice(0, -1), pluralLastWord].join(" "));
    }
  }
  
  // Regional synonyms
  const swaps: Record<string, string> = {
    "aubergine": "eggplant",
    "courgette": "zucchini",
    "coriander": "cilantro",
    "chickpea": "garbanzo bean",
    "rocket": "arugula",
    "spring onion": "scallion",
    "capsicum": "bell pepper",
  };
  
  for (const [from, to] of Object.entries(swaps)) {
    if (name.includes(from)) {
      aliases.push(name.replace(from, to));
    }
    if (name.includes(to)) {
      aliases.push(name.replace(to, from));
    }
  }
  
  return [...new Set(aliases)];
}

/**
 * Classify food into one of 8 canonical groups
 */
export function classifyGroup(category: string): string {
  const categoryLower = category.toLowerCase();
  
  const groupMap: Record<string, string> = {
    // Meat & Fish
    "meat": "meat",
    "poultry": "meat",
    "beef": "meat",
    "pork": "meat",
    "lamb": "meat",
    "fish": "meat",
    "seafood": "meat",
    "finfish": "meat",
    "shellfish": "meat",
    
    // Vegetables
    "vegetable": "veg",
    "legume": "veg",
    "bean": "veg",
    "pea": "veg",
    
    // Fruits
    "fruit": "fruit",
    "berry": "fruit",
    
    // Grains & Starches
    "cereal": "grain",
    "grain": "grain",
    "bread": "grain",
    "pasta": "grain",
    "rice": "grain",
    "baked": "grain",
    
    // Dairy & Eggs
    "dairy": "dairy",
    "milk": "dairy",
    "cheese": "dairy",
    "yogurt": "dairy",
    "egg": "dairy",
    
    // Oils & Fats
    "oil": "fat",
    "fat": "fat",
    "butter": "fat",
    "margarine": "fat",
    
    // Sauces & Seasonings
    "sauce": "condiment",
    "condiment": "condiment",
    "spice": "condiment",
    "seasoning": "condiment",
    "dressing": "condiment",
    "gravy": "condiment",
  };
  
  for (const [key, group] of Object.entries(groupMap)) {
    if (categoryLower.includes(key)) {
      return group;
    }
  }
  
  return "misc";
}

/**
 * Get default measures for a food group
 */
export function defaultMeasures(group: string): Array<{ label: string; grams: number }> {
  const measuresMap: Record<string, Array<{ label: string; grams: number }>> = {
    "meat": [{ label: "piece", grams: 120 }],
    "veg": [{ label: "cup", grams: 90 }],
    "fruit": [{ label: "cup", grams: 150 }],
    "grain": [{ label: "cup", grams: 160 }],
    "dairy": [{ label: "cup", grams: 240 }],
    "fat": [{ label: "tbsp", grams: 14 }],
    "condiment": [{ label: "tbsp", grams: 15 }],
    "misc": [{ label: "tbsp", grams: 10 }],
  };
  
  return measuresMap[group] || [];
}

/**
 * Tokenize a string into trigrams for fuzzy matching
 */
export function tokenize(str: string): string[] {
  // Normalize and clean
  const clean = str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w]/g, "")
    .toLowerCase();
  
  const grams = new Set<string>();
  
  // Generate trigrams
  for (let i = 0; i < clean.length - 2; i++) {
    grams.add(clean.slice(i, i + 3));
  }
  
  // Also add full words as tokens
  const words = str.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (word.length >= 3) {
      grams.add(word);
    }
  }
  
  return Array.from(grams);
}

/**
 * Slugify a string for use as an ID or filename
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

