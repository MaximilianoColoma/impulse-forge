
-- T2.9.b append-only enforcement (defense in depth)
CREATE OR REPLACE FUNCTION public.audit_log_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (%, blocked)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_block_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_block_mutation();

-- T2.9.c emit_audit helper (security definer, resolves actor_id from session)
CREATE OR REPLACE FUNCTION public.emit_audit(
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _space_id uuid DEFAULT NULL,
  _team_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
  _id uuid;
BEGIN
  _actor := public.current_actor_id();
  INSERT INTO public.audit_log (actor_id, action, resource_type, resource_id, space_id, team_id, metadata)
  VALUES (_actor, _action, _resource_type, _resource_id, _space_id, _team_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_audit(text, text, uuid, uuid, uuid, jsonb) TO authenticated, service_role;
