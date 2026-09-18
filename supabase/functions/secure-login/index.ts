import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { setSecureCookie } from '../_shared/secureAuth.ts';
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
    const authRateLimit = createRateLimitMiddleware('auth');
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetTime, retryAfter } = await authRateLimit(`auth:${clientIP}`);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.',
          resetTime 
        }), 
        { 
          status: 429,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }
    
    const { email, password } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Create secure session with HttpOnly cookie
    const response = new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        }
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
    
    // Set HttpOnly cookie with session token
    setSecureCookie(response, 'synapse_session', data.session.access_token, {
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    // Set refresh token with longer lifetime
    setSecureCookie(response, 'synapse_refresh', data.session.refresh_token, {
      maxAge: 2592000, // 30 days
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    return response;
  } catch (error) {
    console.error('Error in secure-login function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Authentication failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }
});
