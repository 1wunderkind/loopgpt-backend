/**
 * LeftoverGPT Utilities
 * 
 * Helpers for response sanitization and error handling.
 */

export function sanitizeResponse(data: any): any {
  if (Array.isArray(data)) {
    return data.map(sanitizeResponse);
  }
  
  if (data && typeof data === "object") {
    const cleaned: any = {};
    for (const key in data) {
      // Strip internal fields
      if (
        key.startsWith("_") || 
        key.toLowerCase().includes("internal") ||
        key.toLowerCase().includes("provider") ||
        key.toLowerCase().includes("trace") ||
        key === "id" // Strip raw DB IDs unless explicitly allowed
      ) {
        continue;
      }
      cleaned[key] = sanitizeResponse(data[key]);
    }
    return cleaned;
  }
  
  return data;
}

export function createErrorResponse(message: string): Response {
  // Generic user-safe error message
  return new Response(JSON.stringify({
    error: "Something went wrong. Please try again.",
    details: message // Optional: remove this for strict production
  }), { 
    status: 500,
    headers: { "Content-Type": "application/json" } 
  });
}
