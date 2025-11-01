/**
 * N-gram fuzzy search index generator
 */

import { tokenize } from "./utils.ts";

interface Food {
  id: number;
  name: string;
  aliases?: string[];
  [key: string]: unknown;
}

export interface NGramIndex {
  [token: string]: number[];
}

/**
 * Build n-gram inverted index for fuzzy search
 */
export function buildNGramIndex(foods: Food[]): NGramIndex {
  const index: NGramIndex = {};
  
  for (const food of foods) {
    // Tokenize food name
    const nameTokens = tokenize(food.name);
    
    // Tokenize aliases
    const aliasTokens: string[] = [];
    if (food.aliases) {
      for (const alias of food.aliases) {
        aliasTokens.push(...tokenize(alias));
      }
    }
    
    // Combine all tokens
    const allTokens = new Set([...nameTokens, ...aliasTokens]);
    
    // Add food ID to each token's list
    for (const token of allTokens) {
      if (!index[token]) {
        index[token] = [];
      }
      
      // Avoid duplicates
      if (!index[token].includes(food.id)) {
        index[token].push(food.id);
      }
    }
  }
  
  return index;
}

/**
 * Get index statistics
 */
export function getIndexStats(index: NGramIndex): {
  tokenCount: number;
  avgFoodsPerToken: number;
  maxFoodsPerToken: number;
  minFoodsPerToken: number;
} {
  const tokens = Object.keys(index);
  const foodCounts = tokens.map(t => index[t].length);
  
  return {
    tokenCount: tokens.length,
    avgFoodsPerToken: Math.round(foodCounts.reduce((a, b) => a + b, 0) / tokens.length),
    maxFoodsPerToken: Math.max(...foodCounts),
    minFoodsPerToken: Math.min(...foodCounts),
  };
}

