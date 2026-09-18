-- Add is_archived field to projects table
ALTER TABLE public.projects 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add is_archived field to impulses table
ALTER TABLE public.impulses 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add index for better query performance on archived items
CREATE INDEX idx_projects_archived ON public.projects(user_id, is_archived);
CREATE INDEX idx_impulses_archived ON public.impulses(user_id, is_archived);