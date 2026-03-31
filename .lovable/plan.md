

# Role-Based Authentication Implementation

## Overview
Add role-based login splitting the app into HR Portal (existing) and Applicant Portal (new). Signup forms differ by role. Applicants can browse active job postings and apply.

## Database Changes (Migration)

1. Create `app_role` enum: `('hr', 'applicant')`
2. Create `user_roles` table with `user_id` + `role`, unique constraint, RLS
3. Create `has_role(user_id, role)` security definer function
4. Add RLS policy on `job_postings` allowing applicants to SELECT active postings
5. Add trigger to auto-assign role on profile creation (optional — can do in app code)

## File Changes

### `src/pages/Auth.tsx` — Update signup with role selection
- Add HR/Applicant toggle on signup form
- HR signup: full name, company name, email, password (current)
- Applicant signup: full name, email, password, resume upload, GitHub username
- On signup: insert into `user_roles`, upload resume + trigger analysis for applicants
- On login: fetch role → redirect to correct dashboard

### `src/hooks/useAuth.ts` — Add role awareness
- After session established, query `user_roles` for current user's role
- Expose `role` in return value

### `src/components/ProtectedRoute.tsx` — New
- Wrapper component checking auth + role
- Redirects unauthenticated to `/auth`, wrong role to their correct dashboard

### `src/pages/ApplicantDashboard.tsx` — New
- Browse active job postings (SELECT from `job_postings` where `is_active = true`)
- "My Applications" section showing applicant's own submissions with status
- "Apply" button linking to existing `/apply/:jobId` flow

### `src/App.tsx` — Update routes
- Wrap `/dashboard` with `ProtectedRoute` requiring `hr` role
- Add `/applicant-dashboard` wrapped with `ProtectedRoute` requiring `applicant` role
- Keep `/apply/:jobId` accessible to authenticated applicants

## Security
- `user_roles` RLS: users can only read/insert their own role
- `has_role()` function avoids recursive RLS
- Job postings readable by applicants (active only) via new SELECT policy
- Existing HR-only tables unchanged

