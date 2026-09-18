-- Add is_focus_block column to impulses table
ALTER TABLE public.impulses 
ADD COLUMN is_focus_block BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN public.impulses.is_focus_block IS 'Marks an impulse as a 10-minute focus block for quick task selection';