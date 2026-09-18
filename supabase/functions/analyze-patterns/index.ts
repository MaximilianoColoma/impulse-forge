import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Fetching impulses for user:', user.id);

    // Fetch all impulses with project information
    const { data: impulses, error: impulsesError } = await supabase
      .from('impulses')
      .select(`
        id,
        content,
        type,
        status,
        tags,
        created_at,
        updated_at,
        due_date,
        projects:project_id (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (impulsesError) {
      console.error('Error fetching impulses:', impulsesError);
      throw impulsesError;
    }

    console.log(`Fetched ${impulses?.length || 0} impulses`);

    if (!impulses || impulses.length === 0) {
      return new Response(
        JSON.stringify({
          topProductiveTimes: [],
          projectTriggers: [],
          successPatterns: [],
          proactiveSuggestion: "Du hast noch keine Impulse erfasst. Beginne damit, deine Gedanken zu sammeln, um personalisierte Insights zu erhalten.",
          dataAvailable: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for AI analysis
    const analysisData = impulses.map(imp => ({
      content: imp.content,
      type: imp.type,
      status: imp.status,
      tags: imp.tags || [],
      project: imp.projects?.[0]?.name || 'Kein Projekt',
      created_at: imp.created_at,
      updated_at: imp.updated_at,
      due_date: imp.due_date
    }));

    const prompt = `Du bist ein spezialisierter Produktivitäts-Analyst für einen User mit ADHD. Deine Aufgabe ist es, die folgende Liste von Impulsen zu analysieren, um Muster, Energierythmen und Trigger zu erkennen.

**Daten der Impulse (${impulses.length} Impulse):**
${JSON.stringify(analysisData, null, 2)}

**Analysiere die Daten und gib Antworten auf die folgenden Fragen:**
1. **Zeitliche Muster:** An welchen Wochentagen und zu welchen Uhrzeiten entstehen die meisten Impulse? Identifiziere die Top 3 produktivsten Zeitfenster.
2. **Projekt-Trigger:** Gibt es bestimmte Projekte, die besonders viele kreative Impulse auslösen? Nenne die Top 3.
3. **Erfolgs-Muster (Wichtig!):** Suche nach Mustern, die auf einen Energieschub hindeuten. Beispiel: "Werden nach der Erledigung von 3 aufeinanderfolgenden Aufgaben in Projekt X signifikant mehr neue Impulse erstellt?". Finde solche "Aktion -> Reaktion"-Ketten.
4. **Prognose:** Basierend auf diesen Mustern, was ist die wahrscheinlichste produktive Zeit für den User morgen? Welches Projekt sollte er in dieser Zeit bearbeiten, um einen Kreativ-Flow auszulösen?

**WICHTIG: Antworte NUR mit einem gültigen JSON-Objekt in diesem exakten Format (ohne Markdown-Code-Blöcke):**
{
  "topProductiveTimes": [
    { "day": "Donnerstag", "hour": 14, "impulseCount": 25 },
    { "day": "Dienstag", "hour": 15, "impulseCount": 22 },
    { "day": "Montag", "hour": 10, "impulseCount": 18 }
  ],
  "projectTriggers": [
    { "projectName": "Projekt Alpha", "impulseCount": 40 },
    { "projectName": "KI-Experimente", "impulseCount": 35 },
    { "projectName": "Persönlich", "impulseCount": 28 }
  ],
  "successPatterns": [
    { "pattern": "Nach Erledigung von Aufgaben in 'Projekt Alpha' steigt die Impuls-Rate um 50%.", "confidence": "hoch" },
    { "pattern": "Montagmorgen sind oft produktiv nach dem Planungsmeeting.", "confidence": "mittel" }
  ],
  "proactiveSuggestion": "Deine produktivste Zeit ist Donnerstag nachmittag. Plane deine wichtigste Aufgabe für 'Projekt Alpha' in dieses Zeitfenster, um einen Kreativ-Flow zu starten."
}`;

    console.log('Calling Lovable AI for pattern analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Produktivitäts-Analyst, der JSON-Antworten gibt. Antworte nur mit gültigem JSON ohne Markdown-Formatierung.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let analysisResult = aiData.choices[0].message.content;

    // Clean up the response - remove markdown code blocks if present
    analysisResult = analysisResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('Cleaned AI response:', analysisResult);

    const parsedResult = JSON.parse(analysisResult);

    return new Response(
      JSON.stringify({ ...parsedResult, dataAvailable: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-patterns function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
