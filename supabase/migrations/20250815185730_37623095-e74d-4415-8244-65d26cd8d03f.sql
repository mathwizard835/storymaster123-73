-- Create a table to track story completions per device/user
CREATE TABLE public.story_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.story_completions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own completions and insert new ones
CREATE POLICY "Allow device to read own completions" 
ON public.story_completions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow device to insert completions" 
ON public.story_completions 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_story_completions_device_id ON public.story_completions(device_id);