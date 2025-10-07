-- Create table for storing GitHub validation results
CREATE TABLE public.github_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_name TEXT NOT NULL,
  github_username TEXT NOT NULL,
  authenticity_score INTEGER NOT NULL CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  total_repos INTEGER DEFAULT 0,
  total_commits INTEGER DEFAULT 0,
  account_age_days INTEGER DEFAULT 0,
  copied_projects_detected INTEGER DEFAULT 0,
  analysis_summary TEXT,
  red_flags JSONB DEFAULT '[]'::jsonb,
  positive_indicators JSONB DEFAULT '[]'::jsonb,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.github_validations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read validations (for HR dashboard)
CREATE POLICY "Anyone can view validations"
ON public.github_validations
FOR SELECT
USING (true);

-- Create policy to allow anyone to insert validations
CREATE POLICY "Anyone can create validations"
ON public.github_validations
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_github_validations_applicant ON public.github_validations(applicant_name);
CREATE INDEX idx_github_validations_username ON public.github_validations(github_username);