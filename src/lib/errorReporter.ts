/**
 * Centralized error reporting and tracking
 * Captures, logs, and reports errors across the application
 */

import { logSecurityEvent } from './securityMonitor';
import { getErrorInfo } from './errorMapper';

export interface ErrorReport {
  id: string;
  timestamp: number;
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  userAgent: string;
  url: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const errorReports: ErrorReport[] = [];
const MAX_REPORTS = 100;

/**
 * Generate unique error ID
 */
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Determine error severity
 */
const determineErrorSeverity = (error: Error): ErrorReport['severity'] => {
  const message = error.message.toLowerCase();
  
  // Critical errors
  if (
    message.includes('security') ||
    message.includes('unauthorized') ||
    message.includes('csrf') ||
    error.name === 'SecurityError'
  ) {
    return 'critical';
  }
  
  // High severity errors
  if (
    message.includes('database') ||
    message.includes('auth') ||
    message.includes('payment') ||
    message.includes('stripe')
  ) {
    return 'high';
  }
  
  // Medium severity errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch')
  ) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Report an error
 */
export const reportError = (
  error: Error,
  context?: Record<string, any>,
  component?: string,
  userId?: string
): ErrorReport => {
  const severity = determineErrorSeverity(error);
  
  const report: ErrorReport = {
    id: generateErrorId(),
    timestamp: Date.now(),
    error,
    context,
    userId,
    userAgent: navigator.userAgent,
    url: window.location.href,
    component,
    severity,
  };
  
  errorReports.push(report);
  
  // Keep only last MAX_REPORTS
  if (errorReports.length > MAX_REPORTS) {
    errorReports.shift();
  }
  
  // Log to console
  if (import.meta.env.DEV) {
    console.error('[Error Report]', {
      id: report.id,
      error,
      context,
      component,
      severity,
    });
  }
  
  // Log security-related errors
  if (severity === 'critical' || severity === 'high') {
    logSecurityEvent(
      'suspicious_activity',
      {
        errorId: report.id,
        errorMessage: error.message,
        component,
        ...context,
      },
      severity
    );
  }
  
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    sendToErrorTrackingService(report);
  }
  
  return report;
};

/**
 * Send error to tracking service (placeholder)
 * Replace with actual service integration (Sentry, LogRocket, etc.)
 */
const sendToErrorTrackingService = (report: ErrorReport): void => {
  // TODO: Integrate with error tracking service
  // Example: Sentry.captureException(report.error, { extra: report.context })
  console.log('[Error Tracking] Would send to service:', report.id);
};

/**
 * Get error reports
 */
export const getErrorReports = (
  limit?: number,
  severity?: ErrorReport['severity']
): ErrorReport[] => {
  let filtered = errorReports;
  
  if (severity) {
    filtered = filtered.filter((r) => r.severity === severity);
  }
  
  if (limit) {
    return filtered.slice(-limit);
  }
  
  return [...filtered];
};

/**
 * Clear error reports
 */
export const clearErrorReports = (): void => {
  errorReports.length = 0;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: Error): string => {
  const errorInfo = getErrorInfo(error);
  return errorInfo.message;
};

/**
 * Handle global errors
 */
export const setupGlobalErrorHandling = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      new Error(event.reason?.message || 'Unhandled Promise Rejection'),
      {
        reason: event.reason,
        promise: 'Promise rejected',
      },
      'GlobalErrorHandler',
      undefined
    );
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    reportError(
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      'GlobalErrorHandler',
      undefined
    );
  });
};
