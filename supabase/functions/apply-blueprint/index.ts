import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateProject {
  id: string;
  name: string;
  parent_project_id: string | null;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseTemplateProjects(value: unknown): TemplateProject[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error("Blueprint must contain between 1 and 100 projects");
  }

  const projects = value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid blueprint project");
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const parent = candidate.parent_project_id;

    if (!id || !name || name.length > 200) throw new Error("Invalid blueprint project");
    if (parent !== null && parent !== undefined && typeof parent !== "string") {
      throw new Error("Invalid blueprint parent");
    }

    return { id, name, parent_project_id: parent ? parent.trim() : null };
  });

  const ids = new Set(projects.map((project) => project.id));
  if (ids.size !== projects.length) throw new Error("Duplicate blueprint project id");

  for (const project of projects) {
    if (project.parent_project_id === project.id) throw new Error("Blueprint contains a cycle");
    if (project.parent_project_id && !ids.has(project.parent_project_id)) {
      throw new Error("Blueprint parent is missing");
    }

    const visited = new Set<string>([project.id]);
    let parentId = project.parent_project_id;
    while (parentId) {
      if (visited.has(parentId)) throw new Error("Blueprint contains a cycle");
      visited.add(parentId);
      parentId = projects.find((candidate) => candidate.id === parentId)?.parent_project_id ?? null;
    }
  }

  return projects;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Function is not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const token = authHeader.slice("Bearer ".length);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

  const createdProjectIds: string[] = [];

  try {
    const body = await req.json();
    const templateId = typeof body?.templateId === "string" ? body.templateId.trim() : "";
    if (!templateId) return jsonResponse({ error: "templateId is required" }, 400);

    const { data: template, error: templateError } = await supabase
      .from("community_templates")
      .select("id, template_data, downloads_count")
      .eq("id", templateId)
      .single();
    if (templateError || !template) return jsonResponse({ error: "Template not found" }, 404);

    const templateProjects = parseTemplateProjects(template.template_data);

    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "human")
      .single();
    if (actorError || !actor) throw new Error("User actor is missing");

    let { data: personalSpace, error: spaceError } = await supabase
      .from("spaces")
      .select("id")
      .eq("owner_actor_id", actor.id)
      .eq("is_personal", true)
      .is("team_id", null)
      .maybeSingle();

    if (spaceError) throw spaceError;
    if (!personalSpace) {
      const { data: personalSpaceId, error: ensureError } = await supabase
        .rpc("ensure_personal_space", { _actor_id: actor.id });
      if (ensureError || !personalSpaceId) throw new Error("Personal space is missing");
      personalSpace = { id: personalSpaceId };
    }

    const idMap = new Map<string, string>();
    for (const project of templateProjects) {
      const { data: created, error: createError } = await supabase
        .from("projects")
        .insert({
          name: project.name,
          user_id: user.id,
          space_id: personalSpace.id,
          parent_project_id: null,
        })
        .select("id")
        .single();
      if (createError || !created) throw createError ?? new Error("Project creation failed");
      createdProjectIds.push(created.id);
      idMap.set(project.id, created.id);
    }

    for (const project of templateProjects) {
      if (!project.parent_project_id) continue;
      const { error: parentError } = await supabase
        .from("projects")
        .update({ parent_project_id: idMap.get(project.parent_project_id) })
        .eq("id", idMap.get(project.id));
      if (parentError) throw parentError;
    }

    const { error: downloadError } = await supabase
      .from("community_templates")
      .update({ downloads_count: template.downloads_count + 1 })
      .eq("id", templateId);
    if (downloadError) console.error("Failed to update blueprint download count", downloadError);

    const { error: feedbackError } = await supabase.from("blueprint_feedback").insert({
      user_id: user.id,
      template_id: templateId,
      space_id: personalSpace.id,
      feedback_type: "usage_success",
      feedback_data: { projectsCreated: createdProjectIds.length, appliedAt: new Date().toISOString() },
    });
    if (feedbackError) console.error("Failed to track blueprint usage", feedbackError);

    return jsonResponse({ success: true, projectsCreated: createdProjectIds.length });
  } catch (error) {
    console.error("Error in apply-blueprint function", error);

    if (createdProjectIds.length > 0) {
      await supabase.from("projects").update({ parent_project_id: null }).in("id", createdProjectIds);
      const { error: cleanupError } = await supabase.from("projects").delete().in("id", createdProjectIds);
      if (cleanupError) console.error("Failed to roll back blueprint projects", cleanupError);
    }

    return jsonResponse({ error: "Failed to apply blueprint" }, 500);
  }
});
