-- Add activity tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN synapse_score integer NOT NULL DEFAULT 0,
ADD COLUMN ai_unlocked boolean NOT NULL DEFAULT false,
ADD COLUMN first_active_at timestamp with time zone DEFAULT now();

-- Create index for faster queries
CREATE INDEX idx_profiles_synapse_score ON public.profiles(synapse_score);
CREATE INDEX idx_profiles_ai_unlocked ON public.profiles(ai_unlocked);

-- Create function to calculate and update synapse score
CREATE OR REPLACE FUNCTION public.update_synapse_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_score integer := 0;
  impulse_count integer;
  done_impulse_count integer;
  project_count integer;
BEGIN
  -- Count impulses (1 point each)
  SELECT COUNT(*) INTO impulse_count
  FROM impulses
  WHERE user_id = NEW.user_id;
  
  -- Count done impulses (5 points each)
  SELECT COUNT(*) INTO done_impulse_count
  FROM impulses
  WHERE user_id = NEW.user_id AND status = 'done';
  
  -- Count projects (10 points each)
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE user_id = NEW.user_id;
  
  -- Calculate total score
  total_score := impulse_count + (done_impulse_count * 5) + (project_count * 10);
  
  -- Update profile
  UPDATE profiles
  SET 
    synapse_score = total_score,
    ai_unlocked = CASE WHEN total_score >= 100 THEN true ELSE ai_unlocked END,
    first_active_at = COALESCE(first_active_at, now())
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers to update score when impulses or projects change
CREATE TRIGGER update_score_on_impulse_insert
AFTER INSERT ON public.impulses
FOR EACH ROW
EXECUTE FUNCTION public.update_synapse_score();

CREATE TRIGGER update_score_on_impulse_update
AFTER UPDATE ON public.impulses
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_synapse_score();

CREATE TRIGGER update_score_on_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_synapse_score();