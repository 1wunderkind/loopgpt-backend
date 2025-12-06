/**
 * Provider Registry
 * Centralized registry for all commerce providers
 */

import type { ICommerceProvider } from './ICommerceProvider.ts';
import type { ProviderId } from '../types/index.ts';

import { mealmeProvider } from './mealmeProvider.ts';
import { instacartProvider } from './instacartProvider.ts';
import { krogerProvider } from './krogerProvider.ts';
import { walmartProvider } from './walmartProvider.ts';

/**
 * Provider registry map
 * All providers must implement ICommerceProvider interface
 */
const providersMap: Record<ProviderId, ICommerceProvider> = {
  MEALME: mealmeProvider,
  INSTACART: instacartProvider,
  KROGER_API: krogerProvider,
  WALMART_API: walmartProvider,
};

/**
 * Get a provider by ID
 * @throws Error if provider is not found
 */
export function getProvider(id: ProviderId): ICommerceProvider {
  const provider = providersMap[id];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

/**
 * Get all registered providers
 */
export function getAllProviders(): ICommerceProvider[] {
  return Object.values(providersMap);
}

/**
 * Get all provider IDs
 */
export function getAllProviderIds(): ProviderId[] {
  return Object.keys(providersMap) as ProviderId[];
}

/**
 * Check if a provider is registered
 */
export function hasProvider(id: ProviderId): boolean {
  return id in providersMap;
}

/**
 * Get provider by ID (safe version that returns undefined if not found)
 */
export function getProviderSafe(id: ProviderId): ICommerceProvider | undefined {
  return providersMap[id];
}

/**
 * Export the registry for direct access if needed
 */
export const providerRegistry = providersMap;
