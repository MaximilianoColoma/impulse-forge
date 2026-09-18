import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectFingerprint {
  totalProjects: number;
  maxDepth: number;
  topLevelNames: string[];
  averageImpulsesPerProject: number;
  projectTypes: string[];
  hasHierarchy: boolean;
}

interface TemplateMatch {
  templateId: string;
  templateName: string;
  reason: string;
  hasEvolution?: boolean;
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

    // Fetch user's project structure
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, parent_project_id')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ 
        fingerprint: null, 
        matches: [],
        message: 'No projects found. Create some projects first!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch impulses for metadata
    const { data: impulses } = await supabase
      .from('impulses')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    // Calculate user's fingerprint
    const calculateDepth = (projectId: string, depth = 0): number => {
      const children = projects.filter(p => p.parent_project_id === projectId);
      if (children.length === 0) return depth;
      return Math.max(...children.map(c => calculateDepth(c.id, depth + 1)));
    };

    const topLevelProjects = projects.filter(p => !p.parent_project_id);
    const maxDepth = Math.max(...topLevelProjects.map(p => calculateDepth(p.id, 1)));
    
    const totalImpulses = impulses?.length || 0;
    const avgImpulses = projects.length > 0 ? Math.round(totalImpulses / projects.length) : 0;

    // Categorize project types based on names
    const categorizeProject = (name: string): string => {
      const lower = name.toLowerCase();
      if (lower.match(/tech|dev|code|api|software|app|web/)) return 'tech';
      if (lower.match(/design|kreativ|art|content|marketing/)) return 'creative';
      if (lower.match(/admin|verwaltung|organisation|dokumente/)) return 'admin';
      if (lower.match(/kunde|client|auftrag/)) return 'client';
      if (lower.match(/lernen|learn|studie|kurs/)) return 'learning';
      return 'general';
    };

    const projectTypes = [...new Set(projects.map(p => categorizeProject(p.name)))];

    const userFingerprint: ProjectFingerprint = {
      totalProjects: projects.length,
      maxDepth: maxDepth,
      topLevelNames: topLevelProjects.map(p => p.name).slice(0, 5),
      averageImpulsesPerProject: avgImpulses,
      projectTypes: projectTypes,
      hasHierarchy: maxDepth > 1,
    };

    // Fetch all community templates
    const { data: templates, error: templatesError } = await supabase
      .from('community_templates')
      .select('*')
      .order('downloads_count', { ascending: false })
      .limit(20);

    if (templatesError || !templates || templates.length === 0) {
      console.log('No templates found or error:', templatesError);
      return new Response(JSON.stringify({ 
        fingerprint: userFingerprint,
        matches: [],
        message: 'No community templates available yet.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create fingerprints for all templates
    const templateFingerprints = templates.map(template => {
      const data = template.template_data as any[];
      const topLevel = data.filter(p => !p.parent_project_id);
      
      const calculateTemplateDepth = (projectId: string, depth = 0): number => {
        const children = data.filter(p => p.parent_project_id === projectId);
        if (children.length === 0) return depth;
        return Math.max(...children.map(c => calculateTemplateDepth(c.id, depth + 1)));
      };

      const maxTemplateDepth = Math.max(...topLevel.map(p => calculateTemplateDepth(p.id, 1)));
      const types = [...new Set(data.map(p => categorizeProject(p.name)))];

      return {
        templateId: template.id,
        templateName: template.anonymized_name,
        fingerprint: {
          totalProjects: data.length,
          maxDepth: maxTemplateDepth,
          topLevelNames: topLevel.map(p => p.name).slice(0, 5),
          projectTypes: types,
          hasHierarchy: maxTemplateDepth > 1,
        }
      };
    });

    if (!lovableApiKey) {
      console.log('No Lovable API key, returning top 3 by downloads');
      const topMatches: TemplateMatch[] = templates.slice(0, 3).map(t => ({
        templateId: t.id,
        templateName: t.anonymized_name,
        reason: 'Beliebtes Template aus der Community',
      }));
      
      return new Response(JSON.stringify({ 
        fingerprint: userFingerprint,
        matches: topMatches 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to find the best matches
    const aiPrompt = `Du bist ein hyperintelligenter Matching-Algorithmus für Projektstrukturen. Vergleiche den folgenden User Fingerprint mit der Liste von Template Fingerprints. Finde die 3 besten Matches und gib für jedes Match eine kurze, überzeugende Begründung (max. 20 Wörter), warum es passt.

**User Fingerprint:**
${JSON.stringify(userFingerprint, null, 2)}

**Template Fingerprints:**
${JSON.stringify(templateFingerprints, null, 2)}

Analysiere:
1. Ähnliche Projektanzahl und Tiefe der Hierarchie
2. Übereinstimmende Projekttypen (tech, creative, admin, etc.)
3. Ähnliche Namenskonventionen in Top-Level-Projekten
4. Ob der User Hierarchien nutzt oder flache Strukturen bevorzugt

Antworte NUR mit diesem JSON-Array (keine zusätzlichen Texte):
[
  { "templateId": "uuid", "reason": "Kurze, überzeugende Begründung" },
  { "templateId": "uuid", "reason": "Kurze, überzeugende Begründung" },
  { "templateId": "uuid", "reason": "Kurze, überzeugende Begründung" }
]`;

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
      
      // Fallback: return top 3 by downloads
      const topMatches: TemplateMatch[] = templates.slice(0, 3).map(t => ({
        templateId: t.id,
        templateName: t.anonymized_name,
        reason: 'Beliebtes Template aus der Community',
      }));
      
      return new Response(JSON.stringify({ 
        fingerprint: userFingerprint,
        matches: topMatches 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    let aiMatches = JSON.parse(aiData.choices[0].message.content);
    
    // Handle if AI returns object with matches property or direct array
    if (!Array.isArray(aiMatches) && aiMatches.matches) {
      aiMatches = aiMatches.matches;
    }

    // Enrich with template names
    const enrichedMatches: TemplateMatch[] = aiMatches.map((match: any) => {
      const template = templates.find(t => t.id === match.templateId);
      return {
        templateId: match.templateId,
        templateName: template?.anonymized_name || 'Unbekanntes Template',
        reason: match.reason,
        hasEvolution: !!template?.parent_template_id,
      };
    });

    console.log('AI matching completed successfully');

    return new Response(JSON.stringify({ 
      fingerprint: userFingerprint,
      matches: enrichedMatches 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-fingerprint function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});