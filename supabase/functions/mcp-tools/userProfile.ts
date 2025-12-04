/**
 * User Profile Management
 * 
 * Stores lightweight user preferences for personalization and retention.
 * Uses Supabase for persistent storage.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * User Profile
 * 
 * Stores user preferences for personalized meal suggestions.
 */
export interface UserProfile {
  userId: string;
  dietTags?: string[]; // e.g., ["vegetarian", "gluten-free"]
  caloriesPerDay?: number; // Daily calorie target
  cuisines?: string[]; // Preferred cuisines (e.g., ["Italian", "Mexican"])
  lastPlanDate?: string; // ISO date of last meal plan generation
  createdAt?: string; // ISO date of profile creation
  updatedAt?: string; // ISO date of last update
}

/**
 * User Profile Store Abstraction
 * 
 * Provides get/upsert operations for user profiles.
 */
export interface UserProfileStore {
  getProfile(userId: string): Promise<UserProfile | null>;
  upsertProfile(profile: UserProfile): Promise<void>;
}

/**
 * Supabase User Profile Store
 * 
 * Implements UserProfileStore using Supabase database.
 */
export class SupabaseUserProfileStore implements UserProfileStore {
  private supabase;
  
  constructor() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Get user profile by userId
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user doesn't have a profile yet
        return null;
      }
      console.error("[UserProfile] Error fetching profile:", error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
    
    if (!data) {
      return null;
    }
    
    // Transform database row to UserProfile
    return {
      userId: data.user_id,
      dietTags: data.diet_tags,
      caloriesPerDay: data.calories_per_day,
      cuisines: data.cuisines,
      lastPlanDate: data.last_plan_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
  
  /**
   * Upsert user profile (insert or update)
   */
  async upsertProfile(profile: UserProfile): Promise<void> {
    const now = new Date().toISOString();
    
    // Transform UserProfile to database row
    const row = {
      user_id: profile.userId,
      diet_tags: profile.dietTags || null,
      calories_per_day: profile.caloriesPerDay || null,
      cuisines: profile.cuisines || null,
      last_plan_date: profile.lastPlanDate || null,
      updated_at: now,
    };
    
    const { error } = await this.supabase
      .from("user_profiles")
      .upsert(row, {
        onConflict: "user_id",
      });
    
    if (error) {
      console.error("[UserProfile] Error upserting profile:", error);
      throw new Error(`Failed to upsert profile: ${error.message}`);
    }
    
    console.log("[UserProfile] Profile upserted", {
      userId: profile.userId,
      hasDietTags: !!profile.dietTags,
      hasCalories: !!profile.caloriesPerDay,
      hasCuisines: !!profile.cuisines,
    });
  }
}

/**
 * Global user profile store instance
 */
let globalStore: UserProfileStore | null = null;

/**
 * Get the global user profile store
 */
export function getUserProfileStore(): UserProfileStore {
  if (!globalStore) {
    globalStore = new SupabaseUserProfileStore();
  }
  return globalStore;
}

/**
 * Helper: Get user profile with fallback to defaults
 */
export async function getProfileOrDefaults(userId: string): Promise<UserProfile> {
  const store = getUserProfileStore();
  const profile = await store.getProfile(userId);
  
  if (profile) {
    return profile;
  }
  
  // Return default profile if user doesn't have one
  return {
    userId,
    dietTags: [],
    caloriesPerDay: 2000, // Default daily calories
    cuisines: [],
  };
}
