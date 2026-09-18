/**
 * Client-side rate limiting to prevent API abuse
 * Tracks requests per endpoint and enforces limits
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limit configurations by endpoint type
const defaultConfigs: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  api: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  upload: { maxRequests: 10, windowMs: 60000 }, // 10 uploads per minute
  default: { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
};

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier for the endpoint/action
 * @param type - Type of endpoint (auth, api, upload, etc.)
 * @returns Object with allowed status and retry info
 */
export const checkRateLimit = (
  key: string,
  type: keyof typeof defaultConfigs = 'default'
): { allowed: boolean; retryAfter?: number } => {
  const config = defaultConfigs[type] || defaultConfigs.default;
  const now = Date.now();
  
  // Clean up expired entries
  for (const [entryKey, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(entryKey);
    }
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  entry.count++;
  return { allowed: true };
};

/**
 * Reset rate limit for a specific key
 * Useful for testing or manual resets
 */
export const resetRateLimit = (key: string): void => {
  rateLimitStore.delete(key);
};

/**
 * Get remaining requests for a key
 */
export const getRemainingRequests = (
  key: string,
  type: keyof typeof defaultConfigs = 'default'
): number => {
  const config = defaultConfigs[type] || defaultConfigs.default;
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry || entry.resetTime < now) {
    return config.maxRequests;
  }
  
  return Math.max(0, config.maxRequests - entry.count);
};
