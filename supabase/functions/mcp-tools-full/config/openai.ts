/**
 * OpenAI Client Factory for TheLoopGPT MCP Tools
 * Singleton pattern to avoid repeated initialization
 */

import OpenAI from "https://esm.sh/openai@4.28.0";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    client = new OpenAI({
      apiKey,
    });
  }

  return client;
}

/**
 * Reset client (for testing)
 */
export function resetOpenAIClient(): void {
  client = null;
}
