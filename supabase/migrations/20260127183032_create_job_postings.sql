-- Create job_postings table
CREATE TABLE public.job_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  location TEXT,
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary_range TEXT,
  is_active BOOLEAN DEFAULT true,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on job_postings
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Job postings policies - users can only see their own postings
CREATE POLICY "Users can view their own job postings" 
ON public.job_postings FOR SELECT 
USING (auth.uid() = user_id);

-- Allow public to view active job postings (for application form)
CREATE POLICY "Public can view active job postings"
ON public.job_postings FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Users can create their own job postings" 
ON public.job_postings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job postings" 
ON public.job_postings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job postings" 
ON public.job_postings FOR DELETE 
USING (auth.uid() = user_id);

-- Add job_posting_id to applicants table
ALTER TABLE public.applicants 
ADD COLUMN job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_job_postings_user_id ON public.job_postings(user_id);
CREATE INDEX idx_job_postings_is_active ON public.job_postings(is_active);
CREATE INDEX idx_applicants_job_posting ON public.applicants(job_posting_id);
CREATE INDEX idx_applicants_email_job ON public.applicants(email, job_posting_id);

-- Create unique constraint to prevent duplicate applications
CREATE UNIQUE INDEX idx_unique_applicant_per_job 
ON public.applicants(email, job_posting_id) 
WHERE job_posting_id IS NOT NULL;

-- Create trigger for updated_at on job_postings
CREATE TRIGGER update_job_postings_updated_at
BEFORE UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment application count
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_posting_id IS NOT NULL THEN
    UPDATE public.job_postings 
    SET application_count = application_count + 1 
    WHERE id = NEW.job_posting_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-increment application count
CREATE TRIGGER increment_job_application_count
AFTER INSERT ON public.applicants
FOR EACH ROW
EXECUTE FUNCTION increment_application_count();

-- Allow public to create applicants when applying through job postings
-- This enables the public application form to work
CREATE POLICY "Allow public to create applicants for job postings"
ON public.applicants FOR INSERT
TO public
WITH CHECK (job_posting_id IS NOT NULL);
