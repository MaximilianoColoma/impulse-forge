import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImpulseRequest {
  text: string;
  context: {
    type: string;
    id: string;
    name: string;
  };
  user: {
    email: string;
  };
}

// Validate JWT token with proper signature verification
async function validateToken(authHeader: string | null, jwtSecret: string): Promise<{ userId: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    // Import key for verification
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify token signature and decode payload
    const payload = await verify(token, key) as { userId: string; email: string; exp: number; iss: string };
    
    // Check issuer
    if (payload.iss !== 'synapse-api') {
      console.error('Invalid token issuer');
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT secret for validation
    const jwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    const tokenData = await validateToken(authHeader, jwtSecret);

    if (!tokenData) {
      console.error('Invalid or missing authentication token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', tokenData.email);

    // Parse request body
    const body: ImpulseRequest = await req.json();

    // Validate request body
    if (!body.text || !body.context || !body.user || !body.user.email) {
      console.error('Invalid request body:', body);
      return new Response(
        JSON.stringify({ error: 'Bad Request - Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', body.user.email)
      .single();

    if (profileError || !profile) {
      console.error('User not found:', body.user.email);
      return new Response(
        JSON.stringify({ error: 'Bad Request - User not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = profile.id;

    // Find or create project based on context.name
    let projectId: string;

    const { data: existingProject } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('name', body.context.name)
      .maybeSingle();

    if (existingProject) {
      projectId = existingProject.id;
      console.log('Found existing project:', body.context.name);
    } else {
      // Create new project
      const { data: newProject, error: projectError } = await supabaseAdmin
        .from('projects')
        .insert({
          user_id: userId,
          name: body.context.name,
        })
        .select('id')
        .single();

      if (projectError || !newProject) {
        console.error('Error creating project:', projectError);
        return new Response(
          JSON.stringify({ error: 'Internal Server Error - Could not create project' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      projectId = newProject.id;
      console.log('Created new project:', body.context.name);
    }

    // Generate tags from context
    const tags = [
      '#Centraly',
      `#${body.context.type}`,
      `#${body.context.name.replace(/\s+/g, '')}`,
    ];

    // Create impulse
    const { data: impulse, error: impulseError } = await supabaseAdmin
      .from('impulses')
      .insert({
        user_id: userId,
        project_id: projectId,
        content: body.text,
        type: 'idea',
        status: 'unprocessed',
        tags,
      })
      .select('id, content, status, created_at')
      .single();

    if (impulseError || !impulse) {
      console.error('Error creating impulse:', impulseError);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error - Could not create impulse' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created impulse:', impulse.id);

    return new Response(
      JSON.stringify({
        id: impulse.id,
        text: impulse.content,
        status: 'offen',
        createdAt: impulse.created_at,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
