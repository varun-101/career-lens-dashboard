-- Add admin value to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Add government ID and verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS government_id_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create private storage bucket for government IDs
INSERT INTO storage.buckets (id, name, public)
VALUES ('government-ids', 'government-ids', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for government-ids bucket
-- Owners can upload their own government ID
CREATE POLICY "Users can upload their own government ID"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'government-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can view their own government ID
CREATE POLICY "Users can view their own government ID"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'government-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all government IDs
CREATE POLICY "Admins can view all government IDs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'government-ids'
  AND public.has_role(auth.uid(), 'admin')
);

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Admin RLS policies for profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Admin RLS policies for user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admin RLS policies for applicants
CREATE POLICY "Admins can view all applicants"
ON public.applicants FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all applicants"
ON public.applicants FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Admin RLS policies for job_postings
CREATE POLICY "Admins can view all job postings"
ON public.job_postings FOR SELECT
USING (public.is_admin(auth.uid()));

-- Update has_role to support admin
-- (already handles it since it checks the user_roles table generically)

-- NOTE: To bootstrap the first admin account, run the following SQL
-- in the Supabase SQL editor after creating the user via Auth:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<your-admin-user-uuid>', 'admin');
--
-- Also set the profile as verified for the admin:
-- UPDATE public.profiles SET is_verified = true WHERE user_id = '<your-admin-user-uuid>';
