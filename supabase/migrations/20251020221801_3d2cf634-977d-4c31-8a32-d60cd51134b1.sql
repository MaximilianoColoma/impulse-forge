-- Create community_templates table for shared project structures
CREATE TABLE public.community_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_name TEXT NOT NULL,
  anonymized_name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view community templates
CREATE POLICY "Community templates are viewable by everyone"
ON public.community_templates
FOR SELECT
USING (true);

-- Users can create their own templates
CREATE POLICY "Users can create community templates"
ON public.community_templates
FOR INSERT
WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

-- Users can update their own templates
CREATE POLICY "Users can update own community templates"
ON public.community_templates
FOR UPDATE
USING (auth.uid() = creator_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own community templates"
ON public.community_templates
FOR DELETE
USING (auth.uid() = creator_id);

-- Create user_template_likes table to track likes
CREATE TABLE public.user_template_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.community_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Enable RLS on likes
ALTER TABLE public.user_template_likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes
CREATE POLICY "Likes are viewable by everyone"
ON public.user_template_likes
FOR SELECT
USING (true);

-- Users can create their own likes
CREATE POLICY "Users can create own likes"
ON public.user_template_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
ON public.user_template_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_community_templates_creator ON public.community_templates(creator_id);
CREATE INDEX idx_community_templates_downloads ON public.community_templates(downloads_count DESC);
CREATE INDEX idx_community_templates_likes ON public.community_templates(likes_count DESC);
CREATE INDEX idx_user_template_likes_user ON public.user_template_likes(user_id);
CREATE INDEX idx_user_template_likes_template ON public.user_template_likes(template_id);

-- Create trigger for updated_at
CREATE TRIGGER update_community_templates_updated_at
BEFORE UPDATE ON public.community_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();