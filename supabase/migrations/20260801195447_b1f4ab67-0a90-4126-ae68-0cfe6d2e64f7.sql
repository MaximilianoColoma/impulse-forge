CREATE OR REPLACE FUNCTION public.sweep_operational_event_outbox()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _deleted integer;
BEGIN
  DELETE FROM public.operational_event_outbox
   WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$function$;

REVOKE ALL ON FUNCTION public.sweep_operational_event_outbox() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_operational_event_outbox() TO service_role;