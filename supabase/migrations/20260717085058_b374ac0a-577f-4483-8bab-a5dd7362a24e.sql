
CREATE TABLE IF NOT EXISTS public.login_confirm_dedup (
  token_hash uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_confirm_dedup TO service_role;
ALTER TABLE public.login_confirm_dedup ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS login_confirm_dedup_created_idx ON public.login_confirm_dedup(created_at);
