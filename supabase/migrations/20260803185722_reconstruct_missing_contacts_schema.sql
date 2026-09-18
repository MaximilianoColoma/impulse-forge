-- Reconstruct tables that were present in the generated client types and RLS
-- contract but missing from the checked-in migration chain.

CREATE TABLE IF NOT EXISTS public.contact_status_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_status_options_user_label_key UNIQUE (user_id, label)
);

CREATE TABLE IF NOT EXISTS public.consent_status_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_status_options_user_label_key UNIQUE (user_id, label)
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  contact_status text NOT NULL DEFAULT 'new',
  consent_status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  space_id uuid NOT NULL DEFAULT public.default_space_id_for_current_actor()
    REFERENCES public.spaces(id) ON DELETE SET NULL
);

ALTER TABLE public.impulses
  ADD COLUMN IF NOT EXISTS contact_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.impulses'::regclass
      AND conname = 'impulses_contact_id_fkey'
  ) THEN
    ALTER TABLE public.impulses
      ADD CONSTRAINT impulses_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS contact_status_options_user_id_idx
  ON public.contact_status_options(user_id);
CREATE INDEX IF NOT EXISTS consent_status_options_user_id_idx
  ON public.consent_status_options(user_id);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx
  ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS impulses_contact_id_idx
  ON public.impulses(contact_id);

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contact_status_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_status_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own contact status options" ON public.contact_status_options;
CREATE POLICY "Users can create own contact status options"
  ON public.contact_status_options FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own contact status options" ON public.contact_status_options;
CREATE POLICY "Users can delete own contact status options"
  ON public.contact_status_options FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own contact status options" ON public.contact_status_options;
CREATE POLICY "Users can view own contact status options"
  ON public.contact_status_options FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own consent status options" ON public.consent_status_options;
CREATE POLICY "Users can create own consent status options"
  ON public.consent_status_options FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own consent status options" ON public.consent_status_options;
CREATE POLICY "Users can delete own consent status options"
  ON public.consent_status_options FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own consent status options" ON public.consent_status_options;
CREATE POLICY "Users can view own consent status options"
  ON public.consent_status_options FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own contacts" ON public.contacts;
CREATE POLICY "Users can create own contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;
CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.contact_status_options FROM anon;
REVOKE ALL ON public.consent_status_options FROM anon;
REVOKE ALL ON public.contacts FROM anon;

GRANT SELECT, INSERT, DELETE ON public.contact_status_options TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.consent_status_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;

GRANT ALL ON public.contact_status_options TO service_role;
GRANT ALL ON public.consent_status_options TO service_role;
GRANT ALL ON public.contacts TO service_role;
