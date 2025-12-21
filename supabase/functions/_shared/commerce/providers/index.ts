/**
 * Commerce Providers - Public API
 * Centralized exports for all provider-related modules
 */

// Provider interface and base class
export type {
  ICommerceProvider,
  QuoteRequest,
  ShippingAddress,
  UserContext,
} from "./ICommerceProvider.ts";
export { BaseCommerceProvider } from "./ICommerceProvider.ts";

// Provider implementations
export { mealmeProvider } from "./mealmeProvider.ts";
export { instacartProvider } from "./instacartProvider.ts";
export { krogerProvider } from "./krogerProvider.ts";
export { walmartProvider } from "./walmartProvider.ts";

// Provider registry
export {
  getAllProviderIds,
  getAllProviders,
  getProvider,
  getProviderSafe,
  hasProvider,
  providerRegistry,
} from "./providerRegistry.ts";

// Provider configs
export {
  getEnabledProviderIds,
  getEnabledProviders,
  getEnabledProvidersSorted,
  getProviderConfig,
  isProviderEnabled,
  providerConfigs,
} from "./providerConfigs.ts";
