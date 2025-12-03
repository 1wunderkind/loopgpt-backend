/**
 * Consolidated Metadata for MCP Server
 * All metadata in one file to avoid bundling issues
 */

// Re-export everything needed
export * from "../_lib/config/types.ts";
export * from "../_lib/config/theloopgptMetadata.ts";
export * from "../_lib/config/toolDescriptions.ts";
export * from "../_lib/config/routingHints.ts";

// Re-export convenience functions
export {
  getCompleteMetadata,
  getToolWithRouting,
  getRecommendedTool,
  MCP_SERVER_INFO
} from "../_lib/config/index.ts";
