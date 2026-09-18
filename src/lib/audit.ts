/**
 * T2.9.c · Audit-Log emitter (client-side helper).
 *
 * Fire-and-forget write into the append-only `audit_log` via the security-definer
 * `emit_audit` RPC. Never throws — audit logging must not block user flows.
 * The RPC resolves the current actor_id server-side (auth.uid()).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AuditEvent {
  action: string;                     // e.g. "space.switch", "role.grant"
  resourceType: string;               // e.g. "space", "user_role", "actor_credential"
  resourceId?: string | null;
  spaceId?: string | null;
  teamId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(evt: AuditEvent): Promise<void> {
  try {
    const { error } = await supabase.rpc('emit_audit', {
      _action: evt.action,
      _resource_type: evt.resourceType,
      _resource_id: evt.resourceId ?? undefined,
      _space_id: evt.spaceId ?? undefined,
      _team_id: evt.teamId ?? undefined,
      _metadata: (evt.metadata ?? {}) as never,
    });
    if (error && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[audit] emit failed', evt.action, error.message);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[audit] emit threw', evt.action, err);
    }
  }
}