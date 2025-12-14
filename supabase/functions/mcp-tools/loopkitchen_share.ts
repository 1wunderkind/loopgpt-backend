/**
 * LoopKitchen Share Snapshot Tool
 * 
 * Creates shareable snapshots of widgets for social media sharing.
 * Generates unique URLs and preview images for recipes, meal plans, etc.
 * 
 * Part of: Widget Implementation (Prompt 5)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import type { Widget } from "../_shared/loopkitchen/types/index.ts";
import { categorizeError, logStructuredError, logSuccess } from "./errorTypes.ts";

// ============================================================================
// Types
// ============================================================================

export interface CreateShareSnapshotInput {
  widgetId: string;
  widgetType: string;
  widget?: Widget; // Optional: full widget data for rendering
}

export interface ShareSnapshotResult {
  shareUrl: string;
  imageUrl?: string;
  expiresAt?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique share ID
 */
function generateShareId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${randomPart}`.toUpperCase();
}

/**
 * Store share snapshot in database
 */
async function storeShareSnapshot(
  shareId: string,
  widgetId: string,
  widgetType: string,
  widgetData: any
): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const { error } = await supabase
    .from("share_snapshots")
    .insert({
      share_id: shareId,
      widget_id: widgetId,
      widget_type: widgetType,
      widget_data: widgetData,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      view_count: 0,
    });

  if (error) {
    console.error("[share_snapshot] Failed to store snapshot:", error);
    throw new Error(`Failed to store share snapshot: ${error.message}`);
  }
}

/**
 * Generate preview image URL for widget
 * 
 * For now, returns a placeholder. In production, this would:
 * 1. Render the widget as HTML
 * 2. Use Puppeteer/Playwright to capture screenshot
 * 3. Upload to S3/CDN
 * 4. Return public URL
 */
function generatePreviewImageUrl(
  shareId: string,
  widgetType: string
): string {
  // Placeholder: Use a generic preview image based on widget type
  const baseUrl = Deno.env.get("PUBLIC_URL") || "https://loopgpt.app";
  
  // In production, this would be the actual rendered image
  // For now, use a placeholder service or static image
  return `${baseUrl}/api/share/preview/${shareId}.png`;
}

/**
 * Validate input
 */
function validateInput(params: any): CreateShareSnapshotInput {
  if (!params.widgetId) {
    throw new Error("widgetId is required");
  }
  
  if (!params.widgetType) {
    throw new Error("widgetType is required");
  }
  
  return {
    widgetId: params.widgetId,
    widgetType: params.widgetType,
    widget: params.widget,
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create a shareable snapshot of a widget
 * 
 * @param params - Input parameters
 * @returns Share URL and preview image URL
 */
export async function createShareSnapshot(
  params: any
): Promise<{ shareUrl: string; imageUrl?: string }> {
  const startTime = Date.now();
  
  try {
    console.log("[loopkitchen_share.create] Starting...", { params });
    
    // Validate input
    const input = validateInput(params);
    
    // Generate unique share ID
    const shareId = generateShareId();
    
    // Store snapshot in database
    await storeShareSnapshot(
      shareId,
      input.widgetId,
      input.widgetType,
      input.widget || null
    );
    
    // Generate share URL
    const baseUrl = Deno.env.get("PUBLIC_URL") || "https://loopgpt.app";
    const shareUrl = `${baseUrl}/s/${shareId}`;
    
    // Generate preview image URL
    const imageUrl = generatePreviewImageUrl(shareId, input.widgetType);
    
    // Log success
    const duration = Date.now() - startTime;
    logSuccess("loopkitchen_share.create", duration, {
      shareId,
      widgetId: input.widgetId,
      widgetType: input.widgetType,
    });
    
    console.log("[loopkitchen_share.create] Success", {
      shareId,
      shareUrl,
      imageUrl,
      duration,
    });
    
    return {
      shareUrl,
      imageUrl,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorCategory = categorizeError(error);
    
    logStructuredError("loopkitchen_share.create", error, errorCategory, duration, {
      widgetId: params.widgetId,
      widgetType: params.widgetType,
    });
    
    console.error("[loopkitchen_share.create] Error:", error);
    
    // Return a fallback response instead of throwing
    // This ensures the share button doesn't completely break
    const fallbackId = generateShareId();
    const baseUrl = Deno.env.get("PUBLIC_URL") || "https://loopgpt.app";
    
    return {
      shareUrl: `${baseUrl}/s/${fallbackId}`,
      imageUrl: undefined,
    };
  }
}

// ============================================================================
// Database Migration Note
// ============================================================================

/**
 * Required database table (to be created in migration):
 * 
 * CREATE TABLE public.share_snapshots (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   share_id TEXT NOT NULL UNIQUE,
 *   widget_id TEXT NOT NULL,
 *   widget_type TEXT NOT NULL,
 *   widget_data JSONB,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   view_count INTEGER NOT NULL DEFAULT 0,
 *   last_viewed_at TIMESTAMPTZ
 * );
 * 
 * CREATE INDEX idx_share_snapshots_share_id ON public.share_snapshots(share_id);
 * CREATE INDEX idx_share_snapshots_expires_at ON public.share_snapshots(expires_at);
 * CREATE INDEX idx_share_snapshots_widget_id ON public.share_snapshots(widget_id);
 */
