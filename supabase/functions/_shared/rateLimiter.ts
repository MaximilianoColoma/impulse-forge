const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  
  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Check current identifier
  const current = rateLimitStore.get(identifier);
  
  if (!current || current.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, resetTime: now + windowMs };
  }
  
  if (current.count >= limit) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  // Increment count
  current.count++;
  return { allowed: true, resetTime: current.resetTime };
};
