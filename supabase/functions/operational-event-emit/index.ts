// T2.10_A · Sole writer for operational_event_outbox from user contexts.
// - Verifies the caller's JWT via SUPABASE_JWKS (no anon writes).
// - Validates payload against the strict Zod contract (no freeform props).
// - Maps auth.uid() → actor_id via the actors table.
// - Calls SECURITY DEFINER RPC public.emit_operational_event with service role.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { OperationalEventSchema } from "../_shared/analyticsSchema.ts";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json(405, { error: "method_not_allowed" });

  // 1. Authenticate
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing_bearer" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "invalid_token" });
  const uid = userData.user.id;

  // 2. Validate payload (strict — unknown keys rejected)
  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const parsed = OperationalEventSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: "invalid_payload", details: parsed.error.flatten() });
  const evt = parsed.data;

  // 3. Resolve actor from JWT (never trust client-supplied actor_ref)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actorRow } = await admin
    .from("actors")
    .select("id")
    .eq("user_id", uid).eq("kind", "human").maybeSingle();
  const actorId = actorRow?.id ?? null;

  // 4. Emit via SECURITY DEFINER RPC (writes operational_event_outbox)
  const { data: emitted, error: emitErr } = await admin.rpc("emit_operational_event", {
    _event_name:       evt.event_name,
    _result:           evt.result,
    _actor_ref:        actorId,
    _space_ref:        evt.space_ref ?? null,
    _team_ref:         evt.team_ref ?? null,
    _tier:             evt.tier ?? null,
    _team_size_bucket: evt.team_size_bucket ?? null,
    _surface:          evt.surface ?? null,
    _error_class:      evt.error_class ?? null,
    _environment:      evt.environment,
  });
  if (emitErr) return json(500, { error: "emit_failed", details: emitErr.message });

  return json(202, { event_id: emitted ?? null });
});