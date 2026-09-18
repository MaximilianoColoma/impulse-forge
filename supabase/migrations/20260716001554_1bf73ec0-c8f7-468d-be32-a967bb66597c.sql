ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_seats int,
  ADD COLUMN IF NOT EXISTS pending_seats_effective_at timestamptz;