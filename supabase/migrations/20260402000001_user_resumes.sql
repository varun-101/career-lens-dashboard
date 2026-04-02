-- Create user_resumes table for resume library
CREATE TABLE public.user_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  resume_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

-- Owners can view their own resumes
CREATE POLICY "Users can view their own saved resumes"
ON public.user_resumes FOR SELECT
USING (auth.uid() = user_id);

-- Owners can insert their own resumes
CREATE POLICY "Users can insert their own saved resumes"
ON public.user_resumes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Owners can delete their own resumes
CREATE POLICY "Users can delete their own saved resumes"
ON public.user_resumes FOR DELETE
USING (auth.uid() = user_id);

-- HR can view all resumes (needed for candidate review)
CREATE POLICY "HR and admins can view all saved resumes"
ON public.user_resumes FOR SELECT
USING (
  public.has_role(auth.uid(), 'hr') OR public.is_admin(auth.uid())
);

-- Index for fast lookup by user
CREATE INDEX idx_user_resumes_user_id ON public.user_resumes(user_id);

-- Add resume_id link and extracted GitHub fields to applicants
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.user_resumes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS github_extracted_username TEXT,
  ADD COLUMN IF NOT EXISTS github_match_status TEXT CHECK (
    github_match_status IN ('match', 'mismatch', 'provided_only', 'extracted_only', 'none')
  ) DEFAULT 'none';

-- Index for fast lookups
CREATE INDEX idx_applicants_resume_id ON public.applicants(resume_id);
