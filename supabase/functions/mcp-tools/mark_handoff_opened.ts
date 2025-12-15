import { serve } from "std@0.168.0/http/server.ts";
import { ReceiptManager } from "../_shared/loopkitchen/receipts.ts";
import { InfoMessage } from "../_shared/loopkitchen/types/Widget.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const receiptManager = new ReceiptManager(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const { receiptId } = await req.json();

    if (!receiptId) {
      return new Response(
        JSON.stringify({ error: "Receipt ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Update Status
    await receiptManager.updateStatus(receiptId, "handoff_opened");

    // 2. Return Info Message
    const widget: InfoMessage = {
      id: crypto.randomUUID(),
      type: "InfoMessage",
      severity: "info",
      title: "Checkout Opened",
      body: `Checkout opened in a new tab. Your receipt ID is ${receiptId}`,
    };

    return new Response(
      JSON.stringify({ widgets: [widget] }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in mark_handoff_opened:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
