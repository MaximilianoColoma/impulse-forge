import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionSuggestion {
  type: 'rename' | 'add' | 'remove';
  oldName?: string;
  newName?: string;
  newFolderName?: string;
  reason: string;
}

interface EvolutionReport {
  successRating: 'hoch' | 'mittel' | 'niedrig';
  summary: string;
  suggestions: EvolutionSuggestion[];
}

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

    const { templateId } = await req.json();

    if (!templateId) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('community_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only creator can trigger evolution
    if (template.creator_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the creator can trigger evolution' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch feedback for this template (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from('blueprint_feedback')
      .select('*')
      .eq('template_id', templateId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (feedbackError) {
      console.error('Feedback fetch error:', feedbackError);
      return new Response(JSON.stringify({ error: 'Failed to fetch feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!feedbackData || feedbackData.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Not enough feedback data yet to generate evolution suggestions.',
        feedbackCount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze feedback
    const usageSuccessCount = feedbackData.filter(f => f.feedback_type === 'usage_success').length;
    const modifications = feedbackData.filter(f => f.feedback_type === 'modification');

    // Count modification patterns
    const modificationSummary = modifications.map(m => {
      const data = m.feedback_data as any;
      return `${data.action || 'modification'}: ${data.details || 'unspecified change'}`;
    });

    const modificationCounts: Record<string, number> = {};
    modificationSummary.forEach(mod => {
      modificationCounts[mod] = (modificationCounts[mod] || 0) + 1;
    });

    const topModifications = Object.entries(modificationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mod, count]) => `${count} Nutzer: ${mod}`);

    if (!lovableApiKey) {
      console.log('No Lovable API key, returning basic summary');
      return new Response(JSON.stringify({ 
        successRating: usageSuccessCount > 10 ? 'hoch' : usageSuccessCount > 3 ? 'mittel' : 'niedrig',
        summary: `Dieses Blueprint wurde ${usageSuccessCount} Mal erfolgreich angewendet in den letzten 30 Tagen.`,
        suggestions: [],
        feedbackCount: feedbackData.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to generate evolution suggestions
    const aiPrompt = `Du bist ein evolutionärer Algorithmus für Projektstrukturen. Analysiere die folgenden Nutzungsdaten für ein Blueprint und schlage eine verbesserte Version 2.0 vor.

**Blueprint-Name:** ${template.anonymized_name}
**Nutzungserfolg:** ${usageSuccessCount} Mal in den letzten 30 Tagen.
**Häufigste Anpassungen:**
${topModifications.length > 0 ? topModifications.join('\n') : 'Keine signifikanten Anpassungen'}

**Deine Aufgabe:**
1. Bewerte den Erfolg (hoch, mittel, niedrig).
2. Schlage 1-3 konkrete Verbesserungen basierend auf den häufigsten Anpassungen vor.
3. Formuliere einen kurzen, überzeugenden Text, warum diese Änderungen das Blueprint verbessern.

**Antworte nur mit diesem JSON-Objekt (keine zusätzlichen Texte):**
{
  "successRating": "hoch/mittel/niedrig",
  "summary": "Kurze Zusammenfassung der Analyse",
  "suggestions": [
    { "type": "rename", "oldName": "Alter Name", "newName": "Neuer Name", "reason": "Begründung" },
    { "type": "add", "newFolderName": "Neuer Ordner", "reason": "Begründung" }
  ]
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
      
      // Fallback to basic summary
      return new Response(JSON.stringify({ 
        successRating: usageSuccessCount > 10 ? 'hoch' : usageSuccessCount > 3 ? 'mittel' : 'niedrig',
        summary: `Dieses Blueprint wurde ${usageSuccessCount} Mal erfolgreich angewendet.`,
        suggestions: [],
        feedbackCount: feedbackData.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const evolutionReport: EvolutionReport = JSON.parse(aiData.choices[0].message.content);

    // Store evolution data with the template
    const { error: updateError } = await supabase
      .from('community_templates')
      .update({
        is_evolution: true,
        evolution_data: {
          ...evolutionReport,
          generatedAt: new Date().toISOString(),
          feedbackCount: feedbackData.length,
          usageCount: usageSuccessCount
        }
      })
      .eq('id', templateId);

    if (updateError) {
      console.error('Error updating template with evolution data:', updateError);
    }

    console.log('Evolution report generated successfully for template:', templateId);

    return new Response(JSON.stringify({ 
      ...evolutionReport,
      feedbackCount: feedbackData.length,
      usageCount: usageSuccessCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evolve-blueprint function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
