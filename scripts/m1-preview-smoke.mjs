#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "M1_TEST_EMAIL",
  "M1_TEST_PASSWORD",
  "PREVIEW_ORIGIN",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const previewOrigin = process.env.PREVIEW_ORIGIN;
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const marker = `m1-preview-${Date.now()}`;
const result = {
  registration: { profile: false, actor: false, personalSpace: false },
  onboarding: { resetObserved: false, completedObserved: false },
  impulse: { created: false, statuses: [] },
  project: { rootCreated: false },
  activity: { status: 0, validPayload: false },
  blueprint: { status: 0, projectsCreated: 0, hierarchyValid: false },
  checkout: {
    status: 0,
    sessionUrlReturned: false,
    checkoutHost: null,
    paymentAttempted: false,
    webhookObserved: false,
    subscriptionObserved: false,
  },
  cleanup: false,
};

let accessToken;
let userId;
let personalSpaceId;
let rootProjectId;
let impulseId;
let templateId;
let blueprintProjectIds = [];

async function invoke(name, body) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publishableKey,
      "Content-Type": "application/json",
      Origin: previewOrigin,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

try {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.M1_TEST_EMAIL,
    password: process.env.M1_TEST_PASSWORD,
  });
  if (authError || !authData.user || !authData.session) throw authError ?? new Error("Sign-in failed");

  userId = authData.user.id;
  accessToken = authData.session.access_token;

  const [{ data: profile }, { data: actorId, error: actorError }] = await Promise.all([
    supabase.from("profiles").select("id,onboarding_completed").eq("id", userId).single(),
    supabase.rpc("current_actor_id"),
  ]);
  if (!profile || actorError || !actorId) throw actorError ?? new Error("Registration trigger records are missing");
  result.registration.profile = true;
  result.registration.actor = true;

  const { data: personalSpace, error: spaceError } = await supabase
    .from("spaces")
    .select("id")
    .eq("owner_actor_id", actorId)
    .eq("is_personal", true)
    .is("team_id", null)
    .single();
  if (spaceError || !personalSpace) throw spaceError ?? new Error("Personal space is missing");
  personalSpaceId = personalSpace.id;
  result.registration.personalSpace = true;

  const { data: resetProfile, error: resetError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: false })
    .eq("id", userId)
    .select("onboarding_completed")
    .single();
  if (resetError || resetProfile?.onboarding_completed !== false) throw resetError ?? new Error("Onboarding reset failed");
  result.onboarding.resetObserved = true;

  const { data: completedProfile, error: completedError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId)
    .select("onboarding_completed")
    .single();
  if (completedError || completedProfile?.onboarding_completed !== true) {
    throw completedError ?? new Error("Onboarding persistence failed");
  }
  result.onboarding.completedObserved = true;

  const { data: rootProject, error: rootError } = await supabase
    .from("projects")
    .insert({ user_id: userId, space_id: personalSpaceId, name: `${marker}-root` })
    .select("id")
    .single();
  if (rootError || !rootProject) throw rootError ?? new Error("Root project creation failed");
  rootProjectId = rootProject.id;
  result.project.rootCreated = true;

  const { data: impulse, error: impulseError } = await supabase
    .from("impulses")
    .insert({
      user_id: userId,
      space_id: personalSpaceId,
      project_id: rootProjectId,
      content: `${marker}-impulse`,
      status: "unprocessed",
    })
    .select("id,status")
    .single();
  if (impulseError || !impulse) throw impulseError ?? new Error("Impulse creation failed");
  impulseId = impulse.id;
  result.impulse.created = true;
  result.impulse.statuses.push(impulse.status);

  for (const status of ["in-progress", "done"]) {
    const { data: updated, error: updateError } = await supabase
      .from("impulses")
      .update({ status })
      .eq("id", impulseId)
      .select("status")
      .single();
    if (updateError || updated?.status !== status) throw updateError ?? new Error(`Impulse ${status} failed`);
    result.impulse.statuses.push(updated.status);
  }

  const activityCall = await invoke("get-user-activity-status", {});
  result.activity.status = activityCall.response.status;
  result.activity.validPayload =
    activityCall.response.ok &&
    typeof activityCall.payload.synapseScore === "number" &&
    typeof activityCall.payload.aiUnlocked === "boolean";
  if (!result.activity.validPayload) throw new Error("Activity function failed");

  const sourceRootId = crypto.randomUUID();
  const sourceChildId = crypto.randomUUID();
  const { data: template, error: templateError } = await supabase
    .from("community_templates")
    .insert({
      original_name: marker,
      anonymized_name: marker,
      description: "M1 preview smoke fixture",
      creator_id: userId,
      space_id: personalSpaceId,
      template_data: [
        { id: sourceRootId, name: `${marker}-blueprint-root`, parent_project_id: null },
        { id: sourceChildId, name: `${marker}-blueprint-child`, parent_project_id: sourceRootId },
      ],
    })
    .select("id")
    .single();
  if (templateError || !template) throw templateError ?? new Error("Blueprint fixture failed");
  templateId = template.id;

  const blueprintCall = await invoke("apply-blueprint", { templateId });
  result.blueprint.status = blueprintCall.response.status;
  result.blueprint.projectsCreated = blueprintCall.payload.projectsCreated ?? 0;
  if (!blueprintCall.response.ok || result.blueprint.projectsCreated !== 2) {
    throw new Error("Apply blueprint function failed");
  }

  const { data: blueprintProjects, error: blueprintProjectsError } = await supabase
    .from("projects")
    .select("id,name,parent_project_id,space_id")
    .in("name", [`${marker}-blueprint-root`, `${marker}-blueprint-child`]);
  if (blueprintProjectsError || blueprintProjects?.length !== 2) {
    throw blueprintProjectsError ?? new Error("Applied blueprint projects are missing");
  }
  blueprintProjectIds = blueprintProjects.map((project) => project.id);
  const appliedRoot = blueprintProjects.find((project) => project.name.endsWith("-blueprint-root"));
  const appliedChild = blueprintProjects.find((project) => project.name.endsWith("-blueprint-child"));
  result.blueprint.hierarchyValid =
    !!appliedRoot &&
    !!appliedChild &&
    appliedChild.parent_project_id === appliedRoot.id &&
    blueprintProjects.every((project) => project.space_id === personalSpaceId);
  if (!result.blueprint.hierarchyValid) throw new Error("Blueprint hierarchy or tenancy is invalid");

  const checkoutCall = await invoke("create-checkout-session", {
    tier: "pro",
    billingCycle: "monthly",
    seats: 1,
  });
  result.checkout.status = checkoutCall.response.status;
  if (typeof checkoutCall.payload.url === "string") {
    const checkoutUrl = new URL(checkoutCall.payload.url);
    result.checkout.checkoutHost = checkoutUrl.hostname;
    result.checkout.sessionUrlReturned = checkoutUrl.hostname === "checkout.stripe.com";
  }
  if (!checkoutCall.response.ok || !result.checkout.sessionUrlReturned) {
    throw new Error("Checkout session creation failed");
  }
} finally {
  if (blueprintProjectIds.length) {
    await supabase.from("projects").update({ parent_project_id: null }).in("id", blueprintProjectIds);
    await supabase.from("projects").delete().in("id", blueprintProjectIds);
  }
  if (templateId) await supabase.from("community_templates").delete().eq("id", templateId);
  if (impulseId) await supabase.from("impulses").delete().eq("id", impulseId);
  if (rootProjectId) await supabase.from("projects").delete().eq("id", rootProjectId);
  await supabase.auth.signOut();
  result.cleanup = true;
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
