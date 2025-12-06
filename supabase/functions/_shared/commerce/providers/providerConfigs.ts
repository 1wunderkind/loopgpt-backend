/**
 * Provider Configuration
 * Centralized config for all commerce providers
 */

import type { ProviderConfig, ProviderId } from '../types/index.ts';

/**
 * Provider configurations with feature flags
 * 
 * Environment Variables:
 * - LOOPGPT_ENABLE_KROGER: Enable Kroger direct API (default: false)
 * - LOOPGPT_ENABLE_WALMART: Enable Walmart direct API (default: false)
 * - LOOPGPT_PREFER_DIRECT_WALMART: Boost Walmart priority (default: false)
 * - LOOPGPT_PREFER_DIRECT_KROGER: Boost Kroger priority (default: false)
 */

// Helper to check if a feature is enabled
function isEnabled(envVar: string, defaultValue: boolean = false): boolean {
  const value = Deno.env.get(envVar);
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

// Helper to get priority with optional boost
function getPriority(basePriority: number, boostEnvVar: string): number {
  const boost = isEnabled(boostEnvVar) ? 20 : 0;
  return basePriority + boost;
}

/**
 * Provider configurations
 * 
 * Priority system:
 * - Higher priority = more likely to be selected (before scoring)
 * - Base priorities: 40-60
 * - Boost: +20 when "prefer direct" flag is enabled
 */
export const providerConfigs: Record<ProviderId, ProviderConfig> = {
  MEALME: {
    id: 'MEALME',
    name: 'MealMe MCP',
    enabled: true, // Always enabled (fallback provider)
    priority: 50,
    commissionRate: 0.03, // 3% commission
    regions: ['US'],
    timeout: 10000, // 10 seconds
    retries: 2,
  },

  INSTACART: {
    id: 'INSTACART',
    name: 'Instacart',
    enabled: true, // Always enabled
    priority: 40,
    commissionRate: 0.02, // 2% commission
    regions: ['US'],
    timeout: 10000, // 10 seconds
    retries: 2,
  },

  KROGER_API: {
    id: 'KROGER_API',
    name: 'Kroger Direct',
    enabled: isEnabled('LOOPGPT_ENABLE_KROGER', false),
    priority: getPriority(60, 'LOOPGPT_PREFER_DIRECT_KROGER'),
    commissionRate: 0.03, // 3% commission
    regions: ['US'],
    timeout: 15000, // 15 seconds (direct API may be slower)
    retries: 3,
  },

  WALMART_API: {
    id: 'WALMART_API',
    name: 'Walmart Direct',
    enabled: isEnabled('LOOPGPT_ENABLE_WALMART', false),
    priority: getPriority(60, 'LOOPGPT_PREFER_DIRECT_WALMART'),
    commissionRate: 0.03, // 3% commission
    regions: ['US'],
    timeout: 15000, // 15 seconds (direct API may be slower)
    retries: 3,
  },
};

/**
 * Get configuration for a specific provider
 */
export function getProviderConfig(id: ProviderId): ProviderConfig {
  const config = providerConfigs[id];
  if (!config) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return config;
}

/**
 * Get all enabled providers
 */
export function getEnabledProviders(): ProviderConfig[] {
  return Object.values(providerConfigs).filter(config => config.enabled);
}

/**
 * Get enabled providers sorted by priority (highest first)
 */
export function getEnabledProvidersSorted(): ProviderConfig[] {
  return getEnabledProviders().sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a provider is enabled
 */
export function isProviderEnabled(id: ProviderId): boolean {
  return providerConfigs[id]?.enabled ?? false;
}

/**
 * Get provider IDs that are currently enabled
 */
export function getEnabledProviderIds(): ProviderId[] {
  return Object.keys(providerConfigs).filter(id => 
    providerConfigs[id as ProviderId].enabled
  ) as ProviderId[];
}
