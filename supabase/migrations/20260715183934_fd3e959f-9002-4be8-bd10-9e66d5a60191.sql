
CREATE OR REPLACE FUNCTION public.ensure_personal_space(_actor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _space_id uuid;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'ensure_personal_space: actor_id required';
  END IF;

  SELECT id INTO _space_id
  FROM public.spaces
  WHERE owner_actor_id = _actor_id
    AND team_id IS NULL
    AND is_personal = true
  LIMIT 1;

  IF _space_id IS NULL THEN
    INSERT INTO public.spaces (owner_actor_id, name, visibility, is_personal, team_id)
    VALUES (_actor_id, 'Personal', 'private', true, NULL)
    RETURNING id INTO _space_id;
  END IF;

  RETURN _space_id;
END;
$$;

DO $$
DECLARE
  _actor record;
BEGIN
  FOR _actor IN SELECT id FROM public.actors WHERE kind = 'human' LOOP
    PERFORM public.ensure_personal_space(_actor.id);
  END LOOP;
END $$;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.projects p SET space_id = m.space_id
FROM mapping m WHERE p.user_id = m.user_id AND p.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.impulses t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.contacts t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.blueprint_feedback t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.structure_snapshots t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.structure_templates t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

WITH mapping AS (
  SELECT a.user_id, public.ensure_personal_space(a.id) AS space_id
  FROM public.actors a WHERE a.kind = 'human'
)
UPDATE public.user_tools t SET space_id = m.space_id
FROM mapping m WHERE t.user_id = m.user_id AND t.space_id IS NULL;

INSERT INTO public.unassigned_rows (source_table, source_id, reason, payload)
SELECT 'projects', p.id, 'no_actor_for_user_id', jsonb_build_object('user_id', p.user_id)
FROM public.projects p WHERE p.space_id IS NULL
UNION ALL
SELECT 'impulses', i.id, 'no_actor_for_user_id', jsonb_build_object('user_id', i.user_id)
FROM public.impulses i WHERE i.space_id IS NULL
UNION ALL
SELECT 'contacts', c.id, 'no_actor_for_user_id', jsonb_build_object('user_id', c.user_id)
FROM public.contacts c WHERE c.space_id IS NULL
UNION ALL
SELECT 'blueprint_feedback', b.id, 'no_actor_for_user_id', jsonb_build_object('user_id', b.user_id)
FROM public.blueprint_feedback b WHERE b.space_id IS NULL
UNION ALL
SELECT 'structure_snapshots', s.id, 'no_actor_for_user_id', jsonb_build_object('user_id', s.user_id)
FROM public.structure_snapshots s WHERE s.space_id IS NULL
UNION ALL
SELECT 'structure_templates', s.id, 'no_actor_for_user_id', jsonb_build_object('user_id', s.user_id)
FROM public.structure_templates s WHERE s.space_id IS NULL
UNION ALL
SELECT 'user_tools', u.id, 'no_actor_for_user_id', jsonb_build_object('user_id', u.user_id)
FROM public.user_tools u WHERE u.space_id IS NULL;

DO $$
DECLARE
  _remaining bigint;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.projects WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.impulses WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.contacts WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.blueprint_feedback WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.structure_snapshots WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.structure_templates WHERE space_id IS NULL)
    + (SELECT COUNT(*) FROM public.user_tools WHERE space_id IS NULL)
  INTO _remaining;

  IF _remaining = 0 THEN
    ALTER TABLE public.projects            ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.impulses            ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.contacts            ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.blueprint_feedback  ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.structure_snapshots ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.structure_templates ALTER COLUMN space_id SET NOT NULL;
    ALTER TABLE public.user_tools          ALTER COLUMN space_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'T2.6.d skipped: % rows still without space_id.', _remaining;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.default_space_id_for_current_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
BEGIN
  _actor := public.current_actor_id();
  IF _actor IS NULL THEN RETURN NULL; END IF;
  RETURN public.ensure_personal_space(_actor);
END;
$$;

INSERT INTO public.audit_log (actor_id, action, resource_type, resource_id, metadata)
SELECT
  (SELECT id FROM public.actors WHERE kind='human' ORDER BY created_at LIMIT 1),
  'tenancy.backfill.completed',
  'migration',
  gen_random_uuid(),
  jsonb_build_object('phase', 'T2.6', 'timestamp', now())
WHERE EXISTS (SELECT 1 FROM public.actors WHERE kind='human');
