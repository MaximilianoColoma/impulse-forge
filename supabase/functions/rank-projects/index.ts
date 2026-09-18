import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch all projects with their impulses
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id);

    if (projectsError) throw projectsError;

    const projectStats = await Promise.all(
      projects.map(async (project) => {
        const { data: impulses } = await supabase
          .from('impulses')
          .select('status')
          .eq('project_id', project.id);

        const total = impulses?.length || 0;
        const done = impulses?.filter(i => i.status === 'done').length || 0;
        const progress = total > 0 ? (done / total) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          total,
          done,
          progress,
        };
      })
    );

    // Use AI to rank projects
    const prompt = `Analyze these projects and rank them by priority. Consider progress percentage and total tasks.
Projects: ${JSON.stringify(projectStats)}

Return ONLY a JSON array of project IDs in priority order (most important first), considering:
- Projects with low progress but many tasks need attention
- Projects with medium progress are actively being worked on
- Projects with high progress are nearly complete
Format: ["project-id-1", "project-id-2", ...]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a project management AI. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error('AI ranking failed');
    }

    const aiData = await aiResponse.json();
    const rankedIds = JSON.parse(aiData.choices[0].message.content);

    // Sort projects by AI ranking
    const rankedProjects = rankedIds
      .map((id: string) => projectStats.find(p => p.id === id))
      .filter(Boolean);

    return new Response(JSON.stringify({ rankedProjects }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in rank-projects:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
