-- Supabase policy suggestions for Wedding Photos app

-- 1) Create an admins table to manage which users can view/delete photos
-- Run in SQL editor for your Supabase DB

CREATE TABLE IF NOT EXISTS admins (
  email text PRIMARY KEY
);

-- 2) Enable RLS on photos table and allow inserts from service role only
ALTER TABLE IF EXISTS public.photos ENABLE ROW LEVEL SECURITY;

-- allow service_role (server) to insert/select/delete
CREATE POLICY "service_role_full_access" ON public.photos
  FOR ALL
  USING ( auth.role() = 'service_role' )
  WITH CHECK ( auth.role() = 'service_role' );

-- allow admins (authenticated users listed in admins table) to select / delete
CREATE POLICY "admins_select_delete" ON public.photos
  FOR SELECT USING ( EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()) );

CREATE POLICY "admins_delete" ON public.photos
  FOR DELETE USING ( EXISTS (SELECT 1 FROM public.admins a WHERE a.email = auth.email()) );

-- If you allow direct uploads from clients to storage (not recommended), create storage policies carefully.
-- Recommended: keep bucket `wedding-photos` private and only use service_role for uploads.

-- Example: keep bucket private
-- In Storage settings -> Bucket -> set to "private"

-- Optional: limit file types/size at application layer (we validate in uploads API)