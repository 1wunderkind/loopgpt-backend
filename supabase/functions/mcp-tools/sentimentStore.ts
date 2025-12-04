/**
 * Sentiment Store
 * 
 * Abstraction for storing and retrieving sentiment events and favorites.
 * Supports Supabase Postgres backend.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sentiment Event Type
 */
export interface SentimentEvent {
  id?: string;
  userId?: string;
  contentType: "recipe" | "mealplan" | "grocery" | "other";
  contentId?: string;
  eventType: "HELPFUL" | "NOT_HELPFUL" | "RATED" | "FAVORITED" | "UNFAVORITED";
  rating?: number; // 1-5 if applicable
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Favorite Item
 */
export interface FavoriteItem {
  userId: string;
  contentType: "recipe" | "mealplan" | "grocery" | "other";
  contentId: string;
  contentName?: string;
  contentData?: Record<string, any>;
  createdAt?: string;
}

/**
 * Sentiment Stats (aggregated)
 */
export interface SentimentStats {
  contentType: string;
  contentId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  totalRatings: number;
  averageRating: number | null;
  favoriteCount: number;
  lastUpdated: string;
}

/**
 * Sentiment Store Interface
 */
export interface ISentimentStore {
  recordEvent(event: SentimentEvent): Promise<void>;
  getFavorites(userId: string, contentType?: string): Promise<FavoriteItem[]>;
  addFavorite(favorite: FavoriteItem): Promise<void>;
  removeFavorite(userId: string, contentType: string, contentId: string): Promise<void>;
  getStats(contentType: string, contentId: string): Promise<SentimentStats | null>;
}

/**
 * Supabase Sentiment Store Implementation
 */
export class SupabaseSentimentStore implements ISentimentStore {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Record a sentiment event
   */
  async recordEvent(event: SentimentEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("sentiment_events")
        .insert({
          user_id: event.userId,
          content_type: event.contentType,
          content_id: event.contentId,
          event_type: event.eventType,
          rating: event.rating,
          metadata: event.metadata || {},
          timestamp: event.timestamp || new Date().toISOString(),
        });

      if (error) {
        // If table doesn't exist, log and continue (will use in-memory on next call)
        if (error.message.includes("Could not find the table")) {
          console.warn("[SentimentStore] Tables not yet created, event logged but not persisted");
          return;
        }
        throw new Error(`Failed to record sentiment event: ${error.message}`);
      }
    } catch (err: any) {
      console.warn("[SentimentStore] Error recording event:", err.message);
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Get user's favorites
   */
  async getFavorites(userId: string, contentType?: string): Promise<FavoriteItem[]> {
    try {
      let query = this.supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (contentType) {
        query = query.eq("content_type", contentType);
      }

      const { data, error } = await query;

      if (error) {
        if (error.message.includes("Could not find the table")) {
          console.warn("[SentimentStore] Tables not yet created, returning empty favorites");
          return [];
        }
        throw new Error(`Failed to get favorites: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        userId: row.user_id,
        contentType: row.content_type,
        contentId: row.content_id,
        contentName: row.content_name,
        contentData: row.content_data,
        createdAt: row.created_at,
      }));
    } catch (err: any) {
      console.warn("[SentimentStore] Error getting favorites:", err.message);
      return [];
    }
  }

  /**
   * Add to favorites
   */
  async addFavorite(favorite: FavoriteItem): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("user_favorites")
        .upsert({
          user_id: favorite.userId,
          content_type: favorite.contentType,
          content_id: favorite.contentId,
          content_name: favorite.contentName,
          content_data: favorite.contentData || {},
          created_at: favorite.createdAt || new Date().toISOString(),
        }, {
          onConflict: "user_id,content_type,content_id",
        });

      if (error) {
        if (error.message.includes("Could not find the table")) {
          console.warn("[SentimentStore] Tables not yet created, favorite not persisted");
          return;
        }
        throw new Error(`Failed to add favorite: ${error.message}`);
      }
    } catch (err: any) {
      console.warn("[SentimentStore] Error adding favorite:", err.message);
    }
  }

  /**
   * Remove from favorites
   */
  async removeFavorite(userId: string, contentType: string, contentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("content_type", contentType)
        .eq("content_id", contentId);

      if (error) {
        if (error.message.includes("Could not find the table")) {
          console.warn("[SentimentStore] Tables not yet created, favorite not removed");
          return;
        }
        throw new Error(`Failed to remove favorite: ${error.message}`);
      }
    } catch (err: any) {
      console.warn("[SentimentStore] Error removing favorite:", err.message);
    }
  }

  /**
   * Get aggregated stats for content
   */
  async getStats(contentType: string, contentId: string): Promise<SentimentStats | null> {
    try {
      const { data, error } = await this.supabase
        .from("sentiment_stats")
        .select("*")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.message.includes("Could not find the table")) {
          // No stats found or table doesn't exist
          return null;
        }
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      return {
        contentType: data.content_type,
        contentId: data.content_id,
        helpfulCount: data.helpful_count,
        notHelpfulCount: data.not_helpful_count,
        totalRatings: data.total_ratings,
        averageRating: data.average_rating,
        favoriteCount: data.favorite_count,
        lastUpdated: data.last_updated,
      };
    } catch (err: any) {
      console.warn("[SentimentStore] Error getting stats:", err.message);
      return null;
    }
  }
}

/**
 * In-Memory Sentiment Store (for testing/fallback)
 */
export class InMemorySentimentStore implements ISentimentStore {
  private events: SentimentEvent[] = [];
  private favorites: Map<string, FavoriteItem[]> = new Map();

  async recordEvent(event: SentimentEvent): Promise<void> {
    this.events.push({
      ...event,
      id: crypto.randomUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
    });
    console.log("[InMemory] Recorded event:", event.eventType);
  }

  async getFavorites(userId: string, contentType?: string): Promise<FavoriteItem[]> {
    const userFavorites = this.favorites.get(userId) || [];
    if (contentType) {
      return userFavorites.filter(f => f.contentType === contentType);
    }
    return userFavorites;
  }

  async addFavorite(favorite: FavoriteItem): Promise<void> {
    const userFavorites = this.favorites.get(favorite.userId) || [];
    const existing = userFavorites.findIndex(
      f => f.contentType === favorite.contentType && f.contentId === favorite.contentId
    );
    
    if (existing === -1) {
      userFavorites.push({
        ...favorite,
        createdAt: favorite.createdAt || new Date().toISOString(),
      });
      this.favorites.set(favorite.userId, userFavorites);
    }
    console.log("[InMemory] Added favorite");
  }

  async removeFavorite(userId: string, contentType: string, contentId: string): Promise<void> {
    const userFavorites = this.favorites.get(userId) || [];
    const filtered = userFavorites.filter(
      f => !(f.contentType === contentType && f.contentId === contentId)
    );
    this.favorites.set(userId, filtered);
    console.log("[InMemory] Removed favorite");
  }

  async getStats(contentType: string, contentId: string): Promise<SentimentStats | null> {
    const relevantEvents = this.events.filter(
      e => e.contentType === contentType && e.contentId === contentId
    );

    if (relevantEvents.length === 0) {
      return null;
    }

    const helpful = relevantEvents.filter(e => e.eventType === "HELPFUL").length;
    const notHelpful = relevantEvents.filter(e => e.eventType === "NOT_HELPFUL").length;
    const ratings = relevantEvents.filter(e => e.eventType === "RATED");
    const favorited = relevantEvents.filter(e => e.eventType === "FAVORITED").length;
    const unfavorited = relevantEvents.filter(e => e.eventType === "UNFAVORITED").length;

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, e) => sum + (e.rating || 0), 0) / ratings.length
      : null;

    return {
      contentType,
      contentId,
      helpfulCount: helpful,
      notHelpfulCount: notHelpful,
      totalRatings: ratings.length,
      averageRating: avgRating,
      favoriteCount: favorited - unfavorited,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Get sentiment store instance
 */
let sentimentStoreInstance: ISentimentStore | null = null;

export function getSentimentStore(): ISentimentStore {
  if (!sentimentStoreInstance) {
    try {
      sentimentStoreInstance = new SupabaseSentimentStore();
      console.log("[SentimentStore] Using Supabase backend");
    } catch (error) {
      console.warn("[SentimentStore] Falling back to in-memory store:", error);
      sentimentStoreInstance = new InMemorySentimentStore();
    }
  }
  return sentimentStoreInstance;
}
