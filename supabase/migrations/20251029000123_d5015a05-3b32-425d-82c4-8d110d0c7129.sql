-- Create reading_sessions table for tracking reading analytics
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id TEXT NOT NULL,
  story_title TEXT,
  words_read INTEGER NOT NULL DEFAULT 0,
  reading_time_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for reading_sessions
CREATE POLICY "Users can view their own reading sessions"
  ON public.reading_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading sessions"
  ON public.reading_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_reading_sessions_user_id ON public.reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_completed_at ON public.reading_sessions(completed_at DESC);