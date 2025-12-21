/**
 * Input Schema for search_restaurants Tool
 *
 * Validates input parameters before calling the tool.
 * Uses Zod for runtime type checking and validation.
 *
 * Part of: Step 5 - Security Hardening
 */

import { z } from "zod";

/**
 * Schema for search_restaurants tool input
 */
export const SearchRestaurantsSchema = z.object({
  // Query string
  query: z.string()
    .min(1, "Query cannot be empty")
    .max(200, "Query too long (max 200 characters)"),

  // Location (required)
  location: z.object({
    lat: z.number()
      .min(-90, "Latitude must be >= -90")
      .max(90, "Latitude must be <= 90"),
    lng: z.number()
      .min(-180, "Longitude must be >= -180")
      .max(180, "Longitude must be <= 180"),
  }),

  // Optional parameters
  maxResults: z.number()
    .int("Max results must be an integer")
    .min(1, "Max results must be at least 1")
    .max(50, "Max results cannot exceed 50")
    .optional()
    .default(10),

  radius: z.number()
    .min(0.1, "Radius must be at least 0.1 km")
    .max(50, "Radius cannot exceed 50 km")
    .optional()
    .default(5),

  cuisine: z.string()
    .max(50, "Cuisine filter too long")
    .optional(),

  priceRange: z.enum(["$", "$$", "$$$", "$$$$"])
    .optional(),

  openNow: z.boolean()
    .optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type SearchRestaurantsInput = z.infer<typeof SearchRestaurantsSchema>;

/**
 * Validate input and return parsed result
 *
 * @param input - Raw input object
 * @returns Validation result
 */
export function validateSearchRestaurantsInput(input: unknown) {
  return SearchRestaurantsSchema.safeParse(input);
}
