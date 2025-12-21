
# LeftoverGPT App Adapter

This directory contains the **App Adapter** for the LeftoverGPT ChatGPT App.

## Purpose
This adapter acts as a strict gateway between the ChatGPT App Store and the broader LooptOS platform. It ensures that:
1.  Only approved tools are exposed.
2.  Schemas are minimal and privacy-preserving.
3.  Commerce intents are explicit and safe.

## Architecture
- **index.ts**: Main controller. Receives tool calls, invokes logic, and formats responses.
- **tools.ts**: The "Manifest". Defines the 4 tools visible to ChatGPT.
- **schemas.ts**: TypeScript interfaces for inputs/outputs.
- **guards.ts**: Safety logic (e.g. ensuring user intent for shopping).

## Integration
The main MCP server (`../../mcp-server/index.ts`) imports this module and delegates all traffic to it.

## Commerce Flow
For `create_external_grocery_order_link`, we generate a URL to the `loopkitchen-ui` frontend. This keeps the chat interface clean and compliant, delegating the complex cart/checkout logic to the web application.
