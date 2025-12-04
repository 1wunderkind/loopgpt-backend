/**
 * User Preferences Tool
 * 
 * Allows users to update their dietary preferences, calorie targets, and cuisine preferences.
 */

import { getUserProfileStore, type UserProfile } from "./userProfile.ts";
import { logSuccess, logError } from "./errorTypes.ts";

/**
 * Update User Preferences Input
 */
export interface UpdatePreferencesInput {
  userId: string;
  dietTags?: string[]; // e.g., ["vegetarian", "gluten-free", "low-carb"]
  caloriesPerDay?: number; // Daily calorie target
  cuisines?: string[]; // Preferred cuisines (e.g., ["Italian", "Mexican", "Thai"])
}

/**
 * Update User Preferences Output
 */
export interface UpdatePreferencesOutput {
  success: boolean;
  message: string;
  profile: UserProfile;
}

/**
 * Validate update preferences input
 */
function validateUpdatePreferencesInput(input: any): UpdatePreferencesInput {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object");
  }
  
  if (!input.userId || typeof input.userId !== "string") {
    throw new Error("userId is required and must be a string");
  }
  
  // Validate dietTags if provided
  if (input.dietTags !== undefined) {
    if (!Array.isArray(input.dietTags)) {
      throw new Error("dietTags must be an array");
    }
    if (!input.dietTags.every((tag: any) => typeof tag === "string")) {
      throw new Error("dietTags must be an array of strings");
    }
  }
  
  // Validate caloriesPerDay if provided
  if (input.caloriesPerDay !== undefined) {
    if (typeof input.caloriesPerDay !== "number") {
      throw new Error("caloriesPerDay must be a number");
    }
    if (input.caloriesPerDay < 1000 || input.caloriesPerDay > 5000) {
      throw new Error("caloriesPerDay must be between 1000 and 5000");
    }
  }
  
  // Validate cuisines if provided
  if (input.cuisines !== undefined) {
    if (!Array.isArray(input.cuisines)) {
      throw new Error("cuisines must be an array");
    }
    if (!input.cuisines.every((cuisine: any) => typeof cuisine === "string")) {
      throw new Error("cuisines must be an array of strings");
    }
  }
  
  return {
    userId: input.userId,
    dietTags: input.dietTags,
    caloriesPerDay: input.caloriesPerDay,
    cuisines: input.cuisines,
  };
}

/**
 * Update User Preferences
 * 
 * Updates user's dietary preferences, calorie targets, and cuisine preferences.
 * Creates a new profile if user doesn't have one.
 */
export async function updateUserPreferences(
  input: any
): Promise<UpdatePreferencesOutput> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validatedInput = validateUpdatePreferencesInput(input);
    
    // Get profile store
    const store = getUserProfileStore();
    
    // Get existing profile or create new one
    let profile = await store.getProfile(validatedInput.userId);
    
    if (!profile) {
      // Create new profile with defaults
      profile = {
        userId: validatedInput.userId,
        dietTags: [],
        caloriesPerDay: 2000,
        cuisines: [],
      };
    }
    
    // Update profile with new values
    if (validatedInput.dietTags !== undefined) {
      profile.dietTags = validatedInput.dietTags;
    }
    if (validatedInput.caloriesPerDay !== undefined) {
      profile.caloriesPerDay = validatedInput.caloriesPerDay;
    }
    if (validatedInput.cuisines !== undefined) {
      profile.cuisines = validatedInput.cuisines;
    }
    
    // Save updated profile
    await store.upsertProfile(profile);
    
    const duration = Date.now() - startTime;
    logSuccess("user.updatePreferences", duration, {
      userId: validatedInput.userId,
      hasDietTags: !!profile.dietTags?.length,
      hasCalories: !!profile.caloriesPerDay,
      hasCuisines: !!profile.cuisines?.length,
    });
    
    return {
      success: true,
      message: "Preferences updated successfully",
      profile,
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("user.updatePreferences", error, duration);
    throw error;
  }
}
