/**
 * Validation Helpers for TheLoopGPT MCP Tools
 * Zod schema validation with user-friendly error messages
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ValidationError } from "./errors.ts";

/**
 * Validate input against a Zod schema
 * Throws ValidationError with user-friendly message on failure
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  toolName: string
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join(".");
      return `${path}: ${err.message}`;
    }).join("; ");

    throw new ValidationError(
      `Validation failed for ${toolName}: ${errors}`,
      `Invalid input: ${errors}`
    );
  }

  return result.data;
}

/**
 * Validate output against a Zod schema
 * Logs warning and returns null on failure (graceful degradation)
 */
export function validateOutput<T>(
  schema: z.ZodSchema<T>,
  output: unknown,
  toolName: string
): T | null {
  const result = schema.safeParse(output);

  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join(".");
      return `${path}: ${err.message}`;
    }).join("; ");

    console.warn(`Output validation failed for ${toolName}: ${errors}`);
    return null;
  }

  return result.data;
}
