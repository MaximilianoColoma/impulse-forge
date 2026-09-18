// T2.10_A · Client-side entrypoint.
// Fire-and-forget: never blocks UX, never throws into the caller.
// The server (edge function `operational-event-emit`) is the only writer;
// this helper simply relays a typed intent along with the caller's JWT.

import { supabase } from "@/integrations/supabase/client";

export type OperationalEventName =
  | "tenancy.space_switch.success" | "tenancy.space_switch.failure"
  | "team.seat.assigned"           | "team.seat.revoked"
  | "team.invite.success"          | "team.invite.failure"
  | "impulse.create.success"       | "impulse.create.failure"
  | "auth.login.success"           | "auth.login.failure"
  | "analytics.delivery.pending"   | "analytics.delivery.failed";

export interface EmitOperationalEventInput {
  event_name: OperationalEventName;
  result: "success" | "failure";
  space_ref?: string | null;
  team_ref?: string | null;
  surface?: string | null;
  error_class?: string | null;
  tier?: "free" | "pro" | "power" | "team" | "enterprise" | null;
  team_size_bucket?: "1" | "2-5" | "6-20" | "21+" | null;
}

export async function emitOperationalEvent(input: EmitOperationalEventInput): Promise<void> {
  try {
    // Fire-and-forget. We do not await propagation into any UI path.
    void Promise.resolve(
      supabase.functions.invoke("operational-event-emit", { body: input }),
    ).catch(() => {
      // swallowed: transport failures must never surface in the domain flow
    });
  } catch {
    // Observability must never break the domain flow.
  }
}