import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { templateName, description, makeAnonymous } = await req.json();

    // Fetch user's project structure
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, parent_project_id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get impulse counts for metadata
    const { data: impulses, error: impulsesError } = await supabase
      .from('impulses')
      .select('project_id, status')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    if (impulsesError) {
      console.error('Error fetching impulses:', impulsesError);
    }

    // Calculate metadata per project
    const projectMetadata = projects.map(project => {
      const projectImpulses = impulses?.filter(i => i.project_id === project.id) || [];
      return {
        id: project.id,
        name: project.name,
        parent_project_id: project.parent_project_id,
        impulse_count: projectImpulses.length,
        completed_count: projectImpulses.filter(i => i.status === 'done').length,
      };
    });

    let anonymizedData;
    let generatedDescription = description;

    if (makeAnonymous && lovableApiKey) {
      // Use AI to anonymize project names and generate description
      const aiPrompt = `Du bist ein Experte für Datenschutz und Anonymisierung. 
      
Hier ist eine Projektstruktur eines Users:
${JSON.stringify(projectMetadata, null, 2)}

Aufgaben:
1. Ersetze alle Projektnamen durch generische, aber beschreibende Platzhalter (z.B. "Kunde Müller" -> "Kundenprojekt A", "Synapse App" -> "Tech-Projekt 1", "Marketing" -> "Marketing-Bereich").
2. Behalte die Hierarchie und IDs bei.
3. Erstelle eine prägnante, hilfreiche Beschreibung (max. 2 Sätze) dieser Struktur für andere User, die erklärt, für welche Art von Arbeit sie geeignet ist.

Antworte NUR mit diesem JSON-Format:
{
  "anonymizedProjects": [
    { "id": "uuid", "name": "Anonymisierter Name", "parent_project_id": "uuid oder null", "impulse_count": 0, "completed_count": 0 }
  ],
  "description": "Kurze, hilfreiche Beschreibung der Struktur"
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: aiPrompt }],
          response_format: { type: "json_object" }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        return new Response(JSON.stringify({ error: 'AI anonymization failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const aiResult = JSON.parse(aiData.choices[0].message.content);
      
      anonymizedData = aiResult.anonymizedProjects;
      if (!description) {
        generatedDescription = aiResult.description;
      }
    } else {
      // No anonymization, use original data
      anonymizedData = projectMetadata;
    }

    // Save to community_templates
    const { data: template, error: insertError } = await supabase
      .from('community_templates')
      .insert({
        original_name: templateName,
        anonymized_name: makeAnonymous ? `${templateName} (Anonymisiert)` : templateName,
        description: generatedDescription,
        template_data: anonymizedData,
        creator_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting template:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to publish blueprint' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Blueprint published successfully:', template.id);

    return new Response(JSON.stringify({ success: true, template }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in publish-blueprint function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});