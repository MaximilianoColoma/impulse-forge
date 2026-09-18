-- Release hardening discovered by replaying the full chain into a clean
-- Production project. Keep this migration idempotent across Preview and
-- Production.

-- pg_net is not referenced anywhere in the application or scheduled jobs. It
-- is non-relocatable and otherwise remains exposed in the public schema.
DROP EXTENSION IF EXISTS pg_net;

-- This table is exclusively an Edge Function deduplication store. RLS already
-- denies public roles; make the privilege and policy intent explicit as well.
REVOKE ALL ON public.login_confirm_dedup FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "login confirm service role only" ON public.login_confirm_dedup;
CREATE POLICY "login confirm service role only"
  ON public.login_confirm_dedup
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- A caller may check only the role attached to its own authenticated identity.
-- Service-role operations bypass RLS and do not need arbitrary-user RPC access.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = (SELECT auth.uid())
  )
$$;

-- Internal helper used by seat-limit triggers/RPCs; users never call it
-- directly and would otherwise be able to enumerate team owner metadata.
REVOKE EXECUTE ON FUNCTION public.team_owner_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.team_owner_profile(uuid) TO service_role;

-- PostgreSQL does not index foreign-key columns automatically.
CREATE INDEX IF NOT EXISTS audit_log_space_id_idx
  ON public.audit_log(space_id);
CREATE INDEX IF NOT EXISTS blueprint_feedback_space_id_idx
  ON public.blueprint_feedback(space_id);
CREATE INDEX IF NOT EXISTS blueprint_feedback_user_id_idx
  ON public.blueprint_feedback(user_id);
CREATE INDEX IF NOT EXISTS community_templates_parent_template_id_idx
  ON public.community_templates(parent_template_id);
CREATE INDEX IF NOT EXISTS community_templates_space_id_idx
  ON public.community_templates(space_id);
CREATE INDEX IF NOT EXISTS contacts_space_id_idx
  ON public.contacts(space_id);
CREATE INDEX IF NOT EXISTS impulses_project_id_idx
  ON public.impulses(project_id);
CREATE INDEX IF NOT EXISTS structure_snapshots_space_id_idx
  ON public.structure_snapshots(space_id);
CREATE INDEX IF NOT EXISTS structure_templates_space_id_idx
  ON public.structure_templates(space_id);
CREATE INDEX IF NOT EXISTS teams_owner_actor_id_idx
  ON public.teams(owner_actor_id);
CREATE INDEX IF NOT EXISTS user_tools_space_id_idx
  ON public.user_tools(space_id);

-- The primary key already enforces the same (team_id, actor_id) uniqueness.
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_team_actor_unique;
