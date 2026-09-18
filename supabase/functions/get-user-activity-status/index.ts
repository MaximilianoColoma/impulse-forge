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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Calculating activity status for user:', user.id);

    // Count impulses (1 point each)
    const { count: impulseCount, error: impulseError } = await supabase
      .from('impulses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (impulseError) throw impulseError;

    // Count done impulses (5 points each)
    const { count: doneImpulseCount, error: doneError } = await supabase
      .from('impulses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done');

    if (doneError) throw doneError;

    // Count projects (10 points each)
    const { count: projectCount, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (projectError) throw projectError;

    // Calculate total score
    const totalScore = (impulseCount || 0) + ((doneImpulseCount || 0) * 5) + ((projectCount || 0) * 10);
    const aiUnlocked = totalScore >= 100;

    // Update profile with new score
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        synapse_score: totalScore,
        ai_unlocked: aiUnlocked,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    // Calculate progress for each category
    const impulseProgress = Math.min((impulseCount || 0), 10);
    const doneImpulseProgress = Math.min((doneImpulseCount || 0) * 5, 15);
    const projectProgress = Math.min((projectCount || 0) * 10, 20);

    console.log('Activity status calculated:', {
      totalScore,
      aiUnlocked,
      impulseCount,
      doneImpulseCount,
      projectCount,
    });

    return new Response(
      JSON.stringify({
        synapseScore: totalScore,
        aiUnlocked,
        threshold: 100,
        progress: {
          impulses: {
            current: impulseCount || 0,
            target: 10,
            points: impulseProgress,
            maxPoints: 10,
          },
          doneImpulses: {
            current: doneImpulseCount || 0,
            target: 3,
            points: doneImpulseProgress,
            maxPoints: 15,
          },
          projects: {
            current: projectCount || 0,
            target: 2,
            points: projectProgress,
            maxPoints: 20,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-user-activity-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});