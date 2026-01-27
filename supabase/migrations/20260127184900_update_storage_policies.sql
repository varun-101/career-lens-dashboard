-- Update storage policies for resumes bucket to allow public uploads

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;

-- Allow public to upload resumes (for job applications)
-- Public uploads go to /public folder
CREATE POLICY "Allow public resume uploads for applications"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = 'public'
);

-- Allow public to read public resumes (for viewing/downloading)
CREATE POLICY "Allow public to read public resumes"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = 'public'
);

-- Allow authenticated users to upload resumes to their own folder
CREATE POLICY "Allow authenticated users to upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own resumes
CREATE POLICY "Allow authenticated users to read their resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own resumes
CREATE POLICY "Allow authenticated users to delete their resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
