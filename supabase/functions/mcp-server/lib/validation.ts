/**
 * Input Validation Module
 * 
 * Provides centralized input validation for MCP tools.
 * Uses Zod schemas for runtime type checking.
 * 
 * Part of: Step 5 - Security Hardening
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Payload Size Validation
// ============================================================================

/**
 * Maximum request body size (256 KB)
 */
export const MAX_PAYLOAD_SIZE = 256 * 1024; // 256 KB

/**
 * Check if request payload exceeds size limit
 * 
 * @param req - HTTP request
 * @returns true if payload is too large
 */
export async function isPayloadTooLarge(req: Request): Promise<boolean> {
  const contentLength = req.headers.get("content-length");
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return size > MAX_PAYLOAD_SIZE;
  }
  
  // If no Content-Length header, we can't check size upfront
  // Will be checked when reading body
  return false;
}

/**
 * Read and validate request body size
 * 
 * @param req - HTTP request
 * @returns Parsed JSON body or null if too large
 */
export async function readRequestBody(req: Request): Promise<any | null> {
  try {
    const text = await req.text();
    
    // Check size
    if (text.length > MAX_PAYLOAD_SIZE) {
      return null;
    }
    
    // Parse JSON
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * Validate input against a Zod schema
 * 
 * @param schema - Zod schema
 * @param input - Input data to validate
 * @returns Validation result
 */
export function validateInput(
  schema: z.ZodSchema,
  input: unknown
): ValidationResult {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  // Extract validation errors
  const errors: ValidationError[] = result.error.errors.map(err => ({
    field: err.path.join("."),
    message: err.message,
  }));
  
  return {
    success: false,
    errors,
  };
}

/**
 * Format validation errors for user-facing message
 * 
 * @param errors - Validation errors
 * @returns Human-readable error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return "Invalid input";
  }
  
  if (errors.length === 1) {
    return `${errors[0].field}: ${errors[0].message}`;
  }
  
  // Multiple errors
  const errorList = errors
    .slice(0, 3) // Show max 3 errors
    .map(err => `${err.field}: ${err.message}`)
    .join("; ");
  
  if (errors.length > 3) {
    return `${errorList}; and ${errors.length - 3} more error(s)`;
  }
  
  return errorList;
}

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Common schema for pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

/**
 * Common schema for location
 */
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Common schema for date range
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// Tool Schema Registry
// ============================================================================

/**
 * Registry of tool schemas
 * Maps tool name to Zod schema
 */
const TOOL_SCHEMAS: Map<string, z.ZodSchema> = new Map();

/**
 * Register a schema for a tool
 * 
 * @param toolName - Tool name
 * @param schema - Zod schema
 */
export function registerSchema(toolName: string, schema: z.ZodSchema): void {
  TOOL_SCHEMAS.set(toolName, schema);
}

/**
 * Get schema for a tool
 * 
 * @param toolName - Tool name
 * @returns Zod schema or undefined if not registered
 */
export function getSchema(toolName: string): z.ZodSchema | undefined {
  return TOOL_SCHEMAS.get(toolName);
}

/**
 * Check if a tool has a registered schema
 * 
 * @param toolName - Tool name
 * @returns true if schema is registered
 */
export function hasSchema(toolName: string): boolean {
  return TOOL_SCHEMAS.has(toolName);
}

/**
 * Validate tool input using registered schema
 * 
 * @param toolName - Tool name
 * @param input - Input data
 * @returns Validation result or null if no schema registered
 */
export function validateToolInput(
  toolName: string,
  input: unknown
): ValidationResult | null {
  const schema = getSchema(toolName);
  
  if (!schema) {
    return null; // No schema registered, skip validation
  }
  
  return validateInput(schema, input);
}

// ============================================================================
// Auto-register schemas
// ============================================================================

// Import and register tool schemas
// This will be expanded as more schemas are added

// Example: Register search_restaurants schema
try {
  const { SearchRestaurantsSchema } = await import("../schemas/search_restaurants.ts");
  registerSchema("search_restaurants", SearchRestaurantsSchema);
} catch {
  // Schema not found, skip registration
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isPayloadTooLarge,
  readRequestBody,
  validateInput,
  validateToolInput,
  formatValidationErrors,
  registerSchema,
  getSchema,
  hasSchema,
};
