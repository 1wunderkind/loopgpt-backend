/**
 * Redaction Utility
 * 
 * Removes sensitive data from objects before logging or returning errors.
 * Ensures no secrets (tokens, API keys, passwords) leak into logs.
 * 
 * Part of: Step 5 - Security Hardening
 */

// ============================================================================
// Sensitive Key Patterns
// ============================================================================

/**
 * Keys that should always be redacted
 * Case-insensitive matching
 */
const SENSITIVE_KEYS = [
  // Authentication
  "authorization",
  "auth",
  "token",
  "bearer",
  "jwt",
  "session",
  "cookie",
  "csrf",
  
  // API Keys
  "apikey",
  "api_key",
  "api-key",
  "key",
  "secret",
  "private",
  "privatekey",
  "private_key",
  
  // Credentials
  "password",
  "passwd",
  "pwd",
  "pass",
  "credential",
  "credentials",
  
  // Payment
  "card",
  "cardnumber",
  "card_number",
  "cvv",
  "cvc",
  "pin",
  "account",
  "routing",
  
  // Personal Info
  "ssn",
  "social",
  "license",
  "passport",
  
  // Provider Secrets
  "stripe",
  "paypal",
  "square",
  "openai",
  "anthropic",
];

/**
 * Keys that should be partially redacted (show last 4 chars)
 */
const PARTIAL_REDACT_KEYS = [
  "email",
  "phone",
  "address",
  "street",
  "zip",
  "postal",
];

/**
 * Redaction placeholder
 */
const REDACTED = "[REDACTED]";

// ============================================================================
// Redaction Functions
// ============================================================================

/**
 * Check if a key should be redacted
 */
function shouldRedact(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(pattern => lowerKey.includes(pattern));
}

/**
 * Check if a key should be partially redacted
 */
function shouldPartialRedact(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return PARTIAL_REDACT_KEYS.some(pattern => lowerKey.includes(pattern));
}

/**
 * Partially redact a string (show last 4 chars)
 * Example: "user@example.com" → "***@example.com"
 */
function partialRedact(value: string): string {
  if (value.length <= 4) {
    return "***";
  }
  
  // For emails, preserve domain
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `***@${domain}`;
  }
  
  // For other strings, show last 4 chars
  const last4 = value.slice(-4);
  return `***${last4}`;
}

/**
 * Redact a single value
 */
function redactValue(key: string, value: any): any {
  // Full redaction
  if (shouldRedact(key)) {
    return REDACTED;
  }
  
  // Partial redaction
  if (shouldPartialRedact(key) && typeof value === "string") {
    return partialRedact(value);
  }
  
  // No redaction needed
  return value;
}

/**
 * Recursively redact sensitive data from an object
 * 
 * @param obj - Object to redact (can be nested)
 * @param maxDepth - Maximum recursion depth (prevents infinite loops)
 * @returns Redacted copy of the object
 */
export function redact(obj: any, maxDepth: number = 10): any {
  // Base cases
  if (maxDepth <= 0) {
    return "[MAX_DEPTH_EXCEEDED]";
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== "object") {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, maxDepth - 1));
  }
  
  // Handle objects
  const redacted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this key should be redacted
    const redactedValue = redactValue(key, value);
    
    // If value was redacted, use the redacted placeholder
    if (redactedValue === REDACTED) {
      redacted[key] = REDACTED;
      continue;
    }
    
    // If value is an object or array, recurse
    if (typeof value === "object" && value !== null) {
      redacted[key] = redact(value, maxDepth - 1);
    } else {
      redacted[key] = redactedValue;
    }
  }
  
  return redacted;
}

/**
 * Redact HTTP headers
 * 
 * Specifically handles common header names:
 * - Authorization
 * - Cookie
 * - X-API-Key
 * - etc.
 */
export function redactHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  
  // Convert Headers to plain object if needed
  const headerObj = headers instanceof Headers
    ? Object.fromEntries(headers.entries())
    : headers;
  
  for (const [key, value] of Object.entries(headerObj)) {
    if (shouldRedact(key)) {
      redacted[key] = REDACTED;
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Redact URL query parameters
 * 
 * Example: "?token=abc123&user=john" → "?token=[REDACTED]&user=john"
 */
export function redactUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // Redact sensitive query params
    for (const [key, value] of params.entries()) {
      if (shouldRedact(key)) {
        params.set(key, REDACTED);
      }
    }
    
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Redact error messages
 * 
 * Ensures error messages don't leak sensitive data
 */
export function redactError(error: Error | any): any {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Don't include stack trace (may contain file paths with secrets)
    };
  }
  
  return redact(error);
}

/**
 * Safe stringify with redaction
 * 
 * Converts object to JSON string with sensitive data redacted
 */
export function safeStringify(obj: any, space?: number): string {
  const redacted = redact(obj);
  return JSON.stringify(redacted, null, space);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a string looks like a token/secret
 * 
 * Heuristics:
 * - Long alphanumeric strings (>20 chars)
 * - Base64-like patterns
 * - JWT patterns (xxx.yyy.zzz)
 */
export function looksLikeSecret(value: string): boolean {
  // JWT pattern
  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
    return true;
  }
  
  // Long base64-like string
  if (value.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(value)) {
    return true;
  }
  
  // API key patterns
  if (/^(sk|pk|api)[-_][A-Za-z0-9]{20,}$/.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Redact any string that looks like a secret
 * 
 * Useful for sanitizing user input or log messages
 */
export function redactPotentialSecrets(text: string): string {
  // Split into words
  const words = text.split(/\s+/);
  
  // Redact words that look like secrets
  const redacted = words.map(word => {
    if (looksLikeSecret(word)) {
      return REDACTED;
    }
    return word;
  });
  
  return redacted.join(" ");
}

// ============================================================================
// Exports
// ============================================================================

export default {
  redact,
  redactHeaders,
  redactUrl,
  redactError,
  safeStringify,
  looksLikeSecret,
  redactPotentialSecrets,
};
