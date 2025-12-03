/**
 * Simple in-memory rate limiting (no Supabase dependency)
 */

const rateLimits = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 100;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(userId: string): Promise<void> {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  
  if (!entry || entry.resetAt < now) {
    // New window
    rateLimits.set(userId, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return;
  }
  
  if (entry.count >= MAX_REQUESTS) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000 / 60)} minutes.`);
  }
  
  entry.count++;
}
