import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ReceiptManager } from "../_shared/loopkitchen/receipts.ts";
import { CheckoutHandoffWidget } from "../_shared/loopkitchen/types/Widget.ts";
import { createHash } from "https://deno.land/std@0.168.0/hash/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const receiptManager = new ReceiptManager(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mock Merchant Routing System
// In production, this would call an external service or complex logic
function routeToProvider(cart: any[]) {
  // Simple round-robin or random for demo purposes
  // In reality, this would check inventory, location, etc.
  const providers = [
    {
      id: "mealme",
      name: "MealMe",
      checkoutUrlBase: "https://mealme.ai/checkout",
      supportUrl: "https://mealme.ai/support",
    },
    {
      id: "instacart",
      name: "Instacart",
      checkoutUrlBase: "https://instacart.com/store/checkout",
      supportUrl: "https://instacart.com/help",
    },
  ];

  // Deterministic selection based on cart length for stability in testing
  const index = cart.length % providers.length;
  return providers[index];
}

serve(async (req) => {
  try {
    const { cart, currency = "USD", userId } = await req.json();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty or invalid" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Route to Provider (Single Source of Truth)
    const provider = routeToProvider(cart);

    // 2. Calculate Financials (Mock)
    const subtotal = cart.reduce((sum: number, item: any) => sum + (item.quantity * 5), 0); // Mock $5/item
    const deliveryFee = 5.99;
    const tax = subtotal * 0.08;
    const total = subtotal + deliveryFee + tax;

    // 3. Generate Cart Hash
    const hasher = createHash("sha256");
    hasher.update(JSON.stringify(cart));
    const cartHash = hasher.toString();

    // 4. Create OrderReceipt
    const receipt = await receiptManager.createReceipt({
      userId,
      providerId: provider.id,
      providerName: provider.name,
      providerSupportUrl: provider.supportUrl,
      checkoutUrl: `${provider.checkoutUrlBase}?token=${crypto.randomUUID()}`,
      currency,
      subtotal,
      deliveryFee,
      tax,
      total,
      cart,
      cartHash,
      support: {
        providerSupportText: `For delivery issues, substitutions, refunds, or billing questions, contact ${provider.name} support.`,
        loopSupportText: "If something looks wrong in the cart or the app behavior, contact LoopKitchen support:",
        loopSupportEmail: "support@loopgpt.app",
      },
      disclaimerText: `Checkout, delivery, substitutions, refunds, and billing are handled by ${provider.name}. LoopKitchen helps you build the cart and redirects you to their checkout.`,
    });

    // 5. Construct Widget
    const widget: CheckoutHandoffWidget = {
      id: crypto.randomUUID(),
      type: "CheckoutHandoffWidget",
      provider: {
        id: provider.id,
        name: provider.name,
        badgeText: `Fulfilled by ${provider.name}`,
      },
      summary: {
        itemCount: cart.length,
        currency,
        subtotal,
        deliveryFee,
        tax,
        total,
      },
      cartPreview: cart.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      })),
      disclaimerText: receipt.disclaimerText,
      actions: {
        reviewRequired: true,
        openConfirmationAction: {
          tool: "open_checkout_confirmation",
          args: { receiptId: receipt.id },
        },
      },
      support: receipt.support,
    };

    return new Response(
      JSON.stringify({ widgets: [widget] }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in prepare_external_checkout:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
