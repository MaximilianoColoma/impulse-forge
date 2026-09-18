-- M1: make the tenancy columns authoritative for projects and impulses.
-- Access follows the space permission model; inserts remain attributable to
-- the authenticated user that created the row.

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impulses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "projects space read"
  ON public.projects FOR SELECT TO authenticated
  USING (
    public.has_space_access(space_id, 'read')
    OR public.has_role((select auth.uid()), 'admin')
  );

CREATE POLICY "projects space insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.has_space_access(space_id, 'write')
  );

CREATE POLICY "projects space update"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  )
  WITH CHECK (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  );

CREATE POLICY "projects space delete"
  ON public.projects FOR DELETE TO authenticated
  USING (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Users can view own impulses" ON public.impulses;
DROP POLICY IF EXISTS "Users can create own impulses" ON public.impulses;
DROP POLICY IF EXISTS "Users can update own impulses" ON public.impulses;
DROP POLICY IF EXISTS "Users can delete own impulses" ON public.impulses;

CREATE POLICY "impulses space read"
  ON public.impulses FOR SELECT TO authenticated
  USING (
    public.has_space_access(space_id, 'read')
    OR public.has_role((select auth.uid()), 'admin')
  );

CREATE POLICY "impulses space insert"
  ON public.impulses FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.has_space_access(space_id, 'write')
  );

CREATE POLICY "impulses space update"
  ON public.impulses FOR UPDATE TO authenticated
  USING (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  )
  WITH CHECK (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  );

CREATE POLICY "impulses space delete"
  ON public.impulses FOR DELETE TO authenticated
  USING (
    public.has_space_access(space_id, 'write')
    OR public.has_role((select auth.uid()), 'admin')
  );
