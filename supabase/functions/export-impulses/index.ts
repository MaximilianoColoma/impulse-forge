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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { format, filters } = await req.json();
    const { timeframe, projectId } = filters;

    console.log('Export request:', { format, filters, userId: user.id });

    // Calculate date range based on timeframe
    let startDate: Date | null = null;
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last7Days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30Days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    // Build query based on filters
    let query = supabaseClient
      .from('impulses')
      .select('*, projects(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply timeframe filter
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply project filter
    if (projectId && projectId !== 'all') {
      if (projectId === 'unassigned') {
        query = query.is('project_id', null);
      } else {
        query = query.eq('project_id', projectId);
      }
    }

    const { data: impulses, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Found ${impulses?.length || 0} impulses to export`);

    let content: string;
    let contentType: string;
    let filename: string;

    const timestamp = new Date().toISOString().split('T')[0];
    const timeframeName = timeframe === 'all' ? 'alle' : timeframe;

    switch (format) {
      case 'markdown':
        content = generateMarkdown(impulses || []);
        contentType = 'text/markdown';
        filename = `synapse-export-${timeframeName}-${timestamp}.md`;
        break;
      case 'csv':
        content = generateCSV(impulses || []);
        contentType = 'text/csv';
        filename = `synapse-export-${timeframeName}-${timestamp}.csv`;
        break;
      case 'json':
      default:
        content = JSON.stringify(impulses, null, 2);
        contentType = 'application/json';
        filename = `synapse-export-${timeframeName}-${timestamp}.json`;
        break;
    }

    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateMarkdown(impulses: any[]): string {
  let md = '# Synapse Export\n\n';
  md += `Exportiert am: ${new Date().toLocaleDateString('de-DE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`;
  md += `Anzahl Impulse: ${impulses.length}\n\n`;
  md += '---\n\n';

  // Group by project
  const byProject = new Map<string, any[]>();
  impulses.forEach(impulse => {
    const projectName = impulse.projects?.name || 'Ohne Projekt';
    if (!byProject.has(projectName)) {
      byProject.set(projectName, []);
    }
    byProject.get(projectName)!.push(impulse);
  });

  byProject.forEach((projectImpulses, projectName) => {
    md += `## ${projectName}\n\n`;
    
    projectImpulses.forEach(impulse => {
      const statusEmoji = impulse.status === 'done' ? '✅' : impulse.status === 'in-progress' ? '🔄' : '💡';
      md += `### ${statusEmoji} ${impulse.content.substring(0, 60)}${impulse.content.length > 60 ? '...' : ''}\n\n`;
      md += `${impulse.content}\n\n`;
      md += `**Tags:** ${impulse.tags?.map((t: string) => `${t}`).join(' ') || 'Keine Tags'}\n\n`;
      md += `**Typ:** ${impulse.type}\n\n`;
      md += `**Status:** ${impulse.status}\n\n`;
      md += `**Erstellt:** ${new Date(impulse.created_at).toLocaleString('de-DE')}\n\n`;
      md += '---\n\n';
    });
  });

  return md;
}

function generateCSV(impulses: any[]): string {
  const headers = ['ID', 'Inhalt', 'Typ', 'Tags', 'Projekt', 'Status', 'Erstellt am', 'Aktualisiert am'];
  const rows = impulses.map(impulse => [
    impulse.id,
    `"${impulse.content.replace(/"/g, '""')}"`,
    impulse.type,
    `"${impulse.tags?.join(', ') || ''}"`,
    `"${impulse.projects?.name || 'Ohne Projekt'}"`,
    impulse.status,
    new Date(impulse.created_at).toLocaleString('de-DE'),
    new Date(impulse.updated_at).toLocaleString('de-DE'),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}