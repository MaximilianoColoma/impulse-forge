
-- T2.8.c: Seat-Assignment (Actor↔Seat) — schema + enforcement + RPCs

-- 1) Enum for seat status
DO $$ BEGIN
  CREATE TYPE public.seat_status AS ENUM ('active','pending','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Columns on team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS seat_status public.seat_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS seat_assigned_at timestamptz;

-- Backfill: existing rows count as active + assigned at invited_at
UPDATE public.team_members
   SET seat_assigned_at = COALESCE(seat_assigned_at, joined_at, invited_at)
 WHERE seat_status = 'active' AND seat_assigned_at IS NULL;

-- 3) Helper: get owner profile of a team (subscription_tier + seats)
CREATE OR REPLACE FUNCTION public.team_owner_profile(_team_id uuid)
RETURNS TABLE (owner_user_id uuid, subscription_tier public.subscription_tier, seats int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.user_id, p.subscription_tier, p.seats
  FROM public.teams t
  JOIN public.actors a ON a.id = t.owner_actor_id
  JOIN public.profiles p ON p.id = a.user_id
  WHERE t.id = _team_id
  LIMIT 1
$$;

-- 4) View: team_seat_usage
DROP VIEW IF EXISTS public.team_seat_usage;
CREATE VIEW public.team_seat_usage
WITH (security_invoker = true)
AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  op.subscription_tier AS owner_tier,
  op.seats AS seats_purchased,
  COALESCE(SUM(CASE WHEN tm.seat_status = 'active'  THEN 1 ELSE 0 END), 0)::int AS seats_active,
  COALESCE(SUM(CASE WHEN tm.seat_status = 'pending' THEN 1 ELSE 0 END), 0)::int AS seats_pending,
  GREATEST(op.seats - COALESCE(SUM(CASE WHEN tm.seat_status = 'active' THEN 1 ELSE 0 END), 0), 0)::int AS seats_remaining
FROM public.teams t
LEFT JOIN LATERAL public.team_owner_profile(t.id) op ON true
LEFT JOIN public.team_members tm ON tm.team_id = t.id
GROUP BY t.id, t.name, op.subscription_tier, op.seats;

GRANT SELECT ON public.team_seat_usage TO authenticated;
GRANT ALL ON public.team_seat_usage TO service_role;

-- 5) Enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tier public.subscription_tier;
  _seats int;
  _active_count int;
BEGIN
  IF NEW.seat_status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.seat_status = 'active' AND OLD.actor_id = NEW.actor_id AND OLD.team_id = NEW.team_id THEN
    RETURN NEW; -- no change in seat consumption
  END IF;

  SELECT subscription_tier, seats INTO _tier, _seats
  FROM public.team_owner_profile(NEW.team_id);

  IF _tier IS DISTINCT FROM 'enterprise' THEN
    RETURN NEW; -- only enforce for enterprise
  END IF;

  SELECT COUNT(*) INTO _active_count
  FROM public.team_members
  WHERE team_id = NEW.team_id
    AND seat_status = 'active'
    AND NOT (actor_id = NEW.actor_id AND (TG_OP = 'UPDATE'));

  IF _active_count + 1 > COALESCE(_seats, 0) THEN
    RAISE EXCEPTION 'SEAT_LIMIT_REACHED: team % has % of % seats occupied', NEW.team_id, _active_count, _seats
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.seat_assigned_at IS NULL THEN
    NEW.seat_assigned_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_seat_limit_trg ON public.team_members;
CREATE TRIGGER enforce_seat_limit_trg
BEFORE INSERT OR UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();

-- 6) RPC: assign_seat
CREATE OR REPLACE FUNCTION public.assign_seat(_team_id uuid, _actor_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  UPDATE public.team_members
     SET seat_status = 'active',
         seat_assigned_at = now()
   WHERE team_id = _team_id AND actor_id = _actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: membership missing';
  END IF;

  PERFORM public.emit_audit('team.seat_assigned','team_member', _actor_id, NULL, _team_id, '{}'::jsonb);
END;
$$;

-- 7) RPC: revoke_seat
CREATE OR REPLACE FUNCTION public.revoke_seat(_team_id uuid, _actor_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  UPDATE public.team_members
     SET seat_status = 'revoked',
         seat_assigned_at = NULL
   WHERE team_id = _team_id AND actor_id = _actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: membership missing';
  END IF;

  PERFORM public.emit_audit('team.seat_revoked','team_member', _actor_id, NULL, _team_id, '{}'::jsonb);
END;
$$;

-- 8) RPC: invite_member (creates a pending row without consuming a seat)
CREATE OR REPLACE FUNCTION public.invite_member(_team_id uuid, _actor_id uuid, _role public.team_role DEFAULT 'member')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _new_id uuid;
BEGIN
  IF NOT public.is_team_member(_team_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required';
  END IF;

  INSERT INTO public.team_members (team_id, actor_id, role, seat_status)
  VALUES (_team_id, _actor_id, _role, 'pending')
  ON CONFLICT (team_id, actor_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO _new_id;

  PERFORM public.emit_audit('team.member_invited','team_member', _actor_id, NULL, _team_id, jsonb_build_object('role', _role));
  RETURN _new_id;
END;
$$;

-- Ensure uniqueness for the ON CONFLICT above (idempotent)
DO $$ BEGIN
  ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_actor_unique UNIQUE (team_id, actor_id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN duplicate_table THEN NULL; END $$;

GRANT EXECUTE ON FUNCTION public.assign_seat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_seat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, uuid, public.team_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_owner_profile(uuid) TO authenticated;
