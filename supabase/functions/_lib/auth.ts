/**
 * Authentication Helper Library
 * Provides secure authentication utilities for Edge Functions
 * 
 * SECURITY: This module enforces Row-Level Security (RLS) by using
 * SUPABASE_ANON_KEY with user JWT tokens instead of SERVICE_ROLE_KEY.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export interface AuthResult {
  supabase: SupabaseClient;
  userId: string | null;
  error: string | null;
}

/**
 * Creates an authenticated Supabase client from the request.
 * Uses ANON_KEY with user's JWT for proper RLS enforcement.
 * 
 * @param req - The incoming HTTP request
 * @returns AuthResult with authenticated client, user ID, and any errors
 * 
 * @example
 * ```typescript
 * const { supabase, userId, error } = await createAuthenticatedClient(req);
 * if (error) {
 *   return createErrorResponse("AUTH_ERROR", error, 401);
 * }
 * // Now use supabase client with RLS enforced
 * const { data } = await supabase.from('meals').select('*');
 * ```
 */
export async function createAuthenticatedClient(req: Request): Promise<AuthResult> {
  // Extract Authorization header
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Create anonymous client for unauthenticated requests
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return {
      supabase,
      userId: null,
      error: null
    };
  }

  const token = authHeader.replace("Bearer ", "");

  // Create client with user's token for RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  // Verify token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      supabase,
      userId: null,
      error: error?.message || "Invalid or expired token"
    };
  }

  return {
    supabase,
    userId: user.id,
    error: null
  };
}

/**
 * Extracts user ID from ChatGPT metadata (fallback for MCP calls)
 * 
 * ChatGPT includes user metadata in MCP requests. This function
 * attempts to extract it from various possible locations.
 * 
 * @param request - The parsed request body
 * @returns User ID string or null if not found
 * 
 * @example
 * ```typescript
 * const body = await req.json();
 * const chatgptUserId = extractChatGPTUserId(body);
 * if (chatgptUserId) {
 *   // Use ChatGPT user ID for cross-GPT operations
 * }
 * ```
 */
export function extractChatGPTUserId(request: any): string | null {
  return (
    request?._meta?.userId ||
    request?.meta?.userId ||
    request?.params?._meta?.userId ||
    request?.params?.meta?.userId ||
    request?.chatgpt_user_id ||
    request?.params?.chatgpt_user_id ||
    null
  );
}

/**
 * Creates a service client for admin operations only.
 * 
 * ⚠️ WARNING: USE SPARINGLY - This bypasses Row-Level Security!
 * 
 * Only use this for operations that truly need admin access:
 * - System maintenance tasks
 * - Webhook handlers (no user context)
 * - Background jobs
 * - Cross-user analytics
 * 
 * For user-specific operations, ALWAYS use createAuthenticatedClient()
 * 
 * @returns Supabase client with SERVICE_ROLE_KEY
 * 
 * @example
 * ```typescript
 * // ✅ GOOD: Webhook handler (no user context)
 * const supabase = createServiceClient();
 * await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
 * 
 * // ❌ BAD: User-specific operation (should use authenticated client)
 * const supabase = createServiceClient(); // DON'T DO THIS
 * await supabase.from('user_meals').select('*'); // Bypasses RLS!
 * ```
 */
export function createServiceClient(): SupabaseClient {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, serviceKey);
}

/**
 * Validates that a user is authenticated and returns their ID.
 * Convenience wrapper around createAuthenticatedClient for simple cases.
 * 
 * @param req - The incoming HTTP request
 * @returns User ID string
 * @throws Error if user is not authenticated
 * 
 * @example
 * ```typescript
 * try {
 *   const userId = await requireAuth(req);
 *   // User is authenticated, proceed with operation
 * } catch (error) {
 *   return createErrorResponse("UNAUTHORIZED", error.message, 401);
 * }
 * ```
 */
export async function requireAuth(req: Request): Promise<string> {
  const { userId, error } = await createAuthenticatedClient(req);
  
  if (error) {
    throw new Error(error);
  }
  
  if (!userId) {
    throw new Error("Authentication required");
  }
  
  return userId;
}

/**
 * Checks if a request has a valid authentication token.
 * Does not throw errors, just returns boolean.
 * 
 * @param req - The incoming HTTP request
 * @returns true if authenticated, false otherwise
 * 
 * @example
 * ```typescript
 * const isAuth = await isAuthenticated(req);
 * if (!isAuth) {
 *   return createErrorResponse("UNAUTHORIZED", "Login required", 401);
 * }
 * ```
 */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const { userId, error } = await createAuthenticatedClient(req);
  return userId !== null && error === null;
}
