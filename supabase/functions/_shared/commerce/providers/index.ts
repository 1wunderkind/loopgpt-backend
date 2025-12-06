/**
 * Commerce Providers - Public API
 * Centralized exports for all provider-related modules
 */

// Provider interface and base class
export type { ICommerceProvider, QuoteRequest, ShippingAddress, UserContext } from './ICommerceProvider.ts';
export { BaseCommerceProvider } from './ICommerceProvider.ts';

// Provider implementations
export { mealmeProvider } from './mealmeProvider.ts';
export { instacartProvider } from './instacartProvider.ts';
export { krogerProvider } from './krogerProvider.ts';
export { walmartProvider } from './walmartProvider.ts';

// Provider registry
export {
  getProvider,
  getAllProviders,
  getAllProviderIds,
  hasProvider,
  getProviderSafe,
  providerRegistry,
} from './providerRegistry.ts';

// Provider configs
export {
  providerConfigs,
  getProviderConfig,
  getEnabledProviders,
  getEnabledProvidersSorted,
  isProviderEnabled,
  getEnabledProviderIds,
} from './providerConfigs.ts';
