import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimit } from '../_shared/rateLimiter.ts';
import { validateTagGenerationRequest, ValidationException } from '../_shared/validation.ts';
import { getJsonHeaders, securityHeaders } from '../_shared/securityHeaders.ts';

const corsHeaders = securityHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const { allowed, resetTime } = rateLimit(`generate-tags:${clientIP}`, 20, 60000); // 20 requests per minute

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
    const { content, projectId } = validateTagGenerationRequest(requestBody);
    
    // Initialize Supabase client for project context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let projectContext = '';
    
    // If projectId is provided, fetch project context
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      if (project) {
        // Get existing tags from impulses in this project
        const { data: impulses } = await supabase
          .from('impulses')
          .select('tags')
          .eq('project_id', projectId)
          .not('tags', 'is', null);
        
        const existingTags = new Set<string>();
        impulses?.forEach(imp => {
          if (imp.tags && Array.isArray(imp.tags)) {
            imp.tags.forEach((tag: string) => existingTags.add(tag));
          }
        });
        
        const tagList = Array.from(existingTags).slice(0, 10).join(', ');
        projectContext = `\n\nProjektkontext: Das Projekt heißt "${project.name}". ${tagList ? `Häufige Tags in diesem Projekt: ${tagList}.` : ''} Schlage Tags vor, die zum neuen Impuls passen und zum bestehenden Vokabular des Projekts passen.`;
      }
    }
    
    if (!content || content.trim().length < 5) {
      return new Response(
        JSON.stringify({ tags: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: `Du bist ein intelligenter Assistent, der Gedanken und Ideen analysiert. Deine Aufgabe ist es, 2-4 prägnante, relevante Tags auf Deutsch vorzuschlagen, die den Inhalt kategorisieren. Tags sollten kurz sein (1-2 Wörter) und mit # beginnen. Antworte NUR mit den Tags, durch Komma getrennt, keine Erklärungen.${projectContext}`
          },
          {
            role: 'user',
            content: `Analysiere diesen Text und schlage passende Tags vor: "${content}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ tags: [] }),
        { 
          status: response.status === 429 || response.status === 402 ? response.status : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();
    
    // Parse tags from response
    const tags = generatedText
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0)
      .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`)
      .slice(0, 4); // Max 4 tags

    console.log('Generated tags:', tags);

    return new Response(
      JSON.stringify({ tags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-tags function:', error);
    
    // Handle validation errors
    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: error.errors,
          tags: [] 
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, tags: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
