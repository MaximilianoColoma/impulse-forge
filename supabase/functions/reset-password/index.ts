import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createRateLimitMiddleware } from '../_shared/persistentRateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply rate limiting
    const authRateLimit = createRateLimitMiddleware('auth');
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetTime, retryAfter } = await authRateLimit(`reset:${clientIP}`);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Zu viele Anfragen zum Zurücksetzen des Passworts. Bitte versuchen Sie es später erneut.',
          resetTime 
        }), 
        { 
          status: 429,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() || '3600',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }
    
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get('origin')}/reset-password`,
      });
    } catch {
      // Keep reset outcomes indistinguishable and never log account identifiers.
      console.error('Reset request could not be completed');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet' 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        } 
      }
    );
  } catch {
    console.error('Reset request could not be completed');
    return new Response(
      JSON.stringify({ error: 'Reset request could not be completed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
