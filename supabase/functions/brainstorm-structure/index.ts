import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectIdea } = await req.json();
    
    if (!projectIdea || projectIdea.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Projektidee zu kurz' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Du bist ein Experte für Projektstrukturierung und ADHD-freundliches Arbeiten nach dem Pareto-Prinzip.

Deine Aufgabe: Analysiere die Projektidee des Users und schlage eine klare, actionable Ordnerstruktur vor.

WICHTIGE REGELN:
1. Maximal 5-7 Hauptordner (weniger ist mehr!)
2. Jeder Ordner repräsentiert einen KERNBEREICH, nicht jede kleine Aufgabe
3. Namen sind kurz, prägnant und actionable (z.B. "Launch", "Content", "Tech")
4. Denke in Phasen oder Arbeitsstreams, nicht in Kategorien
5. Priorisiere die 20% der Bereiche, die 80% des Werts bringen

AUSGABEFORMAT (JSON):
{
  "folders": [
    { "name": "Konzeption", "description": "Strategie & Grundlagen klären" },
    { "name": "MVP", "description": "Minimale lauffähige Version bauen" },
    { "name": "Launch", "description": "Go-Live vorbereiten und durchführen" }
  ]
}

Antworte NUR mit dem JSON, keine zusätzlichen Erklärungen.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Projektidee: ${projectIdea}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit erreicht, bitte später versuchen' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Lovable AI Guthaben aufgebraucht' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response (handles markdown code blocks)
    let parsedStructure;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedStructure = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid AI response format');
    }

    return new Response(
      JSON.stringify(parsedStructure),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brainstorm-structure:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});