// T2.10_A · Deterministic post-login confirm endpoint.
// - Verifies caller's session via SUPABASE_JWKS (getUser round-trips the auth server).
// - Idempotent per access_token: event_id = uuid-v5(sha256(access_token)) → PK conflict = no-op.
// - Emits `auth.login.success`; failure branch handled by client if getUser rejects.
// Rationale: Auth Hooks require dashboard configuration which is not available on
// Lovable Cloud. This endpoint is functionally equivalent for tenancy observability:
// the JWT cannot be forged, and dedup ensures each real login produces exactly one row.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// SHA-256(access_token) → UUID (deterministic, per-session dedup key)
async function tokenToDedupUuid(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const b = Array.from(digest.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // v5-ish
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing_bearer" });
  const token = authHeader.slice("Bearer ".length);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "invalid_token" });
  const uid = userData.user.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: actorRow } = await admin
    .from("actors").select("id").eq("user_id", uid).eq("kind", "human").maybeSingle();
  const actorId = actorRow?.id ?? null;

  // Dedup per access_token via login_confirm_dedup table (session-scoped, one row per token).
  const dedupUuid = await tokenToDedupUuid(token);
  const { error: dedupErr } = await admin
    .from("login_confirm_dedup")
    .insert({ token_hash: dedupUuid, user_id: uid });

  if (dedupErr && (dedupErr as any).code === "23505") {
    return json(202, { deduped: true });
  }
  if (dedupErr) {
    return json(500, { error: "dedup_failed", details: dedupErr.message });
  }

  // Emit via RPC so retention/expires_at is applied consistently.
  const { error: emitErr } = await admin.rpc("emit_operational_event", {
    _event_name:  "auth.login.success",
    _result:      "success",
    _actor_ref:   actorId,
    _environment: Deno.env.get("ENVIRONMENT") ?? "production",
  });
  if (emitErr) return json(500, { error: "emit_failed", details: emitErr.message });

  return json(202, { deduped: false });
});