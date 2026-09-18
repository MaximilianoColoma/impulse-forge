-- Create structure_snapshots table for rollback functionality
CREATE TABLE public.structure_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS
ALTER TABLE public.structure_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own snapshots"
ON public.structure_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots"
ON public.structure_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
ON public.structure_snapshots
FOR DELETE
USING (auth.uid() = user_id);

-- Create structure_templates table
CREATE TABLE public.structure_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.structure_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own templates"
ON public.structure_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
ON public.structure_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.structure_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.structure_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_structure_snapshots_user_id ON public.structure_snapshots(user_id);
CREATE INDEX idx_structure_snapshots_created_at ON public.structure_snapshots(created_at DESC);
CREATE INDEX idx_structure_templates_user_id ON public.structure_templates(user_id);