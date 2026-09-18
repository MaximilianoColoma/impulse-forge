-- Add due_date field to impulses table
ALTER TABLE public.impulses 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;