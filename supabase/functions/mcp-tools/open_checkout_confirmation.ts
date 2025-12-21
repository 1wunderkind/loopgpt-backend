import { serve } from "std@0.168.0/http/server.ts";
import { ReceiptManager } from "../_shared/loopkitchen/receipts.ts";
import { CheckoutConfirmationModalWidget } from "../_shared/loopkitchen/types/Widget.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const receiptManager = new ReceiptManager(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

serve(async (req) => {
  try {
    const { receiptId } = await req.json();

    if (!receiptId) {
      return new Response(
        JSON.stringify({ error: "Receipt ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 1. Load Receipt
    const receipt = await receiptManager.getReceipt(receiptId);

    if (!receipt) {
      return new Response(
        JSON.stringify({ error: "Receipt not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Construct Confirmation Widget
    const widget: CheckoutConfirmationModalWidget = {
      id: crypto.randomUUID(),
      type: "CheckoutConfirmationModalWidget",
      provider: {
        id: receipt.providerId,
        name: receipt.providerName,
        badgeText: `Fulfilled by ${receipt.providerName}`,
      },
      title: `You’re being redirected to ${receipt.providerName}`,
      body:
        `You will complete checkout on ${receipt.providerName} in a new tab.`,
      disclaimerText: receipt.disclaimerText,
      receipt: {
        receiptId: receipt.id,
        itemCount: receipt.cart.length,
        currency: receipt.currency,
        total: receipt.total,
      },
      actions: {
        cancel: { label: "Cancel" },
        proceedExternal: {
          label: "Continue to checkout",
          externalUrl: receipt.checkoutUrl,
          onProceedTool: {
            tool: "mark_handoff_opened",
            args: { receiptId: receipt.id },
          },
        },
      },
      support: receipt.support,
    };

    return new Response(
      JSON.stringify({ widgets: [widget] }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in open_checkout_confirmation:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
