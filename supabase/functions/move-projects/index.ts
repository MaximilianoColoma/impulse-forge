import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { projectIdsToMove, destinationParentId } = await req.json()

    console.log('Move projects request:', { projectIdsToMove, destinationParentId, userId: user.id })

    // Validate input
    if (!Array.isArray(projectIdsToMove) || projectIdsToMove.length === 0) {
      return new Response(
        JSON.stringify({ error: 'projectIdsToMove must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof destinationParentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'destinationParentId must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that the destination project exists and belongs to the user
    const { data: destinationProject, error: destError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', destinationParentId)
      .eq('user_id', user.id)
      .single()

    if (destError || !destinationProject) {
      console.error('Destination project error:', destError)
      return new Response(
        JSON.stringify({ error: 'Destination project not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that all projects to move belong to the user
    const { data: projectsToMove, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .in('id', projectIdsToMove)
      .eq('user_id', user.id)

    if (projectsError) {
      console.error('Projects fetch error:', projectsError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify projects' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if all requested projects belong to the user
    if (!projectsToMove || projectsToMove.length !== projectIdsToMove.length) {
      return new Response(
        JSON.stringify({ error: 'Some projects not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update parent_project_id for all projects
    const { error: updateError } = await supabase
      .from('projects')
      .update({ parent_project_id: destinationParentId })
      .in('id', projectIdsToMove)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to move projects' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully moved projects:', projectIdsToMove)

    return new Response(
      JSON.stringify({ 
        success: true, 
        movedCount: projectIdsToMove.length,
        message: `${projectIdsToMove.length} projects moved successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
