-- Make applicants.user_id nullable so public (unauthenticated) job applications work
ALTER TABLE public.applicants
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a policy to allow logged-in applicants to create applications with their user_id
CREATE POLICY "Authenticated applicants can create their own applications"
ON public.applicants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'applicant'));

-- Authenticated applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.applicants FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
