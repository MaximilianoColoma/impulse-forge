// In-memory rate limiting with cleanup
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export const persistentRateLimit = async (
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> => {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  // Cleanup expired entries
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key);
    }
  }
  
  const current = memoryStore.get(identifier);
  
  if (!current || current.resetTime < now) {
    // First request or window expired
    memoryStore.set(identifier, {
      count: 1,
      resetTime
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: Math.floor(resetTime / 1000)
    };
  }
  
  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.floor(current.resetTime / 1000),
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    };
  }
  
  // Increment count
  current.count++;
  return {
    allowed: true,
    remaining: limit - current.count,
    resetTime: Math.floor(current.resetTime / 1000)
  };
};

// Helper function for different limit types
export const createRateLimitMiddleware = (type: 'api' | 'auth' | 'upload') => {
  const limits = {
    api: { limit: 100, windowMs: 60000 },      // 100 requests/minute
    auth: { limit: 5, windowMs: 60000 },       // 5 auth attempts/minute
    upload: { limit: 10, windowMs: 60000 },    // 10 uploads/minute
  };
  
  return (identifier: string) => 
    persistentRateLimit(identifier, limits[type].limit, limits[type].windowMs);
};
