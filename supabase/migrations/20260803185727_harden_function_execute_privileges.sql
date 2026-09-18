-- PostgreSQL grants EXECUTE on newly-created functions to PUBLIC by default.
-- Remove that broad access and explicitly expose only the RPC/helper surface
-- required by authenticated clients and RLS policies.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      fn.signature
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_actor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.default_space_id_for_current_actor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_audit(text, text, uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_space_access(uuid, public.space_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, public.team_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_seat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_seat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, uuid, public.team_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_owner_profile(uuid) TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
