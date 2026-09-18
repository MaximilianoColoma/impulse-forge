/**
 * Custom hook for secure API calls with rate limiting and error handling
 */

import { useCallback } from 'react';
import { checkRateLimit } from '@/lib/clientRateLimiter';
import { reportError } from '@/lib/errorReporter';
import { measurePerformance } from '@/lib/performanceMonitor';
import { toast } from 'sonner';

interface SecureAPIOptions {
  rateLimitKey?: string;
  rateLimitType?: 'auth' | 'api' | 'upload' | 'default';
  skipRateLimit?: boolean;
}

export const useSecureAPI = () => {
  const secureCall = useCallback(
    async <T>(
      fn: () => Promise<T>,
      operationName: string,
      options: SecureAPIOptions = {}
    ): Promise<T | null> => {
      const {
        rateLimitKey = operationName,
        rateLimitType = 'api',
        skipRateLimit = false,
      } = options;

      try {
        // Check rate limit
        if (!skipRateLimit) {
          const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitType);
          
          if (!rateLimitResult.allowed) {
            const message = `Zu viele Anfragen. Bitte warten Sie ${rateLimitResult.retryAfter} Sekunden.`;
            toast.error(message);
            throw new Error('Rate limit exceeded');
          }
        }

        // Execute with performance tracking
        const result = await measurePerformance(
          operationName,
          fn,
          { rateLimitKey, rateLimitType }
        );

        return result;
      } catch (error) {
        // Report error
        reportError(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: operationName,
            rateLimitKey,
            rateLimitType,
          },
          'useSecureAPI'
        );

        // Show user-friendly error
        if (error instanceof Error && error.message !== 'Rate limit exceeded') {
          toast.error(error.message || 'Ein Fehler ist aufgetreten');
        }

        return null;
      }
    },
    []
  );

  return { secureCall };
};
