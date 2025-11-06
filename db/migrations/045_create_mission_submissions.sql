-- Create table for mission form submissions
CREATE TABLE IF NOT EXISTS public.mission_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'discord_join',
    'category_vote',
    'donation',
    'founding_supporter',
    'city_node_pilot',
    'white_label_demo'
  )),
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  message TEXT,
  additional_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'completed', 'archived')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can submit forms" ON public.mission_submissions;

-- Allow anyone (including anonymous users) to insert submissions
CREATE POLICY "Anyone can submit forms" ON public.mission_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.mission_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.mission_submissions;

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" ON public.mission_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update submissions
CREATE POLICY "Admins can update submissions" ON public.mission_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mission_submissions_type ON public.mission_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_status ON public.mission_submissions(status);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_created_at ON public.mission_submissions(created_at DESC);

