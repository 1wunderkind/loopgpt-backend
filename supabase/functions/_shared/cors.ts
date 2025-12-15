import { SECURITY_HEADERS } from "./security/SecurityHeaders.ts";

const PRODUCTION_ORIGINS = [
  // ChatGPT domains
  "https://chat.openai.com",
  "https://chatgpt.com",
  "https://www.chatgpt.com",
  
  // TheLoopGPT domains
  "https://theloopgpt.ai",
  "https://www.theloopgpt.ai",
  "https://app.theloopgpt.ai",
  
  // LoopKitchen UI
  "https://loopkitchen-ui.vercel.app",
];

const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const env = Deno.env.get("ENVIRONMENT") || "production";
  
  let allowedOrigins = [...PRODUCTION_ORIGINS];
  if (env === "development" || env === "test") {
    allowedOrigins = [...allowedOrigins, ...DEVELOPMENT_ORIGINS];
  }
  
  // Only reflect origin if it's in the allowed list
  // Otherwise, return first allowed origin (browser will block the request)
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, baggage, sentry-trace",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    ...SECURITY_HEADERS
  };
}

// Legacy export for backward compatibility, but using a safe default
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://chatgpt.com', // Default to main consumer
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, baggage, sentry-trace',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  ...SECURITY_HEADERS
};
