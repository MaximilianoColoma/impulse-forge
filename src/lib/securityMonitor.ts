/**
 * Security event monitoring and logging
 * Tracks suspicious activities and security events
 */

export type SecurityEventType =
  | 'auth_failed'
  | 'auth_success'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'csrf_violation';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  userId?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// In-memory store for recent security events (last 100)
const securityEvents: SecurityEvent[] = [];
const MAX_EVENTS = 100;

// Track failed auth attempts per identifier
const authFailures = new Map<string, number>();
const MAX_AUTH_FAILURES = 5;
const AUTH_FAILURE_WINDOW = 300000; // 5 minutes

/**
 * Log a security event
 */
export const logSecurityEvent = (
  type: SecurityEventType,
  details: Record<string, any>,
  severity: SecurityEvent['severity'] = 'medium',
  userId?: string
): void => {
  const event: SecurityEvent = {
    type,
    timestamp: Date.now(),
    userId,
    details,
    severity,
  };
  
  securityEvents.push(event);
  
  // Keep only last MAX_EVENTS
  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.shift();
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.warn(`[Security Event - ${severity.toUpperCase()}]`, {
      type,
      details,
      userId,
    });
  }
  
  // In production, you could send to an analytics service
  if (severity === 'critical' || severity === 'high') {
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
    console.error('[CRITICAL SECURITY EVENT]', event);
  }
};

/**
 * Track authentication failure
 * Returns true if account should be temporarily locked
 */
export const trackAuthFailure = (identifier: string): boolean => {
  const current = authFailures.get(identifier) || 0;
  const newCount = current + 1;
  
  authFailures.set(identifier, newCount);
  
  // Auto-reset after window
  setTimeout(() => {
    authFailures.delete(identifier);
  }, AUTH_FAILURE_WINDOW);
  
  if (newCount >= MAX_AUTH_FAILURES) {
    logSecurityEvent(
      'suspicious_activity',
      {
        identifier,
        failureCount: newCount,
        reason: 'Multiple failed authentication attempts',
      },
      'high'
    );
    return true;
  }
  
  return false;
};

/**
 * Reset auth failure count for identifier
 */
export const resetAuthFailures = (identifier: string): void => {
  authFailures.delete(identifier);
};

/**
 * Get recent security events
 */
export const getSecurityEvents = (
  limit?: number,
  severity?: SecurityEvent['severity']
): SecurityEvent[] => {
  let filtered = securityEvents;
  
  if (severity) {
    filtered = filtered.filter((e) => e.severity === severity);
  }
  
  if (limit) {
    return filtered.slice(-limit);
  }
  
  return [...filtered];
};

/**
 * Detect potential XSS attempts in user input
 */
export const detectXSSAttempt = (input: string): boolean => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /eval\(/gi,
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      logSecurityEvent(
        'xss_attempt',
        { input: input.substring(0, 100) },
        'high'
      );
      return true;
    }
  }
  
  return false;
};

/**
 * Detect potential SQL injection attempts
 */
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\bOR\b|\bAND\b).*?=.*?=/gi,
    /UNION.*?SELECT/gi,
    /DROP.*?TABLE/gi,
    /--/g,
    /;.*?(DELETE|UPDATE|INSERT)/gi,
  ];
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      logSecurityEvent(
        'sql_injection_attempt',
        { input: input.substring(0, 100) },
        'critical'
      );
      return true;
    }
  }
  
  return false;
};

/**
 * Validate input for security threats
 */
export const validateSecureInput = (input: string): boolean => {
  if (detectXSSAttempt(input)) return false;
  if (detectSQLInjection(input)) return false;
  return true;
};
