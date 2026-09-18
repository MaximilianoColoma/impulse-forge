-- Add parent_project_id to projects table for hierarchical structure
ALTER TABLE public.projects
ADD COLUMN parent_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create impulse_history table to track content changes
CREATE TABLE public.impulse_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impulse_id uuid NOT NULL REFERENCES public.impulses(id) ON DELETE CASCADE,
  old_content text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on impulse_history
ALTER TABLE public.impulse_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for impulse_history
CREATE POLICY "Users can view history of own impulses"
ON public.impulse_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.impulses
    WHERE impulses.id = impulse_history.impulse_id
    AND impulses.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert history of own impulses"
ON public.impulse_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.impulses
    WHERE impulses.id = impulse_history.impulse_id
    AND impulses.user_id = auth.uid()
  )
);

-- Create user_tools table for custom tool lists
CREATE TABLE public.user_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tool_name)
);

-- Enable RLS on user_tools
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_tools
CREATE POLICY "Users can view own tools"
ON public.user_tools
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tools"
ON public.user_tools
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tools"
ON public.user_tools
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_impulse_history_impulse_id ON public.impulse_history(impulse_id);
CREATE INDEX idx_projects_parent_project_id ON public.projects(parent_project_id);
CREATE INDEX idx_user_tools_user_id ON public.user_tools(user_id);