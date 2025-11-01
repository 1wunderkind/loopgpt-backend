/**
 * OpenAI Client Utility
 * 
 * Provides a lazy-loaded OpenAI client for Supabase Edge Functions (Deno runtime).
 * Prevents startup crashes if OPENAI_API_KEY is missing.
 * 
 * Pattern from: LeftoverGPT Ecosystem MCP Server Playbook
 */

import { OpenAI } from "https://esm.sh/openai@4.20.1";

let openaiClient: OpenAI | null = null;

/**
 * Get or create the OpenAI client instance
 * 
 * Lazy-loads the client on first use to prevent startup crashes
 * if OPENAI_API_KEY is not set in the environment.
 * 
 * @returns OpenAI client instance
 * @throws Error if OPENAI_API_KEY is not set
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    
    openaiClient = new OpenAI({ apiKey });
    
    console.log("[OpenAI] Client initialized successfully");
  }
  
  return openaiClient;
}

/**
 * Reset the OpenAI client (useful for testing)
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
}

