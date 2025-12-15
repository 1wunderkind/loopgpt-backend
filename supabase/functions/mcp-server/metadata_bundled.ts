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
