// Security headers for all edge functions
// Implements best practices for web security

export const securityHeaders = {
  // CORS headers
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours

  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Content Security Policy - will be expanded based on app needs
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://ai.gateway.lovable.dev https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Strict-Transport-Security (HSTS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const jsonHeaders = {
  ...securityHeaders,
  'Content-Type': 'application/json',
};

export function getSecurityHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...securityHeaders,
    ...additionalHeaders,
  };
}

export function getJsonHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...jsonHeaders,
    ...additionalHeaders,
  };
}
