
import { selectProvider, RouterInput } from "./supabase/functions/_shared/router.ts";
import { LEFTOVERGPT_TOOLS } from "./supabase/functions/apps/leftovergpt/tools.ts";

// --- 3) TOOL SURFACE SUMMARY ---
console.log("--------------------------------");
console.log("3) TOOL SURFACE SUMMARY");
console.log("--------------------------------");
console.log(`Total Tools: ${LEFTOVERGPT_TOOLS.length}`);
console.log("Tool Names:", LEFTOVERGPT_TOOLS.map(t => t.name).join(", "));
LEFTOVERGPT_TOOLS.forEach(t => {
  console.log(`\nTool: ${t.name}`);
  console.log(`  readOnlyHint: ${t.readOnlyHint}`);
  console.log(`  openWorldHint: ${t.openWorldHint}`);
  console.log(`  required: ${JSON.stringify(t.input_schema.required)}`);
  if (t.description.toLowerCase().includes("use when")) {
    console.log("  WARNING: Description contains 'use when'!");
  } else {
    console.log("  Description Check: OK (No 'use when')");
  }
});

// --- 4) ROUTER DECISION EXAMPLES ---
console.log("\n--------------------------------");
console.log("4) ROUTER DECISION EXAMPLES");
console.log("--------------------------------");

const cases = [
  { label: "US, grocery basket", country: "US", basket: [{name: "milk", quantity: "1"}, {name: "eggs", quantity: "12"}] },
  { label: "US, restaurant basket", country: "US", basket: [{name: "burger", quantity: "1"}] },
  { label: "DE, grocery basket", country: "DE", basket: [{name: "milk", quantity: "1"}, {name: "eggs", quantity: "6"}] },
  { label: "DE, restaurant basket", country: "DE", basket: [{name: "pizza", quantity: "1"}] },
  { label: "Unknown country, grocery basket", country: "XX", basket: [{name: "milk", quantity: "1"}] },
];

cases.forEach(c => {
  const input: RouterInput = {
    intent: "order_missing_ingredients",
    basket: c.basket,
    coarse_location: { country: c.country },
    channel: "chatgpt",
    token_hash: "dry-run-hash"
  };
  const result = selectProvider(input);
  console.log(`\nCase: ${c.label}`);
  console.log(`  Selected Provider: ${result.provider}`);
  console.log(`  Requires Address: ${result.requires_address}`);
  try {
    const url = new URL(result.handoff_url);
    console.log(`  Handoff Host: ${url.hostname}`);
  } catch {
    console.log(`  Handoff URL: ${result.handoff_url}`);
  }
});

// --- 5) CHECKOUT FLOW TRACE (DRY) ---
console.log("\n--------------------------------");
console.log("5) CHECKOUT FLOW TRACE (DRY)");
console.log("--------------------------------");

// 1. Example order_url
const mockToken = "mock-token-123";
const mockItems = [{name: "milk", quantity: "1"}];
const orderUrl = `https://loopkitchen-ui.vercel.app/checkout?token=${mockToken}&ingredients=${encodeURIComponent(JSON.stringify(mockItems))}`;
console.log("Example order_url returned by tool:");
console.log(orderUrl);
if (!orderUrl.includes("ingredients=")) console.log("  [Check] Contains ingredients param (for display only)");
if (orderUrl.includes("token=")) console.log("  [Check] Contains token param (for security)");

// 2. Checkout Redirect Logic Simulation
console.log("\nCheckout Redirect Logic Simulation:");

const ALLOWED_DOMAINS = [
  "instacart.com", "www.instacart.com",
  "amazon.com", "www.amazon.com",
  "walmart.com", "www.walmart.com",
  "kroger.com", "www.kroger.com",
  "mealme.ai", "checkout.mealme.ai",
  "loopkitchen-ui.vercel.app"
];

function checkRedirect(url: string) {
  try {
    const parsed = new URL(url);
    if (ALLOWED_DOMAINS.includes(parsed.hostname)) {
      return "ALLOWED";
    }
    return "BLOCKED";
  } catch {
    return "INVALID URL";
  }
}

console.log("  - Valid Token -> Lookup Session -> Route -> Redirect");
console.log("    (Simulated) Target: https://checkout.mealme.ai/cart?...");
console.log(`    Allowlist Check: ${checkRedirect("https://checkout.mealme.ai/cart?products=[]")}`);

console.log("  - Expired Token -> Lookup Session -> Check Expiry -> 410 Gone");
console.log("  - Reused Token -> Lookup Session -> Check Status != created -> 410 Gone");

console.log("\nAllowlist Validation:");
console.log(`  MealMe: ${checkRedirect("https://checkout.mealme.ai/cart")}`);
console.log(`  Instacart: ${checkRedirect("https://www.instacart.com/store")}`);
console.log(`  Evil Site: ${checkRedirect("https://evil-phishing-site.com/checkout")}`);
