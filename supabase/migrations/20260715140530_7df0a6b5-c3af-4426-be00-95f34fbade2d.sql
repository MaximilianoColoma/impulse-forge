
REVOKE EXECUTE ON FUNCTION public.current_actor_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, public.team_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_space_access(uuid, public.space_permission) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_actor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, public.team_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_space_access(uuid, public.space_permission) TO authenticated, service_role;
