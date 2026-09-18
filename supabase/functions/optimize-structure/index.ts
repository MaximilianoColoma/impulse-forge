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

    // Fetch all projects with their hierarchy
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at');

    if (projectsError) throw projectsError;

    // Fetch all impulses
    const { data: impulses, error: impulsesError } = await supabase
      .from('impulses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at');

    if (impulsesError) throw impulsesError;

    console.log(`Fetched ${projects?.length || 0} projects and ${impulses?.length || 0} impulses for user ${user.id}`);

    // Check if there's enough data for analysis
    if (!projects || projects.length === 0) {
      console.log('No projects found - cannot perform optimization');
      return new Response(JSON.stringify({ 
        empty: true,
        message: 'Keine Projekte vorhanden. Erstelle zuerst Projekte, um die KI-Optimierung zu nutzen.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!impulses || impulses.length === 0) {
      console.log('No impulses found - cannot perform optimization');
      return new Response(JSON.stringify({ 
        empty: true,
        message: 'Keine Impulse vorhanden. Erstelle zuerst Impulse in deinen Projekten, um die KI-Optimierung zu nutzen.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build data structure for AI
    const projectsWithImpulses = projects.map(project => {
      const projectImpulses = impulses.filter(i => i.project_id === project.id);
      const completedCount = projectImpulses.filter(i => i.status === 'done').length;
      const inProgressCount = projectImpulses.filter(i => i.status === 'in-progress').length;
      const lastActivity = projectImpulses.length > 0 
        ? new Date(Math.max(...projectImpulses.map(i => new Date(i.updated_at).getTime())))
        : new Date(project.updated_at);
      
      return {
        id: project.id,
        name: project.name,
        parent_project_id: project.parent_project_id,
        created_at: project.created_at,
        impulse_count: projectImpulses.length,
        completed_count: completedCount,
        in_progress_count: inProgressCount,
        last_activity: lastActivity,
        impulses: projectImpulses.map(i => ({
          id: i.id,
          content: i.content,
          status: i.status,
          type: i.type,
          created_at: i.created_at,
          updated_at: i.updated_at,
        })),
      };
    });

    const prompt = `Du bist ein Experte für Organisationsberatung, spezialisiert auf Produktivitätssysteme für Menschen mit ADHS. Deine Aufgabe ist es, die folgende Projekt- und Impulsstruktur eines Users zu analysieren und konkrete, umsetzbare Optimierungsvorschläge zu machen.

**Daten des Users:**
${JSON.stringify(projectsWithImpulses, null, 2)}

**Analysiere die Daten und gib Vorschläge für die folgenden Bereiche:**
1. **Struktur & Hierarchie:** Gibt es Projekte, die zusammengelegt werden sollten? Gibt es eine neue, übergeordnete Struktur, die sinnvoll wäre?
2. **Naming & Konsistenz:** Gibt es Projekte mit unklaren oder ähnlichen Namen, die vereinheitlicht werden könnten?
3. **Aktivität & Fokus:** Welche Projekte sind inaktiv (keine Impulse seit 6 Monaten) und könnten archiviert werden?
4. **Pareto-Prinzip:** Welche 20% der Projektordner enthalten 80% der wichtigen Impulse?

Antworte NUR mit einem validen JSON-Objekt in diesem Format (keine zusätzlichen Texte):
{
  "summary": "Kurze Zusammenfassung der Analyse und der wichtigsten Empfehlung.",
  "suggestions": [
    { "type": "merge", "description": "Beschreibung", "projectIds": ["id1", "id2"], "newParentName": "Name" },
    { "type": "create", "description": "Beschreibung", "newProjectName": "Name" },
    { "type": "archive", "description": "Beschreibung", "projectId": "id" },
    { "type": "rename", "description": "Beschreibung", "projectId": "id", "newName": "Name" }
  ]
}`;

    console.log('Starting AI analysis...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für Organisationsberatung. Antworte nur mit validem JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Insufficient credits. Please add funds to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Clean up potential markdown code blocks
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const analysis = JSON.parse(content);
    
    console.log('AI analysis completed successfully');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in optimize-structure:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});