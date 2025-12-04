/**
 * Sentiment Feedback Tool
 * 
 * Allows users to provide feedback on recipes, meal plans, and grocery lists:
 * - Helpful / Not Helpful
 * - Star ratings (1-5)
 * - Favorites
 */

import { getSentimentStore, type SentimentEvent } from "./sentimentStore.ts";
import { logSuccess, logStructuredError, categorizeError } from "./errorTypes.ts";

/**
 * Sentiment Feedback Input
 */
export interface SentimentFeedbackInput {
  userId?: string;
  contentType: "recipe" | "mealplan" | "grocery" | "other";
  contentId?: string;
  eventType: "HELPFUL" | "NOT_HELPFUL" | "RATED" | "FAVORITED" | "UNFAVORITED";
  rating?: number; // 1-5 for RATED events
  contentName?: string; // For favorites
  contentData?: Record<string, any>; // Additional data to store with favorites
}

/**
 * Sentiment Feedback Output
 */
export interface SentimentFeedbackOutput {
  status: "ok";
  message: string;
  event: {
    eventType: string;
    contentType: string;
    contentId?: string;
    timestamp: string;
  };
}

/**
 * Validate sentiment feedback input
 */
function validateSentimentInput(input: any): SentimentFeedbackInput {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object");
  }

  // Validate contentType
  const validContentTypes = ["recipe", "mealplan", "grocery", "other"];
  if (!input.contentType || !validContentTypes.includes(input.contentType)) {
    throw new Error(`contentType must be one of: ${validContentTypes.join(", ")}`);
  }

  // Validate eventType
  const validEventTypes = ["HELPFUL", "NOT_HELPFUL", "RATED", "FAVORITED", "UNFAVORITED"];
  if (!input.eventType || !validEventTypes.includes(input.eventType)) {
    throw new Error(`eventType must be one of: ${validEventTypes.join(", ")}`);
  }

  // Validate rating for RATED events
  if (input.eventType === "RATED") {
    if (typeof input.rating !== "number") {
      throw new Error("rating is required for RATED events");
    }
    if (input.rating < 1 || input.rating > 5) {
      throw new Error("rating must be between 1 and 5");
    }
  }

  // Validate userId if provided
  if (input.userId !== undefined && typeof input.userId !== "string") {
    throw new Error("userId must be a string");
  }

  // Validate contentId if provided
  if (input.contentId !== undefined && typeof input.contentId !== "string") {
    throw new Error("contentId must be a string");
  }

  return {
    userId: input.userId,
    contentType: input.contentType,
    contentId: input.contentId,
    eventType: input.eventType,
    rating: input.rating,
    contentName: input.contentName,
    contentData: input.contentData,
  };
}

/**
 * Record Sentiment Feedback
 * 
 * Main entry point for recording user feedback.
 */
export async function recordSentimentFeedback(
  input: any
): Promise<SentimentFeedbackOutput> {
  const startTime = Date.now();

  try {
    // Validate input
    const validatedInput = validateSentimentInput(input);

    // Get sentiment store
    const store = getSentimentStore();

    // Create sentiment event
    const event: SentimentEvent = {
      userId: validatedInput.userId,
      contentType: validatedInput.contentType,
      contentId: validatedInput.contentId,
      eventType: validatedInput.eventType,
      rating: validatedInput.rating,
      timestamp: new Date().toISOString(),
    };

    // Record the event
    await store.recordEvent(event);

    // Handle favorites separately (maintain denormalized table)
    if (validatedInput.eventType === "FAVORITED" && validatedInput.userId && validatedInput.contentId) {
      await store.addFavorite({
        userId: validatedInput.userId,
        contentType: validatedInput.contentType,
        contentId: validatedInput.contentId,
        contentName: validatedInput.contentName,
        contentData: validatedInput.contentData,
      });
    } else if (validatedInput.eventType === "UNFAVORITED" && validatedInput.userId && validatedInput.contentId) {
      await store.removeFavorite(
        validatedInput.userId,
        validatedInput.contentType,
        validatedInput.contentId
      );
    }

    const duration = Date.now() - startTime;
    logSuccess("feedback.sentiment", duration, {
      eventType: validatedInput.eventType,
      contentType: validatedInput.contentType,
      hasUserId: !!validatedInput.userId,
      hasContentId: !!validatedInput.contentId,
    });

    return {
      status: "ok",
      message: `Feedback recorded: ${validatedInput.eventType}`,
      event: {
        eventType: validatedInput.eventType,
        contentType: validatedInput.contentType,
        contentId: validatedInput.contentId,
        timestamp: event.timestamp!,
      },
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const mcpError = categorizeError(error, "feedback.sentiment");
    logStructuredError(mcpError, false, duration);
    throw mcpError;
  }
}

/**
 * Get User Favorites
 * 
 * Retrieve user's favorited content.
 */
export interface GetFavoritesInput {
  userId: string;
  contentType?: "recipe" | "mealplan" | "grocery" | "other";
}

export interface GetFavoritesOutput {
  favorites: Array<{
    contentType: string;
    contentId: string;
    contentName?: string;
    contentData?: Record<string, any>;
    createdAt: string;
  }>;
  count: number;
}

export async function getUserFavorites(
  input: any
): Promise<GetFavoritesOutput> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!input || typeof input !== "object") {
      throw new Error("Input must be an object");
    }
    if (!input.userId || typeof input.userId !== "string") {
      throw new Error("userId is required and must be a string");
    }

    const validContentTypes = ["recipe", "mealplan", "grocery", "other"];
    if (input.contentType && !validContentTypes.includes(input.contentType)) {
      throw new Error(`contentType must be one of: ${validContentTypes.join(", ")}`);
    }

    // Get sentiment store
    const store = getSentimentStore();

    // Retrieve favorites
    const favorites = await store.getFavorites(input.userId, input.contentType);

    const duration = Date.now() - startTime;
    logSuccess("feedback.getFavorites", duration, {
      userId: input.userId,
      contentType: input.contentType,
      count: favorites.length,
    });

    return {
      favorites: favorites.map(f => ({
        contentType: f.contentType,
        contentId: f.contentId,
        contentName: f.contentName,
        contentData: f.contentData,
        createdAt: f.createdAt!,
      })),
      count: favorites.length,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const mcpError = categorizeError(error, "feedback.getFavorites");
    logStructuredError(mcpError, false, duration);
    throw mcpError;
  }
}

/**
 * Get Content Stats
 * 
 * Retrieve aggregated sentiment statistics for content.
 */
export interface GetStatsInput {
  contentType: "recipe" | "mealplan" | "grocery" | "other";
  contentId: string;
}

export interface GetStatsOutput {
  contentType: string;
  contentId: string;
  stats: {
    helpfulCount: number;
    notHelpfulCount: number;
    helpfulPercentage: number;
    totalRatings: number;
    averageRating: number | null;
    favoriteCount: number;
  };
  lastUpdated: string;
}

export async function getContentStats(
  input: any
): Promise<GetStatsOutput> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!input || typeof input !== "object") {
      throw new Error("Input must be an object");
    }

    const validContentTypes = ["recipe", "mealplan", "grocery", "other"];
    if (!input.contentType || !validContentTypes.includes(input.contentType)) {
      throw new Error(`contentType must be one of: ${validContentTypes.join(", ")}`);
    }

    if (!input.contentId || typeof input.contentId !== "string") {
      throw new Error("contentId is required and must be a string");
    }

    // Get sentiment store
    const store = getSentimentStore();

    // Retrieve stats
    const stats = await store.getStats(input.contentType, input.contentId);

    if (!stats) {
      // No stats yet - return zeros
      return {
        contentType: input.contentType,
        contentId: input.contentId,
        stats: {
          helpfulCount: 0,
          notHelpfulCount: 0,
          helpfulPercentage: 0,
          totalRatings: 0,
          averageRating: null,
          favoriteCount: 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    const totalHelpful = stats.helpfulCount + stats.notHelpfulCount;
    const helpfulPercentage = totalHelpful > 0
      ? Math.round((stats.helpfulCount / totalHelpful) * 100)
      : 0;

    const duration = Date.now() - startTime;
    logSuccess("feedback.getStats", duration, {
      contentType: input.contentType,
      contentId: input.contentId,
    });

    return {
      contentType: stats.contentType,
      contentId: stats.contentId,
      stats: {
        helpfulCount: stats.helpfulCount,
        notHelpfulCount: stats.notHelpfulCount,
        helpfulPercentage,
        totalRatings: stats.totalRatings,
        averageRating: stats.averageRating,
        favoriteCount: stats.favoriteCount,
      },
      lastUpdated: stats.lastUpdated,
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const mcpError = categorizeError(error, "feedback.getStats");
    logStructuredError(mcpError, false, duration);
    throw mcpError;
  }
}
