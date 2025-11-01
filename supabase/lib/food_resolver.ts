/**
 * LoopGPT Food Resolver
 * Runtime loader for 1,000+ food database with fuzzy search
 * 
 * Features:
 * - CDN-hosted immutable data (Supabase Storage)
 * - In-memory caching (singleton pattern)
 * - N-gram fuzzy matching
 * - < 60ms cold load, < 1ms warm lookup
 */

export interface Food {
  id: number;
  name: string;
  aliases?: string[];
  group: string;
  measures?: Array<{ label: string; grams: number }>;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface NGramIndex {
  [token: string]: number[];
}

export interface Manifest {
  version: string;
  count: number;
  generated_at: string;
}

/**
 * Food database resolver with CDN loading and in-memory caching
 */
class FoodResolver {
  private static instance: FoodResolver;
  
  private foods: Food[] | null = null;
  private foodsById: Map<number, Food> | null = null;
  private foodsByName: Map<string, Food> | null = null;
  private index: NGramIndex | null = null;
  private manifest: Manifest | null = null;
  
  private readonly cdnBaseUrl: string;
  private readonly version: string;
  
  private constructor(cdnBaseUrl: string, version: string = "v1") {
    this.cdnBaseUrl = cdnBaseUrl;
    this.version = version;
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(cdnBaseUrl?: string, version?: string): FoodResolver {
    if (!FoodResolver.instance) {
      if (!cdnBaseUrl) {
        throw new Error("CDN base URL required for first initialization");
      }
      FoodResolver.instance = new FoodResolver(cdnBaseUrl, version);
    }
    return FoodResolver.instance;
  }
  
  /**
   * Load all data from CDN (called once on cold start)
   */
  public async load(): Promise<void> {
    if (this.foods) {
      return; // Already loaded
    }
    
    const startTime = performance.now();
    
    // Load manifest
    const manifestUrl = `${this.cdnBaseUrl}/manifest@${this.version}.json`;
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) {
      throw new Error(`Failed to load manifest: ${manifestRes.statusText}`);
    }
    this.manifest = await manifestRes.json();
    
    // Load foods
    const foodsUrl = `${this.cdnBaseUrl}/foods@${this.version}.json`;
    const foodsRes = await fetch(foodsUrl);
    if (!foodsRes.ok) {
      throw new Error(`Failed to load foods: ${foodsRes.statusText}`);
    }
    this.foods = await foodsRes.json();
    
    // Load n-gram index
    const indexUrl = `${this.cdnBaseUrl}/index.ngram@${this.version}.json`;
    const indexRes = await fetch(indexUrl);
    if (!indexRes.ok) {
      throw new Error(`Failed to load index: ${indexRes.statusText}`);
    }
    this.index = await indexRes.json();
    
    // Build lookup maps
    this.foodsById = new Map();
    this.foodsByName = new Map();
    
    for (const food of this.foods) {
      this.foodsById.set(food.id, food);
      this.foodsByName.set(this.normalize(food.name), food);
      
      // Also index aliases
      if (food.aliases) {
        for (const alias of food.aliases) {
          this.foodsByName.set(this.normalize(alias), food);
        }
      }
    }
    
    const loadTime = Math.round(performance.now() - startTime);
    console.log(`✅ Food database loaded: ${this.foods.length} foods, ${Object.keys(this.index).length} tokens (${loadTime}ms)`);
  }
  
  /**
   * Get food by ID
   */
  public async getById(id: number): Promise<Food | null> {
    await this.load();
    return this.foodsById!.get(id) || null;
  }
  
  /**
   * Find food by exact name match
   */
  public async findExact(name: string): Promise<Food | null> {
    await this.load();
    return this.foodsByName!.get(this.normalize(name)) || null;
  }
  
  /**
   * Find foods by fuzzy search
   */
  public async findFuzzy(query: string, limit: number = 10): Promise<Array<{ food: Food; score: number }>> {
    await this.load();
    
    const startTime = performance.now();
    
    // Tokenize query
    const queryTokens = this.tokenize(query);
    
    // Score each food by token overlap
    const scores = new Map<number, number>();
    
    for (const token of queryTokens) {
      const foodIds = this.index![token] || [];
      for (const id of foodIds) {
        scores.set(id, (scores.get(id) || 0) + 1);
      }
    }
    
    // Sort by score and return top results
    const results = Array.from(scores.entries())
      .map(([id, score]) => ({
        food: this.foodsById!.get(id)!,
        score: score / queryTokens.length, // Normalize by query length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    const searchTime = Math.round(performance.now() - startTime);
    console.log(`🔍 Fuzzy search "${query}" → ${results.length} results (${searchTime}ms)`);
    
    return results;
  }
  
  /**
   * Get all foods (for admin/debugging)
   */
  public async getAll(): Promise<Food[]> {
    await this.load();
    return this.foods!;
  }
  
  /**
   * Get manifest
   */
  public async getManifest(): Promise<Manifest> {
    await this.load();
    return this.manifest!;
  }
  
  /**
   * Normalize string for matching
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  /**
   * Tokenize string into trigrams + full words
   */
  private tokenize(str: string): string[] {
    const clean = str
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]/g, "")
      .toLowerCase();
    
    const tokens = new Set<string>();
    
    // Generate trigrams
    for (let i = 0; i < clean.length - 2; i++) {
      tokens.add(clean.slice(i, i + 3));
    }
    
    // Add full words
    const words = str.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length >= 3) {
        tokens.add(word);
      }
    }
    
    return Array.from(tokens);
  }
}

/**
 * Initialize food resolver (call once in your Edge Function)
 */
export function initFoodResolver(cdnBaseUrl: string, version: string = "v1"): FoodResolver {
  return FoodResolver.getInstance(cdnBaseUrl, version);
}

/**
 * Get food resolver instance
 */
export function getFoodResolver(): FoodResolver {
  return FoodResolver.getInstance();
}

