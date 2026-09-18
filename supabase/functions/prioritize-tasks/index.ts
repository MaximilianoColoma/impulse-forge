import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rankTasksByPareto } from '../_shared/paretoPrioritization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Fetch unfinished impulses
    const { data: impulses, error: impulsesError } = await supabase
      .from('impulses')
      .select('id, content, status, tags, tool')
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .in('status', ['unprocessed', 'in-progress'])
      .order('created_at', { ascending: false });

    if (impulsesError) throw impulsesError;

    if (!impulses || impulses.length === 0) {
      return new Response(JSON.stringify({ topTasks: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rankedTasks = rankTasksByPareto(impulses);
    const topTasks = rankedTasks.map(({ task, score, reasons }) => ({
      ...task,
      paretoScore: score,
      paretoReasons: reasons,
    }));

    return new Response(JSON.stringify({
      topTasks,
      strategy: 'deterministic-pareto-v1',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in prioritize-tasks:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
