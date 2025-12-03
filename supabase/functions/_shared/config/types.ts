/**
 * TheLoopGPT Metadata Types
 * 
 * Type definitions for centralized metadata configuration that powers:
 * - ChatGPT Apps SDK manifest
 * - MCP tool descriptions
 * - App Store submission metadata
 * - Analytics event naming
 */

// ============================================================================
// Routing Types
// ============================================================================

export type RoutingPriority = "critical" | "high" | "medium" | "low";

export type RoutingHint = {
  description: string;
  examples: string[];
  priority: RoutingPriority;
  confidence: number; // 0.0 - 1.0, threshold for invocation
  relatedTools: string[]; // Which tools should be called for this intent
};

export type NegativeRoutingHint = {
  description: string;
  examples: string[];
  reason: string; // Why we should NOT invoke for these
};

export type ToolChain = {
  name: string;
  description: string;
  sequence: string[]; // Tool IDs in order
  trigger: string; // When to use this chain
};

export type RoutingMetadata = {
  triggerHints: Record<string, RoutingHint>;
  negativeHints: NegativeRoutingHint[];
  toolChains: ToolChain[];
};

// ============================================================================
// Tool Description Types
// ============================================================================

export type ToolParameter = {
  name: string;
  type: string;
  description: string;
  example: string;
  default?: string;
};

export type ToolReturnFormat = {
  description: string;
  fields: string[];
  example: string;
};

export type ToolDescription = {
  // Identity
  toolId: string;
  displayName: string;
  
  // What ChatGPT pattern-matches against
  primaryDescription: string;
  
  // Detailed capabilities
  whenToUse: string[];
  whenNotToUse: string[];
  
  // What makes this tool special
  uniqueCapabilities: string[];
  
  // Parameters
  requiredParams: ToolParameter[];
  optionalParams: ToolParameter[];
  
  // Output
  returnFormat: ToolReturnFormat;
  
  // Integration
  chainsWith: string[]; // Other tools this commonly pairs with
  
  // Branding
  brandedName: string; // TheLoopGPT branded name
  legacyName?: string; // Old name for backward compatibility
  
  // Categorization
  category: string;
  subcategory?: string;
};

// ============================================================================
// App Identity Types
// ============================================================================

export type AppIdentity = {
  // Primary identifiers
  appId: string;
  displayName: string;
  shortName: string;
  
  // Version control for metadata changes
  METADATA_VERSION: string;
  LAST_UPDATED: string;
  
  // Legacy internal names (for backward compatibility)
  legacyNames: {
    recipes: string;
    nutrition: string;
    tracking: string;
    planning: string;
  };
  
  // URLs
  website: string;
  statusPage: string;
  supportEmail: string;
};

export type AppTitles = {
  primary: string;
  variants: string[];
  subtitle: string;
};

// ============================================================================
// Seasonal & Contextual Types
// ============================================================================

export type SeasonalKeywords = {
  winter: string[];
  spring: string[];
  summer: string[];
  fall: string[];
  timeOfDay: {
    morning: string[];
    afternoon: string[];
    evening: string[];
    lateNight: string[];
  };
};

// ============================================================================
// Complete Metadata Type
// ============================================================================

export type TheLoopGPTMetadata = {
  // Identity
  identity: AppIdentity;
  titles: AppTitles;
  
  // Descriptions
  shortDescription: string;
  longDescription: string;
  
  // Tags & Keywords
  primaryTags: readonly string[];
  secondaryTags: readonly string[];
  searchKeywords: readonly string[];
  seasonalKeywords: SeasonalKeywords;
  differentiatorKeywords: readonly string[];
  
  // Routing
  routing: RoutingMetadata;
  
  // Tools
  tools: Record<string, ToolDescription>;
  
  // Metadata
  version: string;
  lastUpdated: string;
};

// ============================================================================
// Export Configuration Types
// ============================================================================

export type AppStoreSubmission = {
  appId: string;
  displayName: string;
  shortDescription: string;
  longDescription: string;
  primaryTags: string[];
  secondaryTags: string[];
  searchKeywords: string[];
  website: string;
  supportEmail: string;
  version: string;
};

export type MCPToolManifest = {
  version: string;
  tools: Array<{
    id: string;
    name: string;
    description: string;
    parameters: ToolParameter[];
    returnFormat: ToolReturnFormat;
  }>;
  routing: RoutingMetadata;
};
