-- Allow HR users to read all resumes (needed for createSignedUrl)
CREATE POLICY "HR can read all resumes in storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND public.has_role(auth.uid(), 'hr')
);

-- Allow admins to read all resumes in storage
CREATE POLICY "Admins can read all resumes in storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND public.is_admin(auth.uid())
);
