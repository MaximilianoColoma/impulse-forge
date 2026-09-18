
-- ============================================================
-- Ω2 · Tenancy Backbone (T2.1, T2.2, T2.3, T2.4, T2.9)
-- ============================================================

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.actor_kind AS ENUM ('human', 'llm', 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.space_visibility AS ENUM ('private', 'team', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.space_permission AS ENUM ('read', 'write', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- T2.1 · actors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.actors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          public.actor_kind NOT NULL DEFAULT 'human',
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_actors_user_id ON public.actors(user_id);

GRANT SELECT, INSERT, UPDATE ON public.actors TO authenticated;
GRANT ALL ON public.actors TO service_role;
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- T2.3 · teams + team_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_actor_id    UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  plan              TEXT NOT NULL DEFAULT 'free',
  seat_limit        INTEGER NOT NULL DEFAULT 1,
  referral_source   TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  role        public.team_role NOT NULL DEFAULT 'member',
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at   TIMESTAMPTZ,
  PRIMARY KEY (team_id, actor_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_actor ON public.team_members(actor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- T2.4 · spaces + space_access
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  visibility  public.space_visibility NOT NULL DEFAULT 'private',
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spaces_team ON public.spaces(team_id);
CREATE INDEX IF NOT EXISTS idx_spaces_owner ON public.spaces(owner_actor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT ALL ON public.spaces TO service_role;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.space_access (
  space_id    UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  permission  public.space_permission NOT NULL DEFAULT 'read',
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, actor_id)
);
CREATE INDEX IF NOT EXISTS idx_space_access_actor ON public.space_access(actor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_access TO authenticated;
GRANT ALL ON public.space_access TO service_role;
ALTER TABLE public.space_access ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- T2.2 · actor_credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.actor_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  hashed_secret TEXT NOT NULL,
  prefix        TEXT NOT NULL,
  scopes        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  label         TEXT,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_actor_credentials_actor ON public.actor_credentials(actor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_actor_credentials_prefix ON public.actor_credentials(prefix);
GRANT SELECT, INSERT, UPDATE ON public.actor_credentials TO authenticated;
GRANT ALL ON public.actor_credentials TO service_role;
ALTER TABLE public.actor_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- T2.9 · audit_log (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  team_id        UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  space_id       UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  input_hash     TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_team ON public.audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Unassigned rows quarantine (T2.R5 target)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unassigned_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table  TEXT NOT NULL,
  source_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.unassigned_rows TO authenticated;
GRANT ALL ON public.unassigned_rows TO service_role;
ALTER TABLE public.unassigned_rows ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Security-Definer helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_actor_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.actors
  WHERE user_id = auth.uid() AND kind = 'human'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID, _min_role public.team_role DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.actors a ON a.id = tm.actor_id
    WHERE tm.team_id = _team_id
      AND a.user_id = auth.uid()
      AND CASE _min_role
        WHEN 'viewer' THEN tm.role IN ('viewer','member','admin','owner')
        WHEN 'member' THEN tm.role IN ('member','admin','owner')
        WHEN 'admin'  THEN tm.role IN ('admin','owner')
        WHEN 'owner'  THEN tm.role = 'owner'
      END
  )
$$;

CREATE OR REPLACE FUNCTION public.has_space_access(_space_id UUID, _perm public.space_permission DEFAULT 'read')
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.spaces s
    LEFT JOIN public.space_access sa
      ON sa.space_id = s.id
     AND sa.actor_id = public.current_actor_id()
    WHERE s.id = _space_id
      AND (
        s.owner_actor_id = public.current_actor_id()
        OR (s.visibility = 'public' AND _perm = 'read')
        OR (s.visibility = 'team' AND s.team_id IS NOT NULL AND public.is_team_member(s.team_id, 'viewer') AND _perm = 'read')
        OR (sa.permission IS NOT NULL AND CASE _perm
              WHEN 'read'  THEN sa.permission IN ('read','write','admin')
              WHEN 'write' THEN sa.permission IN ('write','admin')
              WHEN 'admin' THEN sa.permission = 'admin'
            END)
      )
  )
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- actors
DROP POLICY IF EXISTS "actors self read" ON public.actors;
CREATE POLICY "actors self read" ON public.actors FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      JOIN public.actors me ON me.id = tm1.actor_id
      WHERE me.user_id = auth.uid() AND tm2.actor_id = actors.id
    )
  );

DROP POLICY IF EXISTS "actors self insert" ON public.actors;
CREATE POLICY "actors self insert" ON public.actors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR kind = 'llm');

DROP POLICY IF EXISTS "actors self update" ON public.actors;
CREATE POLICY "actors self update" ON public.actors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- teams
DROP POLICY IF EXISTS "teams member read" ON public.teams;
CREATE POLICY "teams member read" ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(id, 'viewer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "teams owner insert" ON public.teams;
CREATE POLICY "teams owner insert" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (owner_actor_id = public.current_actor_id());

DROP POLICY IF EXISTS "teams admin update" ON public.teams;
CREATE POLICY "teams admin update" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_member(id, 'admin')) WITH CHECK (public.is_team_member(id, 'admin'));

DROP POLICY IF EXISTS "teams owner delete" ON public.teams;
CREATE POLICY "teams owner delete" ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_member(id, 'owner'));

-- team_members
DROP POLICY IF EXISTS "team_members read" ON public.team_members;
CREATE POLICY "team_members read" ON public.team_members FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, 'viewer') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "team_members admin manage" ON public.team_members;
CREATE POLICY "team_members admin manage" ON public.team_members FOR ALL TO authenticated
  USING (public.is_team_member(team_id, 'admin')) WITH CHECK (public.is_team_member(team_id, 'admin'));

-- spaces
DROP POLICY IF EXISTS "spaces read" ON public.spaces;
CREATE POLICY "spaces read" ON public.spaces FOR SELECT TO authenticated
  USING (
    owner_actor_id = public.current_actor_id()
    OR visibility = 'public'
    OR (visibility = 'team' AND team_id IS NOT NULL AND public.is_team_member(team_id, 'viewer'))
    OR EXISTS (
      SELECT 1 FROM public.space_access sa
      WHERE sa.space_id = spaces.id AND sa.actor_id = public.current_actor_id()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "spaces insert" ON public.spaces;
CREATE POLICY "spaces insert" ON public.spaces FOR INSERT TO authenticated
  WITH CHECK (
    owner_actor_id = public.current_actor_id()
    AND (team_id IS NULL OR public.is_team_member(team_id, 'member'))
  );

DROP POLICY IF EXISTS "spaces update" ON public.spaces;
CREATE POLICY "spaces update" ON public.spaces FOR UPDATE TO authenticated
  USING (public.has_space_access(id, 'admin') OR owner_actor_id = public.current_actor_id())
  WITH CHECK (public.has_space_access(id, 'admin') OR owner_actor_id = public.current_actor_id());

DROP POLICY IF EXISTS "spaces delete" ON public.spaces;
CREATE POLICY "spaces delete" ON public.spaces FOR DELETE TO authenticated
  USING (owner_actor_id = public.current_actor_id());

-- space_access
DROP POLICY IF EXISTS "space_access read" ON public.space_access;
CREATE POLICY "space_access read" ON public.space_access FOR SELECT TO authenticated
  USING (actor_id = public.current_actor_id() OR public.has_space_access(space_id, 'admin'));

DROP POLICY IF EXISTS "space_access admin manage" ON public.space_access;
CREATE POLICY "space_access admin manage" ON public.space_access FOR ALL TO authenticated
  USING (public.has_space_access(space_id, 'admin')) WITH CHECK (public.has_space_access(space_id, 'admin'));

-- actor_credentials
DROP POLICY IF EXISTS "credentials owner read" ON public.actor_credentials;
CREATE POLICY "credentials owner read" ON public.actor_credentials FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors a WHERE a.id = actor_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "credentials owner insert" ON public.actor_credentials;
CREATE POLICY "credentials owner insert" ON public.actor_credentials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.actors a WHERE a.id = actor_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "credentials owner revoke" ON public.actor_credentials;
CREATE POLICY "credentials owner revoke" ON public.actor_credentials FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.actors a WHERE a.id = actor_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.actors a WHERE a.id = actor_id AND a.user_id = auth.uid()));

-- audit_log (append-only)
DROP POLICY IF EXISTS "audit_log read own" ON public.audit_log;
CREATE POLICY "audit_log read own" ON public.audit_log FOR SELECT TO authenticated
  USING (
    actor_id = public.current_actor_id()
    OR (team_id IS NOT NULL AND public.is_team_member(team_id, 'admin'))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "audit_log insert" ON public.audit_log;
CREATE POLICY "audit_log insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = public.current_actor_id() OR actor_id IS NULL);

-- unassigned_rows (admin only)
DROP POLICY IF EXISTS "unassigned admin read" ON public.unassigned_rows;
CREATE POLICY "unassigned admin read" ON public.unassigned_rows FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Triggers: updated_at + auto-create human actor on signup
-- ============================================================
CREATE TRIGGER trg_actors_updated_at BEFORE UPDATE ON public.actors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spaces_updated_at BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_actor()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.actors (kind, user_id, display_name)
  VALUES ('human', NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'Actor'))
  ON CONFLICT (user_id, kind) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_actor ON auth.users;
CREATE TRIGGER on_auth_user_created_actor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_actor();

-- Backfill actors for existing users
INSERT INTO public.actors (kind, user_id, display_name)
SELECT 'human', u.id, COALESCE(p.email, u.email, 'Actor')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ON CONFLICT (user_id, kind) DO NOTHING;

-- ============================================================
-- Add space_id (nullable) to existing tables — backfill later (T2.6)
-- ============================================================
-- A clean migration replay does not have the legacy contacts table that was
-- present in the original hosted project. Bootstrap its final columns here so
-- the tenancy backfill below can run; the later reconstruction migration adds
-- the remaining indexes, trigger, grants, and RLS policies idempotently.
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  contact_status TEXT NOT NULL DEFAULT 'new',
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL
);

ALTER TABLE public.projects              ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.impulses              ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.blueprint_feedback    ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.community_templates   ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.structure_templates   ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.structure_snapshots   ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.contacts              ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.user_tools            ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_space  ON public.projects(space_id);
CREATE INDEX IF NOT EXISTS idx_impulses_space  ON public.impulses(space_id);
