-- T2.10_A · Privacy-preserving Tenancy & Reliability Observability
-- Two-stage outbox: internal typed operational events → aggregated tenant-free metrics.
-- No freeform payload/metadata/context/properties/raw_event columns anywhere.

-- ============================================================
-- 1) operational_event_outbox (internal, typed, pseudonymous refs)
-- ============================================================
CREATE TABLE public.operational_event_outbox (
  event_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version    smallint NOT NULL DEFAULT 1,
  event_name        text NOT NULL,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  environment       text NOT NULL DEFAULT 'production',
  actor_ref         uuid NULL,
  space_ref         uuid NULL,
  team_ref          uuid NULL,
  tier              text NULL,
  team_size_bucket  text NULL,
  surface           text NULL,
  result            text NOT NULL,
  error_class       text NULL,
  status            text NOT NULL DEFAULT 'pending',
  attempts          integer NOT NULL DEFAULT 0,
  lease_until       timestamptz NULL,
  processed_at      timestamptz NULL,
  expires_at        timestamptz NOT NULL,
  CONSTRAINT op_event_result_ck   CHECK (result IN ('success','failure')),
  CONSTRAINT op_event_status_ck   CHECK (status IN ('pending','processing','processed','dead_lettered')),
  CONSTRAINT op_event_env_ck      CHECK (environment IN ('production','staging','development','test')),
  CONSTRAINT op_event_tier_ck     CHECK (tier IS NULL OR tier IN ('free','pro','power','team','enterprise')),
  CONSTRAINT op_event_size_ck     CHECK (team_size_bucket IS NULL OR team_size_bucket IN ('1','2-5','6-20','21+')),
  CONSTRAINT op_event_name_ck     CHECK (event_name IN (
    'tenancy.space_switch.success','tenancy.space_switch.failure',
    'team.seat.assigned','team.seat.revoked',
    'team.invite.success','team.invite.failure',
    'impulse.create.success','impulse.create.failure',
    'auth.login.success','auth.login.failure',
    'analytics.delivery.pending','analytics.delivery.failed'
  ))
);

COMMENT ON TABLE public.operational_event_outbox IS
  'T2.10_A internal typed observability. Pseudonymous actor/space/team refs stay internal. No freeform payload columns. Retention via expires_at.';

CREATE INDEX op_event_pending_idx    ON public.operational_event_outbox (occurred_at) WHERE status = 'pending';
CREATE INDEX op_event_expires_idx    ON public.operational_event_outbox (expires_at);
CREATE INDEX op_event_name_env_idx   ON public.operational_event_outbox (event_name, environment, occurred_at DESC);
CREATE INDEX op_event_space_idx      ON public.operational_event_outbox (space_ref) WHERE space_ref IS NOT NULL;
CREATE INDEX op_event_team_idx       ON public.operational_event_outbox (team_ref)  WHERE team_ref  IS NOT NULL;

-- Grants: only service_role and admin read; no anon, no authenticated write.
GRANT ALL ON public.operational_event_outbox TO service_role;
GRANT SELECT ON public.operational_event_outbox TO authenticated; -- admin gate via RLS

ALTER TABLE public.operational_event_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_event_admin_read"
  ON public.operational_event_outbox
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for authenticated → only service_role can mutate.

-- ============================================================
-- 2) analytics_metric_outbox (aggregated, tenant-free)
-- ============================================================
CREATE TABLE public.analytics_metric_outbox (
  metric_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version      smallint NOT NULL DEFAULT 1,
  metric_name         text NOT NULL,
  bucket_start        timestamptz NOT NULL,
  bucket_end          timestamptz NOT NULL,
  environment         text NOT NULL DEFAULT 'production',
  tier                text NULL,
  size_bucket         text NULL,
  result              text NULL,
  error_class         text NULL,
  metric_value        numeric NOT NULL,
  source_event_count  integer NOT NULL,
  status              text NOT NULL DEFAULT 'pending',
  attempts            integer NOT NULL DEFAULT 0,
  lease_until         timestamptz NULL,
  delivered_at        timestamptz NULL,
  dead_lettered_at    timestamptz NULL,
  CONSTRAINT metric_status_ck CHECK (status IN ('pending','processing','delivered','dead_lettered')),
  CONSTRAINT metric_env_ck    CHECK (environment IN ('production','staging','development','test')),
  CONSTRAINT metric_tier_ck   CHECK (tier IS NULL OR tier IN ('free','pro','power','team','enterprise')),
  CONSTRAINT metric_size_ck   CHECK (size_bucket IS NULL OR size_bucket IN ('1','2-5','6-20','21+')),
  CONSTRAINT metric_result_ck CHECK (result IS NULL OR result IN ('success','failure')),
  CONSTRAINT metric_bucket_ck CHECK (bucket_end > bucket_start),
  CONSTRAINT metric_source_ck CHECK (source_event_count >= 0),
  CONSTRAINT metric_name_ck   CHECK (metric_name IN (
    'tenancy.space_switch.success','tenancy.space_switch.failure',
    'team.seat.assigned','team.seat.revoked',
    'team.invite.success','team.invite.failure',
    'impulse.create.success','impulse.create.failure',
    'auth.login.success','auth.login.failure',
    'analytics.delivery.pending','analytics.delivery.failed'
  ))
);

COMMENT ON TABLE public.analytics_metric_outbox IS
  'T2.10_B aggregated tenant-free metrics. NEVER contains actor/space/team/user/session/device IDs. Only environment × tier × size_bucket × result × time bucket.';

CREATE UNIQUE INDEX metric_dedup_uidx ON public.analytics_metric_outbox
  (metric_name, bucket_start, bucket_end, environment,
   COALESCE(tier,''), COALESCE(size_bucket,''), COALESCE(result,''), COALESCE(error_class,''));

CREATE INDEX metric_pending_idx  ON public.analytics_metric_outbox (bucket_end) WHERE status = 'pending';
CREATE INDEX metric_lease_idx    ON public.analytics_metric_outbox (lease_until) WHERE status = 'processing';

GRANT ALL    ON public.analytics_metric_outbox TO service_role;
GRANT SELECT ON public.analytics_metric_outbox TO authenticated;

ALTER TABLE public.analytics_metric_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metric_admin_read"
  ON public.analytics_metric_outbox
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3) Retention defaults per event family (family → interval)
-- ============================================================
CREATE TABLE public.operational_event_retention (
  event_name        text PRIMARY KEY,
  retention_interval interval NOT NULL,
  category          text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT retention_category_ck CHECK (category IN ('diagnostic','security','reconciliation'))
);

GRANT ALL    ON public.operational_event_retention TO service_role;
GRANT SELECT ON public.operational_event_retention TO authenticated;

ALTER TABLE public.operational_event_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retention_admin_read"
  ON public.operational_event_retention
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.operational_event_retention (event_name, retention_interval, category) VALUES
  ('tenancy.space_switch.success', interval '14 days', 'diagnostic'),
  ('tenancy.space_switch.failure', interval '30 days', 'diagnostic'),
  ('team.seat.assigned',           interval '90 days', 'reconciliation'),
  ('team.seat.revoked',            interval '90 days', 'reconciliation'),
  ('team.invite.success',          interval '30 days', 'diagnostic'),
  ('team.invite.failure',          interval '30 days', 'diagnostic'),
  ('impulse.create.success',       interval '7 days',  'diagnostic'),
  ('impulse.create.failure',       interval '30 days', 'diagnostic'),
  ('auth.login.success',           interval '30 days', 'security'),
  ('auth.login.failure',           interval '90 days', 'security'),
  ('analytics.delivery.pending',   interval '7 days',  'diagnostic'),
  ('analytics.delivery.failed',    interval '30 days', 'diagnostic');

-- ============================================================
-- 4) emit_operational_event() — typed, single entry point
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_operational_event(
  _event_name       text,
  _result           text,
  _actor_ref        uuid   DEFAULT NULL,
  _space_ref        uuid   DEFAULT NULL,
  _team_ref         uuid   DEFAULT NULL,
  _tier             text   DEFAULT NULL,
  _team_size_bucket text   DEFAULT NULL,
  _surface          text   DEFAULT NULL,
  _error_class      text   DEFAULT NULL,
  _environment      text   DEFAULT 'production'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _id       uuid;
  _interval interval;
BEGIN
  SELECT retention_interval INTO _interval
  FROM public.operational_event_retention
  WHERE event_name = _event_name;

  IF _interval IS NULL THEN
    -- Unknown event family → reject at DB layer (defense in depth beside CHECK).
    RAISE EXCEPTION 'UNKNOWN_EVENT_FAMILY: %', _event_name USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.operational_event_outbox (
    event_name, occurred_at, environment, actor_ref, space_ref, team_ref,
    tier, team_size_bucket, surface, result, error_class, expires_at
  ) VALUES (
    _event_name, now(), _environment, _actor_ref, _space_ref, _team_ref,
    _tier, _team_size_bucket, _surface, _result, _error_class, now() + _interval
  )
  RETURNING event_id INTO _id;

  RETURN _id;
EXCEPTION WHEN OTHERS THEN
  -- Observability MUST NOT break domain flow. Swallow and NULL the return.
  RAISE WARNING 'emit_operational_event failed: % (%)', SQLERRM, SQLSTATE;
  RETURN NULL;
END;
$fn$;

REVOKE ALL ON FUNCTION public.emit_operational_event(text,text,uuid,uuid,uuid,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_operational_event(text,text,uuid,uuid,uuid,text,text,text,text,text) TO service_role;
-- authenticated does NOT get direct execute; domain RPCs (SECURITY DEFINER) call it.

-- ============================================================
-- 5) Retention sweeper
-- ============================================================
CREATE OR REPLACE FUNCTION public.sweep_operational_event_outbox()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE _deleted integer;
BEGIN
  DELETE FROM public.operational_event_outbox
   WHERE expires_at < now()
  RETURNING 1 INTO _deleted;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$fn$;

REVOKE ALL ON FUNCTION public.sweep_operational_event_outbox() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_operational_event_outbox() TO service_role;

-- ============================================================
-- 6) Wire existing domain RPCs to emit typed events (extend, don't rewrite semantics)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_seat(_team_id uuid, _actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text; _size text; _cnt int;
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    PERFORM public.emit_operational_event('team.seat.assigned','failure',
      public.current_actor_id(), NULL, _team_id, NULL, NULL, 'rpc.assign_seat', 'FORBIDDEN');
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  UPDATE public.team_members
     SET seat_status = 'active', seat_assigned_at = now()
   WHERE team_id = _team_id AND actor_id = _actor_id;

  IF NOT FOUND THEN
    PERFORM public.emit_operational_event('team.seat.assigned','failure',
      _actor_id, NULL, _team_id, NULL, NULL, 'rpc.assign_seat', 'NOT_FOUND');
    RAISE EXCEPTION 'NOT_FOUND: membership missing';
  END IF;

  PERFORM public.emit_audit('team.seat_assigned','team_member', _actor_id, NULL, _team_id, '{}'::jsonb);

  SELECT subscription_tier::text INTO _tier FROM public.team_owner_profile(_team_id);
  SELECT COUNT(*) INTO _cnt FROM public.team_members WHERE team_id = _team_id AND seat_status = 'active';
  _size := CASE WHEN _cnt <= 1 THEN '1' WHEN _cnt <= 5 THEN '2-5' WHEN _cnt <= 20 THEN '6-20' ELSE '21+' END;

  PERFORM public.emit_operational_event('team.seat.assigned','success',
    _actor_id, NULL, _team_id, _tier, _size, 'rpc.assign_seat', NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_seat(_team_id uuid, _actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text; _size text; _cnt int;
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    PERFORM public.emit_operational_event('team.seat.revoked','failure',
      public.current_actor_id(), NULL, _team_id, NULL, NULL, 'rpc.revoke_seat', 'FORBIDDEN');
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  UPDATE public.team_members
     SET seat_status = 'revoked', seat_assigned_at = NULL
   WHERE team_id = _team_id AND actor_id = _actor_id;

  IF NOT FOUND THEN
    PERFORM public.emit_operational_event('team.seat.revoked','failure',
      _actor_id, NULL, _team_id, NULL, NULL, 'rpc.revoke_seat', 'NOT_FOUND');
    RAISE EXCEPTION 'NOT_FOUND: membership missing';
  END IF;

  PERFORM public.emit_audit('team.seat_revoked','team_member', _actor_id, NULL, _team_id, '{}'::jsonb);

  SELECT subscription_tier::text INTO _tier FROM public.team_owner_profile(_team_id);
  SELECT COUNT(*) INTO _cnt FROM public.team_members WHERE team_id = _team_id AND seat_status = 'active';
  _size := CASE WHEN _cnt <= 1 THEN '1' WHEN _cnt <= 5 THEN '2-5' WHEN _cnt <= 20 THEN '6-20' ELSE '21+' END;

  PERFORM public.emit_operational_event('team.seat.revoked','success',
    _actor_id, NULL, _team_id, _tier, _size, 'rpc.revoke_seat', NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.invite_member(_team_id uuid, _actor_id uuid, _role team_role DEFAULT 'member'::team_role)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _new_id uuid; _tier text; _size text; _cnt int;
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    PERFORM public.emit_operational_event('team.invite.failure','failure',
      public.current_actor_id(), NULL, _team_id, NULL, NULL, 'rpc.invite_member', 'FORBIDDEN');
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  BEGIN
    INSERT INTO public.team_members (team_id, actor_id, role, seat_status)
    VALUES (_team_id, _actor_id, _role, 'pending')
    ON CONFLICT (team_id, actor_id) DO UPDATE SET role = EXCLUDED.role
    RETURNING id INTO _new_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.emit_operational_event('team.invite.failure','failure',
      _actor_id, NULL, _team_id, NULL, NULL, 'rpc.invite_member', SQLSTATE);
    RAISE;
  END;

  PERFORM public.emit_audit('team.member_invited','team_member', _actor_id, NULL, _team_id, jsonb_build_object('role', _role));

  SELECT subscription_tier::text INTO _tier FROM public.team_owner_profile(_team_id);
  SELECT COUNT(*) INTO _cnt FROM public.team_members WHERE team_id = _team_id;
  _size := CASE WHEN _cnt <= 1 THEN '1' WHEN _cnt <= 5 THEN '2-5' WHEN _cnt <= 20 THEN '6-20' ELSE '21+' END;

  PERFORM public.emit_operational_event('team.invite.success','success',
    _actor_id, NULL, _team_id, _tier, _size, 'rpc.invite_member', NULL);

  RETURN _new_id;
END;
$function$;
