-- Lets the site owner read and triage "report a missing item / mistake" submissions inside the app
-- (/admin-reports) instead of the Supabase dashboard. Safe to re-run.
-- Requires 20261104120000_score_fraction_drop_lowest_university_archive.sql (catalog_reports).

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- A signed-in user can only see whether THEY are an admin; nobody can add admins from the app.
DROP POLICY IF EXISTS "Users read own admin row" ON public.app_admins;
CREATE POLICY "Users read own admin row"
  ON public.app_admins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins read all catalog reports" ON public.catalog_reports;
CREATE POLICY "Admins read all catalog reports"
  ON public.catalog_reports FOR SELECT TO authenticated
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins update catalog reports" ON public.catalog_reports;
CREATE POLICY "Admins update catalog reports"
  ON public.catalog_reports FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin() AND status IN ('open', 'resolved', 'dismissed'));

-- Make yourself the admin (run ONCE, with your own login email):
--   INSERT INTO public.app_admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
--   ON CONFLICT DO NOTHING;
