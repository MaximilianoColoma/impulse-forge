-- Create waitlist_subscribers table
CREATE TABLE public.waitlist_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  affiliate_interest BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'waitlist',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public signup)
CREATE POLICY "Anyone can subscribe to waitlist" 
ON public.waitlist_subscribers 
FOR INSERT 
WITH CHECK (true);

-- Policy: Admins can view all subscribers
CREATE POLICY "Admins can view waitlist" 
ON public.waitlist_subscribers 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Allow public count query (for live counter)
CREATE POLICY "Anyone can count waitlist subscribers" 
ON public.waitlist_subscribers 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_waitlist_subscribed_at ON public.waitlist_subscribers(subscribed_at DESC);