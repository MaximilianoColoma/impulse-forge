-- Create blueprint_feedback table for tracking usage and modifications
CREATE TABLE public.blueprint_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.community_templates(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('usage_success', 'modification')),
  feedback_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add evolution columns to community_templates
ALTER TABLE public.community_templates 
ADD COLUMN is_evolution BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN evolution_data JSONB,
ADD COLUMN parent_template_id UUID REFERENCES public.community_templates(id);

-- Enable RLS on blueprint_feedback
ALTER TABLE public.blueprint_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for blueprint_feedback
CREATE POLICY "Users can create own feedback"
ON public.blueprint_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.blueprint_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Blueprint creators can view feedback for their templates"
ON public.blueprint_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_templates
    WHERE id = blueprint_feedback.template_id
    AND creator_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_blueprint_feedback_template_id ON public.blueprint_feedback(template_id);
CREATE INDEX idx_blueprint_feedback_created_at ON public.blueprint_feedback(created_at DESC);
CREATE INDEX idx_community_templates_is_evolution ON public.community_templates(is_evolution) WHERE is_evolution = true;