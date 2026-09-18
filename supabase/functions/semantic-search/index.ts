import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimit } from '../_shared/rateLimiter.ts';
import { validateSearchQuery, ValidationException } from '../_shared/validation.ts';
import { getJsonHeaders, securityHeaders } from '../_shared/securityHeaders.ts';

const corsHeaders = securityHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const { allowed, resetTime } = rateLimit(`semantic-search:${clientIP}`, 30, 60000); // 30 requests per minute

  if (!allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        resetTime 
      }), 
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime! - Date.now()) / 1000).toString() 
        }
      }
    );
  }

  try {
    // Parse and validate request
    const requestBody = await req.json();
    const { query: searchTerm } = validateSearchQuery({ 
      query: requestBody.searchTerm || requestBody.query 
    });
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ impulses: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get all user's impulses
    const { data: impulses, error: fetchError } = await supabase
      .from('impulses')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    if (!impulses || impulses.length === 0) {
      return new Response(
        JSON.stringify({ impulses: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create a summary of impulses for the AI
    const impulseSummary = impulses.map((imp, idx) => 
      `[${idx}] ID: ${imp.id}, Inhalt: ${imp.content}, Tags: ${imp.tags?.join(', ') || 'keine'}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein intelligenter Suchassistent. Deine Aufgabe ist es, thematisch relevante Notizen zu finden. Analysiere die semantische Bedeutung und den Kontext. Antworte NUR mit den Indizes der relevantesten Notizen, getrennt durch Kommas (z.B. "0,3,7,12"). Maximal 10 Ergebnisse, sortiert nach Relevanz.'
          },
          {
            role: 'user',
            content: `Suchanfrage: "${searchTerm}"\n\nVerfügbare Notizen:\n${impulseSummary}\n\nWelche Notizen sind thematisch am relevantesten für diese Suchanfrage?`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ impulses: [] }),
        { 
          status: response.status === 429 || response.status === 402 ? response.status : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    console.log('AI Response:', aiResponse);

    // Parse the indices from AI response
    const indices = aiResponse
      .split(',')
      .map((idx: string) => parseInt(idx.trim()))
      .filter((idx: number) => !isNaN(idx) && idx >= 0 && idx < impulses.length);

    // Get the relevant impulses
    const relevantImpulses = indices.map((idx: number) => impulses[idx]);

    console.log('Found impulses:', relevantImpulses.length);

    return new Response(
      JSON.stringify({ impulses: relevantImpulses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in semantic-search function:', error);
    
    // Handle validation errors
    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: error.errors,
          impulses: [] 
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, impulses: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
