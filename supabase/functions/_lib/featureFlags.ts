/**
 * Feature Flags Utility
 * Allows gradual rollout of features
 */

import type { FeatureFlag } from "./types.ts";

// In-memory cache for feature flags (in production, this would query Supabase)
const flagCache = new Map<string, FeatureFlag>();

/**
 * Check if a feature is enabled
 * @param flagKey - The feature flag key
 * @param userId - Optional user ID for percentage-based rollouts
 * @returns true if feature is enabled for this user
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId?: string
): Promise<boolean> {
  // Check cache first
  let flag = flagCache.get(flagKey);

  // If not in cache, would query Supabase here
  // For now, use default values
  if (!flag) {
    flag = getDefaultFlag(flagKey);
    flagCache.set(flagKey, flag);
  }

  if (!flag.enabled) {
    return false;
  }

  // If rollout percentage is 100, always enabled
  if (!flag.rollout_percentage || flag.rollout_percentage >= 100) {
    return true;
  }

  // If no user ID, can't do percentage-based rollout
  if (!userId) {
    return flag.rollout_percentage >= 50; // Default to 50% threshold
  }

  // Hash user ID to get consistent percentage
  const userHash = hashString(userId);
  const userPercentage = userHash % 100;

  return userPercentage < flag.rollout_percentage;
}

/**
 * Get feature flag configuration
 */
export async function getFeatureFlag(flagKey: string): Promise<FeatureFlag | null> {
  // Check cache
  let flag = flagCache.get(flagKey);

  if (!flag) {
    flag = getDefaultFlag(flagKey);
    flagCache.set(flagKey, flag);
  }

  return flag;
}

/**
 * Get default flag values
 */
function getDefaultFlag(flagKey: string): FeatureFlag {
  const defaults: Record<string, FeatureFlag> = {
    affiliate_links: {
      key: "affiliate_links",
      enabled: true,
      rollout_percentage: 100,
      description: "Enable affiliate link generation",
    },
    logging: {
      key: "logging",
      enabled: true,
      rollout_percentage: 100,
      description: "Enable detailed logging",
    },
    cache_recipes: {
      key: "cache_recipes",
      enabled: true,
      rollout_percentage: 100,
      description: "Cache recipes from external GPTs",
    },
    multilingual: {
      key: "multilingual",
      enabled: true,
      rollout_percentage: 100,
      description: "Enable multilingual support",
    },
    beta_meal_plans: {
      key: "beta_meal_plans",
      enabled: false,
      rollout_percentage: 0,
      description: "Beta meal plan features",
    },
  };

  return (
    defaults[flagKey] || {
      key: flagKey,
      enabled: false,
      rollout_percentage: 0,
      description: "Unknown feature flag",
    }
  );
}

/**
 * Simple string hash function for consistent user percentage
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clear feature flag cache (useful for testing or when flags are updated)
 */
export function clearFlagCache(): void {
  flagCache.clear();
}

/**
 * Set a feature flag in cache (for testing)
 */
export function setFeatureFlag(flag: FeatureFlag): void {
  flagCache.set(flag.key, flag);
}

