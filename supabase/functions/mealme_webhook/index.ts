/**
 * MealMe Webhook Edge Function
 * 
 * Handles webhook events from MealMe for order status updates.
 */

import { withLogging } from "../../middleware/logging.ts";
import { handleError } from "../../middleware/errorHandler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withWebhook } from "../_shared/security/applyMiddleware.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("MEALME_WEBHOOK_SECRET");

interface WebhookPayload {
  orderId?: string;
  status?: string;
  totals?: {
    subtotal?: number;
    fees?: number;
    tip?: number;
    total?: number;
  };
  items?: any[];
  delivery?: any;
  [key: string]: any;
}

interface WebhookResponse {
  ok: boolean;
  message?: string;
}

async function processWebhook(payload: WebhookPayload, signature?: string): Promise<WebhookResponse> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Verify webhook signature if secret is configured
  if (WEBHOOK_SECRET && signature) {
    // TODO: Implement signature verification when MealMe provides details
    console.log("[MealMe Webhook] Signature verification not yet implemented");
  }

  console.log(`[MealMe Webhook] Received event for order ${payload.orderId || 'unknown'}`);

  // Store raw webhook event
  const { error: webhookError } = await supabase
    .from("mealme_webhook_events")
    .insert({
      mealme_order_id: payload.orderId || null,
      event_type: payload.status || "unknown",
      status: payload.status,
      raw: payload,
    });

  if (webhookError) {
    console.error(`[MealMe Webhook] Failed to store event: ${webhookError.message}`);
    throw new Error(`Failed to store webhook event: ${webhookError.message}`);
  }

  // Update order if orderId is present
  if (payload.orderId) {
    const updateData: any = {
      mealme_order_id: payload.orderId,
      status: payload.status || "processing",
      updated_at: new Date().toISOString(),
    };

    // Update totals if provided
    if (payload.totals) {
      updateData.subtotal = payload.totals.subtotal;
      updateData.fees = payload.totals.fees;
      updateData.tip = payload.totals.tip;
      updateData.total = payload.totals.total;
    }

    // Upsert order by mealme_order_id
    const { error: orderError } = await supabase
      .from("orders")
      .upsert(updateData, { 
        onConflict: "mealme_order_id",
        ignoreDuplicates: false,
      });

    if (orderError) {
      console.error(`[MealMe Webhook] Failed to update order: ${orderError.message}`);
      // Don't throw - we still want to acknowledge the webhook
    } else {
      console.log(`[MealMe Webhook] Updated order ${payload.orderId} with status ${payload.status}`);
    }

    // Update order items if provided
    if (payload.items && payload.items.length > 0) {
      // First, get the order_id from mealme_order_id
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("mealme_order_id", payload.orderId)
        .single();

      if (order) {
        const orderItems = payload.items.map((item: any) => ({
          order_id: order.id,
          sku: item.sku || null,
          name: item.name || "Unknown",
          qty: item.quantity || 1,
          unit_price: item.price || 0,
          total_price: (item.price || 0) * (item.quantity || 1),
          meta: item,
        }));

        // Delete existing items and insert new ones
        await supabase
          .from("order_items")
          .delete()
          .eq("order_id", order.id);

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error(`[MealMe Webhook] Failed to update items: ${itemsError.message}`);
        } else {
          console.log(`[MealMe Webhook] Updated ${orderItems.length} items for order ${payload.orderId}`);
        }
      }
    }
  }

  return {
    ok: true,
    message: "Webhook processed successfully",
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    // Get signature from headers if present
    const signature = req.headers.get("x-mealme-signature") || undefined;

    // Parse webhook payload
    const payload = await req.json() as WebhookPayload;

    // Process webhook
    const result = await processWebhook(payload, signature);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

// Export with logging middleware
export default withWebhook(withLogging(handler, "mealme_webhook"));

